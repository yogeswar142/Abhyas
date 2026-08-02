"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const supabase_js_1 = require("../lib/supabase.js");
const auth_js_1 = require("../middleware/auth.js");
const index_js_1 = require("../schemas/index.js");
const profileRouter = new hono_1.Hono();
profileRouter.use('*', auth_js_1.authMiddleware);
profileRouter.get('/', async (c) => {
    const user = c.get('user');
    const token = c.get('token');
    const supabase = (0, supabase_js_1.getSupabaseClient)(token);
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
    const parseResult = index_js_1.UpdateProfileSchema.safeParse(body);
    if (!parseResult.success) {
        return c.json({ error: 'Validation failed', details: parseResult.error.format() }, 400);
    }
    const supabase = (0, supabase_js_1.getSupabaseClient)(token);
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
exports.default = profileRouter;
