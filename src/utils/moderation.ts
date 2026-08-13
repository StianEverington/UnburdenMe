/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ModerationResult {
  isForbidden: boolean;
  reason?: string;
}

// Moderation rules for abusive, threatening, racist, discriminatory, rude, or hate speech patterns
const FORBIDDEN_PATTERNS: { pattern: RegExp; category: string }[] = [
  // Racist / Xenophobic / Ethnic Slurs
  {
    pattern: /\b(nigger|nigga|chink|spic|kike|wetback|gook|towelhead|raghead|coon|darky|gypsy|paki|honky|jap)\b/i,
    category: 'racist/discriminatory'
  },
  // Discriminatory / Homophobic / Transphobic / Misogynistic Slurs
  {
    pattern: /\b(faggot|fag|dyke|tranny|shemale|retard|spaz|cunt|bitch|whore|slut)\b/i,
    category: 'discriminatory/abusive'
  },
  // Direct Threats & Violent Intimidation
  {
    pattern: /\b(kill yourself|go die|i will (kill|murder|stab|shoot|strangle|slaughter|beat|attack|bomb|destroy) you|bomb threat|death threat|i hope you die)\b/i,
    category: 'threatening/violent'
  },
  // Abusive / Severe Profanity & Rude Harassment
  {
    pattern: /\b(fuck off|shut the fuck up|fuck you|piece of shit|motherfucker|bastard|asshole|dipshit|dickhead|jackass|screw you|scum|moron|idiot)\b/i,
    category: 'abusive/rude'
  },
  // Harassment & Hate Speech Terms
  {
    pattern: /\b(hate all (black|white|asian|jew|muslim|christian|gay|lesbian|trans|immigrant)s|white supremacy|neo-nazi|hitler did nothing wrong)\b/i,
    category: 'hate speech'
  }
];

/**
 * Checks if input text contains forbidden, abusive, threatening, racist, discriminatory, or rude language.
 */
export const checkForbiddenLanguage = (text: string): ModerationResult => {
  if (!text || typeof text !== 'string') {
    return { isForbidden: false };
  }

  const normalized = text.trim();

  for (const item of FORBIDDEN_PATTERNS) {
    if (item.pattern.test(normalized)) {
      return {
        isForbidden: true,
        reason: `Input contains ${item.category} language which violates community and workplace safety guidelines.`
      };
    }
  }

  return { isForbidden: false };
};

export const FORBIDDEN_LANGUAGE_REJECTION_MESSAGE = 
  "Input Rejected: Please ensure your input maintains a polite, respectful, and non-offensive tone. Language containing abusive, rude, discriminatory, or threatening words cannot be processed.";
