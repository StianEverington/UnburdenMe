import React, { useState, useEffect } from 'react';
import { Sparkles, BellOff, FileText, Heart, X, SlidersHorizontal, CheckCircle2, Shield, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { ResetPromptSettings } from '../types';

interface ResetPromptBannerProps {
  settings: ResetPromptSettings;
  onUpdateSettings: (newSettings: ResetPromptSettings) => void;
  onOpenOneMinuteReset: () => void;
  onOpenMicroSummary: () => void;
  onOpenSettings: () => void;
  // Metadata signals (privacy-safe numbers)
  unreadCount?: number;
  highPriorityCount?: number;
  // Explicit manual trigger
  forceShowPrompt?: boolean;
  onDismissForcePrompt?: () => void;
}

export const ResetPromptBanner: React.FC<ResetPromptBannerProps> = ({
  settings,
  onUpdateSettings,
  onOpenOneMinuteReset,
  onOpenMicroSummary,
  onOpenSettings,
  unreadCount = 12,
  highPriorityCount = 3,
  forceShowPrompt = false,
  onDismissForcePrompt
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isQuietActive, setIsQuietActive] = useState<boolean>(false);
  const [quietMinutesLeft, setQuietMinutesLeft] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Check if proactivity triggers prompt based on privacy-safe signals
  useEffect(() => {
    if (forceShowPrompt) {
      setIsVisible(true);
      setIsExpanded(true);
      return;
    }

    if (settings.proactivity === 'off') {
      setIsVisible(false);
      return;
    }

    // Determine trigger based on proactivity setting
    let shouldTrigger = false;
    if (settings.proactivity === 'gentle') {
      shouldTrigger = highPriorityCount >= 3 || unreadCount >= 15;
    } else if (settings.proactivity === 'balanced') {
      shouldTrigger = highPriorityCount >= 2 || unreadCount >= 8;
    } else if (settings.proactivity === 'proactive') {
      shouldTrigger = highPriorityCount >= 1 || unreadCount >= 5;
    }

    setIsVisible(shouldTrigger);
  }, [settings.proactivity, unreadCount, highPriorityCount, forceShowPrompt]);

  // Timer for held/quieted non-urgent notifications
  useEffect(() => {
    if (!settings.silencedUntil) {
      setIsQuietActive(false);
      setQuietMinutesLeft(0);
      return;
    }

    const expiryTime = new Date(settings.silencedUntil).getTime();
    const updateQuietState = () => {
      const now = Date.now();
      const diffMs = expiryTime - now;
      if (diffMs <= 0) {
        setIsQuietActive(false);
        setQuietMinutesLeft(0);
        onUpdateSettings({ ...settings, silencedUntil: null });
      } else {
        setIsQuietActive(true);
        setQuietMinutesLeft(Math.ceil(diffMs / 60000));
      }
    };

    updateQuietState();
    const timer = setInterval(updateQuietState, 15000);
    return () => clearInterval(timer);
  }, [settings.silencedUntil]);

  // Handle Action 1: Hold non-urgent notifications for 15 minutes
  const handleHoldNotifications = () => {
    const silenceUntilISO = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    onUpdateSettings({ ...settings, silencedUntil: silenceUntilISO });
    setFeedbackMessage('Non-urgent notifications held for 15 minutes.');
    setTimeout(() => {
      setFeedbackMessage(null);
      handleDismiss();
    }, 2000);
  };

  // Handle Action 2: Summarise inbox
  const handleSummariseInbox = () => {
    onOpenMicroSummary();
    handleDismiss();
  };

  // Handle Action 3: Start 1-minute reset
  const handleStartOneMinuteReset = () => {
    onOpenOneMinuteReset();
    handleDismiss();
  };

  // Perform full Reset (Holds non-urgent noise + opens 1-minute reset)
  const handleFullReset = () => {
    const silenceUntilISO = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    onUpdateSettings({ ...settings, silencedUntil: silenceUntilISO });
    onOpenOneMinuteReset();
    handleDismiss();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismissForcePrompt) onDismissForcePrompt();
  };

  return (
    <div className="w-full space-y-3">
      {/* Quiet Mode Active Badge (If user currently held non-urgent items) */}
      {isQuietActive && (
        <div className="bg-[#FAF9F5] border border-emerald-300 rounded-2xl p-3 px-4 flex items-center justify-between text-xs text-[#1A1A15] shadow-xs animate-fadeIn">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <BellOff className="w-4 h-4 text-emerald-700" />
            <span className="font-bold text-[#3A3A34]">
              Non-urgent notifications held quietly
            </span>
            <span className="text-[11px] text-[#7A7A70] font-mono">
              ({quietMinutesLeft}m remaining)
            </span>
          </div>
          <button
            onClick={() => onUpdateSettings({ ...settings, silencedUntil: null })}
            className="text-[11px] font-bold text-[#5A5A40] hover:underline px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200"
          >
            Resume notifications
          </button>
        </div>
      )}

      {/* Main Reset Notification Prompt Card */}
      {isVisible && (
        <div className="w-full">
          {!isExpanded ? (
            /* Smaller Pop-up Title Bar Option */
            <div className="bg-[#FAF9F5] border border-amber-300/80 rounded-2xl px-3.5 py-2 shadow-xs flex items-center justify-between text-xs transition-all hover:border-amber-400">
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="flex items-center space-x-2.5 text-xs font-bold text-[#1A1A15] text-left group min-w-0"
              >
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1 shrink-0 group-hover:bg-amber-200 transition-colors">
                  <Sparkles className="w-3 h-3 text-amber-700" />
                  <span>Calm Reset Prompt</span>
                </span>
                <span className="text-[11px] text-[#5A5A40] font-medium hidden sm:inline truncate">
                  Want a quick reset? ({highPriorityCount} priority flags)
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#5A5A40] group-hover:translate-y-0.5 transition-transform shrink-0" />
              </button>

              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="px-2.5 py-1 text-[11px] font-bold text-[#2E4D3A] bg-[#EDF4F0] hover:bg-[#DCECE3] border border-[#B3D7BD] rounded-xl transition-colors shadow-2xs"
                >
                  Select Prompt
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="p-1 text-[#7A7A70] hover:text-[#1A1A15] hover:bg-[#E8E7DF] rounded-lg transition-colors"
                  title="Dismiss prompt"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Full Current Calm Reset Prompts Card */
            <div className="bg-[#FAF9F5] border border-amber-300/90 rounded-2xl p-4 sm:p-5 shadow-xs relative space-y-3 transition-all animate-fadeIn">
              {/* Top header row */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="flex items-center space-x-2 text-left group"
                  title="Click to collapse"
                >
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-amber-700" />
                    <span>Calm Reset Prompt</span>
                  </span>
                  <span className="text-[11px] text-[#7A7A70] hidden sm:inline">
                    • {highPriorityCount} high priority flags detected
                  </span>
                  <ChevronUp className="w-3.5 h-3.5 text-[#5A5A40] group-hover:-translate-y-0.5 transition-transform" />
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={onOpenSettings}
                    className="p-1.5 text-[#7A7A70] hover:text-[#1A1A15] hover:bg-[#F1F0E8] rounded-lg transition-colors text-xs flex items-center space-x-1"
                    title="Adjust reset prompt proactivity"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span className="text-[11px] hidden md:inline font-medium">Customise</span>
                  </button>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="p-1.5 text-[#7A7A70] hover:text-[#1A1A15] hover:bg-[#F1F0E8] rounded-lg transition-colors"
                    title="Collapse prompt"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Feedback message if action taken */}
              {feedbackMessage ? (
                <div className="p-2.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{feedbackMessage}</span>
                </div>
              ) : (
                <>
                  {/* Short non-directive prompt headline */}
                  <h4 className="text-sm sm:text-base font-bold text-[#1A1A15] tracking-tight">
                    Want a quick reset?
                  </h4>

                  {/* 3 Option Bullets with direct 1-tap buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-medium pt-0.5">
                    <button
                      type="button"
                      onClick={handleHoldNotifications}
                      className="p-2.5 rounded-xl border border-[#E8E7DF] bg-[#FFFFFF] hover:bg-[#F1F0E8] text-[#3A3A34] text-left flex items-start space-x-2 transition-all hover:border-[#5A5A40]"
                    >
                      <BellOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#1A1A15] block">Hold non-urgent noise</span>
                        <span className="text-[10px] text-[#7A7A70] block leading-tight">Silence low-priority alerts 15m</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleSummariseInbox}
                      className="p-2.5 rounded-xl border border-[#E8E7DF] bg-[#FFFFFF] hover:bg-[#F1F0E8] text-[#3A3A34] text-left flex items-start space-x-2 transition-all hover:border-[#5A5A40]"
                    >
                      <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#1A1A15] block">Summarise your inbox</span>
                        <span className="text-[10px] text-[#7A7A70] block leading-tight">Digest cognitive load instantly</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleStartOneMinuteReset}
                      className="p-2.5 rounded-xl border border-[#E8E7DF] bg-[#FFFFFF] hover:bg-[#F1F0E8] text-[#3A3A34] text-left flex items-start space-x-2 transition-all hover:border-[#5A5A40]"
                    >
                      <Heart className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#1A1A15] block">Start a 1-minute reset</span>
                        <span className="text-[10px] text-[#7A7A70] block leading-tight">60s guided breathing pause</span>
                      </div>
                    </button>
                  </div>

                  {/* Bottom Actions Row: Cancel | Reset */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#E8E7DF]/80">
                    <span className="text-[10px] text-[#7A7A70] flex items-center space-x-1">
                      <Shield className="w-3 h-3 text-emerald-700" />
                      <span>Privacy • Safe non-content signals only (zero inbox reading)</span>
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsExpanded(false)}
                        className="px-3 py-1.5 rounded-xl border border-[#E8E7DF] bg-[#FFFFFF] hover:bg-[#F1F0E8] text-xs font-semibold text-[#5A5A40]"
                      >
                        Collapse
                      </button>

                      <button
                        type="button"
                        onClick={handleFullReset}
                        className="px-4 py-1.5 rounded-xl bg-[#5A5A40] hover:bg-[#4A4A30] text-xs font-bold text-white shadow-xs flex items-center space-x-1"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Reset</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
