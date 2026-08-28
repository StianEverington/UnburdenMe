diff --git a/server.ts b/server.ts
index 0000000..0000000 100644
--- a/server.ts
+++ b/server.ts
@@
 import dotenv from 'dotenv';
 import { GoogleGenAI, Type } from '@google/genai';
 import { createServer as createViteServer } from 'vite';
 
 dotenv.config();
 
 const app = express();
 const PORT = 3000;
 
 app.use(express.json());
 
-// Mount email routes (OAuth + suggestion endpoints)
-import emailOauthRouter from './server/email/oauth';
-import emailRouter from './server/email/emailRoutes';
-app.use('/api/email', emailOauthRouter);
-app.use('/api/email', emailRouter);
+// Mount email routes (OAuth + suggestion endpoints)
+import emailOauthRouter from './server/email/oauth.js';
+import emailRouter from './server/email/emailRoutes.js';
+app.use('/api/email', emailOauthRouter);
+app.use('/api/email', emailRouter);
+
+// Start full sync background job
+import { syncAllUsers } from './server/email/syncService.js';
+import db from './server/db/index.js';
+
+const POLL_MINUTES = Number(process.env.EMAIL_SYNC_POLL_MINUTES || '5');
+
+function startEmailSyncJob() {
+  setInterval(async () => {
+    try {
+      console.log('[email-sync] starting sync for connected users');
+      // dynamic import decrypt fn from oauth module to avoid circular
+      const oauth = await import('./server/email/oauth.js');
+      await syncAllUsers(oauth.decrypt);
+      console.log('[email-sync] sync complete');
+    } catch (err) {
+      console.error('[email-sync] error', err);
+    }
+  }, Math.max(60, POLL_MINUTES * 60) * 1000);
+}
+
+startEmailSyncJob();
@@
 startServer();
