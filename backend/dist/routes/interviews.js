"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const supabase_js_1 = require("../lib/supabase.js");
const auth_js_1 = require("../middleware/auth.js");
const index_js_1 = require("../schemas/index.js");
const interviewsRouter = new hono_1.Hono();
interviewsRouter.use('*', auth_js_1.authMiddleware);
// Get user stats (total sessions, total hours, streak, avg score)
interviewsRouter.get('/stats', async (c) => {
    const user = c.get('user');
    const token = c.get('token');
    const supabase = (0, supabase_js_1.getSupabaseClient)(token);
    const { data, error } = await supabase
        .rpc('get_user_stats', { p_user_id: user.id });
    if (error) {
        return c.json({ error: error.message }, 500);
    }
    return c.json(data);
});
// List user's interviews
interviewsRouter.get('/', async (c) => {
    const user = c.get('user');
    const token = c.get('token');
    const limitStr = c.req.query('limit') || '30';
    const limit = parseInt(limitStr, 10);
    const supabase = (0, supabase_js_1.getSupabaseClient)(token);
    const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) {
        return c.json({ error: error.message }, 500);
    }
    return c.json(data);
});
// Create new interview
interviewsRouter.post('/', async (c) => {
    const user = c.get('user');
    const token = c.get('token');
    const body = await c.req.json();
    const parseResult = index_js_1.CreateInterviewSchema.safeParse(body);
    if (!parseResult.success) {
        return c.json({ error: 'Validation failed', details: parseResult.error.format() }, 400);
    }
    const supabase = (0, supabase_js_1.getSupabaseClient)(token);
    const { data, error } = await supabase
        .from('interviews')
        .insert({
        user_id: user.id,
        ...parseResult.data,
        status: 'scheduled'
    })
        .select()
        .single();
    if (error) {
        return c.json({ error: error.message }, 500);
    }
    return c.json(data);
});
// Get single interview
interviewsRouter.get('/:id', async (c) => {
    const token = c.get('token');
    const id = c.req.param('id');
    const supabase = (0, supabase_js_1.getSupabaseClient)(token);
    const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', id)
        .single();
    if (error) {
        return c.json({ error: error.message }, 404);
    }
    return c.json(data);
});
// Update interview (e.g. status completed, scores, feedback)
interviewsRouter.patch('/:id', async (c) => {
    const token = c.get('token');
    const id = c.req.param('id');
    const body = await c.req.json();
    const supabase = (0, supabase_js_1.getSupabaseClient)(token);
    const { data, error } = await supabase
        .from('interviews')
        .update(body)
        .eq('id', id)
        .select()
        .single();
    if (error) {
        return c.json({ error: error.message }, 500);
    }
    return c.json(data);
});
// Get messages for an interview
interviewsRouter.get('/:id/messages', async (c) => {
    const token = c.get('token');
    const id = c.req.param('id');
    const supabase = (0, supabase_js_1.getSupabaseClient)(token);
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('interview_id', id)
        .order('created_at', { ascending: true });
    if (error) {
        return c.json({ error: error.message }, 500);
    }
    return c.json(data);
});
// Add message to an interview
interviewsRouter.post('/:id/messages', async (c) => {
    const token = c.get('token');
    const id = c.req.param('id');
    const body = await c.req.json();
    const parseResult = index_js_1.CreateMessageSchema.safeParse(body);
    if (!parseResult.success) {
        return c.json({ error: 'Validation failed', details: parseResult.error.format() }, 400);
    }
    const supabase = (0, supabase_js_1.getSupabaseClient)(token);
    const { data, error } = await supabase
        .from('messages')
        .insert({
        interview_id: id,
        ...parseResult.data
    })
        .select()
        .single();
    if (error) {
        return c.json({
            error: error.message || 'Failed to save message',
            code: error.code,
            details: error.details,
            hint: error.hint,
        }, 500);
    }
    return c.json(data);
});
exports.default = interviewsRouter;
