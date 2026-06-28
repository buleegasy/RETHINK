import fs from 'fs';
import path from 'path';

const BASE_URL = (process.env.RETHINK_API_URL || 'http://localhost:8787').replace(/\/$/, '');
const PROJECT_DIR = '/Users/chenhaoran/工程文件/心理大赛';

function log(msg, ...args) {
  console.log(`[DELETION-INTEG] ${msg}`, ...args);
}

function error(msg, ...args) {
  console.error(`[DELETION-INTEG-ERROR] ${msg}`, ...args);
}

function findFilesWithSessionId(dir, sessionId) {
  const matches = [];
  function scan(currentDir) {
    let files;
    try {
      files = fs.readdirSync(currentDir);
    } catch (e) {
      return;
    }
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (e) {
        continue;
      }
      if (stat.isDirectory()) {
        if (file === 'node_modules' || file === '.git' || file === '.wrangler') {
          continue;
        }
        scan(fullPath);
      } else {
        if (file.includes(sessionId)) {
          matches.push(fullPath);
        }
      }
    }
  }
  scan(dir);
  return matches;
}

async function run() {
  const timestamp = Date.now();
  const sessionId = `test-deletion-integ-${timestamp}`;
  log(`Generated unique Session ID: ${sessionId}`);

  // 1. POST /api/auth/test-login
  log('Performing test-login...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/test-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  if (!loginRes.ok) {
    throw new Error(`Test login failed with status ${loginRes.status}: ${await loginRes.text()}`);
  }
  const loginData = await loginRes.json();
  const token = loginData.token;
  if (!token) {
    throw new Error(`Token was not returned in login response: ${JSON.stringify(loginData)}`);
  }
  log('Test login successful. Token acquired.');

  // 2. POST /api/auth/bind-session
  log(`Binding/creating session: ${sessionId}...`);
  const bindRes = await fetch(`${BASE_URL}/api/auth/bind-session`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sessionId })
  });
  if (!bindRes.ok) {
    throw new Error(`Bind session failed with status ${bindRes.status}: ${await bindRes.text()}`);
  }
  const bindData = await bindRes.json();
  log(`Bind session response: ${JSON.stringify(bindData)}`);
  if (!bindData.success) {
    throw new Error(`Expected bind success, but got: ${JSON.stringify(bindData)}`);
  }
  log('Session bound/created successfully.');

  // 3. GET /api/auth/sessions
  log('Fetching sessions list to verify existence...');
  const sessionsRes = await fetch(`${BASE_URL}/api/auth/sessions`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!sessionsRes.ok) {
    throw new Error(`Fetch sessions failed with status ${sessionsRes.status}: ${await sessionsRes.text()}`);
  }
  const sessionsData = await sessionsRes.json();
  const sessionList = sessionsData.sessions || [];
  const foundSession = sessionList.find(s => s.id === sessionId);
  if (!foundSession) {
    throw new Error(`Created session ${sessionId} not found in the retrieved sessions list: ${JSON.stringify(sessionList)}`);
  }
  log('Session verified in session list.');

  // 4. DELETE /api/auth/sessions/${sessionId}
  log(`Deleting session ${sessionId}...`);
  const deleteRes = await fetch(`${BASE_URL}/api/auth/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!deleteRes.ok) {
    throw new Error(`Delete session failed with status ${deleteRes.status}: ${await deleteRes.text()}`);
  }
  const deleteData = await deleteRes.json();
  log(`Delete response: ${JSON.stringify(deleteData)}`);
  if (!deleteData.success) {
    throw new Error(`Expected delete success, but got: ${JSON.stringify(deleteData)}`);
  }
  log('Delete session call executed successfully.');

  // 5. Verify deletion
  log('Verifying deletion...');

  // Assertion 1: GET /api/auth/sessions no longer includes the deleted session ID
  const sessionsAfterRes = await fetch(`${BASE_URL}/api/auth/sessions`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!sessionsAfterRes.ok) {
    throw new Error(`Fetch sessions after deletion failed with status ${sessionsAfterRes.status}`);
  }
  const sessionsAfterData = await sessionsAfterRes.json();
  const sessionListAfter = sessionsAfterData.sessions || [];
  const foundSessionAfter = sessionListAfter.find(s => s.id === sessionId);
  if (foundSessionAfter) {
    throw new Error(`Session ${sessionId} was still found in the session list after deletion!`);
  }
  log('Assertion 1 PASSED: Session is no longer in the session list.');

  // Assertion 2: GET /api/auth/sessions/${sessionId} returns 404
  const singleSessionRes = await fetch(`${BASE_URL}/api/auth/sessions/${sessionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  log(`Single session fetch response code: ${singleSessionRes.status}`);
  if (singleSessionRes.status !== 404) {
    throw new Error(`Expected GET /api/auth/sessions/${sessionId} to return 404, but got status ${singleSessionRes.status}`);
  }
  log('Assertion 2 PASSED: GET single session returned 404.');

  // Assertion 3: Ensure no local files containing the sessionId in their filename exist
  log('Scanning project directory for files with sessionId in their name...');
  const filesWithId = findFilesWithSessionId(PROJECT_DIR, sessionId);
  if (filesWithId.length > 0) {
    throw new Error(`Found files containing the session ID in their name: ${JSON.stringify(filesWithId)}`);
  }
  log('Assertion 3 PASSED: No files containing the session ID in their name exist in the project directory.');

  log('All deletion and integrity tests completed successfully!');
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    error('Test execution failed:', err);
    process.exit(1);
  });
