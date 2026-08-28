import React from 'react';

export default function CalendarItem({ event }: { event: any }) {
  const markPriority = async () => {
    await fetch('/api/calendar/mark-priority', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider_event_id: event.provider_event_id, priority: 1 }) });
    alert('Marked as priority');
  };

  const recommend = async () => {
    const res = await fetch('/api/calendar/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event }) });
    const data = await res.json();
    alert('Suggestions:\n' + (data.suggestions || []).join('\n'));
  };

  const start = event.start_ts ? new Date(event.start_ts).toLocaleString() : '-';
  return (
    <div style={{ border: '1px solid #eee', padding: 8, marginBottom: 8 }}>
      <div><strong>{event.summary || '(no title)'}</strong></div>
      <div>When: {start}</div>
      <div>{event.location}</div>
      <div>
        <button onClick={recommend}>Get tips</button>
        <button onClick={markPriority}>Mark priority</button>
      </div>
    </div>
  );
}
