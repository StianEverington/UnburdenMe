import React, { useEffect, useState } from 'react';

export default function CalendarPicker({ userId = 'default', onSaved }: { userId?: string, onSaved?: ()=>void }) {
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/calendar/list?userId=${encodeURIComponent(userId)}`).then(r=>r.json()).then(d=>setCalendars(d.calendars||[])).catch(()=>setCalendars([]));
    fetch(`/api/calendar/selected?userId=${encodeURIComponent(userId)}`).then(r=>r.json()).then(d=>setSelected(d.calendars||[])).catch(()=>setSelected([]));
  }, [userId]);

  const toggle = (id:string) => {
    const next = selected.includes(id) ? selected.filter(s=>s!==id) : [...selected, id];
    setSelected(next);
  };

  const save = async () => {
    await fetch('/api/calendar/select', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ userId, calendars: selected }) });
    alert('Saved calendar selection');
    if (onSaved) onSaved();
  };

  return (
    <div>
      <h4>Select calendars to sync</h4>
      {calendars.length === 0 && <div>No calendars found (connect first)</div>}
      <ul>
        {calendars.map(c => (
          <li key={c.id}>
            <label>
              <input type="checkbox" checked={selected.includes(c.id)} onChange={()=>toggle(c.id)} /> {c.summary} {c.primary? '(primary)':''}
            </label>
          </li>
        ))}
      </ul>
      <button onClick={save}>Save</button>
    </div>
  );
}
