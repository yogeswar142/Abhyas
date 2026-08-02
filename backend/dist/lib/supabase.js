"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseClient = getSupabaseClient;
const supabase_js_1 = require("@supabase/supabase-js");
function getSupabaseClient(jwtToken) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (jwtToken) {
        return (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${jwtToken}`
                }
            },
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        });
    }
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
}
