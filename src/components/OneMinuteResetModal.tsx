import React, { useState, useEffect } from 'react';
import { Sparkles, X, Heart, CheckCircle2, Pause, Play, Volume2, VolumeX } from 'lucide-react';

interface OneMinuteResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const OneMinuteResetModal: React.FC<OneMinuteResetModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');

  useEffect(() => {
    if (!isOpen) {
      setSecondsRemaining(60);
      setIsActive(true);
      return;
    }

    let interval: any = null;
    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining(prev => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0) {
      if (onComplete) onComplete();
    }

    return () => clearInterval(interval);
  }, [isOpen, isActive, secondsRemaining, onComplete]);

  // Breathing cycle: Inhale 4s, Hold 4s, Exhale 4s (12s cycle)
  useEffect(() => {
    if (!isOpen) return;
    const cycleTime = (60 - secondsRemaining) % 12;
    if (cycleTime < 4) {
      setBreathPhase('Inhale');
    } else if (cycleTime < 8) {
      setBreathPhase('Hold');
    } else {
      setBreathPhase('Exhale');
    }
  }, [secondsRemaining, isOpen]);

  if (!isOpen) return null;

  const isFinished = secondsRemaining === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FAF9F5] border border-[#E8E7DF] rounded-3xl max-w-md w-full p-6 shadow-xl relative overflow-hidden text-center space-y-6">
        {/* Top close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#7A7A70] hover:text-[#1A1A15] hover:bg-[#F1F0E8] rounded-full transition-colors"
          title="Close reset"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1 pt-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>1-Minute Calm Reset</span>
          </div>
          <h3 className="text-xl font-bold text-[#1A1A15] tracking-tight">
            {isFinished ? "Reset Complete" : "Unburden Your Mind"}
          </h3>
          <p className="text-xs text-[#7A7A70] max-w-xs mx-auto">
            {isFinished
              ? "Your focus is renewed. Return to your day with clarity and agency."
              : "Allow your breathing to slow down. Release non-urgent cognitive noise."}
          </p>
        </div>

        {/* Breathing Animation Canvas */}
        {!isFinished ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <div className="relative flex items-center justify-center w-40 h-40">
              {/* Expanding & contracting pulse ring */}
              <div
                className={`absolute inset-0 rounded-full bg-emerald-200/50 transition-all duration-1000 ease-in-out ${
                  breathPhase === 'Inhale'
                    ? 'scale-110 opacity-70 bg-emerald-300/40'
                    : breathPhase === 'Hold'
                    ? 'scale-110 opacity-90 bg-emerald-400/30'
                    : 'scale-75 opacity-40 bg-emerald-100/50'
                }`}
              />
              <div className="relative z-10 w-28 h-28 rounded-full bg-[#FFFFFF] border border-[#E8E7DF] flex flex-col items-center justify-center shadow-xs">
                <span className="text-2xl font-bold text-[#1A1A15] font-mono">
                  {secondsRemaining}s
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 tracking-wide uppercase mt-0.5">
                  {breathPhase}
                </span>
              </div>
            </div>

            {/* Instruction line */}
            <p className="text-xs font-medium text-[#5A5A40]">
              {breathPhase === 'Inhale' && "Inhale deeply through your nose..."}
              {breathPhase === 'Hold' && "Pause softly and feel the space..."}
              {breathPhase === 'Exhale' && "Slowly exhale and release tension..."}
            </p>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-xs text-[#5A5A40] max-w-xs">
              Extraneous noise silenced. Non-urgent tasks held safely in reserve.
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-center space-x-3 pt-2 border-t border-[#E8E7DF]">
          {!isFinished ? (
            <>
              <button
                onClick={() => setIsActive(!isActive)}
                className="px-4 py-2 rounded-xl border border-[#E8E7DF] bg-[#FFFFFF] hover:bg-[#F1F0E8] text-xs font-semibold text-[#3A3A34] flex items-center space-x-1.5"
              >
                {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isActive ? "Pause" : "Resume"}</span>
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-[#5A5A40] text-white hover:bg-[#4A4A30] text-xs font-semibold"
              >
                Finish Early
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-[#5A5A40] text-white hover:bg-[#4A4A30] text-xs font-bold shadow-xs"
            >
              Back to UnburdenMe
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
