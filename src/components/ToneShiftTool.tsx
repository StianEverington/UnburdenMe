/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserCheck, Copy, Check, RefreshCw, Send, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';
import { checkForbiddenLanguage, FORBIDDEN_LANGUAGE_REJECTION_MESSAGE } from '../utils/moderation';
import { recordPreference, getMostFrequentPreference } from '../utils/preferenceTracker';

type ToneStyle = 'Assertive' | 'Polite' | 'Formal' | 'Informal';

export const DEFAULT_RAW_VENTING = "e.g. I am sick of getting asked for stuff that isn't even urgent or part of my job role. Its evening, I'm offline and not opening my laptop until tomorrow morning, so stop asking.";

export const ToneShiftTool: React.FC = () => {
  const [rawDraft, setRawDraft] = useState<string>('');
  const [targetStyle, setTargetStyle] = useState<ToneStyle>(
    () => (getMostFrequentPreference('tone', 'Assertive') as ToneStyle)
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [outputOptions, setOutputOptions] = useState<{ direct: string; collaborative: string } | null>(null);

  const getToneFallback = (tone: ToneStyle, input: string): { direct: string; collaborative: string } => {
    const text = input.toLowerCase();
    const isOffline = text.includes('offline') || text.includes('evening') || text.includes('8 pm') || text.includes('ping') || text.includes('night') || text.includes('laptop') || text.includes('urgent');
    const isBusy = text.includes('busy') || text.includes('meeting') || text.includes('time') || text.includes('schedule');

    if (tone === 'Assertive') {
      if (isOffline) {
        return {
          direct: `I am offline for the evening and will address this first thing tomorrow morning.`,
          collaborative: `I've wrapped up for today, but I will make this my first priority when I log on tomorrow at 9am.`
        };
      }
      if (isBusy) {
        return {
          direct: `I cannot take this on today due to existing commitments, but I can review it tomorrow afternoon.`,
          collaborative: `My schedule is full today, but I can commit to completing this by 2pm tomorrow.`
        };
      }
      return {
        direct: `I am currently focused on top priorities, but I will follow up on this tomorrow morning.`,
        collaborative: `I will review this first thing tomorrow and send over a clear update.`
      };
    }

    if (tone === 'Polite') {
      if (isOffline) {
        return {
          direct: `Thank you for reaching out! I've stepped away for the evening, but I'll be glad to look into this first thing tomorrow morning.`,
          collaborative: `I appreciate you bringing this to my attention. I am offline for tonight, but I will prioritize this as soon as I start work tomorrow.`
        };
      }
      if (isBusy) {
        return {
          direct: `Thank you for the message. My schedule is quite full today, but I would be happy to review this for you tomorrow morning.`,
          collaborative: `I'm currently tied up with scheduled meetings today, but I'll make sure to get back to you with an update first thing tomorrow.`
        };
      }
      return {
        direct: `Thanks for getting in touch! I'm attending to current deliverables today, but I'll follow up with you as soon as I can.`,
        collaborative: `Thank you for sharing this. I will take a look at it tomorrow and drop you a quick line.`
      };
    }

    if (tone === 'Formal') {
      if (isOffline) {
        return {
          direct: `Please be advised that I have concluded my working hours for today. I will review your request thoroughly and provide a response during standard business hours tomorrow morning.`,
          collaborative: `Thank you for your correspondence. As I am currently unavailable this evening, I will ensure this matter receives my immediate attention upon my return to the office tomorrow.`
        };
      }
      if (isBusy) {
        return {
          direct: `Due to prior scheduled commitments throughout today, I am unable to accommodate additional tasks. I shall review the documentation tomorrow afternoon and revert accordingly.`,
          collaborative: `Thank you for flagging this request. While my agenda is fully committed today, I will allocate time tomorrow morning to review this and provide a formal response.`
        };
      }
      return {
        direct: `I acknowledge receipt of your communication. I am currently attending to scheduled deliverables and will provide a formal update during business hours tomorrow.`,
        collaborative: `Thank you for your message. I shall review the details at my earliest opportunity tomorrow morning and share a comprehensive status update.`
      };
    }

    // Informal
    if (isOffline) {
      return {
        direct: `Hey! I'm all done for the night, but I'll check this out first thing in the morning.`,
        collaborative: `Catching up on this tomorrow morning as soon as I'm back online! Have a great evening.`
      };
    }
    if (isBusy) {
      return {
        direct: `Super busy with meetings today, but I'll definitely take a look tomorrow!`,
        collaborative: `Schedule's pretty packed today, but I'll jump on this first thing in the morning.`
      };
    }
    return {
      direct: `Hey, thanks for sending this over! I'll dive into it tomorrow and let you know.`,
      collaborative: `Got it, thanks! I'll give this a quick read tomorrow and get right back to you.`
    };
  };

  const handleSelectStyle = (newStyle: ToneStyle) => {
    setTargetStyle(newStyle);
    recordPreference('tone', newStyle);
    if (outputOptions) {
      const activeText = rawDraft.trim() || DEFAULT_RAW_VENTING;
      setOutputOptions(getToneFallback(newStyle, activeText));
    }
  };

  const handleRunToneShift = async () => {
    setModerationError(null);
    const activeText = rawDraft.trim();

    if (!activeText) {
      setModerationError("Please enter your draft or venting notes to shift tone.");
      return;
    }

    const modCheck = checkForbiddenLanguage(activeText);
    if (modCheck.isForbidden) {
      setModerationError(modCheck.reason || FORBIDDEN_LANGUAGE_REJECTION_MESSAGE);
      return;
    }

    recordPreference('tone', targetStyle);
    setIsLoading(true);

    try {
      let toneInstruction = '';
      if (targetStyle === 'Assertive') {
        toneInstruction = 'Assertive style: polite but direct, short and concise response setting a firm boundary in 1 sentence.';
      } else if (targetStyle === 'Polite') {
        toneInstruction = 'Polite style: well-mannered, considerate, warm and kind in 1-2 sentences.';
      } else if (targetStyle === 'Formal') {
        toneInstruction = 'Formal style: slightly longer, formal professional language and structured business phrasing.';
      } else {
        toneInstruction = 'Informal style: friendly, relaxed, everyday casual tone and language in 1-2 sentences.';
      }

      const res = await fetch('/api/triage/full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_input: `Rewrite this message in 2 distinct options using an ${toneInstruction}: "${activeText}"`,
          channel: 'Message',
          context_type: 'hybrid',
          desired_tone: targetStyle
        })
      });

      const data = await res.json();
      const rawText = data.raw_llm_response || '';

      const matches = rawText.match(/```(?:text)?\s*([\s\S]*?)```/g);
      if (matches && matches.length >= 2) {
        setOutputOptions({
          direct: matches[0].replace(/```(?:text)?/g, '').replace(/```/g, '').trim(),
          collaborative: matches[1].replace(/```(?:text)?/g, '').replace(/```/g, '').trim()
        });
      } else {
        setOutputOptions(getToneFallback(targetStyle, activeText));
      }
    } catch (e) {
      console.error('Error in tone shift:', e);
      setOutputOptions(getToneFallback(targetStyle, activeText));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="bg-white border border-[#e8e7df] rounded-[32px] p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-[#e8e7df] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-[#d97706]" />
            <h2 className="text-base font-bold text-[#1a1a15] tracking-tight">Tone Shifter</h2>
          </div>
          <p className="text-xs text-[#7a7a70] mt-0.5">
            Quickly rephrase raw or emotional notes into realistic, everyday 1–2 sentence boundary responses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Raw Input Form */}
        <div className="bg-[#fcfbf9] border border-[#e8e7df] rounded-2xl p-5 space-y-4">
          <label className="block text-xs font-bold text-[#a1a19a] uppercase tracking-wider flex items-center space-x-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#5a5a40]" />
            <span>Raw Venting or Frustrated Draft</span>
          </label>

          {moderationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{moderationError}</span>
            </div>
          )}

          <textarea
            value={rawDraft}
            onChange={(e) => setRawDraft(e.target.value)}
            rows={5}
            placeholder={DEFAULT_RAW_VENTING}
            className="w-full p-3.5 text-xs text-[#3a3a34] bg-white rounded-xl border border-[#e8e7df] focus:outline-none focus:ring-2 focus:ring-[#5a5a40] leading-relaxed placeholder:text-[#a1a19a]"
          />

          <div>
            <label className="block text-xs font-semibold text-[#5a5a40] uppercase tracking-wider mb-1.5">
              Desired Communication Style
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {(['Assertive', 'Polite', 'Formal', 'Informal'] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => handleSelectStyle(style)}
                  className={`py-1.5 px-2.5 rounded-xl border text-center font-bold text-xs uppercase tracking-wider transition-all ${
                    targetStyle === style
                      ? 'bg-[#5a5a40] text-white border-[#5a5a40]'
                      : 'bg-white text-[#3a3a34] border-[#e8e7df] hover:bg-[#f1f0e8]'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleRunToneShift}
            disabled={!rawDraft.trim() || isLoading}
            className="w-full py-3 bg-[#5a5a40] hover:bg-[#3f3f2d] text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-xs"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Re-framing Draft...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 text-[#f1f0e8]" />
                <span>Re-frame into Balanced Options</span>
              </>
            )}
          </button>
        </div>

        {/* Re-framed Outputs */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-[#a1a19a] uppercase tracking-wider flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
            <span>Reframed Professional Options</span>
          </h3>

          {outputOptions && (
            <div className="space-y-3.5 text-xs">
              {/* Option 1: Direct Boundary */}
              <div className="bg-[#fcfbf9] border border-[#e8e7df] rounded-2xl p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#e8e7df]">
                  <span className="font-bold text-[#1a1a15]">Option 1: Direct Boundary</span>
                  <button
                    onClick={() => handleCopy('direct', outputOptions.direct)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#e8e7df] font-semibold text-[#5a5a40] hover:bg-[#f1f0e8] flex items-center space-x-1"
                  >
                    {copiedId === 'direct' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#5a5a40]" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[#3a3a34] leading-relaxed font-sans bg-white p-3.5 rounded-xl border border-[#e8e7df] whitespace-pre-line text-xs">
                  {outputOptions.direct}
                </p>
              </div>

              {/* Option 2: Collaborative Counter-Offer */}
              <div className="bg-[#fcfbf9] border border-[#e8e7df] rounded-2xl p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#e8e7df]">
                  <span className="font-bold text-[#1a1a15]">Option 2: Collaborative Counter-Offer</span>
                  <button
                    onClick={() => handleCopy('collab', outputOptions.collaborative)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#e8e7df] font-semibold text-[#5a5a40] hover:bg-[#f1f0e8] flex items-center space-x-1"
                  >
                    {copiedId === 'collab' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#5a5a40]" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[#3a3a34] leading-relaxed font-sans bg-white p-3.5 rounded-xl border border-[#e8e7df] whitespace-pre-line text-xs">
                  {outputOptions.collaborative}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
