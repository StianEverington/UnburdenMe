import { getAllTokens } from '../db/index.js';
import { refreshAccessTokenUsingRefreshToken } from './syncService.js';
import { listCalendarEventsApi, parseEventItem } from './calendarClient.js';
import { saveCalendarEvent } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

export async function syncAllCalendars(decryptFn: (s: string)=>string) {
  const tokens = getAllTokens();
  for (const t of tokens) {
    if (!t.encrypted_refresh_token) continue;
    try {
      const accessToken = await refreshAccessTokenUsingRefreshToken(t.encrypted_refresh_token, decryptFn);
      // fetch events for next 30 days
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
      const listJson = await listCalendarEventsApi(accessToken, 'primary', timeMin, timeMax);
      const items = listJson.items || [];
      for (const item of items) {
        const p = parseEventItem(item);
        saveCalendarEvent({
          id: uuidv4(),
          user_id: t.user_id,
          provider: 'google_calendar',
          provider_event_id: p.provider_event_id,
          calendar_id: p.calendar_id,
          summary: p.summary,
          description: p.description,
          start_ts: p.startTs,
          end_ts: p.endTs,
          location: p.location,
          is_all_day: p.isAllDay,
          metadata: JSON.stringify({ raw: p.raw }),
          priority: 0,
        });
      }
    } catch (e) {
      console.error('calendar sync failed for user', t.user_id, e);
    }
  }
}
