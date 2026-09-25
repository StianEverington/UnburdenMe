// Vercel Serverless Function entry point.
//
// Vercel automatically turns any file inside /api into a serverless function.
// This file re-exports the existing Express app (defined in server.ts, at the
// project root) so Vercel can call it directly per-request, instead of
// running it as a persistent server.
//
// vercel.json's rewrite rule sends every request under /api/* here, and
// Express's own internal routes (app.post('/api/triage/full', ...) etc.,
// defined in server.ts) handle matching the exact path from there.
export { default } from '../server';
