import { Hono } from 'hono';
import { requireAuth } from '../lib/auth-utils';
import type { Env, AuthUser, HonoSchema } from '../types';

export const authRouter = new Hono<HonoSchema>();

/**
 * Helper to verify Cloudflare Turnstile CAPTCHA response
 */
async function verifyTurnstile(token: string, secretKey: string, ip?: string): Promise<boolean> {
  // Standard testing key defaults to always pass
  if (secretKey === '1x00000000000000000000000000000000' || !token) {
    return true;
  }

  try {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) {
      formData.append('remoteip', ip);
    }

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      body: formData,
      method: 'POST',
    });

    const outcome = await result.json() as any;
    return !!outcome.success;
  } catch (e) {
    console.error('Turnstile siteverify fetch failed:', e);
    return false;
  }
}

/**
 * Register User
 * POST /api/auth/register
 */
authRouter.post('/register', async (c) => {
  try {
    const { username, password, invitationCode, turnstileToken } = await c.req.json<any>();

    if (!username || !password || !invitationCode) {
      return c.json({ error: 'Username, password and invitation code are required' }, 400);
    }

    if (username.length < 3) {
      return c.json({ error: 'Username must be at least 3 characters long' }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters long' }, 400);
    }

    // 1. Verify Turnstile Captcha
    const clientIp = c.req.header('cf-connecting-ip');
    const isHuman = await verifyTurnstile(turnstileToken, c.env.TURNSTILE_SECRET_KEY, clientIp);
    if (!isHuman) {
      return c.json({ error: 'Captcha verification failed. Please try again.' }, 400);
    }

    // 2. Validate Invitation Code in D1
    const invite = await c.env.DB.prepare('SELECT * FROM invitation_codes WHERE code = ?')
      .bind(invitationCode)
      .first<any>();

    if (!invite) {
      return c.json({ error: 'Invalid invitation code' }, 400);
    }

    if (invite.used_count >= invite.max_uses) {
      return c.json({ error: 'Invitation code has reached its maximum usage limit' }, 400);
    }

    const email = `${username}@rethink.local`;

    // 3. Create User in Firebase Auth
    let idToken = `mock-token-${username}`;
    let localId = username;

    if (c.env.FIREBASE_API_KEY && c.env.FIREBASE_API_KEY !== 'mock_firebase_key_for_testing') {
      const fbUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${c.env.FIREBASE_API_KEY}`;
      const response = await fetch(fbUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        })
      });

      const fbData = await response.json() as any;
      if (!response.ok || fbData.error) {
        const errMsg = fbData.error?.message || 'Firebase Registration Failed';
        console.error('Firebase error:', fbData.error);
        return c.json({ error: errMsg }, response.status as any);
      }

      idToken = fbData.idToken;
      localId = fbData.localId;
    } else {
      console.log(`[Mock Auth] Successfully registered mock user: ${username}`);
    }

    // 4. Update Invitation Code Usage in D1
    await c.env.DB.prepare('UPDATE invitation_codes SET used_count = used_count + 1 WHERE code = ?')
      .bind(invitationCode)
      .run();

    return c.json({
      success: true,
      user: {
        uid: localId,
        username,
        email,
      },
      token: idToken
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return c.json({ error: err.message || 'Registration failed' }, 500);
  }
});

/**
 * Login User
 * POST /api/auth/login
 */
authRouter.post('/login', async (c) => {
  try {
    const { username, password, turnstileToken } = await c.req.json<any>();

    if (!username || !password) {
      return c.json({ error: 'Username and password are required' }, 400);
    }

    // 1. Verify Turnstile Captcha
    const clientIp = c.req.header('cf-connecting-ip');
    const isHuman = await verifyTurnstile(turnstileToken, c.env.TURNSTILE_SECRET_KEY, clientIp);
    if (!isHuman) {
      return c.json({ error: 'Captcha verification failed. Please try again.' }, 400);
    }

    const email = `${username}@rethink.local`;

    // 2. Authenticate with Firebase
    let idToken = `mock-token-${username}`;
    let localId = username;

    if (c.env.FIREBASE_API_KEY && c.env.FIREBASE_API_KEY !== 'mock_firebase_key_for_testing') {
      const fbUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${c.env.FIREBASE_API_KEY}`;
      const response = await fetch(fbUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        })
      });

      const fbData = await response.json() as any;
      if (!response.ok || fbData.error) {
        const errMsg = fbData.error?.message || 'Invalid username or password';
        console.error('Firebase Login error:', fbData.error);
        return c.json({ error: errMsg }, response.status as any);
      }

      idToken = fbData.idToken;
      localId = fbData.localId;
    } else {
      // Mock validation
      if (password.length < 6) {
        return c.json({ error: 'Invalid password strength' }, 400);
      }
      console.log(`[Mock Auth] Successfully logged in mock user: ${username}`);
    }

    return c.json({
      success: true,
      user: {
        uid: localId,
        username,
        email,
      },
      token: idToken
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return c.json({ error: err.message || 'Login failed' }, 500);
  }
});

