import dotenv from 'dotenv';
import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Mount email routes (OAuth + suggestion endpoints)
import emailOauthRouter from './server/email/oauth.js';
import emailRouter from './server/email/emailRoutes.js';
app.use('/api/email', emailOauthRouter);
app.use('/api/email', emailRouter);

// Mount calendar routes
import calendarRouter from './server/calendar/calendarRoutes.js';
app.use('/api/calendar', calendarRouter);

// Start full sync background job
import { syncAllUsers } from './server/email/syncService.js';
import db from './server/db/index.js';

const POLL_MINUTES = Number(process.env.EMAIL_SYNC_POLL_MINUTES || '5');

function startEmailSyncJob() {
  setInterval(async () => {
    try {
      console.log('[email-sync] starting sync for connected users');
      // dynamic import decrypt fn from oauth module to avoid circular
      const oauth = await import('./server/email/oauth.js');
      await syncAllUsers(oauth.decrypt);
      try {
        const cal = await import('./server/calendar/syncService.js');
        await cal.syncAllCalendars(oauth.decrypt);
      } catch (e) {
        console.warn('calendar sync tick failed', e);
      }
      console.log('[email-sync] sync complete');
    } catch (err) {
      console.error('[email-sync] error', err);
    }
  }, Math.max(60, POLL_MINUTES * 60) * 1000);
}

startEmailSyncJob();

function startServer() {
  app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });
}

startServer();
