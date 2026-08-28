diff --git a/server.ts b/server.ts
index a41403a3..a41403a3 100644
--- a/server.ts
+++ b/server.ts
@@
-import calendarRouter from './server/calendar/calendarRoutes.js';
-app.use('/api/calendar', calendarRouter);
+import calendarRouter from './server/calendar/calendarRoutes.js';
+app.use('/api/calendar', calendarRouter);
@@
-      try {
-        const cal = await import('./server/calendar/syncService.js');
-        await cal.syncAllCalendars(oauth.decrypt);
-      } catch (e) {
-        console.warn('calendar sync tick failed', e);
-      }
+      try {
+        const cal = await import('./server/calendar/syncService.js');
+        await cal.syncAllCalendars(oauth.decrypt);
+      } catch (e) {
+        console.warn('calendar sync tick failed', e);
+      }
       console.log('[email-sync] sync complete');
