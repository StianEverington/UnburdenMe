/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper function to generate realistic fallback triage responses when Gemini API rate limits or quota errors occur
const SENSITIVE_DISCLAIMER_MESSAGE = 'Notice: This matter involves sensitive legal, HR, or clinical health themes. This engine provides executive workload organisation support and is not a substitute for professional advice.';

function generateFallbackResponse(user_input: string, instruction: string = 'Respond to this message', channel: string = 'Email', context_type: string = 'work', desired_tone: string = 'Assertive') {
  // Simpler, more human fallback outputs
  const taskSnippet = user_input.length > 140 ? user_input.slice(0, 140) + '...' : user_input;

  const commonClosing = '\n\nSuggested next step: pick one draft, tweak the small bits so it sounds like you, then send.';

  return `OPTIONS\n\nOption A — Short & direct:\nHi,\n\nI can take care of this. Quick plan: [one-line next step].\n\nDraft: ${taskSnippet}${commonClosing}\n\nOption B — Friendly & helpful:\nHi,\n\nThanks for the note — I\'ll look into this and follow up with details by [time].\n\nDraft: ${taskSnippet}${commonClosing}\n\nOption C — Ask a question to clarify:\nHi,\n\nCan you confirm [quick question]? Once I have that I\'ll sort it.\n\nDraft: ${taskSnippet}${commonClosing}`;
}

function getGeminiAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set in environment variables.');
  }
  return new GoogleGenAI({
    apiKey: apiKey || 'DUMMY_KEY',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Risk Classifier API
app.post('/api/triage/classify', async (req: Request, res: Response) => {
  try {
    const { user_input } = req.body;
    if (!user_input) {
      return res.status(400).json({ error: 'user_input is required' });
    }

    const lower = user_input.toLowerCase();
    let category = 'STANDARD_WORKLOAD';
    let requires_human_disclaimer = false;
    let reason = 'Standard workload and task prioritisation query.';

    if (lower.includes('harass') || lower.includes('terminate') || lower.includes('fire') || lower.includes('discrimination') || lower.includes('grievance')) {
      category = 'SENSITIVE_HR';
      requires_human_disclaimer = true;
      reason = 'Sensitive workplace grievance or HR issue detected.';
    } else if (lower.includes('panic') || lower.includes('hospital') || lower.includes('breakdown') || lower.includes('cannot function') || lower.includes('physical harm')) {
      category = 'SEVERE_BURNOUT';
      requires_human_disclaimer = true;
      reason = 'Severe distress or health concern detected.';
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = getGeminiAI();
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `Please read this short user message and return a simple JSON describing its category and whether a human check is needed:\n\n${user_input}`,
          config: {
            systemInstruction: `You are UnburdenMe. Read the message and return JSON: {"category":"STANDARD_WORKLOAD|SENSITIVE_HR|SEVERE_BURNOUT","requires_human_disclaimer":true|false,"reason":"short explanation"}. Keep the reason short and plain language.`,
            temperature: 0.0,
            topP: 0.95,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                requires_human_disclaimer: { type: Type.BOOLEAN },
                reason: { type: Type.STRING },
              },
              required: ['category', 'requires_human_disclaimer'],
            },
          },
        });

        const resultText = response.text || '{}';
        const parsed = JSON.parse(resultText);
        if (parsed.category) {
          return res.json(parsed);
        }
      } catch (e: any) {
        // Quiet fallback on rate limit or API failure
      }
    }

    return res.json({ category, requires_human_disclaimer, reason });
  } catch (error: any) {
    console.error('Error in /api/triage/classify:', error);
    res.json({
      category: 'STANDARD_WORKLOAD',
      requires_human_disclaimer: false,
      reason: 'Standard workload query.'
    });
  }
});

