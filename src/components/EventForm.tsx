import React, { useState, useEffect } from 'react';

export default function EventForm({
  userId = 'default',
  calendarId = 'primary',
  event = null,
  onSaved = () => {},
  onCancel = () => {},
}: {
  userId?: string;
  calendarId?: string;
  event?: any | null;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const editing = !!event;
  const [summary, setSummary] = useState(event?.summary || '');
  const [description, setDescription] = useState(event?.description || '');
  const [location, setLocation] = useState(event?.location || '');
  const [isAllDay, setIsAllDay] = useState(Boolean(event?.is_all_day));
  const [startLocal, setStartLocal] = useState(() => {
    if (event?.start_ts) return new Date(event.start_ts).toISOString().slice(0,16);
    return '';
  });
  const [endLocal, setEndLocal] = useState(() => {
    if (event?.end_ts) return new Date(event.end_ts).toISOString().slice(0,16);
    return '';
  });
  const [attendeesRaw, setAttendeesRaw] = useState((event?.metadata && (() => {
    try { const parsed = JSON.parse(event.metadata); const raw = parsed?.attendees?.map((a:any)=>a.email).join(', ') || ''; return raw; } catch { return ''; }
  })()) || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [summary, description, startLocal, endLocal]);

  const parseAttendees = (raw: string) => {
    if (!raw) return [];
    return raw.split(',').map(s => ({ email: s.trim() })).filter(a => a.email);
  };

  const handleSubmit = async (e:any) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const startTs = isAllDay ? undefined : (startLocal ? Date.parse(startLocal) : undefined);
      const endTs = isAllDay ? undefined : (endLocal ? Date.parse(endLocal) : undefined);
      const payloadEvent:any = {
        summary,
        description,
        location,
        isAllDay: isAllDay ? true : false,
        start_ts: startTs,
        end_ts: endTs,
        attendees: parseAttendees(attendeesRaw),
      };

      if (!editing) {
        const res = await fetch('/api/calendar/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, calendarId, event: payloadEvent }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'create failed');
      } else {
        // event.provider_event_id must be provided for update
        const res = await fetch('/api/calendar/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, calendarId, eventId: event.provider_event_id, event: payloadEvent }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'update failed');
      }

      setLoading(false);
      onSaved();
    } catch (err:any) {
      setLoading(false);
      setError(err?.message || 'Unexpected error');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ border: '1px solid #ddd', padding: 12, marginBottom: 12, background: '#fff' }}>
      <div style={{ marginBottom: 8 }}>
        <label>Summary<br/>
          <input value={summary} onChange={e=>setSummary(e.target.value)} required style={{ width: '100%' }} />
        </label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Description<br/>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} style={{ width: '100%' }} />
        </label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Location<br/>
          <input value={location} onChange={e=>setLocation(e.target.value)} style={{ width: '100%' }} />
        </label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>
          <input type="checkbox" checked={isAllDay} onChange={e=>setIsAllDay(e.target.checked)} /> All day
        </label>
      </div>
      {!isAllDay && (
        <>
          <div style={{ marginBottom: 8 }}>
            <label>Start<br/>
              <input type="datetime-local" value={startLocal} onChange={e=>setStartLocal(e.target.value)} style={{ width: '100%' }} />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>End<br/>
              <input type="datetime-local" value={endLocal} onChange={e=>setEndLocal(e.target.value)} style={{ width: '100%' }} />
            </label>
          </div>
        </>
      )}
      <div style={{ marginBottom: 8 }}>
        <label>Attendees (comma-separated emails)<br/>
          <input value={attendeesRaw} onChange={e=>setAttendeesRaw(e.target.value)} style={{ width: '100%' }} />
        </label>
      </div>
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      <div>
        <button type="submit" disabled={loading}>{editing ? 'Update event' : 'Create event'}</button>
        <button type="button" onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</button>
      </div>
    </form>
  );
}
