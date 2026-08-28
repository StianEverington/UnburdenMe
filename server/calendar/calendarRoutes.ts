import express from 'express';
import { listCalendarEvents, markEventPriority } from '../db/index.js';
import { getTokenByUserId } from '../db/index.js';
import { syncAllCalendars } from './syncService.js';
import { decrypt } from '../email/oauth.js';
import { GoogleGenAI } from '@google/genai';

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

router.post('/sync-now', async (req, res) => {
  try {
    const userId = (req.body.userId as string) || 'default';
    const tokenRecord = getTokenByUserId(userId);
    if (!tokenRecord) return res.status(404).json({ error: 'no token for user' });
    // schedule immediate sync by calling syncAllCalendars in background
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

// Provide recommendations for a calendar event (e.g., prep tips or priority suggestions)
router.post('/recommend', async (req, res) => {
  try {
    const { event, instruction = 'Give me quick, friendly suggestions for this event' } = req.body || {};
    if (!event) return res.status(400).json({ error: 'event required' });
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'DUMMY_KEY' });
    const prompt = `Event summary: ${event.summary || ''}\nWhen: ${new Date(event.start_ts || 0).toLocaleString()}\nLocation: ${event.location || ''}\nNotes: ${event.description || ''}\n\nInstruction: ${instruction}\n\nRespond in plain, friendly English with 3 quick suggestions (what to prepare, what to bring, quick priorities).`;
    if (!process.env.GEMINI_API_KEY) {
      // fallback
      return res.json({ suggestions: ['Bring a notebook', 'Arrive 10 min early', 'Confirm the main goal of the meeting'] });
    }
    const response = await ai.models.generateContent({ model: 'gemini-3.6-flash', contents: prompt, config: { systemInstruction: 'You are UnburdenMe Calendar Assistant. Keep suggestions short, friendly and practical.', temperature: 0.3, topP: 0.95, responseMimeType: 'text/plain' } });
    const text = response.text || '';
    const lines = text.split('\n').map((l:string)=>l.trim()).filter(Boolean).slice(0,5);
    res.json({ suggestions: lines });
  } catch (e) {
    console.error('POST /api/calendar/recommend', e);
    res.status(500).json({ error: 'failed to get recommendations' });
  }
});

export default router;
