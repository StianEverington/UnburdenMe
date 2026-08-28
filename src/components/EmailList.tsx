import React, { useEffect, useState } from 'react';
import EmailItem from './EmailItem';

export default function EmailList({ userId = 'default' }: { userId?: string }) {
  const [emails, setEmails] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/email/emails?userId=${encodeURIComponent(userId)}`).then(r => r.json()).then(d => setEmails(d.emails || []));
  }, [userId]);

  return (
    <div>
      <h3>Synced Inbox</h3>
      {emails.length === 0 && <div>No synced emails yet.</div>}
      <ul>
        {emails.map(e => (
          <li key={e.id}><EmailItem email={e} /></li>
        ))}
      </ul>
    </div>
  );
}
