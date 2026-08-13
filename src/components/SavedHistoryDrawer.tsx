/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { History, X, Copy, Check, Trash2, Bookmark, Briefcase, UserCheck } from 'lucide-react';
import { SavedTriageItem } from '../types';

interface SavedHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedItems: SavedTriageItem[];
  onClearHistory: () => void;
  onDeleteSingle: (id: string) => void;
}

export const SavedHistoryDrawer: React.FC<SavedHistoryDrawerProps> = ({
  isOpen,
  onClose,
  savedItems,
  onClearHistory,
  onDeleteSingle
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#1a1a15]/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-[#f8f7f2] h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300 border-l border-[#e8e7df]">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#e8e7df] flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-[#5a5a40]" />
            <h2 className="text-base font-bold text-[#1a1a15]">Saved Choices & Preference Memory</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7a7a70] hover:text-[#1a1a15] hover:bg-[#f1f0e8]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Saved Items List */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {savedItems.length === 0 ? (
            <div className="text-center py-16 text-[#a1a19a] space-y-3">
              <Bookmark className="w-10 h-10 mx-auto text-[#d5d4cb] stroke-1" />
              <p className="text-sm font-semibold text-[#3a3a34]">No saved choices yet</p>
              <p className="text-xs text-[#7a7a70] max-w-xs mx-auto leading-relaxed">
                When you click "Select & Remember" on any generated draft, it will be saved here and used to tailor future guidance.
              </p>
            </div>
          ) : (
            savedItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-[#e8e7df] rounded-2xl p-4 shadow-xs space-y-3 relative group"
              >
                <div className="flex items-center justify-between text-xs text-[#7a7a70] pb-2 border-b border-[#f1f0e8]">
                  <span className="flex items-center space-x-1 font-semibold text-[#5a5a40]">
                    {item.context_type === 'work' ? (
                      <Briefcase className="w-3 h-3 text-[#5a5a40]" />
                    ) : (
                      <UserCheck className="w-3 h-3 text-[#d97706]" />
                    )}
                    <span className="capitalize">{item.context_type} • {item.channel}</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-[#a1a19a] font-mono">{item.timestamp}</span>
                    <button
                      onClick={() => onDeleteSingle(item.id)}
                      className="text-[#a1a19a] hover:text-red-600 p-0.5"
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-[#a1a19a] block uppercase tracking-wider">Original Scenario</span>
                  <p className="text-xs text-[#3a3a34] line-clamp-2 mt-0.5 font-serif-italic">
                    "{item.user_scenario}"
                  </p>
                </div>

                <div className="bg-[#fcfbf9] p-3.5 rounded-xl border border-[#e8e7df] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1a1a15]">{item.chosen_option_title}</span>
                    <button
                      onClick={() => handleCopy(item.id, item.edited_draft_text)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#e8e7df] text-[11px] font-bold text-[#5a5a40] hover:bg-[#f1f0e8] flex items-center space-x-1"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-700" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-[#5a5a40]" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs font-mono text-[#3a3a34] whitespace-pre-line leading-relaxed font-sans">
                    {item.edited_draft_text}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {savedItems.length > 0 && (
          <div className="p-4 border-t border-[#e8e7df] bg-white flex items-center justify-between text-xs">
            <span className="text-[#7a7a70]">{savedItems.length} saved preference records</span>
            <button
              onClick={onClearHistory}
              className="text-red-700 hover:text-red-800 font-bold flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-red-200 bg-white"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All History</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
