/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Lightbulb,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Copy,
  Check,
  RotateCcw,
  RefreshCw,
  HelpCircle,
  Compass,
  Briefcase,
  AlertTriangle,
  ExternalLink,
  Share2
} from 'lucide-react';
import { ProblemSolverResult, ProblemSolutionChoice } from '../types';
import { checkForbiddenLanguage, FORBIDDEN_LANGUAGE_REJECTION_MESSAGE } from '../utils/moderation';

export const ProblemSolverWidget: React.FC = () => {
  const [challenge, setChallenge] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ProblemSolverResult | null>(null);
  const [copiedOption, setCopiedOption] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [moderationError, setModerationError] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setModerationError(null);

    const trimmed = challenge.trim();
    if (!trimmed) return;

    // Moderation check
    const modCheck = checkForbiddenLanguage(trimmed);
    if (modCheck.isForbidden) {
      setModerationError(modCheck.reason || FORBIDDEN_LANGUAGE_REJECTION_MESSAGE);
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/problem-solver/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge: challenge.trim() })
      });

      const data: ProblemSolverResult = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Failed to generate problem solver response:', err);
      // Fallback
      setResult({
        isSensitive: false,
        solutions: [
          {
            optionKey: 'Option A',
            title: 'Direct & Structured Approach',
            overview: 'Directly address the primary bottleneck by proposing a focused 15-minute sync and establishing clear written agreements.',
            pros: ['Immediate clarity and alignment', 'Eliminates guesswork or delayed expectations'],
            cons: ['Requires upfront initiative', 'Demands immediate focus time'],
            actionSteps: [
              'Outline the top 2 priority items in a 3-bullet email or message.',
              'Propose a quick 15-minute alignment call with primary stakeholders.',
              'Send a written recap confirming agreed deadlines immediately after the call.'
            ]
          },
          {
            optionKey: 'Option B',
            title: 'Diplomatic & Phased Approach',
            overview: 'Deconstruct the challenge into manageable milestones to build steady momentum while maintaining stakeholder goodwill.',
            pros: ['Lower friction with stakeholders', 'Provides flexibility for adjustments'],
            cons: ['Resolution is spread over a longer timeframe', 'Requires ongoing milestone tracking'],
            actionSteps: [
              'Identify the single most critical deliverable to complete first.',
              'Communicate a phased timeline giving realistic dates for remaining items.',
              'Gather early feedback on Phase 1 before initiating Phase 2.'
            ]
          },
          {
            optionKey: 'Option C',
            title: 'Alternative / Low-Risk Delegated Approach',
            overview: 'Re-prioritise non-critical elements or leverage existing templates and delegated support to reduce immediate friction.',
            pros: ['Protects personal bandwidth', 'Leverages existing resources'],
            cons: ['May require initial oversight', 'Dependent on resource availability'],
            actionSteps: [
              'Audit existing documentation or past templates to avoid starting from scratch.',
              'Delegate or defer non-urgent secondary tasks to later in the week.',
              'Establish a low-effort asynchronous check-in system.'
            ]
          }
        ],
        recommendedFirstStep: 'Start with Step 1 of Option A by drafting a short 3-bullet summary of your primary bottleneck. If time is limited today, use Step 1 of Option B to focus exclusively on the single highest-value sub-task.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySolution = async (choice: ProblemSolutionChoice) => {
    const formatted = `=====================================
${choice.optionKey.toUpperCase()}: ${choice.title.toUpperCase()}
=====================================

SOLUTION OVERVIEW:
${choice.overview}

KEY PROS:
${choice.pros.map(p => `• ${p}`).join('\n')}

KEY CONS:
${choice.cons.map(c => `• ${c}`).join('\n')}

3 CONCRETE ACTION STEPS:
1. ${choice.actionSteps[0] || ''}
2. ${choice.actionSteps[1] || ''}
3. ${choice.actionSteps[2] || ''}

Organised via UnburdenMe Problem Solver`;

    await navigator.clipboard.writeText(formatted);
    setCopiedOption(choice.optionKey);
    triggerToast(`Copied ${choice.optionKey} solution to clipboard!`);
    setTimeout(() => setCopiedOption(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a1a15] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Header & Input Card */}
      <div className="bg-[#fcfbf9] border border-[#e8e7df] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e8e7df] mb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-[#5a5a40] text-white">
                <Lightbulb className="w-4 h-4 text-[#fbbf24]" />
              </span>
              <h2 className="text-lg font-bold text-[#1a1a15]">Problem Solver Engine</h2>
            </div>
            <p className="text-xs text-[#7a7a70] mt-1">
              Describe a challenge or issue to generate 3 distinct, objective solution pathways with pros, cons, and action steps.
            </p>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          {moderationError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-2.5 text-xs text-rose-900 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Input Guardrail / Moderation Alert</span>
                <p className="text-rose-800 leading-relaxed">{moderationError}</p>
              </div>
            </div>
          )}

          {/* Challenge Textarea Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#1a1a15] uppercase tracking-wider">
                Describe Your Challenge or Scenario
              </label>
              {challenge && (
                <button
                  type="button"
                  onClick={() => setChallenge('')}
                  className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Clear Text
                </button>
              )}
            </div>
            <textarea
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              placeholder="e.g. I have two conflicting priorities from different senior managers due on the same day, and I am unsure how to negotiate deadlines without causing friction..."
              rows={4}
              className="w-full p-3.5 rounded-xl border border-[#e8e7df] bg-white text-xs font-mono text-[#1a1a15] focus:outline-none focus:ring-2 focus:ring-[#5a5a40] leading-relaxed placeholder:text-[#a1a19a]"
            />
          </div>

          {/* Submit Button labeled "Generate 3 Solutions" */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !challenge.trim()}
              className="px-6 py-3 bg-[#5a5a40] hover:bg-[#3f3f2d] disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition-all shadow-sm active:scale-98 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#fbbf24]" />
                  <span>Analyzing Challenge...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#fbbf24]" />
                  <span>Generate 3 Solutions</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* RESULT SECTION */}
      {result && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* SAFETY COMPLIANCE BLOCK (Triggered for Medical, Legal, Severe Sensitive Queries) */}
          {result.isSensitive ? (
            <div className="bg-[#fff7f7] border-2 border-[#fca5a5] rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex items-start space-x-3.5">
                <div className="p-3 bg-rose-100 text-rose-800 rounded-xl shrink-0">
                  <ShieldAlert className="w-6 h-6 text-rose-700" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-rose-900">
                    Safety & Compliance Guardrail
                  </h3>
                  <p className="text-sm leading-relaxed text-rose-950 font-medium bg-white/60 p-4 rounded-xl border border-rose-200">
                    {result.sensitiveDisclaimer || "This issue involves a sensitive medical, legal, or safety matter. For your safety and well-being, UnburdenMe cannot provide advice on this topic. Please consult a trusted professional, doctor, or appropriate authority."}
                  </p>
                  <div className="text-xs text-rose-800 pt-2 flex items-center space-x-2">
                    <Compass className="w-3.5 h-3.5" />
                    <span>UnburdenMe is designed exclusively for non-clinical workload prioritization, communication co-piloting, and organizational decision support.</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* STANDARD SAFE QUERY OUTPUT FORMAT */
            <div className="space-y-6">
              
              {/* Header Title */}
              <div className="flex items-center justify-between bg-[#f8f7f2] border border-[#e8e7df] p-4 rounded-2xl">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-[#d97706]" />
                  <span className="text-xs font-bold text-[#1a1a15] uppercase tracking-wider">
                    3 Practical Solution Choices
                  </span>
                </div>
                <span className="text-[11px] text-[#7a7a70]">
                  Unbiased & Actionable Pathways
                </span>
              </div>

              {/* 3 Solution Choice Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {result.solutions?.map((choice, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-[#e8e7df] hover:border-[#5a5a40] rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all group hover:shadow-md"
                  >
                    <div className="space-y-4">
                      {/* Option Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-[#f1f0e8]">
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#5a5a40] text-white">
                            {choice.optionKey}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopySolution(choice)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#5a5a40] hover:bg-[#f1f0e8] transition-colors cursor-pointer"
                          title="Copy this solution"
                        >
                          {copiedOption === choice.optionKey ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Solution Title & Overview */}
                      <div>
                        <h3 className="text-sm font-bold text-[#1a1a15] group-hover:text-[#5a5a40] transition-colors">
                          {choice.title}
                        </h3>
                        <p className="text-xs text-[#52524a] leading-relaxed mt-1.5 bg-[#fcfbf9] p-2.5 rounded-xl border border-[#f1f0e8]">
                          {choice.overview}
                        </p>
                      </div>

                      {/* Key Pros & Cons Grid */}
                      <div className="space-y-3 pt-1">
                        {/* Pros */}
                        <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
                          <div className="flex items-center space-x-1.5 text-[10px] font-bold text-emerald-900 uppercase tracking-wider mb-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Key Pros</span>
                          </div>
                          <ul className="space-y-1 text-xs text-emerald-950">
                            {choice.pros.map((pro, pIdx) => (
                              <li key={pIdx} className="flex items-start space-x-1.5">
                                <span className="text-emerald-500 font-bold">•</span>
                                <span>{pro}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Cons */}
                        <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3">
                          <div className="flex items-center space-x-1.5 text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-2">
                            <XCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Key Cons</span>
                          </div>
                          <ul className="space-y-1 text-xs text-amber-950">
                            {choice.cons.map((con, cIdx) => (
                              <li key={cIdx} className="flex items-start space-x-1.5">
                                <span className="text-amber-500 font-bold">•</span>
                                <span>{con}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* 3 Concrete Action Steps */}
                      <div className="pt-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a70] mb-2.5 flex items-center space-x-1">
                          <ArrowRight className="w-3 h-3 text-[#5a5a40]" />
                          <span>3 Concrete Action Steps</span>
                        </div>
                        <ol className="space-y-2">
                          {choice.actionSteps.map((step, sIdx) => (
                            <li key={sIdx} className="flex items-start space-x-2 text-xs text-[#1a1a15] bg-[#fdfdfc] p-2.5 rounded-xl border border-[#e8e7df]">
                              <span className="w-5 h-5 rounded-full bg-[#5a5a40] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                {sIdx + 1}
                              </span>
                              <span className="leading-snug">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    {/* Copy Button Footer */}
                    <div className="pt-4 mt-4 border-t border-[#f1f0e8]">
                      <button
                        type="button"
                        onClick={() => handleCopySolution(choice)}
                        className="w-full py-2 bg-[#f5f4ee] hover:bg-[#5a5a40] hover:text-white text-[#5a5a40] rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy {choice.optionKey} Details</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommended First Step Banner */}
              {result.recommendedFirstStep && (
                <div className="bg-[#5a5a40] text-white rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#d97706]">
                    <Sparkles className="w-4 h-4 text-[#fbbf24]" />
                    <span>Recommended First Step</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#f1f0e8] leading-relaxed font-medium">
                    {result.recommendedFirstStep}
                  </p>
                </div>
              )}

            </div>
          )}

        </div>
      )}
    </div>
  );
};
