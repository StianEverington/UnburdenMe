import React from 'react';
import { X, ShieldCheck, Sliders, BellOff, Sparkles, Check } from 'lucide-react';
import { ResetProactivityLevel, ResetPromptSettings } from '../types';

interface ResetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ResetPromptSettings;
  onUpdateSettings: (newSettings: ResetPromptSettings) => void;
  onTriggerTestPrompt: () => void;
}

export const ResetSettingsModal: React.FC<ResetSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onTriggerTestPrompt
}) => {
  if (!isOpen) return null;

  const proactivityOptions: {
    level: ResetProactivityLevel;
    title: string;
    description: string;
    tag: string;
  }[] = [
    {
      level: 'off',
      title: 'Off (Silent)',
      description: 'Reset prompts are disabled. App will never show proactive reset suggestions.',
      tag: 'Manual only'
    },
    {
      level: 'gentle',
      title: 'Gentle (Recommended)',
      description: 'Appears only during sustained heavy workloads (e.g. 3+ high-priority flags or 12+ unread items).',
      tag: 'Calm companion'
    },
    {
      level: 'balanced',
      title: 'Balanced',
      description: 'Appears after 10+ minutes of continuous active triage or moderate notification spikes.',
      tag: 'Adaptive'
    },
    {
      level: 'proactive',
      title: 'Proactive',
      description: 'Frequently offers micro-breaks, quiet windows, and inbox summaries throughout busy work sessions.',
      tag: 'Maximum support'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FAF9F5] border border-[#E8E7DF] rounded-3xl max-w-lg w-full p-6 shadow-xl relative text-left space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E8E7DF] pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-[#5A5A40]">
              <Sliders className="w-4 h-4 text-[#5A5A40]" />
              <span>Reset Prompt Preferences</span>
            </div>
            <h3 className="text-lg font-bold text-[#1A1A15]">Customise App Proactivity</h3>
            <p className="text-xs text-[#7A7A70]">
              Control how proactively UnburdenMe suggests calm resets and holds non-urgent noise.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#7A7A70] hover:text-[#1A1A15] hover:bg-[#F1F0E8] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Privacy Notice */}
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-start space-x-3 text-xs text-emerald-900">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Strict Privacy Guarantee</p>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Your message and document content is never read to trigger resets. Prompts rely strictly on anonymous volume counts and flag metadata.
            </p>
          </div>
        </div>

        {/* Proactivity Level Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider block">
            Proactivity Level
          </label>
          <div className="space-y-2">
            {proactivityOptions.map(option => {
              const isSelected = settings.proactivity === option.level;
              return (
                <div
                  key={option.level}
                  onClick={() => onUpdateSettings({ ...settings, proactivity: option.level })}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between ${
                    isSelected
                      ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-xs'
                      : 'bg-[#FFFFFF] text-[#3A3A34] border-[#E8E7DF] hover:bg-[#F1F0E8]'
                  }`}
                >
                  <div className="space-y-1 max-w-[85%]">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs">{option.title}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          isSelected
                            ? 'bg-[#4A4A30] text-white border-[#6A6A50]'
                            : 'bg-[#F1F0E8] text-[#5A5A40] border-[#E8E7DF]'
                        }`}
                      >
                        {option.tag}
                      </span>
                    </div>
                    <p
                      className={`text-[11px] leading-relaxed ${
                        isSelected ? 'text-[#E8E7DF]' : 'text-[#7A7A70]'
                      }`}
                    >
                      {option.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-white text-[#5A5A40] flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#E8E7DF] flex flex-col sm:flex-row items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onTriggerTestPrompt();
              onClose();
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[#E8E7DF] bg-[#FFFFFF] hover:bg-[#F1F0E8] text-xs font-semibold text-[#5A5A40] flex items-center justify-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Test / Preview Reset Prompt Now</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#5A5A40] text-white hover:bg-[#4A4A30] text-xs font-bold"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
