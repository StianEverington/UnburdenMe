import React, { useEffect, useState } from 'react';
import EventForm from './EventForm';
import CalendarItem from './CalendarItem';

export default function CalendarList({ userId = 'default' }: { userId?: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState<any | null>(null);

  const load = async () => {
    const res = await fetch(`/api/calendar/events?userId=${encodeURIComponent(userId)}`);
    const d = await res.json();
    setEvents(d.events || []);
  };

  useEffect(() => { load(); }, [userId]);

  const handleSaved = () => {
    setShowForm(false);
    setEditEvent(null);
    load();
  };

  const handleEdit = (evt:any) => {
    setEditEvent(evt);
    setShowForm(true);
  };

  return (
    <div>
      <h3>Upcoming events</h3>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => { setEditEvent(null); setShowForm(true); }}>Create event</button>
      </div>
      {showForm && <EventForm userId={userId} event={editEvent} onSaved={handleSaved} onCancel={() => { setShowForm(false); setEditEvent(null); }} />}
      {events.length === 0 && <div>No synced events yet.</div>}
      <ul>
        {events.map(e => (
          <li key={e.id}>
            <CalendarItem event={e} onEdit={() => handleEdit(e)} onChange={() => load()} />
          </li>
        ))}
      </ul>
    </div>
  );
}
