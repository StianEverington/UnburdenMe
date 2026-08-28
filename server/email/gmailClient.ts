// Lightweight Gmail client helpers (minimal REST usage)
import fetch from 'node-fetch';

export async function fetchMessageRaw(accessToken: string, messageId: string) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`gmail fetch failed ${res.status}`);
  return res.json();
}

export function extractSnippetFromGmailMessage(msg: any) {
  const snippet = msg.snippet || '';
  let subject = '';
  let from = '';
  const headers = (msg.payload && msg.payload.headers) || [];
  for (const h of headers) {
    if (h.name === 'Subject') subject = h.value;
    if (h.name === 'From') from = h.value;
  }
  let body = '';
  if (msg.payload && msg.payload.parts) {
    const part = msg.payload.parts.find((p: any) => p.mimeType === 'text/plain') || msg.payload.parts[0];
    if (part && part.body && part.body.data) {
      body = Buffer.from(part.body.data, 'base64').toString('utf8');
    }
  } else if (msg.payload && msg.payload.body && msg.payload.body.data) {
    body = Buffer.from(msg.payload.body.data, 'base64').toString('utf8');
  }
  return { snippet, subject, from, body };
}
