import React, { useEffect, useState } from 'react';
import CalendarItem from './CalendarItem';

export default function CalendarList({ userId = 'default' }: { userId?: string }) {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/calendar/events?userId=${encodeURIComponent(userId)}`).then(r => r.json()).then(d => setEvents(d.events || []));
  }, [userId]);

  return (
    <div>
      <h3>Upcoming events</h3>
      {events.length === 0 && <div>No synced events yet.</div>}
      <ul>
        {events.map(e => (
          <li key={e.id}><CalendarItem event={e} /></li>
        ))}
      </ul>
    </div>
  );
}
