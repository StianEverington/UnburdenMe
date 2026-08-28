diff --git a/server.ts b/server.ts
index 0000000..0000000 100644
--- a/server.ts
+++ b/server.ts
@@
-import express, { Request, Response } from 'express';
+import express, { Request, Response } from 'express';
 import path from 'path';
 import dotenv from 'dotenv';
@@
 dotenv.config();
 
 const app = express();
 const PORT = 3000;
 
 app.use(express.json());
+// Mount email routes (OAuth + suggestion endpoints)
+import emailOauthRouter from './server/email/oauth';
+import emailRouter from './server/email/emailRoutes';
+app.use('/api/email', emailOauthRouter);
+app.use('/api/email', emailRouter);
@@
 startServer();
+
+// Basic in-process poller stub to run email sync periodically (polling-first approach)
+const POLL_MINUTES = Number(process.env.EMAIL_SYNC_POLL_MINUTES || '5');
+function startEmailPoller() {
+  setInterval(() => {
+    try {
+      console.log('[email-poller] tick - would sync connected Gmail accounts here');
+      // For the MVP we keep this as a stub. Full sync will iterate stored tokens and call Gmail APIs.
+    } catch (err) {
+      console.error('email poller error', err);
+    }
+  }, Math.max(60, POLL_MINUTES * 60) * 1000);
+}
+
+startEmailPoller();
