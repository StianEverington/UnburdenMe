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
  const isPersonal = context_type === 'personal' || ['whatsapp', 'sms', 'family', 'friend'].some(k => user_input.toLowerCase().includes(k) || channel.toLowerCase().includes(k));
  const isSpoken = channel === 'Phone Call' || channel === 'Face-to-Face';

  // Extract bracketed sensitive info placeholders if any exist in user_input
  const maskedMatches = user_input.match(/\[[A-[#a-zA-Z0-9_\s-]+\]/g) || [];
  const sensitivePlaceholders = Array.from(new Set(maskedMatches)).join(', ');

  const taskSnippet = user_input.length > 120 ? user_input.slice(0, 120) + '...' : user_input;
  const outcomeText = instruction && instruction !== 'Respond to this message' ? instruction : 'Respond to this message';

  // Determine recommended next steps for Section 3 based on user input & instruction
  const lowerInput = (user_input + ' ' + instruction).toLowerCase();
  const isSensitiveFallback = ['harass', 'discrimina', 'terminate', 'fire', 'grievance', 'lawsuit', 'sue', 'court', 'lawyer', 'attorney', 'hospital', 'doctor', 'panic', 'breakdown', 'suicid', 'self-harm', 'illegal', 'violence', 'exploit', 'hack'].some(k => lowerInput.includes(k));

  let fallbackStepsText = '';
  if (isSensitiveFallback) {
    fallbackStepsText = `#### Recommended Next Steps:
1. Do not engage directly with the request or party involved until formal guidance is obtained.
2. Seek advice from a qualified professional, doctor, HR representative, or appropriate authority.
3. Keep an objective, dated record of all relevant communications for official reference.`;
  } else if (instruction && instruction !== 'Respond to this message') {
    fallbackStepsText = `#### Recommended Next Steps:
1. Review the draft options to verify they incorporate your requested outcome: "${instruction}".
2. Select and customize the draft option that best matches your timeline and boundary preference.
3. Send or deliver your chosen response to establish clear expectations promptly.`;
  } else {
    fallbackStepsText = `#### Recommended Next Steps:
1. Review your current commitments to identify any immediate conflict with this request.
2. Select and edit the draft option that best matches your preferred timeline and boundary.
3. Send or deliver your chosen response to establish clear expectations promptly.`;
  }

  if (isSpoken) {
    return `### 1. OPTIONS OVERVIEW

* **Option A: Direct Concrete Solution** - Fulfill request directly with concrete next steps.
* **Option B: Phased Counter-Proposal** - Deliver core priority first with full resolution to follow.
* **Option C: Defer to Next Opportunity** - Acknowledge receipt and complete at next opportunity.

---

### 2. EDITABLE DRAFTS

#### Draft for Option A: Direct Concrete Solution
\`\`\`text
[SPOKEN OPENING LINE]
"Hi [Name], thanks for connecting. I wanted to address your request directly regarding: ${taskSnippet}"

[CORE TALKING POINTS]
• "I have reviewed the specifics and can take care of this for you right away."
• ${instruction && instruction !== 'Respond to this message' ? `"Regarding your outcome preference: I will ${instruction.toLowerCase()}."` : `"Here is the concrete solution: I will complete the primary deliverable today."`}

[HANDLING PUSHBACK]
• "If there are any additional details needed, I can adjust as we go, but this resolves the primary item."

[VOCAL TONE & PACING TIP]
Deliver with an ${desired_tone.toLowerCase()} and composed vocal tone. Keep steady pacing.
\`\`\`

#### Draft for Option B: Phased Counter-Proposal
\`\`\`text
[SPOKEN OPENING LINE]
"Hi [Name], do you have two quick minutes to talk through our plan regarding this request?"

[CORE TALKING POINTS]
• "I saw the details for: ${taskSnippet}"
• "I can complete the immediate core priority for you by [Date/Time], and follow up with the complete output shortly after."

[HANDLING PUSHBACK]
• "This ensures we move forward on the crucial part right away without any bottleneck."

[VOCAL TONE & PACING TIP]
Maintain a collaborative and steady demeanor.
\`\`\`

#### Draft for Option C: Defer to Next Opportunity
\`\`\`text
[SPOKEN OPENING LINE]
"Hi [Name], I received your message regarding ${taskSnippet} and wanted to confirm receipt."

[CORE TALKING POINTS]
• "I am currently focused on ongoing priorities, but I will complete this at the next available opportunity."
• "I will update you as soon as I begin working on it."

[HANDLING PUSHBACK]
• "I will notify you immediately if an earlier window opens up."

[VOCAL TONE & PACING TIP]
Speak clearly and calmly with a direct, professional disposition.
\`\`\`

---

### 3. CONSIDERATION / HUMAN CHECK
${fallbackStepsText}

* **Focus Reminder** Whichever option you choose, remember to ensure it is the exact response you would like and give yourself time to relax`;
  }

  // Written Channels (Email, WhatsApp, SMS, Letter, Chat)
  return `### 1. OPTIONS OVERVIEW

* **Option A: Direct Concrete Solution** - Fulfill and answer the specific request directly with proposed resolution steps.
* **Option B: Phased Delivery Counter-Offer** - Deliver core priorities first while establishing a manageable timeline for full completion.
* **Option C: Defer to Next Opportunity** - Acknowledge receipt and state that you will complete this request at the next available opportunity.

---

### 2. EDITABLE DRAFTS

#### Draft for Option A: Direct Concrete Solution
\`\`\`text
Hi [Name],

Thank you for reaching out regarding: ${taskSnippet}

I have reviewed the details and am pleased to provide a direct resolution. ${instruction && instruction !== 'Respond to this message' ? `As requested, ${instruction.toLowerCase()}.` : 'I will complete the required task and send across the final confirmation by [Date/Time].'}

Please let me know if you need any further details.
\`\`\`

#### Draft for Option B: Phased Delivery Counter-Offer
\`\`\`text
Hi [Name],

I am writing regarding your request: ${taskSnippet}

I can address the core requirement immediately, and complete the full remaining output by [Date/Time].

Please let me know if this adjusted plan works well for you.
\`\`\`

#### Draft for Option C: Defer to Next Opportunity
\`\`\`text
Hi [Name],

I received your request regarding: ${taskSnippet}

I am acknowledging receipt and will complete this at my next available opportunity. I will follow up with you as soon as it is processed.

Thank you for your patience.
\`\`\`

---

### 3. CONSIDERATION / HUMAN CHECK
${fallbackStepsText}

* **Focus Reminder** Whichever option you choose, remember to ensure it is the exact response you would like and give yourself time to relax`;
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
          contents: `Analyze this user query: "${user_input}"`,
          config: {
            systemInstruction: `Analyze the user query and classify it into one of the following categories:
- STANDARD_WORKLOAD: Deadlines, scheduling, email overload, prioritising tasks, personal calendar management, routine boundaries.
- SENSITIVE_HR: Discrimination, harassment, formal grievances, firing/termination, contract disputes.
- SEVERE_BURNOUT: References to physical harm, mental health crisis, extreme medical distress.

OUTPUT FORMAT (JSON ONLY):
{
  "category": "STANDARD_WORKLOAD | SENSITIVE_HR | SEVERE_BURNOUT",
  "requires_human_disclaimer": true | false,
  "reason": "short explanation"
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
          contents: `Workload Metadata (${context_type} context):
- Calendar Events Count: ${calendar_events_count}
- Unread Email / Message Count: ${unread_email_count}
- Top Subject Lines: ${JSON.stringify(top_email_subject_lines)}`,
          config: {
            systemInstruction: `You are an executive filtering tool. Analyze the user's workload metadata and return a concise, 3-bullet summary identifying high-priority items versus low-priority noise.
RULES:
- Exactly 3 bullet points starting with:
  1. Urgent External Demand:
  2. Key Stakeholder Action:
  3. Ignore / Process Later:
- Highlight urgent external or stakeholder demands.
- Group routine/internal updates into a single "Ignore / Process Later" category.
- Do not make emotional comments or tell the user how to feel. Avoid using the word "stress".
- Use British English spelling (e.g. organise, prioritise).`,
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
      urgent_external_demands: 'High-priority stakeholder requests requiring focus between scheduled commitments.',
      key_stakeholder_actions: 'Immediate reviews needed on key deliverables.',
      ignore_later_items: 'Routine updates and non-essential emails deferred for EOD processing.',
      raw_bullets: []
    });
  }
});

// 3. Micro-Mindset Reframer API
app.post('/api/triage/reframe', async (req: Request, res: Response) => {
  try {
    const { user_input } = req.body;
    const fallbackSentence = 'You cannot expand the working hours today, but you can choose the top priority deliverable to focus on.';

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = getGeminiAI();
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `User Context: "${user_input}"`,
          config: {
            systemInstruction: `Given a demanding workload or communication situation, output exactly ONE sentence that helps the user shift focus from external pressure to their immediate, actionable locus of control.
RULES:
- Maximum 20 words.
- No toxic positivity or clichés (e.g., "Just breathe!", "Everything happens for a reason").
- Focus purely on prioritisation and personal agency.
- Do NOT use the word "stress".
- Use British English (e.g., prioritise, organisation).`,
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
      grounding_sentence: 'Focus on your immediate locus of control and define your top deliverable first.',
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
      classification = { category: 'SENSITIVE_HR', requires_human_disclaimer: true, reason: 'HR or contractual sensitivity detected.' };
    } else if (lowerInput.includes('panic') || lowerInput.includes('hospital') || lowerInput.includes('breakdown') || lowerInput.includes('cannot function')) {
      classification = { category: 'SEVERE_BURNOUT', requires_human_disclaimer: true, reason: 'High distress detected.' };
    }

    // 2. Default Reframer Grounding Sentence
    let grounding_sentence = 'You cannot expand the working hours today, but you can choose the top priority deliverable to focus on.';

    // 3. Draft Engine Prompt (Single Call)
    let draftOutputText = '';
    if (apiKey) {
      try {
        const promptContext = `
[EXACT USER REQUEST / DESCRIPTION BOX INPUT]
"${user_input}"

[RESPONSE OUTCOME INSTRUCTION FROM USER]
"${instruction || 'Respond to this message'}"

[SELECTED USER VARIABLES]
- Communication Channel: ${channel}
- Context Sphere: ${context_type} (personal, work, or hybrid)
- Desired Tone: ${desired_tone} (e.g., Assertive & Clear Boundary, Polite & Diplomatic, Formal Executive Style, Direct & Concise)
${metadata ? `- Workload Metadata: ${metadata.calendar_events_count} meetings, ${metadata.unread_email_count} unread emails/chats` : ''}

[CRITICAL INSTRUCTIONS FOR GENERATING THE 3 RESPONSE CHOICES]
1. ACCURATE & SPECIFIC TASK SOLUTIONS:
   - Carefully read the exact task details, questions, or requests in the user description input box.
   - All 3 response options and drafts MUST directly answer, read, and reply to the specific request, providing actual solutions reflecting the original input message.
   - AT LEAST 2 OUT OF THE 3 CHOICES (e.g., Option A & Option B) MUST actively incorporate and solve the specific task or outcome requested in the user input and align with the [RESPONSE OUTCOME INSTRUCTION].
   - THE 3RD CHOICE (Option C) can be a more generic/deferral option stating that the user will complete this at the next available opportunity.
   - If the user provided a custom instruction in [RESPONSE OUTCOME INSTRUCTION] (other than the default "Respond to this message"), the suggested responses MUST tailor their choices to incorporate that specified instruction/outcome.
2. SENSITIVE INFORMATION MASKING PRESERVATION: If the user input contains masked or redacted sensitive information (such as [Name], [Date], [Phone Number], [Client], [Order ID], [Amount], [REDACTED], [Address], etc.), you MUST keep those placeholders intact in all 3 generated draft outcome choices.
3. CHANNEL SPECIFICITY:
   - For written channels (Email, WhatsApp, SMS, Letter, Chat): Generate copy-pasteable written message drafts tailored to that specific medium.
   - For spoken verbal channels (Phone Call, Face-to-Face): Format as spoken scripts with clear opening line, core verbal talking points, pushback handling, and spoken vocal tone advice.
4. CONTEXT & TONE REFLECTION: All 3 drafts MUST strongly reflect the chosen Context (${context_type}) and Desired Tone (${desired_tone}).
5. SECTION 2 BREVITY: Section 2 ("ACTIONABLE OPTIONS") MUST provide a brief, concise 1-sentence overview for each of the 3 choice options (Option A, Option B, Option C) to prevent cognitive overload.
6. SECTION 3 RECOMMENDED NEXT STEPS: In Section 3 ("### 3. CONSIDERATION / HUMAN CHECK"), at the start of this section under the subheading, suggest up to 3 numbered brief next steps / recommendations (1., 2., 3., or 1., 2. if only 1 or 2 apply) that are specifically based on the original input written in the first box and the instructions written by the user. Ensure all recommendations are safe, ethical, and non-discriminatory. If the input touches on a sensitive topic (medical distress, HR dispute, legal trouble, harassment, self-harm, or safety issue), recommend NOT engaging directly and seeking advice from a qualified professional, doctor, HR representative, or appropriate authority.`;

        const draftRes = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: promptContext,
          config: {
            systemInstruction: `You are UnburdenMe, an interactive communication co-pilot and workload management assistant inside a smart productivity app.
Your purpose is to help users manage incoming communication volume, set professional and personal boundaries, and maintain a manageable cognitive load.

CORE RULES:
1. ACCURATE & TASK-SPECIFIC SOLUTIONS:
   - Carefully process the exact description provided in the user request box and any custom user instruction provided.
   - At least 2 out of the 3 choices MUST incorporate the specific task or requested outcome, providing actual concrete solutions that directly address the specific content of the message.
   - The 3rd choice (Option C) can be a generic deferral option stating that the user will complete this request at the next available opportunity.
   - All choices must align with and incorporate the user's custom instruction if specified.
2. SENSITIVE INFO PRESERVATION: Any bracketed placeholders like [Name], [Date], [Amount], [Client], [Order ID], [REDACTED] present in the user request MUST remain as anonymized placeholders in all 3 generated drafts.
3. SCANNABLE FORMATTING: Keep prose minimal. Use bullet points, clear bold headings, and markdown text blocks with actual paragraph breaks (blank lines), NOT escaped characters like '\\n', so drafts are easy to read and copy.
4. USER AUTONOMY & NEUTRAL FRAMING: Provide 3 distinct actionable choices (Option A, Option B, Option C) neutrally framed.
5. LANGUAGE & CHANNEL STYLE:
   - Always use plain, simple British English with everyday terms and concepts (e.g., organise, prioritise, behaviour, calendar, favourite).
   - Write natural, human-like language that sounds like a real person — avoid stiff corporate jargon, complex buzzwords, or robotic AI phrasing unless specifically requested by the user.
   - CHANNEL-SPECIFIC FORMATTING:
     * WRITTEN CHANNELS (Email, WhatsApp, Teams, SMS, Letter): Write clear, copy-pasteable written message drafts with appropriate greeting and structure.
     * SPOKEN VERBAL CHANNELS (Phone Call, Face-to-Face):
       - DO NOT write email-style messages.
       - Format each draft as a "Spoken Verbal Script & Talking Points" tailored for spoken telephone calls or in-person conversations.
       - Include:
         1. Opening Spoken Line (natural call starter/icebreaker)
         2. Core Verbal Talking Points (bulleted concise phrases to say out loud)
         3. Handling Verbal Pushback (what to say out loud if pushed back)
         4. Spoken Delivery & Vocal Tone Advice (vocal tone, pacing, and composure)
   - NEVER use the word 'stress' or its derivatives.
   - Works for BOTH professional and personal contexts.
6. SECTION 3 RECOMMENDED NEXT STEPS & SAFETY:
   - In Section 3 ("### 3. CONSIDERATION / HUMAN CHECK"), right under the subheading, include up to 3 numbered brief next steps / recommendations (1., 2., 3. or 1., 2. if only 1 or 2 apply) tailored specifically to the user's input request and instructions.
   - Must be safe, non-discriminatory, and constructive.
   - If the user input involves sensitive matters (medical/clinical distress, mental health, legal dispute, harassment, discrimination, HR grievance, or safety concerns), suggest NOT engaging directly and seeking advice from a qualified professional, doctor, HR representative, or appropriate authority.

RESPONSE STRUCTURE REQUIRED:
### 1. OPTIONS OVERVIEW
* **Option A: [Descriptive Title]** - [Very brief, short overview phrase]
* **Option B: [Descriptive Title]** - [Very brief, short overview phrase]
* **Option C: [Descriptive Title]** - [Very brief, short overview phrase]

### 2. EDITABLE DRAFTS

#### Draft for Option A: [Descriptive Title]
\`\`\`text
[Full draft text for Option A]
\`\`\`

#### Draft for Option B: [Descriptive Title]
\`\`\`text
[Full draft text for Option B]
\`\`\`

#### Draft for Option C: [Descriptive Title]
\`\`\`text
[Full draft text for Option C]
\`\`\`

### 3. CONSIDERATION / HUMAN CHECK
#### Recommended Next Steps:
1. [First specific recommendation/next step based on user input and instruction]
2. [Second specific recommendation/next step based on user input and instruction]
3. [Third specific recommendation/next step based on user input and instruction (omit if only 1 or 2 apply)]

* **Focus Reminder** Whichever option you choose, remember to ensure it is the exact response you would like and give yourself time to relax`,
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
    // Return a 200 fallback response so the client never crashes
    return res.json({
      classification: {
        category: 'STANDARD_WORKLOAD',
        requires_human_disclaimer: false,
        reason: 'Fallback pipeline triggered'
      },
      grounding: {
        grounding_sentence: 'You cannot expand the working hours today, but you can choose the top priority deliverable to focus on.',
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
          contents: `Summarise the following ${typeLabel} content to reduce cognitive load.
Primary User Preferred Outcome Format: ${outcomeLabel}.
Provide a clear, accurate, and to-the-point output using British English.

Requirements:
1. Title: A concise, descriptive 4-7 word title for this summary.
2. Summary Paragraph: A well-crafted 2-4 sentence cohesive summary paragraph distilling the main narrative context.
3. Bullet Points: Exactly 3 to 5 key bullet points covering the core information.
4. Action Items: Clear, actionable tasks for the user or team.
5. Decisions: Key decisions made or agreed upon in the content.
6. Deadlines: Explicit dates, times, or timeframes mentioned.

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
    const fallbackTitle = `${typeLabel} Digest: ${firstLine.slice(0, 35)}...`;

    const generatedBullets = lines.slice(0, 4).map((l: string) => l.replace(/^[-*•\d.\s]+/, ''));
    if (generatedBullets.length === 0) {
      generatedBullets.push('Key details extracted from provided text.');
    }

    const actionLines = lines.filter((l: string) => /need|action|please|should|task|require|deliver|send|review/i.test(l)).slice(0, 3);
    const decisionLines = lines.filter((l: string) => /agreed|decided|approved|confirm|resolved|chosen/i.test(l)).slice(0, 2);
    const deadlineLines = lines.filter((l: string) => /by|deadline|due|today|tomorrow|friday|monday|pm|am|eod|q[1-4]/i.test(l)).slice(0, 2);

    return res.json({
      id: 'sum-' + Date.now(),
      title: fallbackTitle,
      contentType: typeLabel,
      summaryOutcome: outcomeLabel,
      summaryParagraph: textToSummarize.slice(0, 220) + '...',
      bulletPoints: generatedBullets.length >= 3 ? generatedBullets.slice(0, 5) : [
        ...generatedBullets,
        'Core information digested into actionable format.',
        'Review key commitments and confirm next steps.'
      ],
      actionItems: actionLines.length > 0 ? actionLines : ['Review content details and confirm next steps.'],
      decisions: decisionLines.length > 0 ? decisionLines : ['Primary approach confirmed as per text.'],
      deadlines: deadlineLines.length > 0 ? deadlineLines : ['Standard timeline applies.'],
      originalSnippet: snippet,
      originalWordCount: wordCount,
      summaryWordCount: 85,
      createdAt: new Date().toISOString()
    });
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

    if (!promptText) {
      return res.status(400).json({ error: 'Challenge description is required.' });
    }

    const SENSITIVE_DISCLAIMER_MESSAGE = "This issue involves a sensitive medical, legal, or safety matter. For your safety and well-being, UnburdenMe cannot provide advice on this topic. Please consult a trusted professional, doctor, or appropriate authority.";

    // Pre-screening regex for severe sensitive domains (Medical/Clinical/Psychiatric/Legal liability/Financial investment/Physical harm/Violent/Security exploits)
    const sensitiveRegex = /\b(medical|doctor|patient|clinical|psychiat|depress|suicid|self-harm|medication|pill|dosage|illness|symptom|hospital|surgery|lawsuit|suing|sue|court|attorney|lawyer|liability|prosecut|subpoena|criminal|arrest|illegal|stocks|shares|crypto|crypto-currency|investment advice|day trading|portfolio allocation|guaranteed return|physical harm|violence|weapon|hack|exploit|malware)\b/i;

    if (sensitiveRegex.test(promptText)) {
      return res.json({
        isSensitive: true,
        sensitiveDisclaimer: SENSITIVE_DISCLAIMER_MESSAGE,
        timestamp: new Date().toISOString()
      });
    }

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = getGeminiAI();
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `Analyze the user's challenge and provide 3 distinct practical solutions:

User Challenge:
"""
${promptText}
"""`,
          config: {
            temperature: 0.3,
            topP: 0.95,
            systemInstruction: `You are UnburdenMe Problem Solver, an expert decision-support assistant.

STRICT SAFETY & COMPLIANCE DIRECTIVES:
1. You must NEVER provide medical, clinical, psychiatric, legal liability, or financial investment advice.
2. You must NEVER provide advice that facilitates illegal activity, physical harm, safety breaches, or security exploits.
3. If the user prompt touches on severe sensitive topics (medical distress, legal trouble, violence, or self-harm), set "isSensitive" to true and return NOTHING else in solutions or recommendedFirstStep.
   Exact sensitive disclaimer text to return if isSensitive is true:
   "This issue involves a sensitive medical, legal, or safety matter. For your safety and well-being, UnburdenMe cannot provide advice on this topic. Please consult a trusted professional, doctor, or appropriate authority."

OUTPUT FORMAT (JSON ONLY):
If isSensitive is true:
{
  "isSensitive": true,
  "sensitiveDisclaimer": "This issue involves a sensitive medical, legal, or safety matter. For your safety and well-being, UnburdenMe cannot provide advice on this topic. Please consult a trusted professional, doctor, or appropriate authority."
}

If isSensitive is false:
{
  "isSensitive": false,
  "solutions": [
    {
      "optionKey": "Option A",
      "title": "Short Descriptive Title (e.g., Direct & Structured Approach)",
      "overview": "Clear 1-2 sentence solution overview.",
      "pros": ["Key pro 1", "Key pro 2"],
      "cons": ["Key con 1", "Key con 2"],
      "actionSteps": [
        "Concrete action step 1",
        "Concrete action step 2",
        "Concrete action step 3"
      ]
    },
    {
      "optionKey": "Option B",
      "title": "Short Descriptive Title (e.g., Diplomatic & Phased Approach)",
      "overview": "Clear 1-2 sentence solution overview.",
      "pros": ["Key pro 1", "Key pro 2"],
      "cons": ["Key con 1", "Key con 2"],
      "actionSteps": [
        "Concrete action step 1",
        "Concrete action step 2",
        "Concrete action step 3"
      ]
    },
    {
      "optionKey": "Option C",
      "title": "Short Descriptive Title (e.g., Alternative / Low-Risk Approach)",
      "overview": "Clear 1-2 sentence solution overview.",
      "pros": ["Key pro 1", "Key pro 2"],
      "cons": ["Key con 1", "Key con 2"],
      "actionSteps": [
        "Concrete action step 1",
        "Concrete action step 2",
        "Concrete action step 3"
      ]
    }
  ],
  "recommendedFirstStep": "Single clear recommendation on the exact first step to take right now to get started immediately."
}

Use British English spelling (e.g., organisation, prioritisation, behaviour, analyse).`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isSensitive: { type: Type.BOOLEAN },
                sensitiveDisclaimer: { type: Type.STRING },
                solutions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      optionKey: { type: Type.STRING },
                      title: { type: Type.STRING },
                      overview: { type: Type.STRING },
                      pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                      cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                      actionSteps: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['optionKey', 'title', 'overview', 'pros', 'cons', 'actionSteps']
                  }
                },
                recommendedFirstStep: { type: Type.STRING }
              },
              required: ['isSensitive']
            }
          }
        });

        const resultText = response.text || '{}';
        const parsed = JSON.parse(resultText);

        if (parsed.isSensitive) {
          return res.json({
            isSensitive: true,
            sensitiveDisclaimer: SENSITIVE_DISCLAIMER_MESSAGE,
            timestamp: new Date().toISOString()
          });
        }

        if (parsed.solutions && parsed.solutions.length === 3) {
          return res.json({
            isSensitive: false,
            solutions: parsed.solutions,
            recommendedFirstStep: parsed.recommendedFirstStep || 'Begin with Action Step 1 of Option A to establish clear baseline alignment immediately.',
            timestamp: new Date().toISOString()
          });
        }
      } catch (geminiError) {
        console.warn('Gemini problem solver failed or rate-limited. Using intelligent fallback:', geminiError);
      }
    }

    // Intelligent Fallback Solutions for Safe Query
    return res.json({
      isSensitive: false,
      solutions: [
        {
          optionKey: 'Option A',
          title: 'Direct & Structured Approach',
          overview: 'Directly address the primary bottleneck by proposing a focused 15-minute sync and establishing written agreements.',
          pros: ['Immediate clarity and alignment', 'Eliminates guesswork or delayed expectations'],
          cons: ['Requires upfront initiative', 'Demands immediate focus time'],
          actionSteps: [
            'Outline the top 2 priority items in a 3-bullet email or message.',
            'Propose a quick 15-minute alignment call with primary stakeholders.',
            'Send a written recap confirming agreed deadlines immediately after the call.'
          ]
        },
        {
          optionKey: 'Option B',
          title: 'Diplomatic & Phased Approach',
          overview: 'Deconstruct the challenge into manageable milestones to build steady momentum while maintaining stakeholder goodwill.',
          pros: ['Lower friction with stakeholders', 'Provides flexibility for adjustments'],
          cons: ['Resolution is spread over a longer timeframe', 'Requires ongoing milestone tracking'],
          actionSteps: [
            'Identify the single most critical deliverable to complete first.',
            'Communicate a phased timeline giving realistic dates for remaining items.',
            'Gather early feedback on Phase 1 before initiating Phase 2.'
          ]
        },
        {
          optionKey: 'Option C',
          title: 'Alternative / Low-Risk Delegated Approach',
          overview: 'Re-prioritise non-critical elements or leverage existing templates and delegated support to reduce immediate friction.',
          pros: ['Protects personal bandwidth', 'Leverages existing resources'],
          cons: ['May require initial oversight', 'Dependent on resource availability'],
          actionSteps: [
            'Audit existing documentation or past templates to avoid starting from scratch.',
            'Delegate or defer non-urgent secondary tasks to later in the week.',
            'Establish a low-effort asynchronous check-in system.'
          ]
        }
      ],
      recommendedFirstStep: 'Start with Step 1 of Option A by drafting a short 3-bullet summary of your primary bottleneck. If time is limited today, use Step 1 of Option B to focus exclusively on the single highest-value sub-task.',
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('Error in /api/problem-solver/solve:', err);
    return res.status(500).json({ error: 'Failed to process problem solver request.' });
  }
});

// Endpoint 6: Preparation Tool - Personalized Event/Task Checklist Generator
app.post('/api/prep-tool/generate', async (req: Request, res: Response) => {
  try {
    const { activity, activity_type = 'Event', context_notes = '' } = req.body;

    if (!activity || typeof activity !== 'string' || !activity.trim()) {
      return res.status(400).json({ error: 'Activity headline is required.' });
    }

    const activityInput = activity.trim();
    const typeInput = typeof activity_type === 'string' ? activity_type.trim() : 'Event';
    const notesInput = typeof context_notes === 'string' ? context_notes.trim() : '';

    const combinedQuery = `${activityInput} ${typeInput} ${notesInput}`.toLowerCase();

    // Strict Safety Guardrails Screening
    const sensitiveKeywords = [
      'harass', 'discrimina', 'terminate', 'fire', 'grievance', 'lawsuit', 'sue', 'court',
      'lawyer', 'attorney', 'hospital', 'doctor', 'panic', 'breakdown', 'suicid', 'self-harm',
      'illegal', 'violence', 'exploit', 'hack', 'substance', 'abuse', 'overdose'
    ];

    const isSensitiveQuery = sensitiveKeywords.some(keyword => combinedQuery.includes(keyword));

    if (isSensitiveQuery) {
      return res.json({
        isSensitive: true,
        sensitiveDisclaimer: SENSITIVE_DISCLAIMER_MESSAGE,
        timestamp: new Date().toISOString()
      });
    }

    const ai = getGeminiAI();

    if (process.env.GEMINI_API_KEY) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `You are an empathetic, practical, non-judgmental preparation coach for an executive and personal workload companion.
The user needs a personalized, highly practical preparation checklist before an upcoming visit, event, meeting, interview, or task.

Activity Headline: "${activityInput}"
Activity Category: "${typeInput}"
User Context / Notes: "${notesInput || 'None provided'}"

Generate a personalized preparation guide strictly tailored to this specific activity and context.

Rules:
1. Provide a clear, supportive headline.
2. Provide a 1-2 sentence grounding mindset note to give the user focus and confidence.
3. Organize actionable checklist items into 4 distinct categories:
   - "Essential Items & Materials to Have Ready" (3-4 items)
   - "Key Preparation Steps Beforehand" (3-4 items)
   - "Communication & Mindset During the Activity" (2-3 items)
   - "Post-Event Follow-up Actions" (1-2 items)
4. Ensure tone uses plain, simple British English with everyday terms and concepts. Avoid corporate jargon, robotic phrasing, or stiff buzzwords so suggestions feel natural, human-like, and easy for any average person to understand.
5. Use British English spelling (e.g. organisation, prioritisation, behaviour, analyse).`,
          config: {
            systemInstruction: `You return structured JSON for personalized event and activity preparation checklists. Ensure tone is supportive and safe.
Example JSON structure:
{
  "isSensitive": false,
  "headline": "Personalised Preparation Checklist for Job Interview",
  "mindsetNote": "Approach this session with calm composure. Focus on demonstrating your core strengths and listening actively.",
  "categories": [
    {
      "category": "Essential Items & Materials to Have Ready",
      "items": ["2 printed copies of updated CV", "Notebook and pen for key takeaways", "Photo ID and visitor pass confirmation"]
    },
    {
      "category": "Key Preparation Steps Beforehand",
      "items": ["Review 3 key achievements from your recent project", "Draft 2 strategic questions for the interviewer", "Test your route/travel time to arrive 10 minutes early"]
    },
    {
      "category": "Communication & Mindset During the Activity",
      "items": ["Pause briefly before answering complex questions", "Maintain open body posture and steady vocal pacing"]
    },
    {
      "category": "Post-Event Follow-up Actions",
      "items": ["Send a concise thank-you email within 24 hours outlining key mutual discussion points"]
    }
  ]
}`,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isSensitive: { type: Type.BOOLEAN },
                headline: { type: Type.STRING },
                mindsetNote: { type: Type.STRING },
                categories: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      category: { type: Type.STRING },
                      items: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['category', 'items']
                  }
                }
              },
              required: ['isSensitive', 'headline', 'mindsetNote', 'categories']
            }
          }
        });

        const resultText = response.text || '{}';
        const parsed = JSON.parse(resultText);

        if (parsed.categories && parsed.categories.length > 0) {
          return res.json({
            isSensitive: false,
            headline: parsed.headline || `Preparation Checklist: ${activityInput}`,
            mindsetNote: parsed.mindsetNote || 'Approach this activity with clear focus and steady pacing.',
            categories: parsed.categories,
            timestamp: new Date().toISOString()
          });
        }
      } catch (geminiError) {
        console.warn('Gemini prep tool failed or rate-limited. Using intelligent fallback:', geminiError);
      }
    }

    // Intelligent Fallback Prep Checklist Generator for Safe Query
    const isInterview = combinedQuery.includes('interview') || combinedQuery.includes('job') || combinedQuery.includes('career');
    const isMeeting = combinedQuery.includes('meeting') || combinedQuery.includes('review') || combinedQuery.includes('sync') || combinedQuery.includes('client');
    const isVisit = combinedQuery.includes('visit') || combinedQuery.includes('doctor') || combinedQuery.includes('appointment') || combinedQuery.includes('family');

    let fallbackCategories = [];

    if (isInterview) {
      fallbackCategories = [
        {
          category: "Essential Items & Materials to Have Ready",
          items: [
            `2 physical or digital copies of your resume/portfolio for "${activityInput}"`,
            "A dedicated notepad and pen to capture key discussion points",
            "Confirmed contact details for the host or interviewer"
          ]
        },
        {
          category: "Key Preparation Steps Beforehand",
          items: [
            "Prepare 3 concise examples illustrating your core strengths and problem-solving experience",
            "Formulate 2-3 thoughtful questions regarding team priorities or role expectations",
            "Verify logistics, route, or video link settings 15 minutes in advance"
          ]
        },
        {
          category: "Communication & Mindset During the Activity",
          items: [
            "Maintain steady vocal pacing and pause briefly before answering complex prompts",
            "Emphasise collaborative outcomes and key lessons learned"
          ]
        },
        {
          category: "Post-Event Follow-up Actions",
          items: [
            "Send a short thank-you note within 24 hours confirming your interest and key meeting takeaways"
          ]
        }
      ];
    } else if (isMeeting) {
      fallbackCategories = [
        {
          category: "Essential Items & Materials to Have Ready",
          items: [
            `Key discussion agenda or slide deck regarding "${activityInput}"`,
            "List of key stakeholders and their primary decision-making priorities",
            "Action item tracker to log deliverables in real time"
          ]
        },
        {
          category: "Key Preparation Steps Beforehand",
          items: [
            "Review previous meeting notes to verify open action items",
            "Define the exact target outcome or decision needed by the end of the session",
            "Circulate supporting materials 1 hour prior to ensure all attendees are aligned"
          ]
        },
        {
          category: "Communication & Mindset During the Activity",
          items: [
            "Start by clearly stating the objective and time box for each agenda topic",
            "Guide side-discussions back to core priorities gracefully"
          ]
        },
        {
          category: "Post-Event Follow-up Actions",
          items: [
            "Distribute a 3-bullet summary of agreed decisions and assignees immediately after"
          ]
        }
      ];
    } else if (isVisit) {
      fallbackCategories = [
        {
          category: "Essential Items & Materials to Have Ready",
          items: [
            `Relevant documentation or personal items for "${activityInput}"`,
            "Valid photo ID, pass, or confirmation details",
            "Comfortable attire and water bottle for travel"
          ]
        },
        {
          category: "Key Preparation Steps Beforehand",
          items: [
            "Confirm timing and location address with all parties involved",
            "Note down any specific questions or points you wish to discuss",
            "Allow a 15-minute travel buffer to avoid rushing"
          ]
        },
        {
          category: "Communication & Mindset During the Activity",
          items: [
            "Stay present and give yourself permission to move at an unhurried pace",
            "Express any preferences or boundaries clearly and calmly"
          ]
        },
        {
          category: "Post-Event Follow-up Actions",
          items: [
            "Log any follow-up appointments, dates, or notes in your schedule calendar"
          ]
        }
      ];
    } else {
      fallbackCategories = [
        {
          category: "Essential Items & Materials to Have Ready",
          items: [
            `All essential reference files, notes, or equipment needed for "${activityInput}"`,
            "A clean notepad or digital document to track key milestones",
            "Necessary login credentials or access passes"
          ]
        },
        {
          category: "Key Preparation Steps Beforehand",
          items: [
            "Break down the activity into 2-3 manageable preparation phases",
            "Set aside 15 minutes of uninterrupted quiet time prior to starting",
            "Define your single definition of success for this task"
          ]
        },
        {
          category: "Communication & Mindset During the Activity",
          items: [
            "Focus on one step at a time without multi-tasking",
            "Keep an assertive, steady posture and clear communication"
          ]
        },
        {
          category: "Post-Event Follow-up Actions",
          items: [
            "Review what went well and tick off completed tasks on your priority list"
          ]
        }
      ];
    }

    return res.json({
      isSensitive: false,
      headline: `Personalised Preparation Guide: ${activityInput}`,
      mindsetNote: `Focus on clear, steady execution for "${activityInput}". Take things one step at a time with calm composure.`,
      categories: fallbackCategories,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('Error in /api/prep-tool/generate:', err);
    return res.status(500).json({ error: 'Failed to generate preparation checklist.' });
  }
});


// Vite Integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Triage Engine server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
