import { MiddlewareHandler } from 'hono';
import { getSupabaseClient } from '../lib/supabase.js';
import type { User } from '@supabase/supabase-js';

export interface AuthContextVariables {
  user: User;
  token: string;
}

export const authMiddleware: MiddlewareHandler<{ Variables: AuthContextVariables }> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or invalid token format' }, 401);
  }

  const token = authHeader.split(' ')[1];
  const supabase = getSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return c.json({ error: 'Unauthorized: Invalid session or expired token' }, 401);
  }

  c.set('user', user);
  c.set('token', token);

  await next();
};