/**
 * Test Account Login
 * POST /api/auth/test-login
 */
authRouter.post('/test-login', async (c) => {
  try {
    const username = 'test_guest';
    const email = 'test_guest@rethink.local';
    const localId = 'test_guest_fixed_uid';
    const idToken = 'mock-token-test-guest';

    return c.json({
      success: true,
      user: {
        uid: localId,
        username,
        email,
      },
      token: idToken
    });
  } catch (err: any) {
    console.error('Test Login error:', err);
    return c.json({ error: err.message || 'Test Login failed' }, 500);
  }
});

/**
 * Bind Anonymous Session to Account
 * POST /api/auth/bind-session
 */
authRouter.post('/bind-session', requireAuth, async (c) => {
  try {
    const user = c.get('user') as AuthUser;
    const { sessionId } = await c.req.json<any>();

    if (!sessionId) {
      return c.json({ error: 'sessionId is required' }, 400);
    }

    // Check if session exists
    const session = await c.env.DB.prepare('SELECT id, user_id FROM sessions WHERE id = ?')
      .bind(sessionId)
      .first<any>();

    if (!session) {
      // Create empty session shell for this user
      await c.env.DB.prepare(
        'INSERT INTO sessions (id, title, messages, current_stage, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())'
      )
      .bind(sessionId, '新对话', '[]', 1, user.uid)
      .run();

      return c.json({ success: true, message: 'Session placeholder created and bound' });
    }

    if (session.user_id && session.user_id !== user.uid) {
      return c.json({ error: 'Session belongs to another user' }, 403);
    }

    // Bind anonymous session (where user_id is null/empty) to this logged in user
    if (!session.user_id) {
      await c.env.DB.prepare('UPDATE sessions SET user_id = ?, updated_at = unixepoch() WHERE id = ?')
        .bind(user.uid, sessionId)
        .run();
      return c.json({ success: true, message: 'Session successfully bound to account' });
    }

    return c.json({ success: true, message: 'Session was already bound' });
  } catch (err: any) {
    console.error('Bind session error:', err);
    return c.json({ error: err.message }, 500);
  }
});

/**
 * List Sessions for current User
 * GET /api/auth/sessions
 */
authRouter.get('/sessions', requireAuth, async (c) => {
  try {
    const user = c.get('user') as AuthUser;

    const { results } = await c.env.DB.prepare(
      'SELECT id, title, current_stage, fsm_state, created_at, updated_at FROM sessions WHERE user_id = ? ORDER BY updated_at DESC'
    )
    .bind(user.uid)
    .all<any>();

    return c.json({
      success: true,
      sessions: results
    });
  } catch (err: any) {
    console.error('Fetch user sessions error:', err);
    return c.json({ error: err.message }, 500);
  }
});

/**
 * Get a single session with messages for current User
 * GET /api/auth/sessions/:id
 */
authRouter.get('/sessions/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user') as AuthUser;
    const sessionId = c.req.param('id');

    const session = await c.env.DB.prepare(
      'SELECT id, title, messages, current_stage, fsm_state, fsm_context, created_at, updated_at FROM sessions WHERE id = ? AND user_id = ?'
    )
      .bind(sessionId, user.uid)
      .first<any>();

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    let messages = [];
    try {
      messages = JSON.parse(session.messages || '[]');
    } catch {
      messages = [];
    }

    let fsmContext = {};
    try {
      fsmContext = JSON.parse(session.fsm_context || '{}');
    } catch {
      fsmContext = {};
    }

    return c.json({
      success: true,
      session: {
        ...session,
        messages,
        fsm_context: fsmContext,
      },
    });
  } catch (err: any) {
    console.error('Fetch session detail error:', err);
    return c.json({ error: err.message }, 500);
  }
});
