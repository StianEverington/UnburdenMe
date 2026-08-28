diff --git a/server.ts b/server.ts
index df18ab1..df18ab1 100644
--- a/server.ts
+++ b/server.ts
@@
 import emailOauthRouter from './server/email/oauth.js';
 import emailRouter from './server/email/emailRoutes.js';
 app.use('/api/email', emailOauthRouter);
 app.use('/api/email', emailRouter);
+
+// Calendar routes
+import calendarRouter from './server/calendar/calendarRoutes.js';
+app.use('/api/calendar', calendarRouter);
@@
   const oauth = await import('./server/email/oauth.js');
-      await syncAllUsers(oauth.decrypt);
+      await syncAllUsers(oauth.decrypt);
+      // also sync calendars
+      try {
+        const cal = await import('./server/calendar/syncService.js');
+        await cal.syncAllCalendars(oauth.decrypt);
+      } catch (e) {
+        console.warn('calendar sync tick failed', e);
+      }
       console.log('[email-sync] sync complete');
