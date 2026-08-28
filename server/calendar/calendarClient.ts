// Minimal Google Calendar client helpers (REST)
import fetch from 'node-fetch';

export async function listCalendarEventsApi(accessToken: string, calendarId='primary', timeMin?: string, timeMax?: string) {
  const q: any = {};
  if (timeMin) q.timeMin = timeMin;
  if (timeMax) q.timeMax = timeMax;
  const qs = new URLSearchParams(q).toString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?singleEvents=true&orderBy=startTime&maxResults=250` + (qs ? `&${qs}` : '');
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`calendar list failed ${res.status}`);
  return res.json();
}

export function parseEventItem(item: any) {
  const start = item.start?.dateTime || item.start?.date; // date for all-day
  const end = item.end?.dateTime || item.end?.date;
  const isAllDay = !!item.start?.date && !item.start?.dateTime;
  const startTs = start ? Date.parse(start) : null;
  const endTs = end ? Date.parse(end) : null;
  return {
    provider_event_id: item.id,
    calendar_id: item.organizer?.email || item.creator?.email || 'primary',
    summary: item.summary || '',
    description: item.description || '',
    startTs: startTs || null,
    endTs: endTs || null,
    location: item.location || '',
    isAllDay: isAllDay ? 1 : 0,
    raw: item,
  };
}
