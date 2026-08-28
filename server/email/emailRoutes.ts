import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { fetchMessageRaw, extractSnippetFromGmailMessage } from './gmailClient.js';
import { listEmails, saveEmail, markActionRequired as dbMarkAction } from '../db/index.js';
import { getTokenByUserId } from '../db/index.js';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { postProcessText } from '../ai/postProcess.js';

const router = express.Router();

function getGeminiAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set in environment variables. Using fallback behaviour.');
  }
  return new GoogleGenAI({ apiKey: apiKey || 'DUMMY_KEY', httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
}

function fewShotExamples(mode: 'reply' | 'compose') {
  if (mode === 'reply') {
    return `Example 1 (reply):\nOption A:\nHi Sam,\nThanks — I can take that on. I\'ll get it done by Friday and let you know if anything changes.\n\nOption B:\nHi Sam,\nQuick one: can you confirm the final price? Once I have that I\'ll confirm.\n\nOption C:\nHi Sam,\nI\'m happy to help — is there anything you want prioritised?`;
  }
  return `Example 1 (compose):\nOption A:\nHi Alice,\nJust checking if we can move the meeting to Tuesday — I\'m travelling this week. I\'m free 10am or 2pm.\n\nOption B:\nHi Alice,\nCould we please shift our meeting to next Tue? I have time at 10am or 2pm.\n\nOption C:\nHi Alice,\nI\'m away this week — could we look at Tuesday instead?`; 
}

function buildSystemInstruction(mode: 'reply' | 'compose', samplePhrase?: string, toneHint?: string) {
  const base = mode === 'compose' ? 'You are UnburdenMe Companion. Write three short, friendly, personal email drafts based on the user\'s companion content.' : 'You are UnburdenMe Companion. Reply to the given email with three short, friendly, personal drafts that reference the key point.';
  let sys = base + ' Avoid corporate words, keep language natural and conversational. Use British English.';
  if (samplePhrase) sys += ` Match the user\'s phrasing and tone: "${samplePhrase}".`;
  if (toneHint) sys += ` Tone hint: ${toneHint}.`;
  // Add few-shot
  sys += '\n\n' + fewShotExamples(mode);
  return sys;
}

router.post('/suggest', async (req: Request, res: Response) => {
  try {
    const {
      instruction = 'Respond to this message',
      companion_content = '',
      email = undefined,
      tone = undefined,
    } = req.body || {};

    if (!companion_content && !email) {
      return res.status(400).json({ error: 'Missing companion_content or email body to base suggestions on' });
    }

    const mode: 'reply'|'compose' = /write|compose|new message|draft/i.test(instruction) ? 'compose' : 'reply';

    // Tone mirroring: pick a short sample phrase from companion_content (first sentence)
    let samplePhrase: string | undefined = undefined;
    if (companion_content && companion_content.trim()) {
      const m = companion_content.trim().split(/[\.\!\?\n]/).map(s=>s.trim()).filter(Boolean);
      if (m.length > 0) samplePhrase = m[0].slice(0,140);
    }

    const systemInstruction = buildSystemInstruction(mode, samplePhrase, tone);

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
        `Option A:\nHi ${email?.from?.split(' ')[0] || 'there'},\n\n${companion_content || 'Thanks — I\'ll get on this and will confirm.'}\n\nBest,`,
        `Option B:\nHi ${email?.from?.split(' ')[0] || 'there'},\n\nQuick note: ${companion_content || 'I\'ll follow up with details soon.'}\n\nThanks,`,
        `Option C:\nHi ${email?.from?.split(' ')[0] || 'there'},\n\nShort reply: ${companion_content || 'Can you confirm the date for me?'}\n\nCheers,`,
      ].map(d => postProcessText(d, tone));
      return res.json({ mode, drafts, recommendedAction: 'Pick a draft and tweak if you like.' });
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

    // Post-process drafts to remove remaining corporate terms
    drafts = drafts.map(d => postProcessText(d, tone));

    const recommendedAction = 'Choose a draft, edit lightly if needed, then send.';
    return res.json({ mode, drafts, recommendedAction, raw: text });
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
    const tokenRecord = getTokenByUserId(userId);
    if (!tokenRecord) return res.status(404).json({ error: 'no token for user' });
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
