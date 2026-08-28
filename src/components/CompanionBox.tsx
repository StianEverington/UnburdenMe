import React, { useState } from 'react';

export default function CompanionBox() {
  const [raw, setRaw] = useState('');
  const [instruction, setInstruction] = useState('');
  const [channel, setChannel] = useState('Email');
  const [context, setContext] = useState('Work colleague');
  const [tone, setTone] = useState('Friendly');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [error, setError] = useState(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setOptions([]);
    try {
      const res = await fetch('/api/email/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_message: raw, user_instruction: instruction, channel, context, tone })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOptions(data.options || []);
    } catch (e) {
      setError(e.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(index, value) {
    const copy = [...options];
    copy[index] = { ...copy[index], draft: value };
    setOptions(copy);
  }

  return (
    <div className="companion p-4 bg-white rounded shadow">
      <label className="block font-semibold mb-2">Describe Workload Conflict or Incoming Request: Provide the raw situation or message.</label>
      <textarea className="w-full border p-2 mb-3" value={raw} onChange={(e) => setRaw(e.target.value)} rows={6} />

      <label className="block font-semibold mb-2">Instruction for Gemini (write exactly what you want Gemini to do)</label>
      <textarea className="w-full border p-2 mb-3" value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={3} placeholder="E.g. Reply asking for clarification and propose 2 times. Keep it friendly." />

      <div className="flex gap-2 mb-3">
        <select value={channel} onChange={e => setChannel(e.target.value)} className="border p-2">
          <option>Email</option>
          <option>Slack</option>
          <option>SMS</option>
          <option>Other</option>
        </select>
        <select value={context} onChange={e => setContext(e.target.value)} className="border p-2">
          <option>Work colleague</option>
          <option>Manager</option>
          <option>Customer</option>
          <option>Personal</option>
        </select>
        <select value={tone} onChange={e => setTone(e.target.value)} className="border p-2">
          <option>Friendly</option>
          <option>Formal</option>
          <option>Direct</option>
          <option>Conciliatory</option>
          <option>Brief</option>
        </select>
      </div>

      <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={generate} disabled={loading || !instruction}>
        {loading ? 'Generating…' : 'Run UnburdenMe and generate drafts'}
      </button>

      {error && <div className="text-red-600 mt-3">{error}</div>}

      <div className="results mt-4 space-y-4">
        {options.map((opt, i) => (
          <div key={i} className="option-card border p-3 rounded">
            <h4 className="font-semibold mb-2">{opt.title}</h4>
            <textarea className="w-full border p-2 mb-2" value={opt.draft} onChange={(e) => updateDraft(i, e.target.value)} rows={6} />
            <div className="next-steps mb-2">
              <strong>Recommended next steps & solutions</strong>
              <ul className="list-disc ml-5">
                {opt.next_steps && opt.next_steps.map((s, j) => <li key={j}>{s}</li>)}
              </ul>
            </div>
            <div className="actions flex gap-2">
              <button className="bg-gray-200 px-3 py-1 rounded" onClick={() => navigator.clipboard.writeText(opt.draft)}>Copy</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
