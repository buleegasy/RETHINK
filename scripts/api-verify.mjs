/**
 * API Verification Script
 * Validates backend endpoints for RE-THINK Agent.
 */

const BASE_URL = (process.env.RETHINK_API_URL || 'http://localhost:8787').replace(/\/$/, '');

function log(msg, ...args) {
  console.log(`[API-VERIFY] ${msg}`, ...args);
}

function error(msg, ...args) {
  console.error(`[API-VERIFY-ERROR] ${msg}`, ...args);
}

async function run() {
  log(`Starting API verification against: ${BASE_URL}`);

  // Test Endpoint 1: POST /api/auth/test-login
  log('Testing Endpoint 1: POST /api/auth/test-login');
  let loginRes;
  try {
    loginRes = await fetch(`${BASE_URL}/api/auth/test-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // MUST have a body to prevent hangs!
    });
  } catch (err) {
    error('Failed to connect to backend server. Make sure wrangler/worker dev server is running.');
    throw err;
  }

  const loginText = await loginRes.text();
  if (!loginRes.ok) {
    throw new Error(`Login endpoint failed with status ${loginRes.status}: ${loginText}`);
  }

  let loginData;
  try {
    loginData = JSON.parse(loginText);
  } catch (err) {
    throw new Error(`Login response was not valid JSON: ${loginText}`);
  }

  if (!loginData.success || !loginData.token || !loginData.user) {
    throw new Error(`Login response did not contain expected success/token/user: ${JSON.stringify(loginData)}`);
  }

  log('Endpoint 1 PASSED: Guest token received successfully.');

  const token = loginData.token;

  // Test Endpoint 2: GET /api/auth/sessions
  log('Testing Endpoint 2: GET /api/auth/sessions');
  const sessionsRes = await fetch(`${BASE_URL}/api/auth/sessions`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const sessionsText = await sessionsRes.text();
  if (!sessionsRes.ok) {
    throw new Error(`Sessions endpoint failed with status ${sessionsRes.status}: ${sessionsText}`);
  }

  let sessionsData;
  try {
    sessionsData = JSON.parse(sessionsText);
  } catch (err) {
    throw new Error(`Sessions response was not valid JSON: ${sessionsText}`);
  }

  if (!sessionsData.success || !Array.isArray(sessionsData.sessions)) {
    throw new Error(`Sessions response did not contain success flag or sessions list: ${JSON.stringify(sessionsData)}`);
  }

  log(`Endpoint 2 PASSED: Successfully retrieved ${sessionsData.sessions.length} sessions.`);
  log('All API verification checks passed successfully.');
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    error(err.message || err);
    process.exit(1);
  });
