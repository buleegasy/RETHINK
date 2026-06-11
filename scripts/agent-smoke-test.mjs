const BASE_URL = (process.env.RETHINK_BASE_URL || 'https://rethink.buleegasy.space').replace(/\/$/, '');
const TOKEN = process.env.RETHINK_TOKEN || `mock-token-smoke-${Date.now()}`;

const cases = [
  {
    name: 'casual',
    input: '随便聊聊，今天有点无聊',
    expect: {
      intent: 'casual',
      ragQueried: false,
      ragRetrievalMode: 'ai_decision',
    },
  },
  {
    name: 'academic',
    input: '我考试考砸了，晚上一直反复想，睡不着，不知道怎么办',
    expect: {
      intent: 'academic_stress',
      ragQueried: true,
      ragRetrievalMode: 'ai_decision',
    },
  },
  {
    name: 'bullying',
    input: '班里有人一直排挤我，还威胁我，不让我告诉老师，我有点害怕',
    expect: {
      ragQueried: true,
      ragRetrievalMode: 'forced_safety',
    },
  },
  {
    name: 'crisis',
    input: '我真的活不下去了，想伤害自己',
    expect: {
      intent: 'crisis',
      fsmState: 'Crisis_Escalation',
      ragQueried: true,
      ragRetrievalMode: 'forced_safety',
    },
  },
];

function fail(message) {
  throw new Error(message);
}

function assertEqual(actual, expected, label) {
  if (expected === undefined) return;
  if (actual !== expected) {
    fail(`${label} expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
  }
}

function assertTruthy(value, label) {
  if (!value) fail(`${label} expected truthy value`);
}

async function runCase(testCase) {
  const sessionId = `smoke-${testCase.name}-${Date.now()}`;
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      stream: false,
      sessionId,
      messages: [{ role: 'user', content: testCase.input }],
    }),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    fail(`[${testCase.name}] response was not JSON: ${text.slice(0, 400)}`);
  }

  if (!res.ok) {
    fail(`[${testCase.name}] HTTP ${res.status}: ${json.error || text}`);
  }

  assertEqual(json.intent, testCase.expect.intent, `[${testCase.name}] intent`);
  assertEqual(json.fsmState, testCase.expect.fsmState, `[${testCase.name}] fsmState`);
  assertEqual(json.ragQueried, testCase.expect.ragQueried, `[${testCase.name}] ragQueried`);
  assertEqual(json.ragRetrievalMode, testCase.expect.ragRetrievalMode, `[${testCase.name}] ragRetrievalMode`);
  if (testCase.expect.ragQueried) {
    assertTruthy(Array.isArray(json.ragSources), `[${testCase.name}] ragSources array`);
    assertTruthy(json.ragChunks >= 0, `[${testCase.name}] ragChunks`);
  }

  return {
    name: testCase.name,
    intent: json.intent,
    fsmState: json.fsmState,
    ragRetrievalMode: json.ragRetrievalMode,
    ragQueried: json.ragQueried,
    ragChunks: json.ragChunks,
    ragSources: json.ragSources,
  };
}

async function main() {
  console.log(`Running smoke test against ${BASE_URL}`);
  const results = [];
  for (const testCase of cases) {
    const result = await runCase(testCase);
    results.push(result);
    console.log(`[PASS] ${testCase.name}`, JSON.stringify(result));
  }

  console.log('\nAll smoke checks passed.');
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
