import { Hono } from 'hono';
import { HonoSchema } from '../types';

const adminRouter = new Hono<HonoSchema>();

// Inline middleware to check admin token
adminRouter.use('*', async (c, next) => {
  const adminToken = c.env.ADMIN_SECRET_TOKEN;
  if (!adminToken) {
    return c.json({ error: 'Admin token not configured on server' }, 500);
  }

  const providedToken = c.req.header('x-admin-token');
  if (providedToken !== adminToken) {
    return c.json({ error: 'Unauthorized: Invalid admin token' }, 401);
  }

  await next();
});

// GET /api/admin/invitations - List all invitation codes
adminRouter.get('/invitations', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM invitation_codes ORDER BY created_at DESC'
    ).all();
    return c.json({ codes: results });
  } catch (error: any) {
    console.error('Error fetching invitations:', error);
    return c.json({ error: 'Failed to fetch invitation codes' }, 500);
  }
});

// POST /api/admin/invitations - Create a new invitation code
adminRouter.post('/invitations', async (c) => {
  try {
    const body = await c.req.json();
    const code = body.code || crypto.randomUUID().split('-')[0].toUpperCase(); // Default to random 8-char code
    const maxUses = body.maxUses || 1;

    await c.env.DB.prepare(
      'INSERT INTO invitation_codes (code, max_uses, uses) VALUES (?, ?, 0)'
    ).bind(code, maxUses).run();

    return c.json({ success: true, code, max_uses: maxUses, uses: 0 });
  } catch (error: any) {
    console.error('Error creating invitation:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Code already exists' }, 400);
    }
    return c.json({ error: 'Failed to create invitation code' }, 500);
  }
});

// PUT /api/admin/invitations/:code - Update max_uses
adminRouter.put('/invitations/:code', async (c) => {
  try {
    const code = c.req.param('code');
    const body = await c.req.json();
    const maxUses = body.maxUses;

    if (typeof maxUses !== 'number') {
      return c.json({ error: 'maxUses must be a number' }, 400);
    }

    const { success } = await c.env.DB.prepare(
      'UPDATE invitation_codes SET max_uses = ? WHERE code = ?'
    ).bind(maxUses, code).run();

    if (!success) {
      return c.json({ error: 'Failed to update code' }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error updating invitation:', error);
    return c.json({ error: 'Failed to update invitation code' }, 500);
  }
});

// DELETE /api/admin/invitations/:code - Delete an invitation code
adminRouter.delete('/invitations/:code', async (c) => {
  try {
    const code = c.req.param('code');

    const { success } = await c.env.DB.prepare(
      'DELETE FROM invitation_codes WHERE code = ?'
    ).bind(code).run();

    if (!success) {
      return c.json({ error: 'Failed to delete code' }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting invitation:', error);
    return c.json({ error: 'Failed to delete invitation code' }, 500);
  }
});

export { adminRouter };
