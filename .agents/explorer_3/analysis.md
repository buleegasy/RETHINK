# RAG Behavior Activation Test Design & Query Endpoint Analysis

## Executive Summary
This report analyzes the vector database retrieval validation requirements and designs the test runner architecture, 5 adolescent emotional pressure scenarios, and the assertion criteria. It concludes that a dedicated query API endpoint must be added to the Hono worker (`POST /api/knowledge/query`) to allow external verification scripts to test retrieval directly without being blocked by conversational state machines.

---

## 1. Query Endpoint Analysis: Why and How

### Why a new Hono endpoint is needed
We analyzed two potential methods for querying Vectorize:
1. **Using `/api/chat`**: The chat route has retrieval logic inside `worker/src/routes/chat.ts`. However, retrieval is highly coupled with the conversation FSM state. It is only triggered when the FSM is in the `CBT_Stripping` or `Socratic_Questioning` state. A new session starts in the `Onboarding` state and must pass through `Active_Listening` first. Simulating this multi-turn dialogue over LLM calls is extremely slow, non-deterministic, and unsuitable for rapid vector search unit/integration testing.
2. **Direct Vectorize Binding**: The test script runs locally via `npx tsx` outside the Cloudflare Workers execution environment. It cannot directly bind to Cloudflare's `VECTORIZE` and `AI` services without complex Miniflare/Wrangler mocking.

**Conclusion**: We must add a simple, clean HTTP query endpoint `POST /api/knowledge/query` to the Hono worker. This endpoint will expose `retrieveContext` from `worker/src/lib/rag.ts` directly over HTTP when running locally via `wrangler dev` (which runs on port `8787` by default).

### Proposed Hono Worker Route Handler
We propose adding the following route handler in `worker/src/routes/ingest.ts`:

```typescript
/**
 * POST /api/knowledge/query
 * 
 * Exposes the RAG retrieval mechanism for automated testing and inspection.
 * Body: { query: string, topK?: number, minScore?: number }
 */
knowledgeRouter.post('/query', async (c) => {
  const body = await c.req.json<{
    query: string;
    topK?: number;
    minScore?: number;
  }>();

  if (!body.query) {
    return c.json({ error: 'query 不能为空' }, 400);
  }

  try {
    const context = await retrieveContext(
      c.env,
      body.query,
      body.topK ?? 5,
      body.minScore ?? 0.5
    );

    return c.json({
      success: true,
      ...context
    });
  } catch (err: any) {
    console.error('Query error:', err);
    return c.json({ error: err.message || '检索知识库失败' }, 500);
  }
});
```

---

## 2. Test Cases for the 5 Adolescent Scenarios

The knowledge base in `rag-psy-cbt/docs/cbt_behavioral_activation.md` categorizes adolescent issues into four main modules. We map the 5 test scenarios to these modules:

| Test Scenario | Query Template / Example | Target Category | Verification Match Keyword | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Academic Collapse**<br>(学术崩溃) | `"这次数学只考了 82 分，我就是个差生，我完了，怎么努力都没用，中考肯定完蛋。"` | `Academic` | `Academic Stress` 或 `学业` | Validates catastrophizing and black-and-white academic stress. |
| **Social Isolation**<br>(社交孤立) | `"感觉班上大家都有自己的朋友圈子，没有一个人理我，我每天都是一个人，被大家孤立了。"` | `Relationship` | `Relationship Conflict` 或 `同伴` / `社交` | Tests relationship-specific social withdrawal and loneliness triggers. |
| **Extreme Self-Doubt**<br>(极度自卑) | `"为什么我总是做不好？我真的太差劲了，什么事情都比不上别人，感觉自己是人生的失败者。"` | `Self-Esteem` | `Self-Esteem Issues` 或 `自卑` / `自我否定` | Tests personalizing and general feelings of low self-worth. |
| **Late-night Nihilism**<br>(深夜虚无) | `"现在已经是凌晨两点了，还是睡不着。突然觉得一切都没意思，空虚得可怕，活着到底为了什么？"` | `Depression` | `Midnight Emo / Depression` 或 `深夜` / `生存虚无` | Targets insomnia, midnight depression, and existential crisis. |
| **Negation Sentence Resistance**<br>(否定句抗拒) | `"我才不想管什么社交和交朋友，反正大家都当我是空气，我也不想理任何人，一个人更省事。"` | `Relationship` | `Relationship Conflict` 或 `同伴` / `社交` | **Semantic stress test**: Uses negative structures ("不想", "不需要") but represents a cry for connection. Checks if the dense embedding captures the underlying category rather than getting confused. |

---

## 3. Assertion Strategy

For each test case, the test script will send a request to `/api/knowledge/query` and assert the following:

1. **API Success**: The HTTP status code is `200` and the response JSON has `success: true`.
2. **Result Count**: At least one chunk is returned (`chunks.length > 0`).
3. **Similarity Score Boundary**: The top returned similarity score must be `>= 0.55` (`scores[0] >= 0.55`).
   * *Best Practice Detail*: The test script will query with `minScore: 0` to retrieve the closest match regardless of the score. This allows the test script to assert `score >= 0.55` directly. If the score is lower (e.g. `0.52`), the script throws a descriptive assertion failure rather than an unhelpful "no chunks returned" error.
4. **Category Exact Match**: The top retrieved chunk text (`chunks[0]`) must contain the category's keyword (e.g. `"Academic Stress"`, `"Relationship Conflict"`, etc.). Since the document chunker embeds the heading path prefix `[headingPath]` at the beginning of `metadata.text`, this directly exposes the category folder/heading.

