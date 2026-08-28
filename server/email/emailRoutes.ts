import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

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
      email = undefined, // { from, subject, body }
      channel = 'Email',
    } = req.body || {};

    if (!companion_content && !email) {
      return res.status(400).json({ error: 'Missing companion_content or email body to base suggestions on' });
    }

    const mode = /write|compose|new message|draft/i.test(instruction) ? 'compose' : 'reply';

    const systemInstruction = mode === 'compose' ? buildSystemInstructionComposeMode() : buildSystemInstructionReplyMode();

    const ai = getGeminiAI();

    const promptContext: string[] = [];
    promptContext.push(`User instruction: "${instruction}"`);
    promptContext.push(`Companion content: "${companion_content}"`);
    if (mode === 'reply' && email) {
      promptContext.push(`Original email FROM: ${email.from || 'Unknown'}`);
      promptContext.push(`Original email SUBJECT: ${email.subject || 'No subject'}`);
      promptContext.push(`Original email BODY: ${email.body || email.snippet || ''}`);
    }

    const contents = promptContext.join('\n---\n');

    // Use Gemini if available; otherwise return a simple fallback
    if (!process.env.GEMINI_API_KEY) {
      // Fallback: craft naive drafts
      const drafts = [
        `Option A:\nHi ${email?.from?.split(' ')[0] || 'there'},\n\n${companion_content || 'Thanks for your note. I can help with this — here are the next steps.'}\n\nBest,` ,
        `Option B:\nHi ${email?.from?.split(' ')[0] || 'there'},\n\nQuick note: ${companion_content || 'I\'d like to suggest a small change and propose time to talk.'}\n\nThanks,`,
        `Option C:\nHi ${email?.from?.split(' ')[0] || 'there'},\n\nShort reply: ${companion_content || 'I can take this on. Please confirm the deadline.'}\n\nCheers,`,
      ];
      return res.json({ mode, drafts, recommendedAction: 'Pick the draft closest to your tone and edit as needed.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.4,
        topP: 0.9,
        responseMimeType: 'text/plain',
      },
    });

    const text = response.text || '';
    // Basic split: look for Option A/B/C markers; if not present, split into three parts heuristically
    let drafts: string[] = [];
    const splitByOption = text.split(/\nOption\s*[A-C][:\-]?/i).map(s => s.trim()).filter(Boolean);
    if (splitByOption.length >= 3) {
      // Prepend Option markers since split removed them
      drafts = ['Option A: ' + splitByOption[0], 'Option B: ' + splitByOption[1], 'Option C: ' + splitByOption[2]];
    } else {
      // Try splitting by two or three blank lines
      const parts = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
      drafts = parts.slice(0, 3);
      while (drafts.length < 3) drafts.push('');
    }

    const recommendedAction = 'Choose a draft, make small personal edits if needed, then send.';
    return res.json({ mode, drafts, recommendedAction, raw: text });
  } catch (err: any) {
    console.error('Error /api/email/suggest', err);
    res.status(500).json({ error: 'failed to generate suggestions' });
  }
});

export default router;
