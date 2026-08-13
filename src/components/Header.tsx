/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, Compass, Sparkles, ListTodo, FileText, History, UserCheck, BellOff, Calendar, Lightbulb, ClipboardList } from 'lucide-react';

interface HeaderProps {
  savedCount: number;
  onOpenHistory: () => void;
  onOpenResetSettings?: () => void;
  onOpenPrivacyModal?: () => void;
  activeTab: 'co-pilot' | 'priorities' | 'schedule' | 'micro-summary' | 'tone-shift' | 'problem-solver' | 'prep-tool';
  setActiveTab: (tab: 'co-pilot' | 'priorities' | 'schedule' | 'micro-summary' | 'tone-shift' | 'problem-solver' | 'prep-tool') => void;
}

export const Header: React.FC<HeaderProps> = ({
  savedCount,
  onOpenHistory,
  onOpenResetSettings,
  onOpenPrivacyModal,
  activeTab,
  setActiveTab
}) => {
  return (
    <header className="border-b border-[#e8e7df] bg-[#f8f7f2] sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Identity */}
          <div className="flex items-center space-x-3">
            <a href="/" className="flex items-center group transition-opacity hover:opacity-90">
              <img 
                src="/unburdenme-logo.png" 
                alt="UnburdenMe Logo" 
                className="h-12 w-auto object-contain bg-transparent"
                referrerPolicy="no-referrer"
              />
            </a>
            <div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#e8e7df] text-[#5a5a40] border border-[#d5d4cb]">
                  <ShieldCheck className="w-3 h-3 mr-1 text-[#5a5a40]" />
                  Communication Companion
                </span>
              </div>
              <p className="text-[11px] uppercase tracking-widest text-[#8e8e8e] font-medium mt-0.5">
                Workload Management & Personal Balance
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center space-x-1 bg-[#e8e7df]/80 p-1 rounded-2xl border border-[#d5d4cb] text-xs font-medium text-[#7a7a70]">
            <button
              onClick={() => setActiveTab('co-pilot')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'co-pilot'
                  ? 'bg-[#5a5a40] text-white shadow-xs font-semibold'
                  : 'hover:text-[#1a1a15] hover:bg-[#f1f0e8]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
              <span>Companion</span>
            </button>
            <button
              onClick={() => setActiveTab('priorities')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'priorities'
                  ? 'bg-[#5a5a40] text-white shadow-xs font-semibold'
                  : 'hover:text-[#1a1a15] hover:bg-[#f1f0e8]'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5 text-[#d97706]" />
              <span>Priorities</span>
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'schedule'
                  ? 'bg-[#5a5a40] text-white shadow-xs font-semibold'
                  : 'hover:text-[#1a1a15] hover:bg-[#f1f0e8]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-[#d97706]" />
              <span>Schedule</span>
            </button>
            <button
              onClick={() => setActiveTab('micro-summary')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'micro-summary'
                  ? 'bg-[#5a5a40] text-white shadow-xs font-semibold'
                  : 'hover:text-[#1a1a15] hover:bg-[#f1f0e8]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#d97706]" />
              <span>Micro Summary</span>
            </button>
            <button
              onClick={() => setActiveTab('problem-solver')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'problem-solver'
                  ? 'bg-[#5a5a40] text-white shadow-xs font-semibold'
                  : 'hover:text-[#1a1a15] hover:bg-[#f1f0e8]'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5 text-[#d97706]" />
              <span>Problem Solver</span>
            </button>
            <button
              onClick={() => setActiveTab('prep-tool')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'prep-tool'
                  ? 'bg-[#5a5a40] text-white shadow-xs font-semibold'
                  : 'hover:text-[#1a1a15] hover:bg-[#f1f0e8]'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-[#d97706]" />
              <span>Prep Tool</span>
            </button>
            <button
              onClick={() => setActiveTab('tone-shift')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'tone-shift'
                  ? 'bg-[#5a5a40] text-white shadow-xs font-semibold'
                  : 'hover:text-[#1a1a15] hover:bg-[#f1f0e8]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-[#d97706]" />
              <span>Tone Shifter</span>
            </button>
          </div>

          {/* Context Selector & History */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Saved History Drawer Trigger */}
            <button
              onClick={onOpenHistory}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-[#e8e7df] text-xs font-medium text-[#3a3a34] bg-white hover:bg-[#f1f0e8] transition-colors shadow-xs"
            >
              <History className="w-3.5 h-3.5 text-[#5a5a40]" />
              <span>Saved ({savedCount})</span>
            </button>

            {/* Privacy Compliance Badge Button */}
            {onOpenPrivacyModal && (
              <button
                onClick={onOpenPrivacyModal}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 transition-colors shadow-xs"
                title="View GDPR & User-Driven Privacy Architecture"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Privacy</span>
              </button>
            )}

            {/* Reset Prompts Settings Trigger */}
            {onOpenResetSettings && (
              <button
                onClick={onOpenResetSettings}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-amber-200 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 transition-colors shadow-xs"
                title="Customise reset notification prompts and proactivity"
              >
                <BellOff className="w-3.5 h-3.5 text-amber-700" />
                <span>Reset Prompts</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
