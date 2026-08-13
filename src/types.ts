/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RiskCategory = 'STANDARD_WORKLOAD' | 'SENSITIVE_HR' | 'SEVERE_BURNOUT';

export interface RiskClassification {
  category: RiskCategory;
  requires_human_disclaimer: boolean;
  reason?: string;
}

export interface TriageSignalInput {
  calendar_events_count: number;
  unread_email_count: number;
  top_email_subject_lines: string[];
  context_type?: 'work' | 'personal' | 'hybrid';
}

export interface TriageSignalOutput {
  urgent_external_demands: string;
  key_stakeholder_actions: string;
  ignore_later_items: string;
  raw_bullets: string[];
}

export interface ReframerOutput {
  grounding_sentence: string;
  word_count?: number;
}

export interface DraftOption {
  id: string;
  title: string;
  description: string;
  draft_text: string;
  tone_style?: string;
}

export interface BoundaryResponse {
  synopsis: string;
  options: DraftOption[];
  consideration_note: string;
}

export interface FullTriagePayload {
  user_input: string;
  instruction?: string;
  channel?: string;
  context_type?: 'work' | 'personal' | 'hybrid';
  desired_tone?: 'Assertive' | 'Polite' | 'Formal' | 'Direct';
  metadata?: TriageSignalInput;
}

export interface FullTriageResult {
  classification: RiskClassification;
  signal?: TriageSignalOutput | null;
  grounding: ReframerOutput;
  boundary: BoundaryResponse;
  timestamp: string;
}

export interface SavedTriageItem {
  id: string;
  timestamp: string;
  user_scenario: string;
  category: RiskCategory;
  chosen_option_title: string;
  edited_draft_text: string;
  context_type: 'work' | 'personal' | 'hybrid';
  channel: string;
}

export interface UserPreferences {
  preferred_tone: 'Assertive' | 'Polite' | 'Formal' | 'Direct';
  default_context: 'work' | 'personal' | 'hybrid';
  saved_choices: SavedTriageItem[];
}

export type MicroSummaryContentType = 'Email Thread' | 'Report / Document' | 'Meeting Notes' | 'Message Chain';

export type MicroSummaryOutcome = 'Bullet Points' | 'Written Summary Paragraph' | 'Checklist' | 'Full Structured Digest';

export interface MicroSummaryResult {
  id: string;
  title: string;
  contentType: MicroSummaryContentType;
  summaryOutcome?: MicroSummaryOutcome;
  summaryParagraph?: string;
  bulletPoints: string[];
  actionItems: string[];
  decisions: string[];
  deadlines: string[];
  originalSnippet: string;
  originalWordCount: number;
  summaryWordCount: number;
  createdAt: string;
  isSaved?: boolean;
}

export type ResetProactivityLevel = 'off' | 'gentle' | 'balanced' | 'proactive';

export interface ResetPromptSettings {
  proactivity: ResetProactivityLevel;
  silencedUntil?: string | null; // ISO string when quiet mode expires
  autoDetectHighVolume: boolean;
}

export interface ResetPrompt {
  id: string;
  headline: string; // e.g. "Want a quick reset?"
  options: string[]; // e.g. ["Hold non-urgent notifications", "Summarise your inbox", "Start a 1-minute reset"]
  triggerReason: string; // e.g. "3 high priority items flagged" or "Extended focus session detected"
  createdAt: string;
}

export interface ProblemSolutionChoice {
  optionKey: 'Option A' | 'Option B' | 'Option C' | string;
  title: string;
  overview: string;
  pros: string[];
  cons: string[];
  actionSteps: string[];
}

export interface ProblemSolverResult {
  isSensitive: boolean;
  sensitiveDisclaimer?: string;
  solutions?: ProblemSolutionChoice[];
  recommendedFirstStep?: string;
  timestamp?: string;
}

export interface PrepChecklistCategory {
  category: string;
  items: string[];
}

export interface PrepToolResult {
  isSensitive: boolean;
  sensitiveDisclaimer?: string;
  headline?: string;
  mindsetNote?: string;
  categories?: PrepChecklistCategory[];
  timestamp?: string;
}

