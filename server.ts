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

// Initialize Gemini Client
const getGeminiAI = () => {
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
};

// Helper function to generate realistic fallback triage responses when Gemini API rate limits or quota errors occur
const SENSITIVE_DISCLAIMER_MESSAGE = 'Notice: This matter involves sensitive legal, HR, or clinical health themes. This engine provides executive workload organisation support and is not a substitute for formal HR, legal, or medical counsel. Please consult a qualified professional.';

function generateFallbackResponse(user_input: string, instruction: string = 'Respond to this message', channel: string = 'Email', context_type: string = 'work', desired_tone: string = 'Assertive') {
  const isSpoken = channel === 'Phone Call' || channel === 'Face-to-Face';

  // Extract bracketed sensitive info placeholders if any exist in user_input
  const maskedMatches = user_input.match(/\[[A-[#a-zA-Z0-9_\s-]+\]/g) || [];

  const taskSnippet = user_input.length > 120 ? user_input.slice(0, 120) + '...' : user_input;

  // Determine recommended next steps for Section 3 based on user input & instruction
  const lowerInput = (user_input + ' ' + instruction).toLowerCase();
  const isSensitiveFallback = ['harass', 'discrimina', 'terminate', 'fire', 'grievance', 'lawsuit', 'sue', 'court', 'lawyer', 'attorney', 'hospital', 'doctor', 'panic', 'breakdown', 'suicid', 'self-harm', 'illegal', 'violence', 'exploit', 'hack'].some(k => lowerInput.includes(k));

  let fallbackStepsText = '';
  if (isSensitiveFallback) {
    fallbackStepsText = `#### Recommended Next Steps:
1. Hold off on replying or getting directly involved until you have proper advice.
2. Reach out to a qualified expert, your doctor, HR, or the appropriate authority.
3. Keep a clear, dated record of all messages and updates for reference.`;
  } else if (instruction && instruction !== 'Respond to this message') {
    fallbackStepsText = `#### Recommended Next Steps:
1. Check the draft options to make sure they match what you asked for: "${instruction}".
2. Pick and edit the draft that best fits your timing and what you are comfortable with.
3. Send or share your response so everyone is on the same page.`;
  } else {
    fallbackStepsText = `#### Recommended Next Steps:
1. Take a quick look at your schedule to see if this clashes with anything urgent.
2. Pick and tweak the draft option that best fits your timing and boundaries.
3. Send or share your reply so expectations are set clearly.`;
  }

  if (isSpoken) {
    return `### 1. OPTIONS OVERVIEW

* **Option A: Clear & Direct Answer** - Offer a straightforward answer and address their request right away.
* **Option B: Step-by-Step Plan** - Take care of the main priority first and schedule the rest for later.
* **Option C: Postpone for Now** - Let them know you have received this and will get to it when you next have time.

---

### 2. EDITABLE DRAFTS

#### Draft for Option A: Clear & Direct Answer
\`\`\`text
[SPOKEN OPENING LINE]
"Hi [Name], thanks for catching up. I wanted to talk through what you sent over about: ${taskSnippet}"

[CORE TALKING POINTS]
• "I have had a look through the details and can take care of this for you today."
• ${instruction && instruction !== 'Respond to this message' ? `"Regarding what you needed: I will ${instruction.toLowerCase()}."` : `"Here is the main plan: I will complete the main task today."`}

[HANDLING PUSHBACK]
• "If anything else pops up, we can adjust as we go, but this covers the important part."

[VOCAL TONE & PACING TIP]
Speak in an ${desired_tone.toLowerCase()} and steady voice. Keep your pace relaxed.
\`\`\`

#### Draft for Option B: Step-by-Step Plan
\`\`\`text
[SPOKEN OPENING LINE]
"Hi [Name], do you have two quick minutes to talk through how we approach this?"

[CORE TALKING POINTS]
• "I saw your note regarding: ${taskSnippet}"
• "I can get the main part done for you by [Date/Time], and I will finish the rest right after."

[HANDLING PUSHBACK]
• "This gets things moving straight away without holding anything up."

[VOCAL TONE & PACING TIP]
Keep your tone warm, practical, and conversational.
\`\`\`

#### Draft for Option C: Postpone for Now
\`\`\`text
[SPOKEN OPENING LINE]
"Hi [Name], I got your message about ${taskSnippet} and just wanted to let you know I received it."

[CORE TALKING POINTS]
• "I am focusing on a few pressing things right now, but I will get to this as soon as I have a clear window."
• "I will drop you a line as soon as I pick it up."

[HANDLING PUSHBACK]
• "I will let you know straight away if I can free up time sooner."

[VOCAL TONE & PACING TIP]
Speak clearly, calmly, and naturally.
\`\`\`

---

### 3. CONSIDERATION / HUMAN CHECK
${fallbackStepsText}

* **Focus Reminder** Whichever option you choose, make sure it feels right to you and give yourself space to recharge.`;
  }

  // Written Channels (Email, WhatsApp, SMS, Letter, Chat)
  return `### 1. OPTIONS OVERVIEW

* **Option A: Clear & Direct Answer** - Reply directly to their request with a simple, helpful answer.
* **Option B: Step-by-Step Plan** - Deal with the main priority today and set a realistic timeline for the rest.
* **Option C: Postpone for Now** - Acknowledge their message and let them know you will pick it up when you are next free.

---

### 2. EDITABLE DRAFTS

#### Draft for Option A: Clear & Direct Answer
\`\`\`text
Hi [Name],

Thanks for getting in touch about: ${taskSnippet}

I have gone through the details and am happy to help with this. ${instruction && instruction !== 'Respond to this message' ? `As requested, ${instruction.toLowerCase()}.` : 'I will get this sorted and send over a quick update by [Date/Time].'}

Let me know if you need anything else!

Best,
[Your Name]
\`\`\`

#### Draft for Option B: Step-by-Step Plan
\`\`\`text
Hi [Name],

Thanks for your message regarding: ${taskSnippet}

I can tackle the most urgent part right now, and I will have the rest wrapped up for you by [Date/Time].

Let me know if that sounds like a good plan.

Best,
[Your Name]
\`\`\`

#### Draft for Option C: Postpone for Now
\`\`\`text
Hi [Name],

I have received your message about: ${taskSnippet}

Just letting you know I have seen this. I am tied up with a few priorities at the moment, but I will get to it at my next available opportunity and update you as soon as I do.

Thanks for your patience!

Best,
[Your Name]
\`\`\`

---

### 3. CONSIDERATION / HUMAN CHECK
${fallbackStepsText}

* **Focus Reminder** Whichever option you choose, make sure it feels right to you and give yourself space to recharge.`;
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
    let reason = 'Standard workload and everyday communication request.';

    if (lower.includes('harass') || lower.includes('terminate') || lower.includes('fire') || lower.includes('discrimination') || lower.includes('grievance')) {
      category = 'SENSITIVE_HR';
      requires_human_disclaimer = true;
      reason = 'Sensitive workplace issue or HR grievance flagged.';
    } else if (lower.includes('panic') || lower.includes('hospital') || lower.includes('breakdown') || lower.includes('cannot function') || lower.includes('physical harm')) {
      category = 'SEVERE_BURNOUT';
      requires_human_disclaimer = true;
      reason = 'High emotional distress or medical concern flagged.';
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = getGeminiAI();
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `Analyze this user query: "${user_input}"`,
          config: {
            systemInstruction: `Analyze the user query and classify it into one of the following categories using simple human language:
- STANDARD_WORKLOAD: Normal tasks, deadlines, email overload, calendar management, everyday boundaries.
- SENSITIVE_HR: Workplace disputes, unfair treatment, contracts, firing, formal grievances.
- SEVERE_BURNOUT: Mental health breakdown, severe distress, physical health issues.

OUTPUT FORMAT (JSON ONLY):
{
  "category": "STANDARD_WORKLOAD | SENSITIVE_HR | SEVERE_BURNOUT",
  "requires_human_disclaimer": true | false,
  "reason": "short explanation in natural, simple British English"
}`,
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
      reason: 'Standard workload and communication request.'
    });
  }
});

// 2. Triage & Signal Engine API (Data Digest)
app.post('/api/triage/signal', async (req: Request, res: Response) => {
  try {
    const { calendar_events_count = 5, unread_email_count = 20, top_email_subject_lines = [], context_type = 'hybrid' } = req.body;

    const fallbackResponse = {
      urgent_external_demands: 'Important requests from others that need quick attention today.',
      key_stakeholder_actions: 'A few key items needing your review or approval.',
      ignore_later_items: `General updates, newsletters, and ${Math.max(0, unread_email_count - 3)} non-urgent items you can leave for later.`,
      raw_bullets: [
        'Urgent External Demand: Important requests from people waiting on your reply.',
        'Key Stakeholder Action: Project updates and documents ready for your review.',
        `Ignore / Process Later (${unread_email_count} items): Routine updates and newsletters you can deal with later.`
      ]
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = getGeminiAI();
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `Workload Overview (${context_type} context):
- Calendar Meetings/Events: ${calendar_events_count}
- Unread Messages/Emails: ${unread_email_count}
- Subject Lines: ${JSON.stringify(top_email_subject_lines)}`,
          config: {
            systemInstruction: `You are a helpful companion sorting through daily workload noise. Summarise the workload in 3 simple, human-sounding bullet points.
RULES:
- Exactly 3 bullet points starting with:
  1. Urgent External Demand:
  2. Key Stakeholder Action:
  3. Ignore / Process Later:
- Use warm, plain, conversational British English (e.g. organise, prioritising).
- Avoid robotic, corporate jargon, buzzwords, or overly formal executive phrasing.
- Do not offer emotional unsolicited advice or tell the user how to feel. NEVER use the word "stress".`,
            temperature: 0.2,
            topP: 0.95,
          },
        });

        const text = response.text || '';
        const bullets = text.split('\n').filter(line => line.trim().length > 0);
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
      urgent_external_demands: 'Important messages needing quick attention today.',
      key_stakeholder_actions: 'Key tasks and approvals to look over when free.',
      ignore_later_items: 'Routine updates and newsletters deferred for later.',
      raw_bullets: []
    });
  }
});

