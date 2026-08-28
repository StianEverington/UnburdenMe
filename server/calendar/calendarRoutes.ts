import express from 'express';
import { listCalendarEvents, markEventPriority, saveCalendarSelection, getSelectedCalendars } from '../db/index.js';
import { getTokenByUserId } from '../db/index.js';
import { syncAllCalendars } from './syncService.js';
import { decrypt } from '../email/oauth.js';
import { GoogleGenAI } from '@google/genai';
import { listCalendarsApi, createEventApi, updateEventApi, deleteEventApi } from './calendarClient.js';

const router = express.Router();

router.get('/events', (req, res) => {
  try {
    const userId = (req.query.userId as string) || 'default';
    const events = listCalendarEvents(userId, 250);
    res.json({ events });
  } catch (e) {
    console.error('GET /api/calendar/events', e);
    res.status(500).json({ error: 'failed to list events' });
  }
});

router.get('/list', async (req, res) => {
  try {
    const userId = (req.query.userId as string) || 'default';
    const token = getTokenByUserId(userId);
    if (!token) return res.status(404).json({ error: 'no token for user' });
    if (!token.encrypted_refresh_token) return res.status(400).json({ error: 'no refresh token' });
    const accessToken = await (await import('./syncService.js')).refreshAccessTokenUsingRefreshToken(token.encrypted_refresh_token, decrypt);
    const list = await listCalendarsApi(accessToken);
    // return minimal fields
    const items = (list.items || []).map((i:any)=>({ id: i.id, summary: i.summary, primary: !!i.primary }));
    res.json({ calendars: items });
  } catch (e) {
    console.error('GET /api/calendar/list', e);
    res.status(500).json({ error: 'failed to list calendars' });
  }
});

router.get('/selected', (req, res) => {
  try {
    const userId = (req.query.userId as string) || 'default';
    const selected = getSelectedCalendars(userId);
    res.json({ calendars: selected });
  } catch (e) {
    console.error('GET /api/calendar/selected', e);
    res.status(500).json({ error: 'failed to get selected calendars' });
  }
});

router.post('/select', (req, res) => {
  try {
    const { userId, calendars } = req.body || {};
    if (!userId || !Array.isArray(calendars)) return res.status(400).json({ error: 'userId and calendars[] required' });
    saveCalendarSelection(userId, calendars);
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /api/calendar/select', e);
    res.status(500).json({ error: 'failed to save selection' });
  }
});

router.post('/sync-now', async (req, res) => {
  try {
    const userId = (req.body.userId as string) || 'default';
    const tokenRecord = getTokenByUserId(userId);
    if (!tokenRecord) return res.status(404).json({ error: 'no token for user' });
    syncAllCalendars(decrypt).then(()=>{}).catch(()=>{});
    res.json({ ok: true, message: 'calendar sync scheduled' });
  } catch (e) {
    console.error('POST /api/calendar/sync-now', e);
    res.status(500).json({ error: 'failed to schedule sync' });
  }
});

router.post('/mark-priority', (req, res) => {
  try {
    const { provider_event_id, priority = 1 } = req.body || {};
    if (!provider_event_id) return res.status(400).json({ error: 'provider_event_id required' });
    markEventPriority('google_calendar', provider_event_id, Number(priority));
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /api/calendar/mark-priority', e);
    res.status(500).json({ error: 'failed to mark priority' });
  }
});

// Event create/update/delete with invite handling
router.post('/create', async (req, res) => {
  try {
    const { userId, calendarId = 'primary', event } = req.body || {};
    if (!userId || !event) return res.status(400).json({ error: 'userId and event required' });
    const token = getTokenByUserId(userId);
    if (!token || !token.encrypted_refresh_token) return res.status(404).json({ error: 'no token' });
    const accessToken = await (await import('./syncService.js')).refreshAccessTokenUsingRefreshToken(token.encrypted_refresh_token, decrypt);
    // build event payload for Google Calendar
    const payload:any = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: event.isAllDay ? { date: event.startDate } : { dateTime: new Date(event.start_ts).toISOString() },
      end: event.isAllDay ? { date: event.endDate } : { dateTime: new Date(event.end_ts).toISOString() },
      attendees: event.attendees || [],
    };
    const created = await createEventApi(accessToken, calendarId, payload, 'all');
    // save locally
    saveCalendarEvent({ id: (await import('uuid')).v4(), user_id: userId, provider: 'google_calendar', provider_event_id: created.id, calendar_id: calendarId, summary: created.summary, description: created.description, start_ts: Date.parse(created.start?.dateTime || created.start?.date || new Date().toString()), end_ts: Date.parse(created.end?.dateTime || created.end?.date || new Date().toString()), location: created.location, is_all_day: created.start?.date ? 1 : 0, metadata: JSON.stringify(created) });
    res.json({ ok: true, created });
  } catch (e) {
    console.error('POST /api/calendar/create', e);
    res.status(500).json({ error: 'failed to create event' });
  }
});

router.patch('/update', async (req, res) => {
  try {
    const { userId, calendarId = 'primary', eventId, event } = req.body || {};
    if (!userId || !eventId || !event) return res.status(400).json({ error: 'userId, eventId and event required' });
    const token = getTokenByUserId(userId);
    if (!token || !token.encrypted_refresh_token) return res.status(404).json({ error: 'no token' });
    const accessToken = await (await import('./syncService.js')).refreshAccessTokenUsingRefreshToken(token.encrypted_refresh_token, decrypt);
    const payload:any = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: event.isAllDay ? { date: event.startDate } : { dateTime: new Date(event.start_ts).toISOString() },
      end: event.isAllDay ? { date: event.endDate } : { dateTime: new Date(event.end_ts).toISOString() },
      attendees: event.attendees || [],
    };
    const updated = await updateEventApi(accessToken, calendarId, eventId, payload, 'all');
    // save locally
    saveCalendarEvent({ id: (await import('uuid')).v4(), user_id: userId, provider: 'google_calendar', provider_event_id: updated.id, calendar_id: calendarId, summary: updated.summary, description: updated.description, start_ts: Date.parse(updated.start?.dateTime || updated.start?.date || new Date().toString()), end_ts: Date.parse(updated.end?.dateTime || updated.end?.date || new Date().toString()), location: updated.location, is_all_day: updated.start?.date ? 1 : 0, metadata: JSON.stringify(updated) });
    res.json({ ok: true, updated });
  } catch (e) {
    console.error('PATCH /api/calendar/update', e);
    res.status(500).json({ error: 'failed to update event' });
  }
});

router.delete('/delete', async (req, res) => {
  try {
    const { userId, calendarId = 'primary', eventId } = req.body || {};
    if (!userId || !eventId) return res.status(400).json({ error: 'userId and eventId required' });
    const token = getTokenByUserId(userId);
    if (!token || !token.encrypted_refresh_token) return res.status(404).json({ error: 'no token' });
    const accessToken = await (await import('./syncService.js')).refreshAccessTokenUsingRefreshToken(token.encrypted_refresh_token, decrypt);
    await deleteEventApi(accessToken, calendarId, eventId, 'all');
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/calendar/delete', e);
    res.status(500).json({ error: 'failed to delete event' });
  }
});

export default router;
