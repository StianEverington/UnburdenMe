export default async function handler(req, res) {
  // Simple serverless handler for Vercel (api/email/suggest)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { raw_message = '', user_instruction, channel = 'Email', context = 'Work colleague', tone = 'Friendly' } = req.body || {};
    if (!user_instruction || typeof user_instruction !== 'string') {
      return res.status(400).json({ error: 'user_instruction is required and must be a string' });
    }

    // If GEMINI_API_KEY is set, attempt to call @google/genai; otherwise use a local deterministic generator.
    const apiKey = process.env.GEMINI_API_KEY;
    let options = [];

    if (apiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'unburdenme' } } });
        const system = `You are UnburdenMe. Output exactly JSON with schema: { \"options\": [ { \"title\": string, \"draft\": string, \"next_steps\": [string] } ] }.`;
        const prompt = `${system}\n\nChannel: ${channel}\nContext: ${context}\nTone: ${tone}\n\nRaw message: ${raw_message || 'None'}\nUser instruction: ${user_instruction}\n\nRespond ONLY with JSON following the schema above.`;

        const resp = await ai.generate({ model: 'gemini-1.0', prompt, temperature: 0.7, max_output_tokens: 800 });
        const text = (resp.outputText || resp[0]?.outputText || resp?.candidates?.[0]?.content || '') + '';
        try {
          const parsed = JSON.parse(text);
          options = Array.isArray(parsed.options) ? parsed.options.slice(0, 3) : [];
        } catch (e) {
          // Try extract JSON substring
          const m = text.match(/\{[\s\S]*\}/);
          if (m) options = (JSON.parse(m[0]).options || []).slice(0, 3);
        }
      } catch (e) {
        console.error('AI call failed', e);
      }
    }

    // If no options from AI, fallback to deterministic local generation (safe for deploy/testing)
    if (!options || options.length === 0) {
      const base = raw_message ? `Based on this message: "${raw_message.slice(0, 300)}"\n` : '';
      const instr = user_instruction;
      const make = (style) => {
        const title = style === 'polite' ? 'Polite short reply' : style === 'concise' ? 'Short clear reply' : 'Direct friendly reply';
        const draft = style === 'polite'
          ? `Hi there,\n\n${base}Thanks for getting in touch. ${instr}. Could you please confirm the details and I\'ll get this sorted?\n\nBest,\n[Your name]`
          : style === 'concise'
          ? `Hi,\n\n${base}${instr}. Let me know if that works.\n\nThanks,\n[Your name]`
          : `Hi,\n\n${base}Thanks — ${instr}. Happy to help.\n\nCheers,\n[Your name]`;
        const next_steps = [
          'Send this reply and wait for response',
          'If no reply in 48 hours, send a short follow-up',
          'If unresolved, schedule a quick call to sort it out'
        ];
        return { title, draft, next_steps };
      };
      options = [make('polite'), make('concise'), make('direct')];
    }

    // Post-process: ensure exactly 3 options
    options = options.slice(0, 3);
    while (options.length < 3) options.push({ title: 'Alternate', draft: 'Try again', next_steps: ['Try again'] });

    // Ensure outputs are simple British English adjustments (small replacements)
    const brit = (s) => s.replace(/\borganize\b/gi, 'organise').replace(/\bcolor\b/gi, 'colour');
    options = options.map(o => ({ title: brit(o.title), draft: brit(o.draft), next_steps: (o.next_steps || []).map(brit) }));

    return res.status(200).json({ options });
  } catch (err) {
    console.error('suggest handler error', err);
    return res.status(500).json({ error: (err && err.message) || 'unknown' });
  }
}
