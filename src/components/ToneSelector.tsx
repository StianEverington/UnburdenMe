import React from 'react';

export default function ToneSelector({ onChange }: { onChange?: (v: string) => void }) {
  const current = typeof window !== 'undefined' ? localStorage.getItem('unburdenme_tone') || 'Friendly' : 'Friendly';

  const setTone = (t: string) => {
    localStorage.setItem('unburdenme_tone', t);
    if (onChange) onChange(t);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <label style={{ marginRight: 6 }}>Tone:</label>
      <select defaultValue={current} onChange={(e) => setTone(e.target.value)}>
        <option value="Friendly">Friendly</option>
        <option value="Casual">Casual</option>
        <option value="Direct">Direct</option>
        <option value="Formal">Formal</option>
      </select>
    </div>
  );
}
