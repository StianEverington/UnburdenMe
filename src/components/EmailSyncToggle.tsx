import React from 'react';
import { useState, useEffect } from 'react';

export default function EmailSyncToggle({ userId = 'default' }: { userId?: string }) {
  const [status, setStatus] = useState<{ connected: boolean } | null>(null);

  useEffect(() => {
    fetch(`/api/email/status?userId=${encodeURIComponent(userId)}`).then(r => r.json()).then(setStatus).catch(() => setStatus({ connected: false }));
  }, [userId]);

  const connect = () => {
    window.location.href = `/api/email/connect?userId=${encodeURIComponent(userId)}`;
  };

  const disconnect = async () => {
    await fetch('/api/email/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
    setStatus({ connected: false });
  };

  if (!status) return <div>Loading...</div>;
  return (
    <div>
      {status.connected ? (
        <div>
          <div>Gmail connected</div>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <div>
          <div>Gmail not connected</div>
          <button onClick={connect}>Connect Gmail</button>
        </div>
      )}
    </div>
  );
}
