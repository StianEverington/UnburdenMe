// Calendar DB support added to existing DB module
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'unburdenme.db');

function ensureDataDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDataDir();

const db = new Database(DB_PATH);

// Simple migrations (email tables + calendar table)
db.exec(`
CREATE TABLE IF NOT EXISTS email_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT,
  encrypted_refresh_token TEXT,
  access_token TEXT,
  token_expires_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_tokens_userid ON email_tokens(user_id);

CREATE TABLE IF NOT EXISTS synced_emails (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_message_id TEXT NOT NULL,
  thread_id TEXT,
  from_email TEXT,
  to_email TEXT,
  cc TEXT,
  subject TEXT,
  snippet TEXT,
  body TEXT,
  received_at INTEGER,
  is_action_required INTEGER DEFAULT 0,
  labels TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_synced_msgs_provider_id ON synced_emails(provider, provider_message_id);

CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  calendar_id TEXT,
  summary TEXT,
  description TEXT,
  start_ts INTEGER,
  end_ts INTEGER,
  location TEXT,
  is_all_day INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0,
  metadata TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_provider_id ON calendar_events(provider, provider_event_id);
`);

export function upsertToken(record: {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id?: string;
  encrypted_refresh_token?: string;
  access_token?: string;
  token_expires_at?: number;
}) {
  const stmt = db.prepare(`
    INSERT INTO email_tokens (id, user_id, provider, provider_user_id, encrypted_refresh_token, access_token, token_expires_at)
    VALUES (@id, @user_id, @provider, @provider_user_id, @encrypted_refresh_token, @access_token, @token_expires_at)
    ON CONFLICT(id) DO UPDATE SET
      provider_user_id=excluded.provider_user_id,
      encrypted_refresh_token=COALESCE(excluded.encrypted_refresh_token,email_tokens.encrypted_refresh_token),
      access_token=excluded.access_token,
      token_expires_at=excluded.token_expires_at,
      updated_at = strftime('%s','now')
  `);
  stmt.run(record);
}

export function getAllTokens() {
  return db.prepare('SELECT * FROM email_tokens').all();
}

export function getTokenByUserId(userId: string) {
  return db.prepare('SELECT * FROM email_tokens WHERE user_id = ?').get(userId);
}

export function deleteTokenByUserId(userId: string) {
  return db.prepare('DELETE FROM email_tokens WHERE user_id = ?').run(userId);
}

export function saveEmail(email: {
  id: string;
  user_id: string;
  provider: string;
  provider_message_id: string;
  thread_id?: string;
  from_email?: string;
  to_email?: string;
  cc?: string;
  subject?: string;
  snippet?: string;
  body?: string;
  received_at?: number;
  labels?: string;
  is_action_required?: number;
}) {
  const stmt = db.prepare(`
    INSERT INTO synced_emails (id, user_id, provider, provider_message_id, thread_id, from_email, to_email, cc, subject, snippet, body, received_at, labels, is_action_required)
    VALUES (@id,@user_id,@provider,@provider_message_id,@thread_id,@from_email,@to_email,@cc,@subject,@snippet,@body,@received_at,@labels,@is_action_required)
    ON CONFLICT(provider, provider_message_id) DO UPDATE SET
      subject=excluded.subject,
      snippet=excluded.snippet,
      body=excluded.body,
      labels=COALESCE(excluded.labels, synced_emails.labels),
      is_action_required=excluded.is_action_required
  `);
  stmt.run(email);
}

export function listEmails(userId: string, limit = 50) {
  return db.prepare('SELECT * FROM synced_emails WHERE user_id = ? ORDER BY received_at DESC LIMIT ?').all(userId, limit);
}

export function markActionRequired(provider: string, provider_message_id: string, flag: boolean) {
  return db.prepare("UPDATE synced_emails SET is_action_required = ?, updated_at = strftime('%s','now') WHERE provider = ? AND provider_message_id = ?").run(flag ? 1 : 0, provider, provider_message_id);
}

// Calendar event helpers
export function saveCalendarEvent(evt: {
  id: string;
  user_id: string;
  provider: string;
  provider_event_id: string;
  calendar_id?: string;
  summary?: string;
  description?: string;
  start_ts?: number;
  end_ts?: number;
  location?: string;
  is_all_day?: number;
  priority?: number;
  metadata?: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO calendar_events (id, user_id, provider, provider_event_id, calendar_id, summary, description, start_ts, end_ts, location, is_all_day, priority, metadata)
    VALUES (@id,@user_id,@provider,@provider_event_id,@calendar_id,@summary,@description,@start_ts,@end_ts,@location,@is_all_day,@priority,@metadata)
    ON CONFLICT(provider, provider_event_id) DO UPDATE SET
      summary=excluded.summary,
      description=excluded.description,
      start_ts=excluded.start_ts,
      end_ts=excluded.end_ts,
      location=excluded.location,
      priority=excluded.priority,
      metadata=COALESCE(excluded.metadata, calendar_events.metadata)
  `);
  stmt.run(evt);
}

export function listCalendarEvents(userId: string, limit = 100) {
  return db.prepare('SELECT * FROM calendar_events WHERE user_id = ? ORDER BY start_ts DESC LIMIT ?').all(userId, limit);
}

export function markEventPriority(provider: string, provider_event_id: string, priority: number) {
  return db.prepare('UPDATE calendar_events SET priority = ?, updated_at = strftime("%s","now") WHERE provider = ? AND provider_event_id = ?').run(priority, provider, provider_event_id);
}

export default db;
