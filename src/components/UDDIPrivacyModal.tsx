import React from 'react';
import { X, ShieldCheck, Lock, EyeOff, Cpu, CheckCircle2, FileCheck, MousePointerClick } from 'lucide-react';

interface UDDIPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UDDIPrivacyModal: React.FC<UDDIPrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FAF9F5] border border-[#E8E7DF] rounded-3xl max-w-xl w-full p-6 shadow-xl relative text-left space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E8E7DF] pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>GDPR & User-Driven Privacy Architecture</span>
            </div>
            <h3 className="text-lg font-bold text-[#1A1A15]">User-Driven Data Input</h3>
            <p className="text-xs text-[#7A7A70]">
              Full transparency on how UnburdenMe protects your privacy and operates strictly on data you explicitly provide.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#7A7A70] hover:text-[#1A1A15] hover:bg-[#F1F0E8] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Core Pillars of User-Driven Privacy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-white border border-[#E8E7DF] rounded-2xl space-y-1.5 shadow-xs">
            <div className="flex items-center space-x-2 text-[#1A1A15] font-bold">
              <EyeOff className="w-4 h-4 text-emerald-600" />
              <span>No Automatic Scanning</span>
            </div>
            <p className="text-[11px] text-[#7A7A70] leading-relaxed">
              No background reading of inbox messages, no silent monitoring, and no requests for full inbox read permissions.
            </p>
          </div>

          <div className="p-3.5 bg-white border border-[#E8E7DF] rounded-2xl space-y-1.5 shadow-xs">
            <div className="flex items-center space-x-2 text-[#1A1A15] font-bold">
              <MousePointerClick className="w-4 h-4 text-blue-600" />
              <span>Copy & Paste Control</span>
            </div>
            <p className="text-[11px] text-[#7A7A70] leading-relaxed">
              You choose exactly what to paste and process. You retain total agency over every snippet shared.
            </p>
          </div>

          <div className="p-3.5 bg-white border border-[#E8E7DF] rounded-2xl space-y-1.5 shadow-xs">
            <div className="flex items-center space-x-2 text-[#1A1A15] font-bold">
              <Cpu className="w-4 h-4 text-amber-600" />
              <span>Behavioural Load Detection</span>
            </div>
            <p className="text-[11px] text-[#7A7A70] leading-relaxed">
              Cognitive overload triggers rely on non-content signals (e.g. high-importance flags count, app usage duration, task volume) — never message text.
            </p>
          </div>

          <div className="p-3.5 bg-white border border-[#E8E7DF] rounded-2xl space-y-1.5 shadow-xs">
            <div className="flex items-center space-x-2 text-[#1A1A15] font-bold">
              <Lock className="w-4 h-4 text-purple-600" />
              <span>GDPR Compliance</span>
            </div>
            <p className="text-[11px] text-[#7A7A70] leading-relaxed">
              On-demand AI processing without persistent database tracking or third-party ad profile sharing.
            </p>
          </div>
        </div>

        {/* Breakdown Box */}
        <div className="p-4 bg-[#FCFBF9] border border-[#E8E7DF] rounded-2xl space-y-2 text-xs">
          <h4 className="font-bold text-[#5A5A40] uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
            <FileCheck className="w-4 h-4 text-[#5A5A40]" />
            <span>How UnburdenMe Remains Your Calm Companion</span>
          </h4>
          <ul className="space-y-1.5 text-[11px] text-[#3A3A34]">
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>User-driven inputs:</strong> The AI only digests text snippets when you click "Summarise" or "Generate Draft".</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Non-directive prompts:</strong> Reset suggestions use gentle "Want to...?" phrasing and can be muted anytime.</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><strong>Local storage control:</strong> Saved items remain on your local device.</span>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[#E8E7DF] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#5A5A40] text-white hover:bg-[#4A4A30] text-xs font-bold"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
