/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PRESET_SCENARIOS, PresetScenario } from '../lib/constants';
import { Zap, Mail, MessageSquare, Users, Phone, Briefcase, Heart, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface PresetPickerProps {
  onSelectPreset: (preset: PresetScenario) => void;
  selectedPresetId?: string;
  contextMode: 'work' | 'personal' | 'hybrid';
  setContextMode: (mode: 'work' | 'personal' | 'hybrid') => void;
}

export const PresetPicker: React.FC<PresetPickerProps> = ({
  onSelectPreset,
  selectedPresetId,
  contextMode,
  setContextMode
}) => {
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const filteredPresets = PRESET_SCENARIOS.filter((preset) => {
    if (contextMode === 'hybrid') return true;
    if (contextMode === 'work') return preset.category === 'work' || preset.category === 'hybrid';
    if (contextMode === 'personal') return preset.category === 'personal' || preset.category === 'hybrid';
    return true;
  });

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'Face-to-Face':
        return <Users className="w-3.5 h-3.5 text-[#d97706]" />;
      case 'Phone Call':
        return <Phone className="w-3.5 h-3.5 text-[#e11d48]" />;
      case 'Email':
        return <Mail className="w-3.5 h-3.5 text-[#3b82f6]" />;
      case 'WhatsApp':
      case 'SMS':
      case 'Teams':
      case 'Online Meeting':
        return <MessageSquare className="w-3.5 h-3.5 text-[#10b981]" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-[#5a5a40]" />;
    }
  };

  return (
    <div className="bg-white border border-[#e8e7df] rounded-[24px] p-3.5 shadow-xs transition-all">
      {/* Top Header & Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-[#d97706] shrink-0" />
          <h2 className="text-xs uppercase tracking-widest text-[#5a5a40] font-bold">
            Quick Scenario Presets
          </h2>
        </div>

        {/* Category Filters & Toggle */}
        <div className="flex items-center space-x-1 text-[11px]">
          <div className="bg-[#f8f7f2] p-0.5 rounded-xl border border-[#e8e7df] flex items-center space-x-0.5">
            <button
              onClick={() => setContextMode('personal')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                contextMode === 'personal'
                  ? 'bg-white text-[#1a1a15] shadow-xs font-semibold'
                  : 'text-[#7a7a70] hover:text-[#1a1a15]'
              }`}
            >
              Personal & Life
            </button>
            <button
              onClick={() => setContextMode('work')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                contextMode === 'work'
                  ? 'bg-white text-[#1a1a15] shadow-xs font-semibold'
                  : 'text-[#7a7a70] hover:text-[#1a1a15]'
              }`}
            >
              Workplace
            </button>
            <button
              onClick={() => setContextMode('hybrid')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                contextMode === 'hybrid'
                  ? 'bg-white text-[#1a1a15] shadow-xs font-semibold'
                  : 'text-[#7a7a70] hover:text-[#1a1a15]'
              }`}
            >
              Combined
            </button>
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 rounded-lg hover:bg-[#f8f7f2] text-[#7a7a70] transition-all ml-1 flex items-center space-x-1"
            title={showDetails ? "Hide descriptions" : "Show scenario descriptions"}
          >
            <span className="text-[10px] hidden sm:inline font-medium text-[#7a7a70]">
              {showDetails ? "Compact" : "Details"}
            </span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Preset Buttons Grid - Low Profile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filteredPresets.map((preset) => {
          const isSelected = preset.id === selectedPresetId;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              title={isSelected ? "Click to deselect preset and revert to default" : `Select scenario: ${preset.title}`}
              className={`text-left px-3 py-2 rounded-xl border text-xs transition-all flex flex-col justify-center cursor-pointer ${
                isSelected
                  ? 'bg-[#f8f7f2] border-[#5a5a40] ring-1 ring-[#5a5a40] shadow-xs'
                  : 'bg-white border-[#e8e7df] hover:bg-[#fcfbf9] hover:border-[#d5d4cb]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="shrink-0">{getChannelIcon(preset.channel)}</span>
                  <span className={`font-semibold text-xs truncate ${isSelected ? 'text-[#1a1a15]' : 'text-[#3a3a34]'}`}>
                    {preset.title}
                  </span>
                </div>
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase shrink-0 ${
                  preset.category === 'personal'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : preset.category === 'work'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}>
                  {preset.category}
                </span>
              </div>

              {showDetails && (
                <p className="text-[11px] text-[#7a7a70] mt-1.5 line-clamp-2 leading-tight">
                  {preset.description}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
