import express, { Request, Response } from 'express';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { upsertToken, getTokenByUserId, deleteTokenByUserId } from '../db/index.js';

const router = express.Router();

function getEncryptionKey(): Buffer {
  const k = process.env.ENCRYPTION_KEY || '';
  if (!k || k.length < 32) {
    throw new Error('ENCRYPTION_KEY must be set and at least 32 characters long');
  }
  return Buffer.from(k.slice(0, 32));
}

function encrypt(text: string) {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(data: string) {
  const raw = Buffer.from(data, 'base64');
  const iv = raw.slice(0, 12);
  const tag = raw.slice(12, 28);
  const encrypted = raw.slice(28);
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

// Start OAuth flow: user is expected to hit this endpoint and be redirected to Google.
router.get('/connect', async (req: Request, res: Response) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirect = process.env.GOOGLE_OAUTH_REDIRECT || `${req.protocol}://${req.get('host')}/api/email/oauth2callback`;
    if (!clientId) return res.status(500).json({ error: 'GOOGLE_CLIENT_ID not configured' });

    const state = JSON.stringify({ userId: req.query.userId || 'default' });
    const scope = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/calendar.events',
      'openid',
      'email',
      'profile',
    ].join(' ');

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(
      redirect
    )}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;

    return res.redirect(url);
  } catch (err) {
    console.error('Error /api/email/connect', err);
    res.status(500).json({ error: 'failed to start OAuth flow' });
  }
});

// OAuth2 callback to exchange code for tokens
router.get('/oauth2callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string | undefined;
    const stateRaw = req.query.state as string | undefined;
    if (!code) return res.status(400).json({ error: 'missing code' });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirect = process.env.GOOGLE_OAUTH_REDIRECT || `${req.protocol}://${req.get('host')}/api/email/oauth2callback`;
    if (!clientId || !clientSecret) return res.status(500).json({ error: 'OAuth credentials not configured' });

    // Exchange code
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirect,
        grant_type: 'authorization_code',
      }),
    });

    const tokenJson = await tokenRes.json();
    if (tokenJson.error) {
      console.error('token exchange error', tokenJson);
      return res.status(500).json({ error: 'token exchange failed', details: tokenJson });
    }

    const refreshToken = tokenJson.refresh_token;
    const accessToken = tokenJson.access_token;
    const expiresIn = tokenJson.expires_in;

    if (!refreshToken) {
      console.warn('No refresh token returned from Google (user likely previously consented).');
    }

    const state = stateRaw ? JSON.parse(stateRaw) : { userId: 'default' };
    const userId = state.userId || 'default';

    const id = uuidv4();
    const encrypted = refreshToken ? encrypt(refreshToken) : undefined;
    upsertToken({
      id,
      user_id: String(userId),
      provider: 'gmail',
      provider_user_id: undefined,
      encrypted_refresh_token: encrypted,
      access_token: accessToken,
      token_expires_at: expiresIn ? Date.now() + Number(expiresIn) * 1000 : undefined,
    });

    const redirectBack = process.env.AFTER_OAUTH_REDIRECT || '/';
    return res.redirect(redirectBack);
  } catch (err) {
    console.error('Error /api/email/oauth2callback', err);
    res.status(500).json({ error: 'oauth callback failed' });
  }
});

router.get('/status', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'default';
  const record = getTokenByUserId(userId);
  const info = record ? { connected: true, provider: record.provider } : { connected: false };
  res.json(info);
});

router.post('/disconnect', (req: Request, res: Response) => {
  const userId = (req.body.userId as string) || 'default';
  deleteTokenByUserId(userId);
  res.json({ ok: true });
});

export { decrypt };
export default router;
