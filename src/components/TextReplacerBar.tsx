import React, { useState } from 'react';
import { ShieldAlert, RefreshCw, Check, Sparkles } from 'lucide-react';

interface TextReplacerBarProps {
  textValue: string;
  onUpdateText: (newText: string) => void;
}

export const TextReplacerBar: React.FC<TextReplacerBarProps> = ({
  textValue,
  onUpdateText,
}) => {
  const [replaceTarget, setReplaceTarget] = useState<string>('');
  const [replaceWith, setReplaceWith] = useState<string>('XXX');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Generate smart suggestions based on what the user typed in "Replace"
  const getSuggestions = (target: string): string[] => {
    const trimmed = target.trim();
    if (!trimmed) return [];

    const suggestions: string[] = [];

    // 1. Default red redacted option
    suggestions.push('XXX');

    // 2. Initials (e.g., "John Smith" -> "JS", "Alice Johnson" -> "AJ")
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length >= 1) {
      const initials = words.map(w => w[0].toUpperCase()).join('');
      if (initials && !suggestions.includes(initials) && initials !== 'XXX') {
        suggestions.push(initials);
      }
    }

    // 3. Generic placeholders based on context
    if (words.length > 1) {
      suggestions.push('Person A');
      suggestions.push('Client');
    } else {
      suggestions.push('Colleague');
      suggestions.push('[Redacted]');
    }

    return suggestions;
  };

  const suggestions = getSuggestions(replaceTarget);

  const handleApplyReplace = () => {
    const target = replaceTarget.trim();
    if (!target || !textValue) return;

    // Case-insensitive regex search for all occurrences
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapeRegex(target), 'gi');

    const matches = textValue.match(regex);
    const count = matches ? matches.length : 0;

    if (count === 0) {
      setFeedback(`No matches found for "${target}".`);
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    const updatedText = textValue.replace(regex, replaceWith || 'XXX');
    onUpdateText(updatedText);

    setFeedback(`Replaced ${count} instance${count > 1 ? 's' : ''} of "${target}" with "${replaceWith || 'XXX'}".`);
    setReplaceTarget('');
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <div className="bg-[#FAF9F5] border border-[#E8E7DF] rounded-2xl p-3 space-y-2 text-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[#5A5A40] uppercase tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
          <span>Hide Sensitive Info / Names</span>
        </div>
        <span className="text-[10px] text-[#7A7A70]">
          Instant on-device text replacement before submitting
        </span>
      </div>

      {/* Inputs row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Target input */}
        <div className="flex-1 flex items-center space-x-1.5 bg-white border border-[#E8E7DF] rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-[#5A5A40]">
          <span className="text-[#7A7A70] font-semibold text-[11px] shrink-0">Replace:</span>
          <input
            type="text"
            value={replaceTarget}
            onChange={(e) => setReplaceTarget(e.target.value)}
            placeholder="e.g. John Smith or Acme Corp"
            className="w-full bg-transparent text-xs text-[#1A1A15] focus:outline-none placeholder:text-[#A1A19A]"
          />
        </div>

        {/* Replacement input */}
        <div className="flex-1 flex items-center space-x-1.5 bg-white border border-[#E8E7DF] rounded-xl px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-[#5A5A40]">
          <span className="text-[#7A7A70] font-semibold text-[11px] shrink-0">with:</span>
          <input
            type="text"
            value={replaceWith}
            onChange={(e) => setReplaceWith(e.target.value)}
            placeholder="e.g. XXX or [Redacted]"
            className="w-full bg-transparent text-xs font-bold text-red-600 focus:outline-none placeholder:text-[#a1a19a]"
          />
        </div>

        {/* Action button */}
        <button
          type="button"
          onClick={handleApplyReplace}
          disabled={!replaceTarget.trim() || !textValue}
          className="px-3.5 py-1.5 rounded-xl bg-[#5A5A40] text-white hover:bg-[#4A4A30] disabled:bg-[#A1A19A] disabled:cursor-not-allowed text-xs font-bold shrink-0 transition-all shadow-xs flex items-center justify-center space-x-1"
        >
          <RefreshCw className="w-3 h-3 text-amber-300" />
          <span>Apply Replace</span>
        </button>
      </div>

      {/* Suggested replacement chips */}
      {replaceTarget.trim().length > 0 && suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] text-[#7A7A70] font-semibold flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Suggested:</span>
          </span>
          {suggestions.map((sug, idx) => {
            const isSelected = replaceWith === sug;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setReplaceWith(sug)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                  isSelected
                    ? 'bg-red-50 text-red-700 border-red-300 ring-1 ring-red-300'
                    : 'bg-white text-[#3A3A34] border-[#E8E7DF] hover:bg-[#F1F0E8]'
                }`}
              >
                {sug === 'XXX' ? <span className="text-red-600 font-extrabold">XXX</span> : sug}
              </button>
            );
          })}
        </div>
      )}

      {/* Feedback toast message */}
      {feedback && (
        <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-[11px] font-semibold flex items-center space-x-1.5 animate-fadeIn">
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
};