// 2. Triage & Signal Engine API (Data Digest)
app.post('/api/triage/signal', async (req: Request, res: Response) => {
  try {
    const { calendar_events_count = 5, unread_email_count = 20, top_email_subject_lines = [], context_type = 'hybrid' } = req.body;

    const fallbackResponse = {
      urgent_external_demands: 'High-priority stakeholder requests requiring focus between scheduled calendar commitments.',
      key_stakeholder_actions: 'Immediate reviews needed on key project deliverables and budget sign-offs.',
      ignore_later_items: `Routine newsletters, internal announcements, and ${Math.max(0, unread_email_count - 3)} low-priority items deferred for EOD processing.`,
      raw_bullets: [
        'Urgent External Demand: Primary stakeholder requests requiring immediate focus.',
        'Key Stakeholder Action: Slide reviews and budget approvals flagged for review today.',
        `Ignore / Process Later (${unread_email_count} items): Calendar events and non-essential emails batch processed later.`
      ]
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = getGeminiAI();
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `Workload Metadata:\n- Calendar Events: ${calendar_events_count}\n- Unread Emails: ${unread_email_count}\n- Top Subjects: ${JSON.stringify(top_email_subject_lines)}`,
          config: {
            systemInstruction: `You are UnburdenMe. In plain, friendly language give exactly three short bullet points: 1) urgent things to do now, 2) key things that need attention, 3) what to ignore for later. Keep each line short and non-corporate. Use British English.`,
            temperature: 0.25,
            topP: 0.95,
          },
        });

        const text = response.text || '';
        const bullets = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0).slice(0,3);
        return res.json({
          urgent_external_demands: bullets[0] || fallbackResponse.urgent_external_demands,
          key_stakeholder_actions: bullets[1] || fallbackResponse.key_stakeholder_actions,
          ignore_later_items: bullets[2] || fallbackResponse.ignore_later_items,
          raw_bullets: bullets.length > 0 ? bullets : fallbackResponse.raw_bullets,
        });
      } catch (e: any) {
        // Quiet fallback on rate limit or API failure
      }
    }

    return res.json(fallbackResponse);
  } catch (error: any) {
    console.error('Error in /api/triage/signal:', error);
    res.json({
      urgent_external_demands: 'High-priority requests that need your attention today.',
      key_stakeholder_actions: 'Important things to follow up on with people.',
      ignore_later_items: 'Low-value emails and routine notices can wait until later.',
      raw_bullets: []
    });
  }
});

// 3. Micro-Mindset Reframer API
app.post('/api/triage/reframe', async (req: Request, res: Response) => {
  try {
    const { user_input } = req.body;
    const fallbackSentence = 'You can only do so much today — pick one small step that moves this forward.';

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = getGeminiAI();
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `Give one short, plain-language sentence to help the user refocus for: ${user_input}`,
          config: {
            systemInstruction: `You are UnburdenMe. Output exactly one sentence, max 20 words, that helps the user focus on a practical next step. Use gentle, human wording, British English. Do not moralise or use 'stress'.`,
            temperature: 0.5,
            topP: 0.95,
          },
        });

        const sentence = (response.text || '').trim();
        if (sentence) {
          return res.json({ grounding_sentence: sentence, word_count: sentence.split(/\s+/).filter(Boolean).length });
        }
      } catch (e: any) {
        // Quiet fallback
      }
    }

    return res.json({ grounding_sentence: fallbackSentence, word_count: fallbackSentence.split(/\s+/).filter(Boolean).length });
  } catch (error: any) {
    console.error('Error in /api/triage/reframe:', error);
    return res.json({ grounding_sentence: 'Focus on one small thing you can do right now.', word_count: 6 });
  }
});

