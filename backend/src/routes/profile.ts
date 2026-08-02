import { Hono } from 'hono';
import { getSupabaseClient } from '../lib/supabase.js';
import { authMiddleware, AuthContextVariables } from '../middleware/auth.js';
import { UpdateProfileSchema } from '../schemas/index.js';

const profileRouter = new Hono<{ Variables: AuthContextVariables }>();

profileRouter.use('*', authMiddleware);

profileRouter.get('/', async (c) => {
  const user = c.get('user');
  const token = c.get('token');
  const supabase = getSupabaseClient(token);

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data);
});

profileRouter.patch('/', async (c) => {
  const user = c.get('user');
  const token = c.get('token');
  const body = await c.req.json();
  
  const parseResult = UpdateProfileSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: 'Validation failed', details: parseResult.error.format() }, 400);
  }

  const supabase = getSupabaseClient(token);
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      ...parseResult.data,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json(data);
});

export default profileRouter;
