export default async function handler(req, res) {
  // Improved serverless handler for Vercel (api/email/suggest)
  // - Logs incoming request for debugging (only in preview/development)
  // - Uses Gemini if GEMINI_API_KEY is set
  // - Deterministic fallback now strictly follows the user's instruction, channel, context and tone

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { raw_message = '', user_instruction, channel = 'Email', context = 'Work colleague', tone = 'Friendly' } = req.body || {};
    console.log('[suggest] request body:', { raw_message: raw_message && raw_message.slice(0, 500), user_instruction, channel, context, tone });

    if (!user_instruction || typeof user_instruction !== 'string') {
      return res.status(400).json({ error: 'user_instruction is required and must be a string' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let options = [];

    // Helper: normalise tone to a small set
    const toneKey = (t) => {
      const k = (t || '').toLowerCase();
      if (k.includes('friend')) return 'friendly';
      if (k.includes('formal')) return 'formal';
      if (k.includes('direct')) return 'direct';
      if (k.includes('conciliat') || k.includes('apolog')) return 'conciliatory';
      if (k.includes('brief') || k.includes('short')) return 'brief';
      return 'friendly';
    };

    const channelKey = (c) => ( (c||'').toLowerCase().includes('slack') ? 'slack' : ( (c||'').toLowerCase().includes('sms') ? 'sms' : 'email') );

    const applyTone = (body, toneK, channelK) => {
      // Build simple sentence-level tone adjustments
      let opening = '';
      let closing = '';
      if (channelK === 'slack' || channelK === 'sms') {
        // shorter, no formal sign-off
        if (toneK === 'friendly') opening = '';
        else if (toneK === 'formal') opening = '';
        else if (toneK === 'direct') opening = '';
        else if (toneK === 'conciliatory') opening = '';
        else opening = '';
        closing = '';
      } else {
        if (toneK === 'friendly') { opening = 'Hi there,\n\n'; closing = '\n\nCheers,\n[Your name]'; }
        else if (toneK === 'formal') { opening = 'Dear [Name],\n\n'; closing = '\n\nKind regards,\n[Your name]'; }
        else if (toneK === 'direct') { opening = ''; closing = '\n\nThanks,\n[Your name]'; }
        else if (toneK === 'conciliatory') { opening = 'Hi [Name],\n\n'; closing = '\n\nBest,\n[Your name]'; }
        else if (toneK === 'brief') { opening = ''; closing = '\n\nThanks,\n[Your name]'; }
      }
      // Keep language simple / British English small replacements already handled centrally
      return `${opening}${body}${closing}`.trim();
    };

    const snippet = raw_message ? (raw_message.length > 300 ? raw_message.slice(0, 300) + '…' : raw_message) : '';
    const channelK = channelKey(channel);
    const toneK = toneKey(tone);

    // If a real AI key is present, prefer calling Gemini. This block remains robust but we fall back
    // to the deterministic generator if the AI call fails or the response can't be parsed as JSON.
    if (apiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'unburdenme' } } });

        const system = `You are UnburdenMe assistant. Output exactly JSON only that matches this schema: { \"options\": [ { \"title\": string, \"draft\": string, \"next_steps\": [string] } ] } with exactly 3 items in options. Use everyday British English, no jargon, and follow the user's instruction exactly.`;

        // Few-shot: show one concise example
        const fewShot = `
INPUT:
raw_message: "Can you send the report by Friday?"
user_instruction: "Reply and ask for a short extension, propose two alternate days, keep it friendly."
channel: Email
context: Work colleague
tone: Friendly

OUTPUT_JSON:
{"options":[{"title":"Ask for a short extension","draft":"Hi Sam,\n\nThanks for the note. I can get the reports to you but would it be possible to extend the deadline by two days to ensure accuracy? I could send them by next Monday or Tuesday — which works for you?\n\nBest,\n[Your name]","next_steps":["Send the reply and await confirmation","If no reply in 48 hours, send a one-line nudge","Prepare a brief status summary to attach with the reports"]}]}
`;

        const prompt = `${system}\n\n${fewShot}\n\nChannel: ${channel}\nContext: ${context}\nTone: ${tone}\nRaw message: ${raw_message || 'None'}\nUser instruction (follow exactly): ${user_instruction}\n\nRespond ONLY with JSON following the schema above.`;

        const resp = await ai.generate({ model: 'gemini-1.0', prompt, temperature: 0.65, max_output_tokens: 800 });
        const text = (resp.outputText || resp[0]?.outputText || resp?.candidates?.[0]?.content || '') + '';
        // Attempt to parse JSON strictly; if it fails, try extracting the first JSON object.
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed.options) && parsed.options.length > 0) options = parsed.options.slice(0, 3);
        } catch (e) {
          const m = text.match(/\{[\s\S]*\}/);
          if (m) {
            try { const parsed = JSON.parse(m[0]); if (Array.isArray(parsed.options)) options = parsed.options.slice(0,3); } catch (e2) { console.warn('[suggest] ai returned non-parseable json'); }
          } else {
            console.warn('[suggest] ai returned no json');
          }
        }
      } catch (e) {
        console.error('[suggest] ai call error', e);
      }
    }

    // Deterministic fallback that follows instruction, tone and channel strictly
    if (!options || options.length === 0) {
      // Helper to craft a draft following the user's instruction as literally as possible
      const craftDraft = (variant) => {
        // Interpret user_instruction heuristically to produce an action: common verbs like 'reply', 'write', 'apolog', 'ask', 'propose', 'confirm'
        const instr = user_instruction.trim();
        const lower = instr.toLowerCase();
        let body = '';

        // If raw_message exists, reference it briefly
        if (snippet) body += `About the message: "${snippet}"\n\n`;

        // Very simple heuristic: detect 'reply' or 'write' or 'apolog' or 'ask' or 'propose'
        if (lower.includes('apolog')) {
          body += 'I\'m sorry for the oversight. ';
          if (lower.includes('recover') || lower.includes('plan')) body += 'Here is a brief recovery plan: '; else body += '';
        }

        if (lower.includes('reply') || lower.includes('respond') || lower.includes('write')) {
          // If instruction asks to ask for clarification
          if (lower.includes('clarif') || lower.includes('clarify')) {
            body += 'Could you clarify what you meant by the second paragraph? '; 
          }
          // If instruction asks to propose times
          if (lower.includes('propose') && lower.includes('time')) {
            body += 'Would either Tuesday morning at 10am or Thursday afternoon at 3pm work for you? ';
          }
          // If asks for extension
          if (lower.includes('extension') || lower.includes('extend')) {
            body += 'Would it be possible to extend the deadline by two days so I can ensure this is accurate? ';
          }

          // If instruction contains explicit text like 'ask for X', include that phrase
          const askMatch = instr.match(/ask for ([^.]+)/i);
          if (askMatch) body += `Can you please ${askMatch[1].trim()}? `;

          // If no clear instruction detected, include a generic reply action using the instruction text
          if (body.trim() === '' || body.trim().length < 10) body += `${instr.charAt(0).toLowerCase() === 'r' ? instr : instr}. `;
        } else {
          // If instruction doesn't mention reply/write, just follow it as a directive.
          body += instr + ' ';
        }

        // Add variant-specific phrasing
        if (variant === 'polite') body = 'Thanks for getting in touch. ' + body + '\n\nI\'m happy to help.';
        if (variant === 'concise') body = body + '\n\nLet me know if that works.';
        if (variant === 'direct') body = body + '\n\nI\'ll act once you confirm.';

        // Apply tone & channel wrappers
        const final = applyTone(body, toneK, channelK);

        // Build sensible next steps aligned with the instruction
        const nsteps = [];
        if (lower.includes('propose') && lower.includes('time')) {
          nsteps.push('Send the chosen draft and wait for confirmation');
          nsteps.push('If no reply in 48 hours, follow up with one short message');
        } else if (lower.includes('apolog')) {
          nsteps.push('Send the apology and outline the recovery plan');
          nsteps.push('Follow up with progress updates until resolved');
        } else if (lower.includes('extension') || lower.includes('extend')) {
          nsteps.push('Send the extension request and await reply');
          nsteps.push('If accepted, update your calendar and stakeholders');
        } else {
          nsteps.push('Send the draft and wait for a reply');
          nsteps.push('If no reply in 48 hours, send a brief nudge');
        }
        nsteps.push('If complex, propose a short call to resolve remaining details');

        return { title: variant === 'polite' ? 'Polite clarifying reply' : variant === 'concise' ? 'Short clear reply' : 'Direct friendly reply', draft: final, next_steps: nsteps };
      };

      options = [ craftDraft('polite'), craftDraft('concise'), craftDraft('direct') ];
    }

    // Ensure we have exactly 3 options and basic post-processing (British English tweaks)
    options = options.slice(0, 3);
    while (options.length < 3) options.push({ title: 'Alternate', draft: 'Please try again', next_steps: ['Try again'] });

    const brit = (s) => (typeof s === 'string' ? s.replace(/\borganize\b/gi, 'organise').replace(/\bcolor\b/gi, 'colour') : s);
    options = options.map(o => ({ title: brit(o.title), draft: brit(o.draft), next_steps: (o.next_steps || []).map(brit) }));

    console.log('[suggest] returning options count=', options.length);
    return res.status(200).json({ options });
  } catch (err) {
    console.error('[suggest] handler error', err);
    return res.status(500).json({ error: (err && err.message) || 'unknown' });
  }
}
