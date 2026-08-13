/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Check, Edit2, Bookmark, Compass, AlertTriangle, ShieldAlert, Sparkles, CheckCircle2, ArrowDown, ExternalLink } from 'lucide-react';
import { FullTriageResult, SavedTriageItem } from '../types';
import { SYSTEM_DISCLAIMERS } from '../lib/constants';
import { MicroMindsetCard } from './MicroMindsetCard';

interface TriageResultsViewProps {
  result: FullTriageResult;
  userScenario: string;
  channel: string;
  contextType: 'work' | 'personal' | 'hybrid';
  desiredTone?: string;
  onSaveChoice: (item: SavedTriageItem) => void;
}

export const TriageResultsView: React.FC<TriageResultsViewProps> = ({
  result,
  userScenario,
  channel,
  contextType,
  desiredTone = 'Assertive',
  onSaveChoice
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedChoiceId, setSavedChoiceId] = useState<string | null>(null);

  // Safe Fallback Guards for classification & grounding
  const classification = result?.classification || {
    category: 'STANDARD_WORKLOAD',
    requires_human_disclaimer: false,
    reason: ''
  };

  const grounding = result?.grounding || {
    grounding_sentence: 'You cannot expand the working hours today, but you can choose the top priority deliverable to focus on.',
    word_count: 17
  };

  // Parse sections from raw LLM output
  const rawText = result?.raw_llm_response || '';

  // Extract Options
  const optionsMatch = rawText.match(/(?:### 1\. OPTIONS OVERVIEW|### 2\. ACTIONABLE OPTIONS)\s*\n+([\s\S]*?)(?=\n+---|### 2\. EDITABLE DRAFTS|### 3\. EDITABLE DRAFTS|$)/i);
  const optionsText = optionsMatch ? optionsMatch[1].trim() : '';

  // Parse individual drafts
  const draftsBlock = rawText.match(/(?:### 2\. EDITABLE DRAFTS|### 3\. EDITABLE DRAFTS)\s*\n+([\s\S]*?)(?=\n+---|### 3\. CONSIDERATION|### 4\. CONSIDERATION|$)/i);
  const draftsText = draftsBlock ? draftsBlock[1].trim() : '';

  // Extract Consideration
  const considerationMatch = rawText.match(/(?:### 3\. CONSIDERATION \/ HUMAN CHECK|### 4\. CONSIDERATION \/ HUMAN CHECK)\s*\n+([\s\S]*?)$/i);
  const considerationText = considerationMatch ? considerationMatch[1].trim() : '**Focus Reminder** Whichever option you choose, remember to ensure it is the exact response you would like and give yourself time to relax';

  const isSpokenChannel = channel === 'Phone Call' || channel === 'Face-to-Face';

  // Parse draft code blocks
  const parseDrafts = () => {
    const draftRegex = /#### Draft for (Option [A-C]:?[^\n]*)\s*\n+```(?:text)?\s*([\s\S]*?)```/gi;
    const items: Array<{ id: string; title: string; text: string }> = [];
    let match;
    let count = 1;

    while ((match = draftRegex.exec(draftsText)) !== null) {
      items.push({
        id: `draft-${count}`,
        title: match[1].trim(),
        text: match[2].trim()
      });
      count++;
    }

    if (items.length === 0) {
      // Fallback draft items if regex match doesn't hit
      if (isSpokenChannel) {
        items.push({
          id: 'draft-1',
          title: 'Option A: Phased Delivery Counter-Offer',
          text: `[SPOKEN OPENING LINE]\n"Hi [Name], thanks for connecting. I wanted to touch base directly about your request regarding: ${userScenario.slice(0, 80)}..."\n\n[CORE TALKING POINTS]\n• "Due to my current commitments today, I won't be able to complete this full response by EOD without compromising quality."\n• "What I can do is get you the complete output by [Date/Time] tomorrow."\n\n[HANDLING PUSHBACK]\n• "If you need a quick status update right now, I can talk you through the main numbers in 2 minutes, but the full resolution will be ready tomorrow."\n\n[VOCAL TONE & PACING TIP]\nDeliver with a calm, ${desiredTone.toLowerCase()} vocal cadence. Pause after stating your revised timeline.`
        });
        items.push({
          id: 'draft-2',
          title: 'Option B: Priority & Calendar Realignment',
          text: `[SPOKEN OPENING LINE]\n"Hi [Name], do you have two quick minutes to talk through our current priorities regarding this request?"\n\n[CORE TALKING POINTS]\n• "I saw the urgent request regarding: ${userScenario.slice(0, 80)}..."\n• "If this takes top priority today, I will move our upcoming meeting to free up a focus block."\n\n[HANDLING PUSHBACK]\n• "Would you prefer I reschedule that commitment, or hold off on this deadline until [Date/Time]?"\n\n[VOCAL TONE & PACING TIP]\nUse a collaborative, neutral tone. Frame the choice around managing focus time effectively.`
        });
        items.push({
          id: 'draft-3',
          title: 'Option C: Phased Spoken Update',
          text: `[SPOKEN OPENING LINE]\n"Hi [Name], I saw your message and wanted to give you an immediate verbal summary."\n\n[CORE TALKING POINTS]\n• "Here are the primary points right now..."\n• "I will follow up with the full detailed documentation by [Date/Time]."\n\n[HANDLING PUSHBACK]\n• "This allows us to move forward right away without waiting for the full document."\n\n[VOCAL TONE & PACING TIP]\nSpeak clearly and concisely with steady composure.`
        });
      } else {
        items.push({
          id: 'draft-1',
          title: 'Option A: Phased Delivery Counter-Offer',
          text: `Hi [Name],\n\nI am writing regarding your request: ${userScenario}\n\nDue to existing commitments on my schedule today, I won't have sufficient focus time to complete a full draft by the initial deadline.\n\nI can deliver the core priority items first, and follow up with the complete output by [Date/Time]. Please let me know if this adjusted timeline works for you.`
        });
        items.push({
          id: 'draft-2',
          title: 'Option B: Priority & Calendar Realignment',
          text: `Hi [Name],\n\nThank you for reaching out regarding: ${userScenario}\n\nIn order to address this effectively today, I will need to adjust my current scheduled commitments. Would you prefer I reschedule our upcoming meeting to create dedicated focus time, or shift the deliverable deadline to [Date/Time]?`
        });
        items.push({
          id: 'draft-3',
          title: 'Option C: Direct Executive Summary First',
          text: `Hi [Name],\n\nI received your request regarding: ${userScenario}\n\nTo ensure you have what you need immediately, here is a high-level summary overview first. I will provide the complete, detailed follow-up by [Date/Time].`
        });
      }
    }

    return items;
  };

  const parsedDrafts = parseDrafts();
  const [editableDrafts, setEditableDrafts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    parsedDrafts.forEach(d => {
      initial[d.id] = d.text;
    });
    return initial;
  });

  const handleDraftChange = (id: string, newText: string) => {
    setEditableDrafts(prev => ({
      ...prev,
      [id]: newText
    }));
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSaveChoice = (draftId: string, title: string, text: string) => {
    const item: SavedTriageItem = {
      id: `saved-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      user_scenario: userScenario,
      category: classification.category,
      chosen_option_title: title,
      edited_draft_text: text,
      context_type: contextType,
      channel: channel
    };

    onSaveChoice(item);
    setSavedChoiceId(draftId);
    setTimeout(() => setSavedChoiceId(null), 3000);
  };

  // Parse Actionable Options list with hyperlinking metadata
  const parseActionableOptions = () => {
    const lines = optionsText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const items: Array<{ id: string; optionKey: string; title: string; overview: string; targetDraftId: string }> = [];

    lines.forEach((line, index) => {
      // Clean leading bullet points / asterisks
      const cleaned = line.replace(/^[*•\d.-]+\s*/, '');
      const match = cleaned.match(/^(?:\*\*)?(Option [A-C]:?[^*]*)(?:\*\*)?\s*[:-–—]?\s*(.*)/i);
      if (match) {
        const rawTitle = match[1].trim();
        const rawOverview = match[2].trim();
        const overview = rawOverview.replace(/^[-–—:]\s*/, '').trim();

        let targetDraftId = `draft-${index + 1}`;
        if (rawTitle.toLowerCase().includes('option a')) targetDraftId = 'draft-1';
        else if (rawTitle.toLowerCase().includes('option b')) targetDraftId = 'draft-2';
        else if (rawTitle.toLowerCase().includes('option c')) targetDraftId = 'draft-3';

        items.push({
          id: `opt-${index + 1}`,
          optionKey: rawTitle.split(':')[0] || `Option ${String.fromCharCode(65 + index)}`,
          title: rawTitle,
          overview: overview || 'Brief overview of this actionable choice.',
          targetDraftId
        });
      }
    });

    if (items.length === 0) {
      // Fallback structured items
      items.push(
        { id: 'opt-1', optionKey: 'Option A', title: 'Option A: Direct Concrete Solution', overview: 'Fulfill request directly with concrete next steps.', targetDraftId: 'draft-1' },
        { id: 'opt-2', optionKey: 'Option B', title: 'Option B: Phased Counter-Proposal', overview: 'Deliver core priority first with full resolution to follow.', targetDraftId: 'draft-2' },
        { id: 'opt-3', optionKey: 'Option C', title: 'Option C: Defer to Next Opportunity', overview: 'Acknowledge receipt and complete at next opportunity.', targetDraftId: 'draft-3' }
      );
    }

    return items;
  };

  const parsedActionableOptions = parseActionableOptions();

  const scrollToDraft = (draftId: string) => {
    const el = document.getElementById(draftId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#5a5a40]', 'bg-amber-50/70');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#5a5a40]', 'bg-amber-50/70');
      }, 2200);
    }
  };

  // Helper to parse Section 3 (Consideration & Recommended Next Steps)
  const parseConsiderationSection = () => {
    const rawMatch = rawText.match(/(?:### 3\. CONSIDERATION \/ HUMAN CHECK|### 4\. CONSIDERATION \/ HUMAN CHECK)\s*\n+([\s\S]*?)$/i);
    const content = rawMatch ? rawMatch[1].trim() : considerationText;

    // Extract numbered steps (e.g. "1. Step one\n2. Step two\n3. Step three")
    const stepRegex = /^\s*(\d+)\.\s+(.*?)$/gm;
    const extractedSteps: string[] = [];
    let stepMatch;

    while ((stepMatch = stepRegex.exec(content)) !== null) {
      const stepText = stepMatch[2].trim();
      if (stepText && !stepText.toLowerCase().includes('focus reminder')) {
        extractedSteps.push(stepText);
      }
    }

    // Extract Focus Reminder text
    const reminderMatch = content.match(/\*\s*\*\*Focus Reminder\*\*\s*(.*)/i) || content.match(/Focus Reminder\s*[:-–—]?\s*(.*)/i);
    let focusReminderText = reminderMatch
      ? reminderMatch[1].trim()
      : 'Whichever option you choose, remember to ensure it is the exact response you would like and give yourself time to relax';

    // If no numbered steps were matched in LLM text, generate context-aware recommendations based on userScenario & classification
    if (extractedSteps.length === 0) {
      const lowerScenario = (userScenario || '').toLowerCase();
      const isSensitive = classification.requires_human_disclaimer ||
        ['harass', 'discrimina', 'terminate', 'fire', 'grievance', 'lawsuit', 'sue', 'court', 'lawyer', 'attorney', 'hospital', 'doctor', 'panic', 'breakdown', 'suicid', 'self-harm', 'illegal', 'violence', 'exploit', 'hack'].some(k => lowerScenario.includes(k));

      if (isSensitive) {
        extractedSteps.push('Do not engage directly with the request or party involved until formal guidance is obtained.');
        extractedSteps.push('Seek advice from a qualified professional, doctor, HR representative, or appropriate authority.');
        extractedSteps.push('Keep an objective, dated record of all relevant communications for official reference.');
      } else {
        extractedSteps.push('Review your current commitments to identify any immediate schedule or workload conflict.');
        extractedSteps.push('Select and customize the draft option above that best aligns with your preferred boundary.');
        extractedSteps.push('Send or communicate your chosen response to establish clear, manageable expectations.');
      }
    }

    return {
      nextSteps: extractedSteps.slice(0, 3),
      focusReminder: focusReminderText
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Safety Disclaimer Banner if SENSITIVE_HR or SEVERE_BURNOUT */}
      {classification.requires_human_disclaimer && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-semibold block text-amber-900">
              {classification.category === 'SENSITIVE_HR'
                ? 'Workplace HR / Formal Advisory Disclaimer'
                : 'Wellbeing & Health Consultation Advisory'}
            </span>
            <p className="leading-relaxed text-amber-800">
              {classification.category === 'SENSITIVE_HR'
                ? SYSTEM_DISCLAIMERS.SENSITIVE_HR
                : SYSTEM_DISCLAIMERS.SEVERE_BURNOUT}
            </p>
          </div>
        </div>
      )}

      {/* 1. OPTIONS OVERVIEW & GROUNDING CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#e8e7df] rounded-[32px] p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-widest text-[#a1a19a] font-bold">
                1. Options Overview
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {parsedActionableOptions.map((opt) => (
                <div
                  key={opt.id}
                  className="p-3.5 rounded-2xl bg-[#fcfbf9] border border-[#e8e7df] hover:border-[#5a5a40] transition-all flex flex-col justify-center space-y-1 group"
                >
                  <button
                    onClick={() => scrollToDraft(opt.targetDraftId)}
                    className="text-sm font-bold text-[#5a5a40] hover:text-[#2a2a1e] flex items-center space-x-2 text-left group-hover:translate-x-0.5 transition-transform cursor-pointer"
                    title={`Click to jump immediately to ${opt.title}`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#d97706] shrink-0" />
                    <span className="underline decoration-[#5a5a40]/30 underline-offset-4 hover:decoration-[#5a5a40]">
                      {opt.title}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#d97706] shrink-0 opacity-80" />
                  </button>
                  <p className="text-xs text-[#5a5a52] leading-snug pl-5 font-normal">
                    {opt.overview}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#f1f0e8] flex flex-wrap items-center justify-between text-xs text-[#7a7a70] gap-2 mt-4">
            <span>Context: <strong className="text-[#3a3a34] capitalize">{contextType}</strong></span>
            <span>Channel: <strong className="text-[#3a3a34]">{channel}</strong></span>
            <span>Tone: <strong className="text-[#3a3a34]">{desiredTone}</strong></span>
          </div>
        </div>

        {/* Micro-Mindset Grounding Card */}
        <div className="lg:col-span-1 flex flex-col justify-start">
          <MicroMindsetCard
            initialQuote={grounding.grounding_sentence}
            userScenario={userScenario}
          />
        </div>
      </div>

      {/* 2. EDITABLE DRAFTS SECTION */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xs uppercase tracking-widest text-[#a1a19a] font-bold">
            {isSpokenChannel ? '2. Spoken Response Scripts & Talking Points' : '2. Editable Response Drafts'}
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {parsedDrafts.map((draftItem) => {
            const currentText = editableDrafts[draftItem.id] || draftItem.text;
            const isCopied = copiedId === draftItem.id;
            const isSaved = savedChoiceId === draftItem.id;

            return (
              <div
                key={draftItem.id}
                id={draftItem.id}
                className="bg-[#fcfbf9] border border-[#e8e7df] rounded-[28px] p-6 shadow-xs transition-all duration-300 hover:border-[#d5d4cb] scroll-mt-24"
              >
                {/* Draft Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#e8e7df]">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]" />
                    <h4 className="text-sm font-semibold text-[#1a1a15]">
                      {draftItem.title}
                    </h4>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleCopy(draftItem.id, currentText)}
                      className={`text-xs font-bold transition-all flex items-center space-x-1 ${
                        isCopied
                          ? 'text-emerald-700 font-semibold'
                          : 'text-[#5a5a40] underline underline-offset-4 hover:text-[#3f3f2d]'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied text</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy text</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleSaveChoice(draftItem.id, draftItem.title, currentText)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-xs ${
                        isSaved
                          ? 'bg-emerald-800 text-white'
                          : 'bg-[#5a5a40] text-white hover:bg-[#3f3f2d]'
                      }`}
                      title="Save this choice to refine future preferences"
                    >
                      {isSaved ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <span>Choice Saved</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5 text-white" />
                          <span>Select & Remember</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Editable Code/Text Block */}
                <div className="relative">
                  <div className="absolute top-3 right-3 text-[10px] text-[#a1a19a] font-mono pointer-events-none flex items-center space-x-1">
                    <Edit2 className="w-3 h-3 text-[#a1a19a]" />
                    <span>Editable Draft</span>
                  </div>
                  <textarea
                    value={currentText}
                    onChange={(e) => handleDraftChange(draftItem.id, e.target.value)}
                    rows={6}
                    className="w-full p-4 font-mono text-sm leading-relaxed text-[#3a3a34] bg-white rounded-xl border border-[#e8e7df] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. CONSIDERATION / FOCUS REMINDER */}
      {(() => {
        const { nextSteps, focusReminder } = parseConsiderationSection();
        const lowerScenario = (userScenario || '').toLowerCase();
        const isSensitive = classification.requires_human_disclaimer ||
          ['harass', 'discrimina', 'terminate', 'fire', 'grievance', 'lawsuit', 'sue', 'court', 'lawyer', 'attorney', 'hospital', 'doctor', 'panic', 'breakdown', 'suicid', 'self-harm', 'illegal', 'violence', 'exploit', 'hack'].some(k => lowerScenario.includes(k));

        return (
          <div className="bg-white border border-[#e8e7df] rounded-[28px] p-6 text-xs text-[#3a3a34] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f0e8]">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-[#d97706] shrink-0" />
                <h3 className="text-xs uppercase tracking-widest text-[#1a1a15] font-bold">
                  3. Consideration / Focus Reminder
                </h3>
              </div>
              {isSensitive && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-200 flex items-center space-x-1">
                  <ShieldAlert className="w-3 h-3 text-rose-700" />
                  <span>Professional Advice Recommended</span>
                </span>
              )}
            </div>

            {/* Recommended Next Steps */}
            <div className="space-y-2.5">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-[#5a5a40] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
                <span>Recommended Next Steps & Solutions</span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {nextSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex items-start space-x-3 transition-all ${
                      isSensitive
                        ? 'bg-[#fff8f8] border-rose-200 text-rose-950'
                        : 'bg-[#fcfbf9] border-[#e8e7df] text-[#1a1a15]'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                      isSensitive ? 'bg-rose-800 text-white' : 'bg-[#5a5a40] text-white'
                    }`}>
                      {idx + 1}
                    </span>
                    <p className="text-xs leading-relaxed font-medium">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Focus Reminder Note */}
            <div className="pt-3 border-t border-[#f1f0e8] text-[#7a7a70] text-xs flex items-start space-x-2">
              <span className="font-bold text-[#1a1a15] shrink-0">Focus Reminder:</span>
              <p className="leading-relaxed">
                {focusReminder.replace(/^[*•\s]*/, '').replace(/^Focus Reminder\s*[:-–—]?\s*/i, '')}
              </p>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
