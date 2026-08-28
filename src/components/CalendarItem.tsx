import React from 'react';

export default function CalendarItem({ event, onEdit = () => {}, onChange = () => {} }: { event: any, onEdit?: ()=>void, onChange?: ()=>void }) {
  const markPriority = async () => {
    await fetch('/api/calendar/mark-priority', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider_event_id: event.provider_event_id, priority: 1 }) });
    alert('Marked as priority');
    onChange();
  };

  const recommend = async () => {
    const res = await fetch('/api/calendar/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event }) });
    const data = await res.json();
    alert('Suggestions:\n' + (data.suggestions || []).join('\n'));
  };

  const handleEdit = () => {
    if (onEdit) onEdit();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this event from Google Calendar? This will send cancellations to attendees.')) return;
    try {
      const res = await fetch('/api/calendar/delete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: event.user_id, calendarId: event.calendar_id || 'primary', eventId: event.provider_event_id }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || 'delete failed');
      alert('Deleted');
      onChange();
    } catch (e:any) {
      alert('Delete failed: ' + (e?.message || e));
    }
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
        <button onClick={handleEdit}>Edit</button>
        <button onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
}
