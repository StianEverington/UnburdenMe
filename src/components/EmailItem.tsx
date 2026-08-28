diff --git a/src/components/EmailItem.tsx b/src/components/EmailItem.tsx
index 0000000..0000000 100644
--- a/src/components/EmailItem.tsx
+++ b/src/components/EmailItem.tsx
@@
 import React from 'react';
 
 export default function EmailItem({ email }: { email: any }) {
   const suggest = async () => {
-    const body = JSON.stringify({ instruction: 'Respond to this message', companion_content: '', email: { from: email.from_email || '', subject: email.subject || '', body: email.body || email.snippet || '' } });
+    const tone = localStorage.getItem('unburdenme_tone') || 'Friendly';
+    const body = JSON.stringify({ instruction: 'Respond to this message', companion_content: '', email: { from: email.from_email || '', subject: email.subject || '', body: email.body || email.snippet || '' }, tone });
     const res = await fetch('/api/email/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
     const data = await res.json();
     alert('Drafts:\n' + (data.drafts || []).join('\n\n---\n\n'));
   };
