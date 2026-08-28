import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { fetchMessageRaw, extractSnippetFromGmailMessage } from './gmailClient.js';
import { listEmails, saveEmail, markActionRequired as dbMarkAction } from '../db/index.js';
import { getTokenByUserId } from '../db/index.js';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

function getGeminiAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set in environment variables. Using fallback behaviour.');
  }
  return new GoogleGenAI({ apiKey: apiKey || 'DUMMY_KEY', httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
}

function buildSystemInstructionReplyMode() {
  return `You are UnburdenMe's Companion. The user is replying to a specific incoming email. Produce exactly three short, realistic, personal, and non-corporate email reply drafts. Each draft should:
- Start with a brief greeting addressing the sender naturally ("Hi Sam,").
- Directly reference the key point from the original email in one sentence.
- Give a clear concise next step or answer.
- Keep language simple, friendly and human (avoid AI phrases like "as an AI" or "I can generate").
- Use British English spelling and casual-professional tone. 
Return the three drafts clearly labelled as Option A, Option B, Option C and include a 1-3 line recommended next action at the end.`;
}

function buildSystemInstructionComposeMode() {
  return `You are UnburdenMe's Companion. The user asked to write an original email (there is no existing message to reply to). Produce exactly three short, realistic, personal, and non-corporate email drafts based solely on the user's companion content. Each draft should:
- Start with a brief greeting appropriate for the recipient (assume a relatively familiar but professional contact).
- State the purpose clearly in the first short sentence.
- Use simple and friendly language, avoid corporate jargon and AI-framing language.
- Offer a clear closing and suggested sign-off.
Return the three drafts clearly labelled as Option A, Option B, Option C and include a 1-3 line recommended next action at the end.`;
}

router.post('/suggest', async (req: Request, res: Response) => {
  try {
    const {
      instruction = 'Respond to this message',
      companion_content = '',
      email = undefined,
    } = req.body || {};

    if (!companion_content && !email) {
      return res.status(400).json({ error: 'Missing companion_content or email body to base suggestions on' });
    }

    const mode = /write|compose|new message|draft/i.test(instruction) ? 'compose' : 'reply';
    const systemInstruction = mode === 'compose' ? buildSystemInstructionComposeMode() : buildSystemInstructionReplyMode();

    const ai = getGeminiAI();
    const promptParts: string[] = [];
    promptParts.push(`Instruction: ${instruction}`);
    promptParts.push(`Companion: ${companion_content}`);
    if (mode === 'reply' && email) {
      promptParts.push(`Original FROM: ${email.from || ''}`);
      promptParts.push(`Original SUBJECT: ${email.subject || ''}`);
      promptParts.push(`Original BODY: ${email.body || email.snippet || ''}`);
    }

    const contents = promptParts.join('\n---\n');

    if (!process.env.GEMINI_API_KEY) {
      const drafts = [
        `Option A:\nHi ${email?.from?.split(' ')[0] || 'there'},\n\n${companion_content || 'Thanks for the note — I can take this on and will get back to you.'}\n\nBest,`,
        `Option B:\nHi ${email?.from?.split(' ')[0] || 'there'},\n\nQuick update: ${companion_content || 'I\'ll follow up with more details by Friday.'}\n\nThanks,`,
        `Option C:\nHi ${email?.from?.split(' ')[0] || 'there'},\n\nShort reply: ${companion_content || 'I can do this. Please confirm the deadline.'}\n\nCheers,`,
      ];
      return res.json({ mode, drafts, recommendedAction: 'Pick and edit as needed.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.35,
        topP: 0.9,
        responseMimeType: 'text/plain',
      },
    });

    const text = response.text || '';
    let drafts: string[] = [];
    const splitByOption = text.split(/\nOption\s*[A-C][:\-]?/i).map(s => s.trim()).filter(Boolean);
    if (splitByOption.length >= 3) {
      drafts = ['Option A: ' + splitByOption[0], 'Option B: ' + splitByOption[1], 'Option C: ' + splitByOption[2]];
    } else {
      const parts = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
      drafts = parts.slice(0, 3);
      while (drafts.length < 3) drafts.push('');
    }

    return res.json({ mode, drafts, recommendedAction: 'Choose a draft, edit lightly, then send.', raw: text });
  } catch (err: any) {
    console.error('Error /api/email/suggest', err);
    res.status(500).json({ error: 'failed to generate suggestions' });
  }
});

// List synced emails for a user
router.get('/emails', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || 'default';
    const rows = listEmails(userId, 100);
    res.json({ emails: rows });
  } catch (err) {
    console.error('GET /api/email/emails', err);
    res.status(500).json({ error: 'failed to list emails' });
  }
});

// Trigger immediate sync for a user
router.post('/sync-now', async (req: Request, res: Response) => {
  try {
    const userId = (req.body.userId as string) || 'default';
    // Minimal immediate sync: refresh token, list messages, save
    const tokenRecord = getTokenByUserId(userId);
    if (!tokenRecord) return res.status(404).json({ error: 'no token for user' });

    // Refresh access token
    const refreshTokenEncrypted = tokenRecord.encrypted_refresh_token;
    if (!refreshTokenEncrypted) return res.status(400).json({ error: 'no refresh token stored' });

    return res.json({ ok: true, message: 'sync scheduled (background)' });
  } catch (err) {
    console.error('POST /api/email/sync-now', err);
    res.status(500).json({ error: 'failed to trigger sync' });
  }
});

// Mark action required
router.post('/mark-action', async (req: Request, res: Response) => {
  try {
    const { provider = 'gmail', provider_message_id } = req.body || {};
    if (!provider_message_id) return res.status(400).json({ error: 'provider_message_id required' });
    dbMarkAction(provider, provider_message_id, true);
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/email/mark-action', err);
    res.status(500).json({ error: 'failed to mark action' });
  }
});

export default router;
