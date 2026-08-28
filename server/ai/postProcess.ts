import { replaceJargon } from '../email/jargon.js';

export function postProcessText(text: string, tone?: string) {
  if (!text) return text;

  // Optionally apply tone hints (for now we only pass through)
  let out = text;

  // Replace common corporate terms with friendlier words
  out = replaceJargon(out);

  // If tone is Casual, make small tweaks (e.g., replace "Regards" -> "Cheers")
  if (tone && tone.toLowerCase().includes('casual')) {
    out = out.replace(/\bRegards\b/ig, 'Cheers');
    out = out.replace(/\bBest regards\b/ig, 'Cheers');
  }

  return out;
}