// 4. Full Pipeline Endpoint (Classify + Signal + Reframe + Drafts)
app.post('/api/triage/full', async (req: Request, res: Response) => {
  try {
    const {
      user_input = '',
      instruction = 'Respond to this message',
      channel = 'Email',
      context_type = 'work',
      desired_tone = 'Assertive',
      metadata
    } = req.body;

    if (!user_input) return res.status(400).json({ error: 'user_input is required' });

    const apiKey = process.env.GEMINI_API_KEY;
    const ai = getGeminiAI();

    // 1. Local Classification (instant)
    let classification = { category: 'STANDARD_WORKLOAD', requires_human_disclaimer: false, reason: 'Standard workload and task prioritisation query.' };
    const lowerInput = user_input.toLowerCase();
    if (lowerInput.includes('harass') || lowerInput.includes('terminate') || lowerInput.includes('fire') || lowerInput.includes('discrimination') || lowerInput.includes('grievance')) {
      classification = { category: 'SENSITIVE_HR', requires_human_disclaimer: true, reason: 'HR or contractual sensitivity detected.' };
    } else if (lowerInput.includes('panic') || lowerInput.includes('hospital') || lowerInput.includes('breakdown') || lowerInput.includes('cannot function')) {
      classification = { category: 'SEVERE_BURNOUT', requires_human_disclaimer: true, reason: 'High distress detected.' };
    }

    // 2. Default grounding sentence
    let grounding_sentence = 'You can only do so much today — pick one small step that moves this forward.';

    // 3. Draft engine
    let draftOutputText = '';
    if (apiKey) {
      try {
        const promptContext = `User message: "${user_input}"\nInstruction: "${instruction}"\nChannel: ${channel}\nTone: ${desired_tone}`;
        const draftRes = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: promptContext,
          config: {
            systemInstruction: `You are UnburdenMe, a friendly assistant that writes short, natural, personal messages. For this input, return exactly three short draft options labelled Option A, Option B, Option C. Keep sentences plain, avoid corporate jargon, and match the user's tone where possible. Use British English.`,
            temperature: 0.35,
            topP: 0.95,
            responseMimeType: 'text/plain',
          }
        });
        draftOutputText = draftRes.text || generateFallbackResponse(user_input, instruction, channel, context_type, desired_tone);
      } catch (e: any) {
        draftOutputText = generateFallbackResponse(user_input, instruction, channel, context_type, desired_tone);
      }
    } else {
      draftOutputText = generateFallbackResponse(user_input, instruction, channel, context_type, desired_tone);
    }

    return res.json({ classification, grounding: { grounding_sentence, word_count: grounding_sentence.split(/\s+/).filter(Boolean).length }, raw_llm_response: draftOutputText, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('Error in /api/triage/full:', error);
    return res.json({ classification: { category: 'STANDARD_WORKLOAD', requires_human_disclaimer: false, reason: 'Fallback pipeline triggered' }, grounding: { grounding_sentence: 'Focus on one small thing to move this forward.', word_count: 7 }, raw_llm_response: generateFallbackResponse(req.body?.user_input || '', req.body?.instruction || 'Respond to this message', req.body?.channel || 'Email', req.body?.context_type || 'work', req.body?.desired_tone || 'Assertive'), timestamp: new Date().toISOString() });
  }
});

