const JARGON_MAP: Record<string,string> = {
  'bottleneck': 'hold-up',
  'leverage': 'use',
  'synergy': 'working together',
  'synergies': 'working together',
  'prioritise': 'put first',
  'prioritise': 'put first',
  'actionable': 'useful',
  'touch base': 'check in',
  'circle back': 'follow up',
  'low-hanging fruit': 'easy wins',
  'bandwidth': 'time',
  'stakeholder': 'person involved',
  'procurement': 'buying',
  'deliverable': 'item',
  'milestone': 'step',
  'align': 'agree',
  'deep-dive': 'look into',
  'scope': 'range',
};

export function replaceJargon(text: string) {
  if (!text) return text;
  let out = text;
  // Do simple case-insensitive replacement for whole words
  for (const [k,v] of Object.entries(JARGON_MAP)) {
    const re = new RegExp('\\b' + k.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + '\\b','ig');
    out = out.replace(re, (match) => {
      // Preserve capitalization of first letter
      if (match[0] === match[0].toUpperCase()) {
        return v.charAt(0).toUpperCase() + v.slice(1);
      }
      return v;
    });
  }
  // Also collapse double spaces
  out = out.replace(/\s{2,}/g,' ');
  return out;
}
