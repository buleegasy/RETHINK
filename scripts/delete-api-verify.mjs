/**
 * Message Deletion API Verification Script
 * Validates backend deletion endpoints and permissions.
 */

import { execSync } from 'child_process';

const BASE_URL = (process.env.RETHINK_API_URL || 'http://localhost:8787').replace(/\/$/, '');

function log(msg, ...args) {
  console.log(`[DELETE-API-VERIFY] ${msg}`, ...args);
}

function error(msg, ...args) {
  console.error(`[DELETE-API-VERIFY-ERROR] ${msg}`, ...args);
}

async function run() {
  log(`Starting deletion API verification against: ${BASE_URL}`);

  const guestToken = 'mock-token-test-guest'; // Decodes to uid: 'test-guest'
  const otherToken = 'mock-token-other-user'; // Decodes to uid: 'other-user'

  // 1. Seed test database data using wrangler D1 execute
  log('Seeding D1 database with test sessions...');
  try {
    // Delete existing test session if left over from aborted runs
    execSync(
      `npx wrangler d1 execute re-think-sessions --local --config worker/wrangler.toml --command "DELETE FROM sessions WHERE id = 'audit-session-123';"`
    );

    // Insert guest test session belonging to 'test-guest'
    execSync(
      `npx wrangler d1 execute re-think-sessions --local --config worker/wrangler.toml --command "INSERT INTO sessions (id, title, messages, current_stage, fsm_state, fsm_context, user_id, created_at, updated_at) VALUES ('audit-session-123', 'Audit Session', '[{\\"id\\": \\"msg-to-keep\\", \\"role\\": \\"user\\", \\"content\\": \\"Keep me\\"}, {\\"id\\": \\"msg-to-delete\\", \\"role\\": \\"user\\", \\"content\\": \\"Delete me\\"}]', 1, 'Onboarding', '{}', 'test-guest', 1782306484, 1782306484);"`
    );
  } catch (err) {
    error('Failed to seed D1 database. Make sure local wrangler environment is set up.');
    throw err;
  }
  log('Test data seeded successfully.');

  // 2. Try to delete guest message using other user token (403 Forbidden check)
  log('Test case: Delete message belonging to another user (should fail with 403)...');
  const deleteForbiddenRes = await fetch(`${BASE_URL}/api/chat/sessions/audit-session-123/messages/msg-to-delete`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${otherToken}`,
      'Content-Type': 'application/json',
    },
  });
  log(`Status code: ${deleteForbiddenRes.status}`);
  if (deleteForbiddenRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden, but got status ${deleteForbiddenRes.status}`);
  }
  const forbiddenData = await deleteForbiddenRes.json();
  if (!forbiddenData.error.toLowerCase().includes('forbidden')) {
    throw new Error(`Expected forbidden error message, but got: ${JSON.stringify(forbiddenData)}`);
  }
  log('403 Forbidden check PASSED.');

  // 3. Delete guest message using guest token (200 Success check)
  log('Test case: Delete message using session owner token (should succeed with 200)...');
  const deleteSuccessRes = await fetch(`${BASE_URL}/api/chat/sessions/audit-session-123/messages/msg-to-delete`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${guestToken}`,
      'Content-Type': 'application/json',
    },
  });
  log(`Status code: ${deleteSuccessRes.status}`);
  if (deleteSuccessRes.status !== 200) {
    throw new Error(`Expected 200 OK, but got status ${deleteSuccessRes.status}: ${await deleteSuccessRes.text()}`);
  }
  const successData = await deleteSuccessRes.json();
  if (!successData.success) {
    throw new Error(`Expected success flag to be true, but got: ${JSON.stringify(successData)}`);
  }
  log('200 Delete call PASSED.');

  // 4. Retrieve session and verify that the message is gone
  log('Test case: Retrieve session and assert message is deleted...');
  const getSessionRes = await fetch(`${BASE_URL}/api/auth/sessions/audit-session-123`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${guestToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (!getSessionRes.ok) {
    throw new Error(`Failed to retrieve session: ${await getSessionRes.text()}`);
  }
  const getSessionData = await getSessionRes.json();
  const messages = getSessionData.session.messages;
  log(`Remaining messages in session: ${JSON.stringify(messages)}`);
  if (messages.length !== 1) {
    throw new Error(`Expected 1 message left, but got ${messages.length}`);
  }
  if (messages[0].id !== 'msg-to-keep') {
    throw new Error(`Expected remaining message to be "msg-to-keep", but got "${messages[0].id}"`);
  }
  log('Session message list assertion PASSED.');

  // 5. Try to delete the same message again (404 Not Found check)
  log('Test case: Delete already deleted message (should fail with 404)...');
  const deleteNotFoundRes = await fetch(`${BASE_URL}/api/chat/sessions/audit-session-123/messages/msg-to-delete`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${guestToken}`,
      'Content-Type': 'application/json',
    },
  });
  log(`Status code: ${deleteNotFoundRes.status}`);
  if (deleteNotFoundRes.status !== 404) {
    throw new Error(`Expected 404 Not Found, but got status ${deleteNotFoundRes.status}`);
  }
  const notFoundData = await deleteNotFoundRes.json();
  if (!notFoundData.error.toLowerCase().includes('not found')) {
    throw new Error(`Expected not found error message, but got: ${JSON.stringify(notFoundData)}`);
  }
  log('404 Not Found check PASSED.');

  // Cleanup database
  log('Cleaning up database...');
  execSync(
    `npx wrangler d1 execute re-think-sessions --local --config worker/wrangler.toml --command "DELETE FROM sessions WHERE id = 'audit-session-123';"`
  );

  log('All message deletion API verification checks passed successfully.');
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    error(err.message || err);
    // Attempt cleanup
    try {
      execSync(
        `npx wrangler d1 execute re-think-sessions --local --config worker/wrangler.toml --command "DELETE FROM sessions WHERE id = 'audit-session-123';"`
      );
    } catch {}
    process.exit(1);
  });