---

## 4. Test Script Setup & Dependencies

### File Location & Execution Command
* **File Location**: `/Users/chenhaoran/Documents/心理竞赛/test-behavior-activation-rag.ts` (Workspace root)
* **Execution Command**: `npx tsx test-behavior-activation-rag.ts`

### Dependencies and Imports
To keep the script zero-dependency and runnable in any Node.js environment (v18+) without requiring additional package installations, we will use:
1. `node:assert/strict` — Node's native strict assertions.
2. `global.fetch` — Node's native fetch API (stable in Node 18+).

### Complete Proposed Draft Structure for `test-behavior-activation-rag.ts`

```typescript
import assert from 'node:assert/strict';

const API_URL = process.env.API_URL || 'http://localhost:8787';

interface TestCase {
  name: string;
  query: string;
  expectedCategory: string;
  categoryKeywords: string[];
}

const testCases: TestCase[] = [
  {
    name: 'Academic Collapse (学术崩溃)',
    query: '这次数学只考了 82 分，我就是个差生，我完了，怎么努力都没用，中考肯定完蛋。',
    expectedCategory: 'Academic',
    categoryKeywords: ['Academic Stress', '学业'],
  },
  {
    name: 'Social Isolation (社交孤立)',
    query: '感觉班上大家都有自己的朋友圈子，没有一个人理我，我每天都是一个人，被大家孤立了。',
    expectedCategory: 'Relationship',
    categoryKeywords: ['Relationship Conflict', '同伴关系', '同伴冲突', '社交疲劳'],
  },
  {
    name: 'Extreme Self-Doubt (极度自卑)',
    query: '为什么我总是做不好？我真的太差劲了，什么事情都比不上别人，感觉自己是人生的失败者。',
    expectedCategory: 'Self-Esteem',
    categoryKeywords: ['Self-Esteem Issues', '自卑', '自我否定'],
  },
  {
    name: 'Late-night Nihilism (深夜虚无)',
    query: '现在已经是凌晨两点了，还是睡不着。突然觉得一切都没意思，空虚得可怕，活着到底为了什么？',
    expectedCategory: 'Depression',
    categoryKeywords: ['Midnight Emo / Depression', '深夜低落', '生存虚无'],
  },
  {
    name: 'Negation Sentence Resistance (否定句抗拒)',
    query: '我才不想管什么社交和交朋友，反正大家都当我是空气，我也不想理任何人，一个人更省事。',
    expectedCategory: 'Relationship',
    categoryKeywords: ['Relationship Conflict', '同伴关系', '同伴冲突', '社交疲劳'],
  }
];

async function runTests() {
  console.log(`🚀 Starting RAG Retrieval Quality test on target: ${API_URL}`);
  let passedCount = 0;
  let failedCount = 0;

  for (const tc of testCases) {
    console.log(`\n--------------------------------------------------`);
    console.log(`🧪 Test Case: ${tc.name}`);
    console.log(`👉 Query: "${tc.query}"`);

    try {
      const startTime = Date.now();
      const response = await fetch(`${API_URL}/api/knowledge/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: tc.query,
          topK: 1,
          minScore: 0 // Request all scores for better debugging and assertion reporting
        })
      });

      const duration = Date.now() - startTime;

      assert.equal(response.status, 200, `API returned status ${response.status}`);
      
      const body = await response.json<{
        success: boolean;
        chunks: string[];
        scores: number[];
        sourceDocuments: string[];
        chunkIds: string[];
        error?: string;
      }>();

      if (!body.success) {
        throw new Error(`API error response: ${body.error}`);
      }

      // Assert at least one chunk retrieved
      assert.ok(body.chunks && body.chunks.length > 0, 'No chunks retrieved for query.');

      const topChunkText = body.chunks[0];
      const topScore = body.scores[0];
      const topSource = body.sourceDocuments[0];

      console.log(`⏱️  Latency: ${duration}ms`);
      console.log(`🎯 Top Matched Source: "${topSource}"`);
      console.log(`📊 Similarity Score: ${topScore.toFixed(4)}`);
      console.log(`📝 Chunk Snippet: "${topChunkText.slice(0, 100).replace(/\n/g, ' ')}..."`);

      // Assertion 1: Similarity Score threshold >= 0.55
      assert.ok(
        topScore >= 0.55, 
        `Similarity score too low: expected >= 0.55, but got ${topScore.toFixed(4)}`
      );

      // Assertion 2: Category exact match (check keywords in chunk content / heading path)
      const hasKeyword = tc.categoryKeywords.some(keyword => topChunkText.includes(keyword));
      assert.ok(
        hasKeyword,
        `Category mismatch: expected one of [${tc.categoryKeywords.join(', ')}] in chunk, but got:\n"${topChunkText.slice(0, 200)}"`
      );

      console.log(`✅ Passed: "${tc.name}" retrieved correct category with similarity >= 0.55`);
      passedCount++;
    } catch (err: any) {
      console.error(`❌ Failed: "${tc.name}"`);
      console.error(`👉 Reason: ${err.message}`);
      failedCount++;
    }
  }

  console.log(`\n==================================================`);
  console.log(`📊 Test Summary: ${passedCount} passed, ${failedCount} failed.`);
  console.log(`==================================================`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All RAG tests completed successfully.');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
```
