import React from 'react';

export default function EmailItem({ email }: { email: any }) {
  const suggest = async () => {
    const body = JSON.stringify({ instruction: 'Respond to this message', companion_content: '', email: { from: email.from_email || '', subject: email.subject || '', body: email.body || email.snippet || '' } });
    const res = await fetch('/api/email/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const data = await res.json();
    alert('Drafts:\n' + (data.drafts || []).join('\n\n---\n\n'));
  };

  const mark = async () => {
    await fetch('/api/email/mark-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'gmail', provider_message_id: email.provider_message_id }) });
    alert('Marked action required');
  };

  return (
    <div style={{ border: '1px solid #eee', padding: 8, marginBottom: 8 }}>
      <div><strong>{email.subject || '(no subject)'}</strong></div>
      <div>From: {email.from_email}</div>
      <div>{email.snippet}</div>
      <div>
        <button onClick={suggest}>Suggest reply</button>
        <button onClick={mark}>Mark action</button>
      </div>
    </div>
  );
}
