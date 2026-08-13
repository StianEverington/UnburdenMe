/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

export const WEEKLY_MINDSET_QUOTES = [
  "You cannot expand the working hours today, but you can choose the top priority deliverable to focus on.",
  "Focusing on what you can resolve now brings clarity; everything else can wait for its dedicated window.",
  "Boundaries protect the quality of your work—saying no to low priorities preserves space for key outcomes.",
  "You are responsible for your effort and focus today, not for solving every incoming request at once.",
  "Progress comes from completing one clear deliverable at a time, rather than holding ten in motion.",
  "Protecting your focus today ensures you return tomorrow with energy, composure, and sharp attention.",
  "An immediate ping does not mandate an immediate sacrifice of your planned priorities.",
  "Clear communication of realistic timelines is a professional strength, not a delay."
];

export const HIGH_WORKLOAD_MINDSET_QUOTES = [
  "With multiple high priorities competing today, select the single critical task first and defer the rest.",
  "When workload surges, tightening your focus to one item protects quality and prevents cognitive fatigue.",
  "High volume calls for high selectivity—pause, triage, and execute the top deliverable only.",
  "Protecting your agency in peak periods means choosing what gets done today, and what waits.",
  "Under heavy demands, clear boundary setting is your most effective tool for sustainable progress."
];

interface MicroMindsetCardProps {
  initialQuote?: string;
  userScenario?: string;
  metadata?: any;
}

export const MicroMindsetCard: React.FC<MicroMindsetCardProps> = ({
  initialQuote,
  userScenario = '',
  metadata
}) => {
  const [manualOffset, setManualOffset] = useState<number>(0);
  const [appUsageCount, setAppUsageCount] = useState<number>(1);

  // Track app usage in localStorage
  useEffect(() => {
    try {
      const storedCount = localStorage.getItem('unburdenme_app_usage_count');
      const count = storedCount ? parseInt(storedCount, 10) + 1 : 1;
      localStorage.setItem('unburdenme_app_usage_count', count.toString());
      setAppUsageCount(count);
    } catch (e) {
      // Ignore localStorage errors in restricted environments
    }
  }, []);

  // Detect high workload conditions
  // Condition 1: > 3 high priority calendar items / emails / subject lines
  // Condition 2: Frequent app usage (> 3 runs) or high-volume scenario text
  const highPriorityItemsCount = (metadata?.calendar_events_count || 0) + (metadata?.top_email_subject_lines?.length || 0);
  const isHighWorkload = 
    highPriorityItemsCount > 3 || 
    (metadata?.unread_email_count && metadata.unread_email_count > 15) ||
    appUsageCount > 3 ||
    ['urgent', 'asap', 'overwhelmed', 'multiple', 'heavy', 'deadline', 'priority'].some(k => userScenario.toLowerCase().includes(k));

  // Determine epoch week for automatic weekly rotation
  const epochWeek = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));

  // Choose quote based on workload & weekly schedule
  let currentQuote = initialQuote;

  if (isHighWorkload) {
    const poolIndex = Math.abs((epochWeek + appUsageCount + manualOffset) % HIGH_WORKLOAD_MINDSET_QUOTES.length);
    currentQuote = HIGH_WORKLOAD_MINDSET_QUOTES[poolIndex];
  } else {
    const poolIndex = Math.abs((epochWeek + manualOffset) % WEEKLY_MINDSET_QUOTES.length);
    currentQuote = (manualOffset === 0 && initialQuote) ? initialQuote : WEEKLY_MINDSET_QUOTES[poolIndex];
  }

  const handleRotate = () => {
    setManualOffset((prev) => prev + 1);
  };

  return (
    <div className="bg-[#5a5a40] text-white rounded-2xl p-4 shadow-xs flex flex-col justify-between transition-all">
      <div>
        <div className="flex items-center justify-end mb-2">
          <button
            onClick={handleRotate}
            className="flex items-center space-x-1 bg-white/10 hover:bg-white/20 text-white/90 px-2 py-0.5 rounded-md transition-colors cursor-pointer text-[9px] font-normal"
            title="Rotate mindset quote"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Rotate</span>
          </button>
        </div>

        <p className="font-serif-italic text-xs sm:text-sm leading-relaxed text-white/95 font-medium">
          "{currentQuote}"
        </p>
      </div>
    </div>
  );
};
