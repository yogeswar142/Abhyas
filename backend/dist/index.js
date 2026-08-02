"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_server_1 = require("@hono/node-server");
const hono_1 = require("hono");
const cors_1 = require("hono/cors");
const dotenv = __importStar(require("dotenv"));
const profile_js_1 = __importDefault(require("./routes/profile.js"));
const interviews_js_1 = __importDefault(require("./routes/interviews.js"));
// Load environment variables (.env file in backend root or parent directory env fallback)
dotenv.config();
const app = new hono_1.Hono();
// Configure CORS for frontend access
app.use('*', (0, cors_1.cors)({
    origin: '*', // Dynamic domain binding recommended in production
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: false, // Bearer tokens; avoid invalid ACAO:* + credentials combo
}));
// Base healthz check
app.get('/healthz', (c) => c.text('OK', 200));
// Register routes
app.route('/api/profile', profile_js_1.default);
app.route('/api/interviews', interviews_js_1.default);
// Start Node HTTP Server
const port = parseInt(process.env.PORT || '4000', 10);
console.log(`Starting Abhyas Backend server on port ${port}...`);
(0, node_server_1.serve)({
    fetch: app.fetch,
    port
}, (info) => {
    console.log(`Server is listening on http://localhost:${info.port}`);
});
