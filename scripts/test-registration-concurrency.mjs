import { execSync, spawn } from 'child_process';
import dns from 'dns';
import fs from 'fs';
import path from 'path';

// Ensure localhost resolves to 127.0.0.1
dns.setDefaultResultOrder('ipv4first');

const PORT_8787 = 'http://127.0.0.1:8787';
const PORT_8789 = 'http://127.0.0.1:8789';

const DEV_VARS_PATH = path.resolve('worker/.dev.vars');
const DEV_VARS_BACKUP_PATH = path.resolve('worker/.dev.vars.backup');

function log(msg, ...args) {
  console.log(`[REG-CONCURRENCY-TEST] ${msg}`, ...args);
}

function error(msg, ...args) {
  console.error(`[REG-CONCURRENCY-TEST-ERROR] ${msg}`, ...args);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function queryDB(code) {
  const output = execSync(
    `npx wrangler d1 execute DB --local --command="SELECT code, max_uses, used_count FROM invitation_codes WHERE code = '${code}'"`,
    { cwd: 'worker', encoding: 'utf8' }
  );
  const jsonStart = output.indexOf('[');
  if (jsonStart !== -1) {
    const jsonStr = output.substring(jsonStart);
    const data = JSON.parse(jsonStr);
    return data[0]?.results[0];
  }
  throw new Error(`Failed to query DB for code ${code}: ${output}`);
}

let backupCreated = false;

function backupDevVars() {
  if (fs.existsSync(DEV_VARS_PATH)) {
    log('Backing up .dev.vars...');
    fs.copyFileSync(DEV_VARS_PATH, DEV_VARS_BACKUP_PATH);
    backupCreated = true;
  }
}

function restoreDevVars() {
  if (backupCreated && fs.existsSync(DEV_VARS_BACKUP_PATH)) {
    log('Restoring original .dev.vars...');
    fs.copyFileSync(DEV_VARS_BACKUP_PATH, DEV_VARS_PATH);
    fs.unlinkSync(DEV_VARS_BACKUP_PATH);
    backupCreated = false;
  }
}

// Clean up handlers
function cleanupAndExit() {
  restoreDevVars();
  try {
    execSync('kill -9 $(lsof -t -i:8789) || true');
  } catch (e) {}
}

process.on('exit', cleanupAndExit);
process.on('SIGINT', () => {
  cleanupAndExit();
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  error('Uncaught Exception:', err);
  cleanupAndExit();
  process.exit(1);
});

async function main() {
  log('Starting registration concurrency and rollback tests...');

  // 1. Seed DB
  log('Seeding invitation codes...');
  execSync(
    `npx wrangler d1 execute DB --local --command="INSERT OR REPLACE INTO invitation_codes (code, max_uses, used_count) VALUES ('CONCURRENCY-TEST-2', 1, 0), ('ROLLBACK-TEST-1', 1, 0);"`,
    { cwd: 'worker' }
  );

  const seed1 = await queryDB('CONCURRENCY-TEST-2');
  const seed2 = await queryDB('ROLLBACK-TEST-1');
  log('Seed verification:', { seed1, seed2 });

  if (!seed1 || seed1.used_count !== 0 || !seed2 || seed2.used_count !== 0) {
    throw new Error('Database seeding failed or returned incorrect values.');
  }

  // 2. Perform backup and write temporary .dev.vars with invalid Firebase API Key
  backupDevVars();

  let originalContent = '';
  if (fs.existsSync(DEV_VARS_PATH)) {
    originalContent = fs.readFileSync(DEV_VARS_PATH, 'utf8');
  }
  
  // Replace FIREBASE_API_KEY with an invalid one
  const modifiedContent = originalContent
    .split('\n')
    .map(line => {
      if (line.startsWith('FIREBASE_API_KEY=')) {
        return 'FIREBASE_API_KEY=invalid_api_key_for_testing_rollback';
      }
      return line;
    })
    .join('\n');
  
  fs.writeFileSync(DEV_VARS_PATH, modifiedContent, 'utf8');
  log('Wrote temporary .dev.vars with invalid FIREBASE_API_KEY');

  // 3. Start secondary wrangler dev server on port 8789
  log('Starting secondary wrangler dev server on port 8789...');
  const wranglerProcess = spawn('npx', ['wrangler', 'dev', '--port', '8789'], {
    cwd: 'worker'
  });

  wranglerProcess.stdout.on('data', (data) => {});
  wranglerProcess.stderr.on('data', (data) => {});

  // Wait for server to start
  log('Waiting for port 8789 dev server to spin up...');
  let isReady = false;
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    try {
      const res = await fetch(`${PORT_8789}/`);
      if (res.status === 404 || res.ok) {
        isReady = true;
        break;
      }
    } catch (e) {}
  }

  if (!isReady) {
    wranglerProcess.kill('SIGKILL');
    throw new Error('Failed to start secondary wrangler dev server on port 8789');
  }
  log('Secondary wrangler dev server is running on port 8789.');

  // Restore .dev.vars immediately after port 8789 server reads it,
  // to minimize risk of leaving the temporary file on disk.
  restoreDevVars();

  // 4. Concurrency Test on Port 8787 (already running, mock/real auth based on original .dev.vars)
  log('--- RUNNING CONCURRENCY TEST ---');
  const uuid = Math.floor(Math.random() * 1000000);
  const requests = Array.from({ length: 10 }).map((_, index) => {
    const username = `concur_user_${uuid}_${index}`;
    return fetch(`${PORT_8787}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password: 'validpassword123',
        invitationCode: 'CONCURRENCY-TEST-2',
        turnstileToken: 'mock-token'
      })
    });
  });

  log('Sending 10 concurrent registration requests...');
  const responses = await Promise.all(requests);
  const statusCodes = responses.map(r => r.status);
  log('Registration status codes:', statusCodes);

  let successCount = 0;
  let limitReachedCount = 0;
  let otherCount = 0;

  for (const res of responses) {
    const body = await res.json();
    if (res.status === 200 && body.success) {
      successCount++;
    } else if (res.status === 400 && body.error === 'Invitation code has reached its maximum usage limit') {
      limitReachedCount++;
    } else {
      log('Unexpected response:', res.status, body);
      otherCount++;
    }
  }

  log(`Results - Success: ${successCount}, Limit Reached: ${limitReachedCount}, Other: ${otherCount}`);

  const finalInvite = await queryDB('CONCURRENCY-TEST-2');
  log('Final database state for CONCURRENCY-TEST-2:', finalInvite);

  if (successCount !== 1) {
    throw new Error(`Concurrency Test FAILED: expected exactly 1 success, got ${successCount}`);
  }
  if (limitReachedCount !== 9) {
    throw new Error(`Concurrency Test FAILED: expected exactly 9 limit reached errors, got ${limitReachedCount}`);
  }
  if (finalInvite.used_count !== 1) {
    throw new Error(`Concurrency Test FAILED: expected database used_count = 1, got ${finalInvite.used_count}`);
  }
  log('CONCURRENCY TEST PASSED.');

  // 5. Rollback Test on Port 8789 (Firebase Fail mode)
  log('--- RUNNING ROLLBACK TEST ---');
  const rollbackUser = `rollback_user_${uuid}`;
  log(`Sending registration request for user: ${rollbackUser}...`);
  const rollbackRes = await fetch(`${PORT_8789}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: rollbackUser,
      password: 'validpassword123',
      invitationCode: 'ROLLBACK-TEST-1',
      turnstileToken: 'mock-token'
    })
  });

  const rollbackBody = await rollbackRes.json();
  log(`Rollback register status: ${rollbackRes.status}, response:`, rollbackBody);

  // The request should fail since the Firebase API Key is invalid
  if (rollbackRes.status === 200) {
    throw new Error('Rollback Test FAILED: Expected registration to fail due to invalid Firebase API Key, but it succeeded!');
  }

  // Now verify that the invitation code used_count has rolled back to 0
  const rollbackInvite = await queryDB('ROLLBACK-TEST-1');
  log('Final database state for ROLLBACK-TEST-1:', rollbackInvite);

  if (rollbackInvite.used_count !== 0) {
    throw new Error(`Rollback Test FAILED: expected used_count to be rolled back to 0, but it is ${rollbackInvite.used_count}`);
  }
  log('ROLLBACK TEST PASSED.');

  // 6. Clean up
  log('Cleaning up...');
  wranglerProcess.kill('SIGKILL');
  execSync('kill -9 $(lsof -t -i:8789) || true');
  execSync(
    `npx wrangler d1 execute DB --local --command="DELETE FROM invitation_codes WHERE code IN ('CONCURRENCY-TEST-2', 'ROLLBACK-TEST-1');"`,
    { cwd: 'worker' }
  );
  log('All tests finished successfully!');
}

main().catch(err => {
  error('Test failed with error:', err);
  cleanupAndExit();
  process.exit(1);
});
