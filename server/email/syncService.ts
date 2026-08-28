import { getAllTokens } from '../db/index.js';
import { fetchMessageRaw, extractSnippetFromGmailMessage } from './gmailClient.js';

// Minimal email sync helpers (build-friendly stubs)
// These functions are intentionally minimal so bundlers do not fail during build on Vercel.
// They should be expanded with real sync logic (refresh tokens, Gmail API calls) for production.

export async function syncAllUsers(decryptFn: (s: string) => string) {
  const tokens = getAllTokens();
  for (const t of tokens) {
    try {
      // Placeholder: no-op during build. Real implementation should refresh access token
      // and fetch messages for the user.
      // Example:
      // const accessToken = await refreshAccessTokenUsingRefreshToken(t.encrypted_refresh_token, decryptFn);
      // const raw = await fetchMessageRaw(accessToken, ...);
    } catch (e) {
      console.warn('email sync failed for user', t.user_id, e);
    }
  }
}

export async function refreshAccessTokenUsingRefreshToken(encryptedRefreshToken: string, decryptFn: (s: string) => string) {
  // Build-time stub: callers should replace with a proper implementation that exchanges
  // a refresh token for a short-lived access token using the provider's OAuth API.
  // Throwing here will surface the missing implementation at runtime rather than build.
  throw new Error('refreshAccessTokenUsingRefreshToken is not implemented on build stub');
}
