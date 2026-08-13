/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Send, MessageSquare, Briefcase, UserCheck, Sparkles, RefreshCw, RotateCcw, Sliders, AlertTriangle } from 'lucide-react';
import { FullTriagePayload } from '../types';
import { TextReplacerBar } from './TextReplacerBar';
import { checkForbiddenLanguage, FORBIDDEN_LANGUAGE_REJECTION_MESSAGE } from '../utils/moderation';
import { recordPreference, getMostFrequentPreference } from '../utils/preferenceTracker';

interface ScenarioFormProps {
  onSubmitPayload: (payload: FullTriagePayload) => void;
  isLoading: boolean;
  initialText?: string;
  initialInstruction?: string;
  initialChannel?: string;
  initialContext?: 'work' | 'personal' | 'hybrid';
  initialTone?: 'Assertive' | 'Polite' | 'Formal' | 'Direct';
  onClear?: () => void;
}

export const DEFAULT_SCENARIO_TEXT = 'e.g. I have a query regarding an order, I need to reschedule my appointment, My manager asked for a report during a day of meetings';
export const DEFAULT_INSTRUCTION_TEXT = 'Respond to this message';

export const ScenarioForm: React.FC<ScenarioFormProps> = ({
  onSubmitPayload,
  isLoading,
  initialText = '',
  initialInstruction = DEFAULT_INSTRUCTION_TEXT,
  initialChannel = 'Email',
  initialContext = 'work',
  initialTone = 'Assertive',
  onClear
}) => {
  const [userInput, setUserInput] = useState(initialText);
  const [instruction, setInstruction] = useState(initialInstruction || DEFAULT_INSTRUCTION_TEXT);
  const [channel, setChannel] = useState(() => getMostFrequentPreference('type', initialChannel || 'Email'));
  const [contextType, setContextType] = useState<'work' | 'personal' | 'hybrid'>(
    () => (getMostFrequentPreference('context_mode', initialContext || 'work') as any)
  );
  const [desiredTone, setDesiredTone] = useState<'Assertive' | 'Polite' | 'Formal' | 'Direct'>(
    () => (getMostFrequentPreference('tone', initialTone || 'Assertive') as any)
  );
  const [moderationError, setModerationError] = useState<string | null>(null);

  // Sync if initial props change
  React.useEffect(() => {
    setUserInput(initialText);
    if (initialInstruction !== undefined) setInstruction(initialInstruction || DEFAULT_INSTRUCTION_TEXT);
    if (initialChannel) setChannel(initialChannel);
    if (initialContext) setContextType(initialContext);
    if (initialTone) setDesiredTone(initialTone);
  }, [initialText, initialInstruction, initialChannel, initialContext, initialTone]);

  const handleClear = () => {
    setUserInput('');
    setInstruction(DEFAULT_INSTRUCTION_TEXT);
    setModerationError(null);
    if (onClear) {
      onClear();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModerationError(null);

    const trimmedInput = userInput.trim();

    if (!trimmedInput) {
      setModerationError("Please type a description of your workload request before submitting.");
      return;
    }

    // Moderate input for forbidden/abusive language
    const modCheckInput = checkForbiddenLanguage(trimmedInput);
    const modCheckInstruction = checkForbiddenLanguage(instruction);

    if (modCheckInput.isForbidden || modCheckInstruction.isForbidden) {
      setModerationError(modCheckInput.reason || modCheckInstruction.reason || FORBIDDEN_LANGUAGE_REJECTION_MESSAGE);
      return;
    }

    // Record preferences to learn over time
    recordPreference('tone', desiredTone);
    recordPreference('context_mode', contextType);
    recordPreference('type', channel);

    const finalInstruction = instruction.trim() || DEFAULT_INSTRUCTION_TEXT;
    if (isLoading) return;

    onSubmitPayload({
      user_input: trimmedInput,
      instruction: finalInstruction,
      channel,
      context_type: contextType,
      desired_tone: desiredTone,
      metadata: {
        calendar_events_count: 5,
        unread_email_count: 20,
        top_email_subject_lines: [
          'URGENT: Deliverable deadline confirmation',
          'Calendar synchronisation request'
        ],
        context_type: contextType
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-[#e8e7df] rounded-[32px] p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-xs uppercase tracking-widest text-[#a1a19a] font-bold flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-[#d97706]" />
          <span>Describe Workload Conflict or Incoming Request</span>
        </h2>
        <p className="text-xs text-[#7a7a70] mt-1">
          Provide the raw situation or message. UnburdenMe will generate 2–3 structured options and editable drafts.
        </p>
      </div>

      {moderationError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-2.5 text-xs text-rose-900 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold block">Input Validation / Guardrail Alert</span>
            <p className="text-rose-800 leading-relaxed">{moderationError}</p>
          </div>
        </div>
      )}

      {/* Main Text Area */}
      <div>
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={DEFAULT_SCENARIO_TEXT}
          rows={3}
          className="w-full p-3.5 rounded-2xl border border-[#e8e7df] text-sm text-[#3a3a34] placeholder:text-[#a1a19a] focus:outline-none focus:ring-2 focus:ring-[#5a5a40] focus:border-transparent transition-all resize-y leading-relaxed bg-[#fcfbf9]"
        />
        <div className="flex items-center justify-between mt-2 px-0.5">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl border border-[#e8e7df] bg-white text-xs font-semibold text-[#7a7a70] hover:text-[#2c2c28] hover:bg-[#f5f4ee] hover:border-[#c5c4bc] transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Clear description box and reset instruction"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#7a7a70]" />
            <span>Clear</span>
          </button>
          <span className="text-[10px] text-[#a1a19a] font-mono">
            {userInput.length} chars
          </span>
        </div>
      </div>

      {/* Instruction Section directly underneath request box */}
      <div className="bg-[#fcfbf9] border border-[#e8e7df] rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs uppercase tracking-wider text-[#5a5a40] font-bold flex items-center space-x-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#d97706]" />
            <span>Instruction</span>
          </label>
          {instruction !== DEFAULT_INSTRUCTION_TEXT && (
            <button
              type="button"
              onClick={() => setInstruction(DEFAULT_INSTRUCTION_TEXT)}
              className="text-[10px] text-[#7a7a70] hover:text-[#2c2c28] underline underline-offset-2 flex items-center space-x-1 cursor-pointer"
              title="Reset instruction to default"
            >
              <RotateCcw className="w-3 h-3 text-[#7a7a70]" />
              <span>Reset to default ("{DEFAULT_INSTRUCTION_TEXT}")</span>
            </button>
          )}
        </div>
        <p className="text-[11px] text-[#7a7a70] leading-snug">
          Optional instruction to specify the outcome or solution you want the response choices to include.
        </p>
        <input
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder={DEFAULT_INSTRUCTION_TEXT}
          className="w-full px-3.5 py-2.5 text-xs font-medium text-[#3a3a34] bg-white rounded-xl border border-[#e8e7df] focus:outline-none focus:ring-2 focus:ring-[#5a5a40] focus:border-transparent placeholder:text-[#a1a19a] transition-all"
        />
      </div>

      {/* Quick Selectors & Configuration */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Channel Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#7a7a70] uppercase tracking-wider mb-1 flex items-center space-x-1">
            <MessageSquare className="w-3 h-3 text-[#5a5a40]" />
            <span>Channel</span>
          </label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[#e8e7df] bg-white text-xs font-medium text-[#3a3a34] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]"
          >
            <option value="Email">Email</option>
            <option value="Phone Call">Phone Call (Verbal)</option>
            <option value="Face-to-Face">Face-to-Face (Verbal)</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Online Meeting">Online Meeting</option>
            <option value="SMS">SMS / Text</option>
          </select>
        </div>

        {/* Context Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#7a7a70] uppercase tracking-wider mb-1 flex items-center space-x-1">
            <Briefcase className="w-3 h-3 text-[#5a5a40]" />
            <span>Context</span>
          </label>
          <select
            value={contextType}
            onChange={(e) => setContextType(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl border border-[#e8e7df] bg-white text-xs font-medium text-[#3a3a34] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]"
          >
            <option value="personal">Personal / Family</option>
            <option value="work">Workplace / Professional</option>
            <option value="hybrid">Hybrid / Combined Balance</option>
          </select>
        </div>

        {/* Desired Tone */}
        <div>
          <label className="block text-xs font-semibold text-[#7a7a70] uppercase tracking-wider mb-1 flex items-center space-x-1">
            <UserCheck className="w-3 h-3 text-[#5a5a40]" />
            <span>Desired Tone</span>
          </label>
          <select
            value={desiredTone}
            onChange={(e) => setDesiredTone(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl border border-[#e8e7df] bg-white text-xs font-medium text-[#3a3a34] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]"
          >
            <option value="Assertive">Assertive & Clear Boundary</option>
            <option value="Polite">Polite & Diplomatic</option>
            <option value="Formal">Formal Executive Style</option>
            <option value="Direct">Direct & Concise</option>
          </select>
        </div>
      </div>

      {/* Sensitive Information Replacer (Above Privacy Notice) */}
      <TextReplacerBar
        textValue={userInput}
        onUpdateText={setUserInput}
      />

      {/* Submit Button & Privacy Notice */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-[#e8e7df]">
        <span className="text-[11px] text-[#7a7a70] font-medium flex items-center space-x-1">
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
            Privacy
          </span>
          <span>Processed on-demand • No background scanning or inbox access</span>
        </span>

        <button
          type="submit"
          disabled={!userInput.trim() || isLoading}
          className={`px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-white flex items-center space-x-2 transition-all shadow-xs ${
            !userInput.trim() || isLoading
              ? 'bg-[#a1a19a] cursor-not-allowed'
              : 'bg-[#5a5a40] hover:bg-[#3f3f2d] active:scale-[0.98]'
          }`}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing & Drafting Options...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5 text-[#f1f0e8]" />
              <span>Run UnburdenMe & Generate Drafts</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
