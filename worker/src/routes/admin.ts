import { Hono } from 'hono';
import { z } from 'zod';
import type { HonoSchema } from '../types';

interface InvitationCodeRow {
  code: string;
  max_uses: number;
  used_count: number;
  created_at?: number;
}

const createInvitationSchema = z.object({
  code: z.string().optional(),
  maxUses: z.number().int().positive().optional().default(1),
});

const updateInvitationSchema = z.object({
  maxUses: z.number({ required_error: 'maxUses must be a number' }),
});

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
    ).all<InvitationCodeRow>();
    return c.json({ codes: results });
  } catch (error: unknown) {
    console.error('Error fetching invitations:', error);
    return c.json({ error: 'Failed to fetch invitation codes' }, 500);
  }
});

// POST /api/admin/invitations - Create a new invitation code
adminRouter.post('/invitations', async (c) => {
  try {
    const rawBody = await c.req.json().catch(() => ({}));
    const parsed = createInvitationSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Invalid input';
      return c.json({ error: errorMsg }, 400);
    }

    const code = parsed.data.code || crypto.randomUUID().split('-')[0].toUpperCase(); // Default to random 8-char code
    const maxUses = parsed.data.maxUses;

    await c.env.DB.prepare(
      'INSERT INTO invitation_codes (code, max_uses, used_count) VALUES (?, ?, 0)'
    ).bind(code, maxUses).run();

    return c.json({ success: true, code, max_uses: maxUses, uses: 0 });
  } catch (error: unknown) {
    console.error('Error creating invitation:', error);
    const msg = (error as Error)?.message || '';
    if (msg.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Code already exists' }, 400);
    }
    return c.json({ error: 'Failed to create invitation code' }, 500);
  }
});

// PUT /api/admin/invitations/:code - Update max_uses
adminRouter.put('/invitations/:code', async (c) => {
  try {
    const code = c.req.param('code');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = updateInvitationSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'maxUses must be a number';
      return c.json({ error: errorMsg }, 400);
    }
    const { maxUses } = parsed.data;

    const { success } = await c.env.DB.prepare(
      'UPDATE invitation_codes SET max_uses = ? WHERE code = ?'
    ).bind(maxUses, code).run();

    if (!success) {
      return c.json({ error: 'Failed to update code' }, 500);
    }

    return c.json({ success: true });
  } catch (error: unknown) {
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
  } catch (error: unknown) {
    console.error('Error deleting invitation:', error);
    return c.json({ error: 'Failed to delete invitation code' }, 500);
  }
});

export { adminRouter };
