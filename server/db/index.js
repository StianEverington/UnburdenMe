// Lightweight DB adapter that prefers better-sqlite3 (when available) but falls back to an in-memory store.
// This prevents native binary build failures on serverless hosts during `npm install` while keeping
// behaviour for local/dev where better-sqlite3 is available.

let dbImpl = null;

try {
  // Try to require the native better-sqlite3 binding. If it isn't available (e.g. on Vercel
  // during build), we'll catch and fall back to the in-memory implementation below.
  // Use dynamic require to avoid bundlers attempting to include the native module at build time.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const BetterSqlite3 = require('better-sqlite3');
  const path = require('path');
  const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'unburdenme.db');
  const db = new BetterSqlite3(dbPath);

  dbImpl = {
    type: 'sqlite',
    getAllTokens: async () => {
      const rows = db.prepare('SELECT user_id, encrypted_refresh_token FROM tokens').all();
      return rows || [];
    },
    getTokenByUserId: async (userId) => {
      return db.prepare('SELECT * FROM tokens WHERE user_id = ?').get(userId);
    },
    saveToken: async (userId, encryptedRefreshToken) => {
      db.prepare('INSERT OR REPLACE INTO tokens (user_id, encrypted_refresh_token) VALUES (?, ?)').run(userId, encryptedRefreshToken);
    },
    listEmails: async (userId) => {
      return db.prepare('SELECT * FROM emails WHERE user_id = ? ORDER BY received_at DESC').all(userId || null) || [];
    },
    saveEmail: async (email) => {
      db.prepare('INSERT INTO emails (id, user_id, subject, body, received_at) VALUES (?, ?, ?, ?, ?)')
        .run(email.id, email.user_id, email.subject, email.body, email.received_at || Date.now());
    },
    markActionRequired: async (emailId, flag) => {
      db.prepare('UPDATE emails SET action_required = ? WHERE id = ?').run(flag ? 1 : 0, emailId);
    }
  };
} catch (e) {
  // Fallback: in-memory store. Safe for serverless deployments and for build time.
  const tokens = new Map();
  const emails = new Map();

  dbImpl = {
    type: 'memory',
    getAllTokens: async () => {
      const out = [];
      for (const [user_id, encrypted_refresh_token] of tokens.entries()) out.push({ user_id, encrypted_refresh_token });
      return out;
    },
    getTokenByUserId: async (userId) => {
      const t = tokens.get(userId);
      if (!t) return null;
      return { user_id: userId, encrypted_refresh_token: t };
    },
    saveToken: async (userId, encryptedRefreshToken) => {
      tokens.set(userId, encryptedRefreshToken);
    },
    listEmails: async (userId) => {
      const arr = [];
      for (const e of emails.values()) if (!userId || e.user_id === userId) arr.push(e);
      return arr.sort((a, b) => (b.received_at || 0) - (a.received_at || 0));
    },
    saveEmail: async (email) => {
      emails.set(email.id, email);
    },
    markActionRequired: async (emailId, flag) => {
      const e = emails.get(emailId);
      if (e) e.action_required = !!flag;
    }
  };
}

module.exports = dbImpl;
