import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import * as dotenv from 'dotenv';
import profileRouter from './routes/profile.js';
import interviewsRouter from './routes/interviews.js';

// Load environment variables (.env file in backend root or parent directory env fallback)
dotenv.config();

const app = new Hono();

// Configure CORS for frontend access
app.use('*', cors({
  origin: '*', // Dynamic domain binding recommended in production
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: false, // Bearer tokens; avoid invalid ACAO:* + credentials combo
}));

// Base healthz check
app.get('/healthz', (c) => c.text('OK', 200));

app.onError((err, c) => {
  console.error('Unhandled Backend Error:', err);
  return c.json({ error: err.message || 'Internal Server Error' }, 500);
});

// Register routes
app.route('/api/profile', profileRouter);
app.route('/api/interviews', interviewsRouter);

// Start Node HTTP Server
const port = parseInt(process.env.PORT || '4000', 10);
console.log(`Starting Abhyas Backend server on port ${port}...`);

serve({
  fetch: app.fetch,
  port
}, (info) => {
  console.log(`Server is listening on http://localhost:${info.port}`);
});
