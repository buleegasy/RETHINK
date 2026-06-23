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
    categoryKeywords: ['Relationship Conflict', '同伴关系', '同伴冲突', '社交疲劳', 'Relationship'],
  },
  {
    name: 'Extreme Self-Doubt (极度自卑)',
    query: '为什么我总是做不好？我真的太差劲了，什么事情都比不上别人，感觉自己是人生的失败者。',
    expectedCategory: 'Self-Esteem',
    categoryKeywords: ['Self-Esteem Issues', '自卑', '自我否定', 'SelfEsteem'],
  },
  {
    name: 'Late-night Nihilism (深夜虚无)',
    query: '现在已经是凌晨两点，还是睡不着。突然觉得一切都没意思，空虚得可怕，活着到底为了什么？',
    expectedCategory: 'Depression',
    categoryKeywords: ['Midnight Emo / Depression', '深夜低落', '生存虚无', 'Depression'],
  },
  {
    name: 'Negation Sentence Resistance (否定句抗拒)',
    query: '我才不想管什么社交和交朋友，反正大家都当我是空气，我也不想理任何人，一个人更省事。',
    expectedCategory: 'Relationship',
    categoryKeywords: ['Relationship Conflict', '同伴关系', '同伴冲突', '社交疲劳', 'Relationship'],
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