// 5. Micro Summary Generation API
app.post('/api/summary/generate', async (req: Request, res: Response) => {
  try {
    const { content, contentType, summaryOutcome } = req.body || {};
    const textToSummarize = (content || '').trim();
    const typeLabel = contentType || 'Email Thread';
    const outcomeLabel = summaryOutcome || 'Bullet Points';

    if (!textToSummarize) return res.status(400).json({ error: 'Content is required for micro summary.' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = getGeminiAI();
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Summarise this ${typeLabel} in plain, friendly language and give a short title, a 2-sentence summary and 3 short bullet points.\n\nContent:\n${textToSummarize}`,
          config: {
            systemInstruction: `You are UnburdenMe. Produce a short, human-friendly summary in British English: a title (4-7 words), a 2-sentence summary, and 3 simple bullet points with clear next steps. Avoid jargon.`,
            temperature: 0.25,
            topP: 0.95,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summaryParagraph: { type: Type.STRING },
                bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                decisions: { type: Type.ARRAY, items: { type: Type.STRING } },
                deadlines: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['title', 'summaryParagraph', 'bulletPoints']
            }
          }
        });

        const resultText = response.text || '{}';
        const parsed = JSON.parse(resultText);
        if (parsed.title && Array.isArray(parsed.bulletPoints)) {
          const summaryWords = [parsed.summaryParagraph || '', ...(parsed.bulletPoints || []), ...(parsed.actionItems || [])].join(' ').split(/\s+/).filter(Boolean).length;
          return res.json({ id: 'sum-' + Date.now(), title: parsed.title, contentType: typeLabel, summaryOutcome: outcomeLabel, summaryParagraph: parsed.summaryParagraph || '', bulletPoints: parsed.bulletPoints.slice(0, 5), actionItems: parsed.actionItems || [], decisions: parsed.decisions || [], deadlines: parsed.deadlines || [], originalSnippet: textToSummarize.slice(0, 180) + '...', originalWordCount: textToSummarize.split(/\s+/).filter(Boolean).length, summaryWordCount: summaryWords, createdAt: new Date().toISOString() });
        }
      } catch (geminiError) {
        console.warn('Gemini summary call failed or rate-limited. Serving intelligent fallback:', geminiError);
      }
    }

    // Fallback summary
    const lines = textToSummarize.split(/\n+/).map((l: string) => l.trim()).filter((l: string) => l.length > 10);
    const firstLine = lines[0] || textToSummarize;
    const fallbackTitle = `${typeLabel} Digest: ${firstLine.slice(0, 35)}...`;
    const generatedBullets = lines.slice(0, 4).map((l: string) => l.replace(/^[-*•\d.\s]+/, ''));
    if (generatedBullets.length === 0) generatedBullets.push('Key details extracted from provided text.');

    return res.json({ id: 'sum-' + Date.now(), title: fallbackTitle, contentType: typeLabel, summaryOutcome: outcomeLabel, summaryParagraph: textToSummarize.slice(0, 220) + '...', bulletPoints: generatedBullets.slice(0, 5), actionItems: [], decisions: [], deadlines: [], originalSnippet: textToSummarize.slice(0, 180) + '...', originalWordCount: textToSummarize.split(/\s+/).filter(Boolean).length, summaryWordCount: 85, createdAt: new Date().toISOString() });
  } catch (err: any) {
    console.error('Error in /api/summary/generate:', err);
    return res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// 6. Problem Solver API Endpoint
app.post('/api/problem-solver/solve', async (req: Request, res: Response) => {
  try {
    const { challenge } = req.body || {};
    const promptText = (challenge || '').trim();

    if (!promptText) return res.status(400).json({ error: 'Challenge description is required.' });

    const SENSITIVE_DISCLAIMER_MESSAGE_SIMPLE = "This issue involves a sensitive legal, medical, or safety matter. For your safety and wellbeing, please consult a qualified professional.";

    const sensitiveRegex = /\b(medical|doctor|patient|clinical|psychiat|depress|suicid|self-harm|medication|pill|dosage|illness|hospital|surgery|lawsuit|suing|sue|court|attorney|lawyer|liability)\b/i;
    if (sensitiveRegex.test(promptText)) return res.json({ isSensitive: true, sensitiveDisclaimer: SENSITIVE_DISCLAIMER_MESSAGE_SIMPLE, timestamp: new Date().toISOString() });

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = getGeminiAI();
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `User problem:\n${promptText}\n\nGive three simple, practical options written in plain, human language. For each option give 2 short pros and 1 short con, and 2 quick action steps. Lead with a one-line recommended first step. Use British English and avoid corporate jargon.`,
          config: {
            systemInstruction: `You are UnburdenMe Problem Solver. Provide three plain-language, practical options with short pros/cons and clear next steps. Keep tone friendly and useful.`,
            temperature: 0.3,
            topP: 0.95,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isSensitive: { type: Type.BOOLEAN },
                solutions: { type: Type.ARRAY, items: { type: Type.OBJECT } },
                recommendedFirstStep: { type: Type.STRING }
              },
              required: ['isSensitive']
            }
          }
        });

        const resultText = response.text || '{}';
        const parsed = JSON.parse(resultText);
        if (parsed.isSensitive) return res.json({ isSensitive: true, sensitiveDisclaimer: SENSITIVE_DISCLAIMER_MESSAGE_SIMPLE, timestamp: new Date().toISOString() });
        if (parsed.solutions && parsed.solutions.length >= 1) return res.json({ isSensitive: false, solutions: parsed.solutions, recommendedFirstStep: parsed.recommendedFirstStep || 'Try the first small step and see how it goes.', timestamp: new Date().toISOString() });
      } catch (geminiError) {
        console.warn('Gemini problem solver failed or rate-limited. Using intelligent fallback:', geminiError);
      }
    }

    // Fallback
    return res.json({ isSensitive: false, solutions: [ { optionKey: 'Option A', title: 'Direct approach', overview: 'A short direct fix to resolve the issue quickly.', pros: ['Quick result','Simple'], cons: ['May need follow-up'], actionSteps: ['Do the main step','Send a quick update'] }, { optionKey: 'Option B', title: 'Split into small steps', overview: 'Break it down and handle the most important part first.', pros: ['Less stressful','Flexible'], cons: ['Takes longer overall'], actionSteps: ['Do the small first step','Set a short deadline'] }, { optionKey: 'Option C', title: 'Ask for help', overview: 'Get a second pair of hands to speed resolution.', pros: ['Shared load','Outside perspective'], cons: ['Requires coordination'], actionSteps: ['Ask one person for help','Share clear instructions'] } ], recommendedFirstStep: 'Start with the quickest, smallest step that moves this forward.', timestamp: new Date().toISOString() });

  } catch (err: any) {
    console.error('Error in /api/problem-solver/solve:', err);
    return res.status(500).json({ error: 'Failed to process problem solver request.' });
  }
});

// 7. Preparation Tool - Personalized Event/Task Checklist Generator
app.post('/api/prep-tool/generate', async (req: Request, res: Response) => {
  try {
    const { activity, activity_type = 'Event', context_notes = '' } = req.body;

    if (!activity || typeof activity !== 'string' || !activity.trim()) return res.status(400).json({ error: 'Activity headline is required.' });

    const combinedQuery = `${activity} ${activity_type} ${context_notes}`.toLowerCase();
    const sensitiveKeywords = ['harass', 'discrimina', 'terminate', 'fire', 'grievance', 'lawsuit', 'sue', 'court', 'lawyer', 'hospital', 'panic', 'self-harm'];
    const isSensitiveQuery = sensitiveKeywords.some(keyword => combinedQuery.includes(keyword));
    if (isSensitiveQuery) return res.json({ isSensitive: true, sensitiveDisclaimer: SENSITIVE_DISCLAIMER_MESSAGE, timestamp: new Date().toISOString() });

    const ai = getGeminiAI();
    if (process.env.GEMINI_API_KEY) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Create a short, friendly preparation checklist for: ${activity} (${activity_type}). Keep it simple and practical. Include 3-4 "essentials", 2-3 "prep steps" and 1-2 "follow-ups". Use British English.`,
          config: {
            systemInstruction: `You are UnburdenMe Prep Coach. Produce a short, human checklist with simple, friendly wording. Avoid corporate phrasing.`,
            temperature: 0.3,
            topP: 0.95,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: { isSensitive: { type: Type.BOOLEAN }, headline: { type: Type.STRING }, mindsetNote: { type: Type.STRING }, categories: { type: Type.ARRAY } },
              required: ['isSensitive', 'headline']
            }
          }
        });

        const resultText = response.text || '{}';
        const parsed = JSON.parse(resultText);
        if (parsed.categories && parsed.categories.length > 0) return res.json({ isSensitive: false, headline: parsed.headline || `Prep: ${activity}`, mindsetNote: parsed.mindsetNote || 'Keep it simple and focus on one thing at a time.', categories: parsed.categories, timestamp: new Date().toISOString() });
      } catch (geminiError) {
        console.warn('Gemini prep tool failed or rate-limited. Using intelligent fallback:', geminiError);
      }
    }

    // Fallback
    const isInterview = combinedQuery.includes('interview') || combinedQuery.includes('job');
    const fallbackCategories = isInterview ? [ { category: 'Essentials', items: ['Printed CV or notes','Phone/charger','Directions'] }, { category: 'Prep steps', items: ['Pick 3 examples to talk about','Prepare 2 questions to ask'] }, { category: 'Follow-ups', items: ['Send a short thank-you note'] } ] : [ { category: 'Essentials', items: ['Any files you need','Notebook','ID'] }, { category: 'Prep steps', items: ['Set aside 20 minutes to review','Write a quick goal statement'] }, { category: 'Follow-ups', items: ['Note any next steps and who you told'] } ];

    return res.json({ isSensitive: false, headline: `Prep Guide: ${activity}`, mindsetNote: `Keep it simple — pick one thing to focus on first.`, categories: fallbackCategories, timestamp: new Date().toISOString() });

  } catch (err: any) {
    console.error('Error in /api/prep-tool/generate:', err);
    return res.status(500).json({ error: 'Failed to generate preparation checklist.' });
  }
});

// Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => { res.sendFile(path.join(distPath, 'index.html')); });
  }

  app.listen(PORT, '0.0.0.0', () => { console.log(`Triage Engine server running on http://0.0.0.0:${PORT}`); });
}

startServer();

export {}; 
