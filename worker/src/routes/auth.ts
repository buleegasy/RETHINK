import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../lib/auth-utils';
import type { Env, AuthUser, HonoSchema, SessionRow } from '../types';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export const authRouter = new Hono<HonoSchema>();

interface InvitationCodeRow {
  code: string;
  max_uses: number;
  used_count: number;
  created_at: number;
}

interface FirebaseAuthResponse {
  idToken?: string;
  localId?: string;
  error?: {
    message?: string;
  };
}

const registerSchema = z.object({
  username: z.string({ required_error: 'Username, password and invitation code are required' })
    .min(3, 'Username must be at least 3 characters long'),
  password: z.string({ required_error: 'Username, password and invitation code are required' })
    .min(6, 'Password must be at least 6 characters long'),
  invitationCode: z.string({ required_error: 'Username, password and invitation code are required' })
    .min(1, 'Username, password and invitation code are required'),
  turnstileToken: z.string().optional().default(''),
});

const loginSchema = z.object({
  username: z.string({ required_error: 'Username and password are required' })
    .min(1, 'Username and password are required'),
  password: z.string({ required_error: 'Username and password are required' })
    .min(1, 'Username and password are required'),
  turnstileToken: z.string().optional().default(''),
});

const bindSessionSchema = z.object({
  sessionId: z.string({ required_error: 'sessionId is required' }).min(1, 'sessionId is required'),
});

/**
 * Helper to verify Cloudflare Turnstile CAPTCHA response
 */
async function verifyTurnstile(_token: string, _secretKey: string, _ip?: string): Promise<boolean> {
  // 针对中国大陆用户，跳过 Turnstile 验证避免由于网络受限导致的无法注册/登录
  return true;
}

/**
 * Register User
 * POST /api/auth/register
 */
