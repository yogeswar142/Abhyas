"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const supabase_js_1 = require("../lib/supabase.js");
const authMiddleware = async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized: Missing or invalid token format' }, 401);
    }
    const token = authHeader.split(' ')[1];
    const supabase = (0, supabase_js_1.getSupabaseClient)();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        return c.json({ error: 'Unauthorized: Invalid session or expired token' }, 401);
    }
    c.set('user', user);
    c.set('token', token);
    await next();
};
exports.authMiddleware = authMiddleware;
