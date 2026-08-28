import { useEffect, useState } from 'react';

export function useEmailSync(userId = 'default') {
  const [status, setStatus] = useState<{ connected: boolean } | null>(null);
  useEffect(() => {
    fetch(`/api/email/status?userId=${encodeURIComponent(userId)}`).then(r => r.json()).then(setStatus).catch(() => setStatus({ connected: false }));
  }, [userId]);

  const syncNow = async () => {
    await fetch('/api/email/sync-now', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
  };

  return { status, syncNow };
}
