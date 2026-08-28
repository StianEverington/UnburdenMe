diff --git a/src/components/CalendarSyncToggle.tsx b/src/components/CalendarSyncToggle.tsx
index 0000000..0000000 100644
--- a/src/components/CalendarSyncToggle.tsx
+++ b/src/components/CalendarSyncToggle.tsx
@@
 import React from 'react';
 import { useState, useEffect } from 'react';
 
 export default function CalendarSyncToggle({ userId = 'default' }: { userId?: string }) {
@@
   const syncNow = async () => {
     await fetch('/api/calendar/sync-now', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
     alert('Sync started — check Calendar list shortly.');
   };
+
+  const openPicker = () => {
+    // simple navigation to a route, assume app has a place for /calendar-picker
+    window.location.href = '/calendar-picker';
+  };
@@
       {status.connected ? (
         <div>
           <div>Calendar connected</div>
           <button onClick={syncNow}>Sync now</button>
+          <button onClick={openPicker}>Choose calendars</button>
         </div>
       ) : (
         <div>
           <div>Calendar not connected</div>
           <button onClick={connect}>Connect Google Calendar</button>
+          <div style={{ marginTop: 8 }}>After connecting you can choose which calendars to sync via "Choose calendars".</div>
         </div>
       )}
     </div>
   );
 }