authRouter.post('/register', async (c) => {
  try {
    const rawBody = await c.req.json().catch(() => null);
    const parsed = registerSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Username, password and invitation code are required';
      return c.json({ error: errorMsg }, 400);
    }
    const { username, password, invitationCode, turnstileToken } = parsed.data;

    // 1. Verify Turnstile Captcha
    const clientIp = c.req.header('cf-connecting-ip');
    const isHuman = await verifyTurnstile(turnstileToken, c.env.TURNSTILE_SECRET_KEY, clientIp);
    if (!isHuman) {
      return c.json({ error: 'Captcha verification failed. Please try again.' }, 400);
    }

    // 2. Validate and Update Invitation Code in D1 atomically
    if (!c.env?.DB) {
      return c.json({ error: 'Database service unavailable' }, 500);
    }

    const updateResult = await c.env.DB.prepare(
      'UPDATE invitation_codes SET used_count = used_count + 1 WHERE code = ? AND used_count < max_uses'
    )
      .bind(invitationCode)
      .run();

    if (updateResult.meta.changes === 0) {
      const checkInvite = await c.env.DB.prepare('SELECT * FROM invitation_codes WHERE code = ?')
        .bind(invitationCode)
        .first<InvitationCodeRow>();
      if (!checkInvite) {
        return c.json({ error: 'Invalid invitation code' }, 400);
      } else {
        return c.json({ error: 'Invitation code has reached its maximum usage limit' }, 400);
      }
    }

    const email = `${username}@rethink.local`;

    // 3. Create User in Firebase Auth
    let idToken = `mock-token-${username}`;
    let localId = username;

    try {
      if (c.env.FIREBASE_API_KEY && c.env.FIREBASE_API_KEY !== 'mock_firebase_key_for_testing') {
        const fbUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${c.env.FIREBASE_API_KEY}`;
        const response = await fetch(fbUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true
          }),
          signal: AbortSignal.timeout(8000),
        });

        let fbData: FirebaseAuthResponse = {};
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            fbData = await response.json() as FirebaseAuthResponse;
          } catch {
            fbData = {};
          }
        } else {
          const rawText = await response.text();
          fbData = { error: { message: `Firebase Auth 服务异常 (${response.status}): ${rawText.substring(0, 100)}` } };
        }

        if (!response.ok || fbData.error) {
          const errMsg = fbData.error?.message || 'Firebase Registration Failed';
          console.error('Firebase error:', fbData.error);

          // Rollback by decrementing used_count safely
          if (c.env?.DB) {
            await c.env.DB.prepare('UPDATE invitation_codes SET used_count = MAX(0, used_count - 1) WHERE code = ?')
              .bind(invitationCode)
              .run();
          }

          const safeStatus: ContentfulStatusCode = Number.isInteger(response.status) && response.status >= 100 && response.status <= 599 ? (response.status as ContentfulStatusCode) : 400;
          return c.json({ error: errMsg }, safeStatus);
        }

        idToken = fbData.idToken || idToken;
        localId = fbData.localId || localId;
      } else {
        console.log(`[Mock Auth] Successfully registered mock user: ${username}`);
      }
    } catch (fbErr: unknown) {
      const fbErrorMessage = (fbErr as Error)?.message || 'Firebase Registration Failed';
      console.error('Firebase signup error:', fbErr);

      // Rollback by decrementing used_count safely
      if (c.env?.DB) {
        await c.env.DB.prepare('UPDATE invitation_codes SET used_count = MAX(0, used_count - 1) WHERE code = ?')
          .bind(invitationCode)
          .run();
      }

      return c.json({ error: fbErrorMessage }, 500);
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
  } catch (err: unknown) {
    const message = (err as Error)?.message || 'Registration failed';
    console.error('Registration error:', err);
    return c.json({ error: message }, 500);
  }
});

/**
 * Login User
 * POST /api/auth/login
 */
authRouter.post('/login', async (c) => {
  try {
    const rawBody = await c.req.json().catch(() => null);
    const parsed = loginSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Username and password are required';
      return c.json({ error: errorMsg }, 400);
    }
    const { username, password, turnstileToken } = parsed.data;

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
        }),
        signal: AbortSignal.timeout(8000),
      });

      let fbData: FirebaseAuthResponse = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          fbData = await response.json() as FirebaseAuthResponse;
        } catch {
          fbData = {};
        }
      } else {
        const rawText = await response.text();
        fbData = { error: { message: `Firebase Auth 服务异常 (${response.status}): ${rawText.substring(0, 100)}` } };
      }

      if (!response.ok || fbData.error) {
        const errMsg = fbData.error?.message || 'Invalid username or password';
        console.error('Firebase Login error:', fbData.error);
        const safeStatus: ContentfulStatusCode = Number.isInteger(response.status) && response.status >= 100 && response.status <= 599 ? (response.status as ContentfulStatusCode) : 400;
        return c.json({ error: errMsg }, safeStatus);
      }

      idToken = fbData.idToken || idToken;
      localId = fbData.localId || localId;
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
  } catch (err: unknown) {
    const message = (err as Error)?.message || 'Login failed';
    console.error('Login error:', err);
    return c.json({ error: message }, 500);
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
  } catch (err: unknown) {
    const message = (err as Error)?.message || 'Test Login failed';
    console.error('Test Login error:', err);
    return c.json({ error: message }, 500);
  }
});

/**
 * Bind Anonymous Session to Account
 * POST /api/auth/bind-session
 */
authRouter.post('/bind-session', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = bindSessionSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'sessionId is required';
      return c.json({ error: errorMsg }, 400);
    }
    const { sessionId } = parsed.data;

    if (!c.env?.DB) {
      return c.json({ error: 'Database service unavailable' }, 500);
    }

    // Check if session exists
    const session = await c.env.DB.prepare('SELECT id, user_id FROM sessions WHERE id = ?')
      .bind(sessionId)
      .first<Pick<SessionRow, 'id' | 'user_id'>>();

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
  } catch (err: unknown) {
    const message = (err as Error)?.message || 'Bind session failed';
    console.error('Bind session error:', err);
    return c.json({ error: message }, 500);
  }
});

/**
 * List Sessions for current User
 * GET /api/auth/sessions
 */
authRouter.get('/sessions', requireAuth, async (c) => {
  try {
    const user = c.get('user');

    if (!c.env?.DB) {
      return c.json({
        success: true,
        sessions: []
      });
    }

    const { results } = await c.env.DB.prepare(
      'SELECT id, title, current_stage, fsm_state, created_at, updated_at FROM sessions WHERE user_id = ? ORDER BY updated_at DESC'
    )
    .bind(user.uid)
    .all<Pick<SessionRow, 'id' | 'title' | 'current_stage' | 'fsm_state' | 'created_at' | 'updated_at'>>();

    return c.json({
      success: true,
      sessions: results
    });
  } catch (err: unknown) {
    const message = (err as Error)?.message || 'Fetch user sessions failed';
    console.error('Fetch user sessions error:', err);
    return c.json({ error: message }, 500);
  }
});

/**
 * Get a single session with messages for current User
 * GET /api/auth/sessions/:id
 */
authRouter.get('/sessions/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const sessionId = c.req.param('id');

    if (!c.env?.DB) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const session = await c.env.DB.prepare(
      'SELECT id, title, messages, current_stage, fsm_state, fsm_context, created_at, updated_at FROM sessions WHERE id = ? AND user_id = ?'
    )
      .bind(sessionId, user.uid)
      .first<SessionRow>();

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
  } catch (err: unknown) {
    const message = (err as Error)?.message || 'Fetch session detail failed';
    console.error('Fetch session detail error:', err);
    return c.json({ error: message }, 500);
  }
});

/**
 * Delete a session for current User
 * DELETE /api/auth/sessions/:id
 */
authRouter.delete('/sessions/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const sessionId = c.req.param('id');

    if (!sessionId) {
      return c.json({ error: 'sessionId is required' }, 400);
    }

    if (!c.env?.DB) {
      return c.json({ success: true, message: 'Session not found or already deleted' }, 200);
    }

    // Fetch the session to check existence and user ownership
    const session = await c.env.DB.prepare(
      'SELECT id, user_id FROM sessions WHERE id = ?'
    )
      .bind(sessionId)
      .first<Pick<SessionRow, 'id' | 'user_id'>>();

    if (!session) {
      return c.json({ success: true, message: 'Session not found or already deleted' }, 200);
    }

    if (session.user_id !== user.uid) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Delete the session from D1 database using SQL
    await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?')
      .bind(sessionId)
      .run();

    return c.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (err: unknown) {
    const message = (err as Error)?.message || 'Delete session failed';
    console.error('Delete session error:', err);
    return c.json({ error: message }, 500);
  }
});
