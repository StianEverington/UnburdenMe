diff --git a/src/components/EmailSyncToggle.tsx b/src/components/EmailSyncToggle.tsx
index 0000000..0000000 100644
--- a/src/components/EmailSyncToggle.tsx
+++ b/src/components/EmailSyncToggle.tsx
@@
-import React from 'react';
-import { useState, useEffect } from 'react';
-
-export default function EmailSyncToggle({ userId = 'default' }: { userId?: string }) {
-  const [status, setStatus] = useState<{ connected: boolean } | null>(null);
-
-  useEffect(() => {
-    fetch(`/api/email/status?userId=${encodeURIComponent(userId)}`).then(r => r.json()).then(setStatus).catch(() => setStatus({ connected: false }));
-  }, [userId]);
-
-  const connect = () => {
-    window.location.href = `/api/email/connect?userId=${encodeURIComponent(userId)}`;
-  };
-
-  const disconnect = async () => {
-    await fetch('/api/email/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
-    setStatus({ connected: false });
-  };
-
-  if (!status) return <div>Loading...</div>;
-  return (
-    <div>
-      {status.connected ? (
-        <div>
-          <div>Gmail connected</div>
-          <button onClick={disconnect}>Disconnect</button>
-        </div>
-      ) : (
-        <div>
-          <div>Gmail not connected</div>
-          <button onClick={connect}>Connect Gmail</button>
-        </div>
-      )}
-    </div>
-  );
-}
+import React from 'react';
+import { useState, useEffect } from 'react';
+import ToneSelector from './ToneSelector';
+
+export default function EmailSyncToggle({ userId = 'default' }: { userId?: string }) {
+  const [status, setStatus] = useState<{ connected: boolean } | null>(null);
+
+  useEffect(() => {
+    fetch(`/api/email/status?userId=${encodeURIComponent(userId)}`).then(r => r.json()).then(setStatus).catch(() => setStatus({ connected: false }));
+  }, [userId]);
+
+  const connect = () => {
+    window.location.href = `/api/email/connect?userId=${encodeURIComponent(userId)}`;
+  };
+
+  const disconnect = async () => {
+    await fetch('/api/email/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
+    setStatus({ connected: false });
+  };
+
+  if (!status) return <div>Loading...</div>;
+  return (
+    <div>
+      {status.connected ? (
+        <div>
+          <div>Gmail connected</div>
+          <button onClick={disconnect}>Disconnect</button>
+          <ToneSelector />
+        </div>
+      ) : (
+        <div>
+          <div>Gmail not connected</div>
+          <button onClick={connect}>Connect Gmail</button>
+          <ToneSelector />
+        </div>
+      )}
+    </div>
+  );
+}