// 3. Micro-Mindset Reframer API
app.post('/api/triage/reframe', async (req: Request, res: Response) => {
  try {
    const { user_input } = req.body;
    const fallbackSentence = 'You cannot add more hours to the day, but you can choose what to focus on first.';

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = getGeminiAI();
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `User Context: "${user_input}"`,
          config: {
            systemInstruction: `Give the user exactly ONE grounding sentence that helps them focus on what is in their direct control today.
RULES:
- Maximum 20 words.
- Write naturally, like a thoughtful human friend.
- NO corporate jargon, fluff, or clichés (e.g., "Take a deep breath!", "Everything happens for a reason").
- NEVER use the word "stress".
- Use natural British English spelling and phrasing (e.g., prioritising, behaviour).`,
            temperature: 0.6,
            topP: 0.95,
          },
        });

        const sentence = (response.text || '').trim();
        if (sentence) {
          return res.json({ grounding_sentence: sentence, word_count: sentence.split(/\s+/).filter(Boolean).length });
        }
      } catch (e: any) {
        // Quiet fallback on rate limit or API failure
      }
    }

    return res.json({
      grounding_sentence: fallbackSentence,
      word_count: fallbackSentence.split(/\s+/).filter(Boolean).length
    });
  } catch (error: any) {
    console.error('Error in /api/triage/reframe:', error);
    res.json({
      grounding_sentence: 'Focus on what you can control right now and take things one step at a time.',
      word_count: 14
    });
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

    if (!user_input) {
      return res.status(400).json({ error: 'user_input is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const ai = getGeminiAI();

    // 1. Local Classification (Instant, 0ms, zero quota)
    let classification = {
      category: 'STANDARD_WORKLOAD',
      requires_human_disclaimer: false,
      reason: 'Standard workload and task prioritisation query.'
    };

    const lowerInput = user_input.toLowerCase();
    if (lowerInput.includes('harass') || lowerInput.includes('terminate') || lowerInput.includes('fire') || lowerInput.includes('discrimination') || lowerInput.includes('grievance')) {
      classification = { category: 'SENSITIVE_HR', requires_human_disclaimer: true, reason: 'HR or legal dispute flagged.' };
    } else if (lowerInput.includes('panic') || lowerInput.includes('hospital') || lowerInput.includes('breakdown') || lowerInput.includes('cannot function')) {
      classification = { category: 'SEVERE_BURNOUT', requires_human_disclaimer: true, reason: 'High distress or personal health concern flagged.' };
    }

    // 2. Default Reframer Grounding Sentence
    let grounding_sentence = 'You cannot add more hours to the day, but you can choose what to focus on first.';

    // 3. Draft Engine Prompt (Single Call)
    let draftOutputText = '';
    if (apiKey) {
      try {
        const promptContext = `
[EXACT USER REQUEST / MESSAGE CONTENT]
"${user_input}"

[WHAT THE USER WANTS TO ACHIEVE / SPECIFIC OUTCOME INSTRUCTION]
"${instruction || 'Respond to this message'}"

[SELECTED SETTINGS]
- Medium / Channel: ${channel}
- Context: ${context_type} (personal, work, or hybrid)
- Desired Tone: ${desired_tone}
${metadata ? `- Background Context: ${metadata.calendar_events_count} meetings scheduled today, ${metadata.unread_email_count} unread messages` : ''}

[CRITICAL INSTRUCTIONS FOR GENERATING THE 3 DRAFT OPTIONS]
1. NATURAL HUMAN LANGUAGE & ZERO JARGON:
   - Write completely naturally like a real human being speaking or writing to another human.
   - ABSOLUTELY NO corporate buzzwords, stiff corporate speak, artificial AI terminology, or unnatural phrases (e.g. avoid words like "synergy", "paradigm", "leverage", "bandwidth", "alignment", "touch base", "delve", "foster").
   - Match the requested [Desired Tone] (${desired_tone}) naturally without making it sound forced or mechanical.
2. ACCURATE & SPECIFIC TASK SOLUTIONS:
   - Carefully read the original request and the [WHAT THE USER WANTS TO ACHIEVE] instruction.
   - All 3 choices MUST directly address the specific details of what was asked.
   - At least 2 of the choices (e.g., Option A & Option B) MUST actively carry out and solve the specific task or request, incorporating the user's specific instruction/outcome.
   - Option C can be a polite deferral explaining that the user will pick this up at their next available opportunity.
3. PRESERVE PLACEHOLDERS: If the original message contains bracketed placeholders like [Name], [Date], [Amount], [Client], [Order ID], [REDACTED], keep them intact in all drafts.
4. CHANNEL MATCHING:
   - Written channels (Email, WhatsApp, SMS, Letter, Chat): Produce clean, copy-pasteable messages with a warm, human greeting and sign-off.
   - Spoken channels (Phone Call, Face-to-Face): Provide a natural spoken script layout with:
     * Spoken Opening Line (natural conversation starter)
     * Core Talking Points (simple bulleted phrases to say out loud)
     * How to Handle Pushback (what to say out loud if pressed)
     * Delivery & Vocal Tone Tip (friendly, grounded advice on tone and pace)
5. BRIEF OVERVIEW: Section 1 ("OPTIONS OVERVIEW") must give a simple 1-sentence explanation for each choice so it is easy to skim.
6. RECOMMENDED NEXT STEPS: In Section 3 ("### 3. CONSIDERATION / HUMAN CHECK"), list up to 3 simple, practical, human next steps based on the user's request. If the query involves HR disputes, medical concerns, or legal trouble, advise them not to engage directly and to talk to an appropriate authority or professional.
7. Always use natural British English (e.g. organise, prioritise, neighbourhood, behaviour).
8. NEVER use the word "stress" or its variations.`;

        const draftRes = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: promptContext,
          config: {
            systemInstruction: `You are UnburdenMe, a helpful and warm communication co-pilot in a smart productivity app. You help people communicate clearly, protect their boundaries, and respond thoughtfully without mental exhaustion.

CORE GUIDELINES:
- Always use plain, friendly, conversational British English.
- Speak like a real human peer. Avoid stiff corporate speak, artificial AI phrasing, or business buzzwords.
- Make all recommendations and drafts clear, specific, and tailor-made to the user's exact request and desired outcome.
- Ensure drafts adopt the requested tone (${desired_tone}) naturally and appropriately.
- Maintain bracketed placeholders (e.g. [Name], [Date]) exactly as provided.
- Keep output nicely formatted with clear Markdown headings and clean paragraph breaks.
- NEVER use the word 'stress'.

REQUIRED OUTPUT FORMAT:
### 1. OPTIONS OVERVIEW
* **Option A: [Simple Title]** - [Brief 1-sentence description]
* **Option B: [Simple Title]** - [Brief 1-sentence description]
* **Option C: [Simple Title]** - [Brief 1-sentence description]

---

### 2. EDITABLE DRAFTS

#### Draft for Option A: [Simple Title]
\`\`\`text
[Full draft text or spoken script for Option A]
\`\`\`

#### Draft for Option B: [Simple Title]
\`\`\`text
[Full draft text or spoken script for Option B]
\`\`\`

#### Draft for Option C: [Simple Title]
\`\`\`text
[Full draft text or spoken script for Option C]
\`\`\`

---

### 3. CONSIDERATION / HUMAN CHECK
#### Recommended Next Steps:
1. [Practical, simple next step tailored to request]
2. [Practical, simple next step tailored to request]
3. [Practical, simple next step tailored to request (omit if not needed)]

* **Focus Reminder** Whichever option you choose, make sure it feels right to you and give yourself space to recharge.`,
            temperature: 0.45,
            topP: 0.95,
          }
        });

        draftOutputText = draftRes.text || generateFallbackResponse(user_input, instruction, channel, context_type, desired_tone);
      } catch (e: any) {
        draftOutputText = generateFallbackResponse(user_input, instruction, channel, context_type, desired_tone);
      }
    } else {
      draftOutputText = generateFallbackResponse(user_input, instruction, channel, context_type, desired_tone);
    }

    return res.json({
      classification,
      grounding: {
        grounding_sentence,
        word_count: grounding_sentence.split(/\s+/).filter(Boolean).length
      },
      raw_llm_response: draftOutputText,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in /api/triage/full:', error);
    return res.json({
      classification: {
        category: 'STANDARD_WORKLOAD',
        requires_human_disclaimer: false,
        reason: 'Fallback pipeline triggered'
      },
      grounding: {
        grounding_sentence: 'You cannot add more hours to the day, but you can choose what to focus on first.',
        word_count: 17
      },
      raw_llm_response: generateFallbackResponse(req.body?.user_input || '', req.body?.instruction || 'Respond to this message', req.body?.channel || 'Email', req.body?.context_type || 'work', req.body?.desired_tone || 'Assertive'),
      timestamp: new Date().toISOString()
    });
  }
});

// 5. Micro Summary Generation API
app.post('/api/summary/generate', async (req: Request, res: Response) => {
  try {
    const { content, contentType, summaryOutcome } = req.body || {};
    const textToSummarize = (content || '').trim();
    const typeLabel = contentType || 'Email Thread';
    const outcomeLabel = summaryOutcome || 'Bullet Points';

    if (!textToSummarize) {
      return res.status(400).json({ error: 'Content is required for micro summary.' });
    }

    const wordCount = textToSummarize.split(/\s+/).filter(Boolean).length;
    const snippet = textToSummarize.length > 180 ? textToSummarize.slice(0, 180) + '...' : textToSummarize;

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = getGeminiAI();
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Summarise the following ${typeLabel} content so it is easy and clear to read.
Preferred Output Style: ${outcomeLabel}.

Requirements:
1. Title: A clear, simple 4-7 word title summarizing the context.
2. Summary Paragraph: A friendly, easy-to-read 2-4 sentence summary of what this is about.
3. Bullet Points: 3 to 5 clear bullet points pulling out the core details.
4. Action Items: Simple, actionable things that need doing.
5. Decisions: Key decisions made or agreed upon.
6. Deadlines: Clear dates or timeframes mentioned.

Use plain, simple British English. Avoid corporate jargon, robotic AI phrasing, and stiff terms.

Content to summarise:
"""
${textToSummarize}
"""`,
          config: {
            temperature: 0.2,
            topP: 0.95,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summaryParagraph: { type: Type.STRING },
                bulletPoints: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                actionItems: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                decisions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                deadlines: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ['title', 'summaryParagraph', 'bulletPoints', 'actionItems', 'decisions', 'deadlines']
            }
          }
        });

        const resultText = response.text || '{}';
        const parsed = JSON.parse(resultText);

        if (parsed.title && Array.isArray(parsed.bulletPoints)) {
          const summaryWords = [
            parsed.summaryParagraph || '',
            ...(parsed.bulletPoints || []),
            ...(parsed.actionItems || []),
            ...(parsed.decisions || []),
            ...(parsed.deadlines || [])
          ].join(' ').split(/\s+/).filter(Boolean).length;

          return res.json({
            id: 'sum-' + Date.now(),
            title: parsed.title,
            contentType: typeLabel,
            summaryOutcome: outcomeLabel,
            summaryParagraph: parsed.summaryParagraph || '',
            bulletPoints: parsed.bulletPoints.slice(0, 5),
            actionItems: parsed.actionItems || [],
            decisions: parsed.decisions || [],
            deadlines: parsed.deadlines || [],
            originalSnippet: snippet,
            originalWordCount: wordCount,
            summaryWordCount: summaryWords,
            createdAt: new Date().toISOString()
          });
        }
      } catch (geminiError) {
        console.warn('Gemini summary call failed or rate-limited. Serving intelligent fallback:', geminiError);
      }
    }

    // Intelligent Fallback Summary
    const lines = textToSummarize.split(/\n+/).map((l: string) => l.trim()).filter((l: string) => l.length > 10);
    const firstLine = lines[0] || textToSummarize;
    const fallbackTitle = `${typeLabel} Overview: ${firstLine.slice(0, 35)}...`;

    const generatedBullets = lines.slice(0, 4).map((l: string) => l.replace(/^[-*•\d.\s]+/, ''));
    if (generatedBullets.length === 0) {
      generatedBullets.push('Key details extracted from provided text.');
    }

    const actionLines = lines.filter((l: string) => /need|must|please|action|todo|check|send/i.test(l));
    const decisionLines = lines.filter((l: string) => /agreed|decided|confirmed|approved|settled/i.test(l));
    const deadlineLines = lines.filter((l: string) => /by|deadline|due|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}:\d{2}/i.test(l));

    return res.json({
      id: 'sum-' + Date.now(),
      title: fallbackTitle,
      contentType: typeLabel,
      summaryOutcome: outcomeLabel,
      summaryParagraph: lines.slice(0, 2).join(' ') || 'Here is a quick overview of the key details from your text.',
      bulletPoints: generatedBullets,
      actionItems: actionLines.length > 0 ? actionLines.slice(0, 3) : ['Review text details and confirm next steps.'],
      decisions: decisionLines.length > 0 ? decisionLines.slice(0, 3) : ['No explicit decisions flagged in text.'],
      deadlines: deadlineLines.length > 0 ? deadlineLines.slice(0, 3) : ['No explicit dates or deadlines detected.'],
      originalSnippet: snippet,
      originalWordCount: wordCount,
      summaryWordCount: Math.round(wordCount * 0.4),
      createdAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in /api/summary/generate:', error);
    res.status(500).json({ error: 'Failed to generate summary.' });
  }
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const template = await vite.transformIndexHtml(
          req.originalUrl,
          `<!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>UnburdenMe</title>
            </head>
            <body>
              <div id="root"></div>
              <script type="module" src="/src/main.tsx"></script>
            </body>
          </html>`
        );
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, '../dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer();
