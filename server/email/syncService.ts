import { getAllTokens } from './db/index.js';
import fetch from 'node-fetch';
import { fetchMessageRaw, extractSnippetFromGmailMessage } from './email/gmailClient.js';
import { saveEmail } from './db/index.js';
import { v4 as uuidv4 } from 'uuid';

export async function refreshAccessTokenUsingRefreshToken(encryptedRefreshToken: string, decryptFn: (s: string) => string) {
  const refreshToken = decryptFn(encryptedRefreshToken);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId || '',
      client_secret: clientSecret || '',
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error('refresh token failed');
  const json = await res.json();
  return json.access_token as string;
}

export async function syncAllUsers(decryptFn: (s: string) => string) {
  const tokens = getAllTokens();
  for (const t of tokens) {
    if (!t.encrypted_refresh_token) continue;
    try {
      const accessToken = await refreshAccessTokenUsingRefreshToken(t.encrypted_refresh_token, decryptFn);
      // list latest messages
      const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=in:inbox`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const listJson = await listRes.json();
      const messages = listJson.messages || [];
      for (const m of messages) {
        try {
          const full = await fetchMessageRaw(accessToken, m.id);
          const extracted = extractSnippetFromGmailMessage(full);
          const isAction = /(please|can you|could you|would you|urgent|asap|do you mind|need)/i.test(extracted.body + extracted.snippet || '');
          saveEmail({
            id: uuidv4(),
            user_id: t.user_id,
            provider: 'gmail',
            provider_message_id: m.id,
            thread_id: full.threadId,
            from_email: extracted.from,
            subject: extracted.subject,
            snippet: extracted.snippet,
            body: extracted.body,
            received_at: Date.now(),
            labels: JSON.stringify(full.labelIds || []),
            is_action_required: isAction ? 1 : 0,
          });
        } catch (e) {
          console.warn('failed fetch message', e);
        }
      }
    } catch (e) {
      console.error('failed to sync user', t.user_id, e);
    }
  }
}
