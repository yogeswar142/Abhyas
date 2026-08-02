# Abhyas Backend Engineering Rules

Engineering rules for the stateless, lightweight Hono backend of the Abhyas platform.
All modifications, additions, and integrations in `/backend` must adhere to these standards.

---

## 🚀 Free-Tier Optimization (Render / Railway)

Because this backend will be hosted on resource-constrained free servers (typically 512MB RAM, shared CPU, idle sleep):

1. **Lightweight Runtime**: Avoid heavy frameworks, caches, or large dependencies. Keep Hono lean.
2. **Minimal Database Connection Pool**: Avoid persistent connections. Limit max connections in pool configs to `1` or `2` to prevent database connection exhaustion on Supabase Free Tier.
3. **Stateless Operations**: Never store state, session variables, or caches in memory. Every endpoint must be stateless.
4. **Instant Health Checks**: Expose a GET `/healthz` endpoint that returns immediately with a `200 OK` status to allow hosting platform pings to wake up/verify the server without hitches.

---

## 🔒 Security & Boundary Validation

1. **JWT Verification**: Every protected endpoint (`/api/...`) must authenticate the user via the `Authorization: Bearer <JWT>` token issued by Supabase Auth. Use a common middleware or utility helper.
2. **Zod Validation**: Validate all incoming query params, path variables, and request body payloads using Zod schemas at the router boundary before executing business or database logic.
3. **Internal Errors**: Catch database errors and log them internally, returning clean, obfuscated errors to the client. Never expose raw SQL errors to users.

---

## 📁 Folder Structure

```
backend/
  src/
    index.ts         # Server entrypoint and Hono configuration
    middleware/      # Authentication and error handler middleware
    routes/          # Route handlers (profile, interviews, etc.)
    schemas/         # Zod schemas for input validation
    lib/             # Supabase clients and helper utilities
  package.json
  tsconfig.json
```
