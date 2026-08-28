import React from 'react';
import { useState, useEffect } from 'react';

export default function CalendarSyncToggle({ userId = 'default' }: { userId?: string }) {
  const [status, setStatus] = useState<{ connected: boolean } | null>(null);

  useEffect(() => {
    fetch(`/api/email/status?userId=${encodeURIComponent(userId)}`).then(r => r.json()).then(setStatus).catch(() => setStatus({ connected: false }));
  }, [userId]);

  const connect = () => {
    // reuse email connect since scopes include calendar
    window.location.href = `/api/email/connect?userId=${encodeURIComponent(userId)}`;
  };

  const syncNow = async () => {
    await fetch('/api/calendar/sync-now', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
    alert('Sync started — check Calendar list shortly.');
  };

  if (!status) return <div>Loading...</div>;
  return (
    <div>
      {status.connected ? (
        <div>
          <div>Calendar connected</div>
          <button onClick={syncNow}>Sync now</button>
        </div>
      ) : (
        <div>
          <div>Calendar not connected</div>
          <button onClick={connect}>Connect Google Calendar</button>
        </div>
      )}
    </div>
  );
}
