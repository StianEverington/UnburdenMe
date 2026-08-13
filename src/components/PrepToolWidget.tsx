import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Sparkles,
  RefreshCw,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  CalendarPlus,
  ListPlus,
  Copy,
  Check,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Tag,
  ArrowRight
} from 'lucide-react';
import { PrepToolResult, PrepChecklistCategory } from '../types';
import { checkForbiddenLanguage, FORBIDDEN_LANGUAGE_REJECTION_MESSAGE } from '../utils/moderation';
import { recordPreference, getMostFrequentPreference } from '../utils/preferenceTracker';

interface PrepToolWidgetProps {
  initialActivity?: string;
  onNavigateToTab?: (tab: 'schedule' | 'priorities') => void;
}

export const PrepToolWidget: React.FC<PrepToolWidgetProps> = ({
  initialActivity = '',
  onNavigateToTab
}) => {
  // Form input state
  const [activity, setActivity] = useState<string>(initialActivity);
  const [activityType, setActivityType] = useState<string>(
    () => getMostFrequentPreference('type', 'Meeting')
  );
  const [contextNotes, setContextNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Update activity if initialActivity changes from prop
  useEffect(() => {
    if (initialActivity) {
      setActivity(initialActivity);
    }
  }, [initialActivity]);

  // Loading & Result state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PrepToolResult | null>(null);

  // Checked items state (mapping item key/text to boolean)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Custom items added by user
  const [customInputText, setCustomInputText] = useState<string>('');
  const [activeCategoryForCustom, setActiveCategoryForCustom] = useState<string>('');

  // Integration feedback toasts / status
  const [addedToCalendarSuccess, setAddedToCalendarSuccess] = useState<boolean>(false);
  const [addedToPrioritiesSuccess, setAddedToPrioritiesSuccess] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // Integration form controls
  const [calDate, setCalDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [calTime, setCalTime] = useState<string>('09:00');
  const [priorityLevel, setPriorityLevel] = useState<'high' | 'mid' | 'low'>('high');

  const QUICK_PRESETS = [
    { label: 'Job Interview', type: 'Interview', text: 'Important Job Interview for Senior Role' },
    { label: 'Medical Visit', type: 'Visit / Event', text: "Doctor's Appointment & Medical Review" },
    { label: 'Performance Review', type: 'Performance Review', text: 'Annual Performance & Workload Review with Manager' },
    { label: 'Client Pitch', type: 'Meeting', text: 'High-Stakes Client Proposal Presentation' },
    { label: 'Family Event', type: 'Visit / Event', text: 'Family Gathering & Weekend Dinner' }
  ];

  // Handle API submission
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const trimmedActivity = activity.trim();
    if (!trimmedActivity) return;

    // Check forbidden language
    const modCheckAct = checkForbiddenLanguage(trimmedActivity);
    const modCheckNotes = checkForbiddenLanguage(contextNotes);
    if (modCheckAct.isForbidden || modCheckNotes.isForbidden) {
      setErrorMessage(modCheckAct.reason || modCheckNotes.reason || FORBIDDEN_LANGUAGE_REJECTION_MESSAGE);
      return;
    }

    // Record preference
    recordPreference('type', activityType);

    setIsLoading(true);
    setResult(null);
    setCheckedItems({});
    setAddedToCalendarSuccess(false);
    setAddedToPrioritiesSuccess(false);

    try {
      const response = await fetch('/api/prep-tool/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          activity: activity.trim(),
          activity_type: activityType,
          context_notes: contextNotes.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate prep checklist.');
      }

      const data: PrepToolResult = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Error generating prep checklist:', err);
      // Fallback
      setResult({
        isSensitive: false,
        headline: `Personalised Preparation Checklist: ${activity.trim()}`,
        mindsetNote: `Approach "${activity.trim()}" with clear focus and steady pacing. Take items one step at a time.`,
        categories: [
          {
            category: 'Essential Items & Materials to Have Ready',
            items: [
              `All relevant notes or documentation for "${activity.trim()}"`,
              'Notepad and pen to capture key takeaways',
              'Confirmed access passes or location details'
            ]
          },
          {
            category: 'Key Preparation Steps Beforehand',
            items: [
              'Review core objectives and target outcomes',
              'Set aside 15 minutes of quiet focus time before starting',
              'Prepare 2 key questions or discussion points'
            ]
          },
          {
            category: 'Communication & Mindset During the Activity',
            items: [
              'Pause briefly before answering complex prompts',
              'Maintain an assertive, clear, and composed demeanor'
            ]
          },
          {
            category: 'Post-Event Follow-up Actions',
            items: [
              'Log key outcomes and follow-up deadlines in your schedule'
            ]
          }
        ],
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle checklist item
  const toggleCheck = (itemText: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemText]: !prev[itemText]
    }));
  };

  // Add custom item
  const handleAddCustomItem = (catName: string) => {
    if (!customInputText.trim() || !result || !result.categories) return;

    const updatedCategories = result.categories.map(cat => {
      if (cat.category === catName) {
        return {
          ...cat,
          items: [...cat.items, customInputText.trim()]
        };
      }
      return cat;
    });

    setResult({
      ...result,
      categories: updatedCategories
    });

    setCustomInputText('');
    setActiveCategoryForCustom('');
  };

  // Delete item from category
  const handleDeleteItem = (catName: string, itemIdx: number) => {
    if (!result || !result.categories) return;

    const updatedCategories = result.categories.map(cat => {
      if (cat.category === catName) {
        return {
          ...cat,
          items: cat.items.filter((_, idx) => idx !== itemIdx)
        };
      }
      return cat;
    });

    setResult({
      ...result,
      categories: updatedCategories
    });
  };

  // Add event to Schedule Calendar automatically
  const handleAddToScheduleCalendar = () => {
    if (!activity.trim()) return;

    try {
      const storedRaw = localStorage.getItem('unburdenme_calendar_events');
      let calendarEvents: any[] = storedRaw ? JSON.parse(storedRaw) : [];

      const categoryMap: Record<string, 'work' | 'personal' | 'focus' | 'meeting'> = {
        'Interview': 'meeting',
        'Meeting': 'meeting',
        'Performance Review': 'work',
        'Visit / Event': 'personal',
        'Task': 'focus'
      };

      const selectedCategory = categoryMap[activityType] || 'work';

      // Summary of prep checklist as notes
      let notesSummary = result?.mindsetNote || '';
      if (result?.categories && result.categories.length > 0) {
        const topItems = result.categories[0].items.slice(0, 2).join('; ');
        if (topItems) notesSummary += ` | Prep: ${topItems}`;
      }

      const newEvent = {
        id: `prep-evt-${Date.now()}`,
        title: activity.trim(),
        date: calDate,
        startTime: calTime,
        endTime: `${(parseInt(calTime.split(':')[0], 10) + 1).toString().padStart(2, '0')}:00`,
        category: selectedCategory,
        priority: priorityLevel,
        notes: notesSummary,
        completed: false,
        syncedFrom: 'manual'
      };

      calendarEvents.push(newEvent);
      localStorage.setItem('unburdenme_calendar_events', JSON.stringify(calendarEvents));

      // Dispatch event to update Calendar tab in real-time
      window.dispatchEvent(new CustomEvent('unburdenme_calendar_updated', { detail: newEvent }));

      setAddedToCalendarSuccess(true);
      setTimeout(() => setAddedToCalendarSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to add prep event to calendar:', err);
    }
  };

  // Add event to Priority List automatically
  const handleAddToPriorityList = () => {
    if (!activity.trim()) return;

    try {
      const storedRaw = localStorage.getItem('unburdenme_priority_checklist');
      let priorityItems: any[] = storedRaw ? JSON.parse(storedRaw) : [];

      const typeMap: Record<string, 'Calendar Event' | 'Task' | 'Email' | 'Message' | 'General'> = {
        'Interview': 'Calendar Event',
        'Meeting': 'Calendar Event',
        'Performance Review': 'Task',
        'Visit / Event': 'Calendar Event',
        'Task': 'Task'
      };

      const newItem = {
        id: `prep-pri-${Date.now()}`,
        title: activity.trim(),
        priority: priorityLevel,
        type: typeMap[activityType] || 'Task',
        completed: false,
        deadline: calDate
      };

      priorityItems.unshift(newItem);
      localStorage.setItem('unburdenme_priority_checklist', JSON.stringify(priorityItems));

      // Dispatch custom event to update Priority tab in real-time
      window.dispatchEvent(new CustomEvent('unburdenme_priorities_updated', { detail: newItem }));

      setAddedToPrioritiesSuccess(true);
      setTimeout(() => setAddedToPrioritiesSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to add prep event to priority list:', err);
    }
  };

  // Copy plain text checklist
  const handleCopyChecklist = async () => {
    if (!result || !result.categories) return;

    let text = `=====================================\n`;
    text += `${result.headline || activity}\n`;
    text += `Mindset Note: ${result.mindsetNote || ''}\n`;
    text += `=====================================\n\n`;

    result.categories.forEach(cat => {
      text += `--- ${cat.category.toUpperCase()} ---\n`;
      cat.items.forEach((item, idx) => {
        const isChecked = checkedItems[item] ? '[✓]' : '[ ]';
        text += `${isChecked} ${item}\n`;
      });
      text += `\n`;
    });

    text += `Prepared via UnburdenMe Companion`;

    await navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
      {/* Top Banner Header */}
      <div className="bg-white border border-[#e8e7df] rounded-[28px] p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-[#5a5a40] text-white rounded-2xl shadow-xs shrink-0">
              <ClipboardList className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs uppercase tracking-widest text-[#a1a19a] font-bold">
                  Personalised Event Preparation Tool
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#1a1a15]">
                Event & Activity Preparation Tool
              </h2>
              <p className="text-xs text-[#7a7a70] mt-0.5 leading-relaxed">
                Generate a simple, tailored checklist before an upcoming visit, meeting, interview, or key task.
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 hidden sm:block">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#f8f7f2] text-[#5a5a40] border border-[#e8e7df]">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>AI-Powered Tailoring</span>
            </span>
          </div>
        </div>
      </div>

      {/* Input Form Card */}
      <div className="bg-white border border-[#e8e7df] rounded-[28px] p-6 shadow-xs space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-4">
          {/* Activity Headline Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#5a5a40] mb-1.5">
              What activity or event are you preparing for?
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                placeholder="e.g. Job Interview, Doctor's Visit, Performance Review, Client Pitch..."
                className="w-full p-3.5 text-sm rounded-2xl border border-[#e8e7df] bg-[#fcfbf9] text-[#1a1a15] focus:outline-none focus:ring-2 focus:ring-[#5a5a40] placeholder:text-[#a1a19a] transition-all"
              />
              {activity && (
                <button
                  type="button"
                  onClick={() => setActivity('')}
                  className="absolute right-3.5 top-3.5 text-xs text-[#a1a19a] hover:text-[#1a1a15]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Quick Scenario Preset Badges */}
          <div>
            <span className="text-[11px] font-semibold text-[#7a7a70] block mb-1.5">
              Quick Preset Ideas:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActivity(preset.text);
                    setActivityType(preset.type);
                  }}
                  className="px-2.5 py-1 rounded-xl text-xs font-medium bg-[#f8f7f2] hover:bg-[#e8e7df] text-[#5a5a40] border border-[#e8e7df] transition-colors flex items-center space-x-1"
                >
                  <Tag className="w-3 h-3 text-amber-600" />
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Activity Type & Optional Context Notes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-[#5a5a40] mb-1">
                Activity Category
              </label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-[#e8e7df] bg-[#fcfbf9] text-[#1a1a15] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]"
              >
                <option value="Meeting">Meeting / Discussion</option>
                <option value="Interview">Job / Strategic Interview</option>
                <option value="Visit / Event">Visit or Social Event</option>
                <option value="Performance Review">Performance Review</option>
                <option value="Task">Key Deliverable / Task</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#5a5a40] mb-1">
                Personal Context or Specific Notes <span className="font-normal text-[#7a7a70]">(Optional)</span>
              </label>
              <input
                type="text"
                value={contextNotes}
                onChange={(e) => setContextNotes(e.target.value)}
                placeholder="e.g. 'I get nervous presenting stats', 'Need to bring my ID & medical history'..."
                className="w-full p-2.5 text-xs rounded-xl border border-[#e8e7df] bg-[#fcfbf9] text-[#1a1a15] focus:outline-none focus:ring-2 focus:ring-[#5a5a40] placeholder:text-[#a1a19a]"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={!activity.trim() || isLoading}
              className="px-6 py-3 rounded-2xl bg-[#5a5a40] hover:bg-[#4a4a30] text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Generating Personalised Prep Checklist...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate Personalised Prep Checklist</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Sensitive Safety Card Warning */}
      {result?.isSensitive && (
        <div className="bg-rose-50 border border-rose-200 rounded-[28px] p-6 text-rose-950 space-y-3 shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2 text-rose-900 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0" />
            <span>Sensitive Safety Notice</span>
          </div>
          <p className="text-xs leading-relaxed text-rose-900">
            {result.sensitiveDisclaimer || 'This activity involves a sensitive medical, legal, or safety matter. For your safety and well-being, UnburdenMe cannot provide advice or prep lists on this topic. Please consult a trusted professional, doctor, or appropriate authority.'}
          </p>
        </div>
      )}

      {/* Generated Results Card */}
      {result && !result.isSensitive && (
        <div className="bg-white border border-[#e8e7df] rounded-[28px] p-6 shadow-xs space-y-6 animate-in fade-in">
          {/* Header & Mindset Note */}
          <div className="pb-4 border-b border-[#f1f0e8] space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-base font-bold text-[#1a1a15] flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{result.headline || `Prep Guide: ${activity}`}</span>
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200">
                Ready to Prepare
              </span>
            </div>

            {result.mindsetNote && (
              <div className="p-3.5 bg-[#faf9f5] border border-[#e8e7df] rounded-2xl text-xs text-[#3a3a34] flex items-start space-x-2.5">
                <Sparkles className="w-4 h-4 text-[#d97706] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#1a1a15] block mb-0.5">Mindset & Focus Note:</span>
                  <p className="leading-relaxed text-[#5a5a40]">{result.mindsetNote}</p>
                </div>
              </div>
            )}
          </div>

          {/* Checklist Categories Grid */}
          <div className="space-y-5">
            {result.categories?.map((cat, catIdx) => (
              <div key={catIdx} className="bg-[#fcfbf9] border border-[#e8e7df] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#e8e7df]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5a5a40] flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-[#d97706]" />
                    <span>{cat.category}</span>
                  </h4>
                  <span className="text-[10px] text-[#7a7a70] font-semibold">
                    {cat.items.filter(i => checkedItems[i]).length} / {cat.items.length} done
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  {cat.items.map((item, itemIdx) => {
                    const isDone = !!checkedItems[item];
                    return (
                      <div
                        key={itemIdx}
                        className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-2 ${
                          isDone
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 opacity-80'
                            : 'bg-white border-[#e8e7df] text-[#1a1a15] hover:border-[#5a5a40]/40'
                        }`}
                      >
                        <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => toggleCheck(item)}
                            className="mt-0.5 shrink-0 text-[#5a5a40] hover:scale-110 transition-transform"
                            title={isDone ? 'Mark as incomplete' : 'Tick off item'}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                            ) : (
                              <Circle className="w-4 h-4 text-[#a1a19a] hover:text-[#5a5a40]" />
                            )}
                          </button>
                          <p className={`text-xs leading-snug break-words ${isDone ? 'line-through text-emerald-900/70 font-medium' : 'font-medium text-[#1a1a15]'}`}>
                            {item}
                          </p>
                        </div>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(cat.category, itemIdx)}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded-md transition-colors shrink-0"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Inline Add Custom Item */}
                {activeCategoryForCustom === cat.category ? (
                  <div className="pt-1 flex gap-2">
                    <input
                      type="text"
                      value={customInputText}
                      onChange={(e) => setCustomInputText(e.target.value)}
                      placeholder="Type custom checklist item..."
                      className="flex-1 p-2 text-xs rounded-xl border border-[#e8e7df] bg-white text-[#1a1a15]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCustomItem(cat.category)}
                      className="px-3 py-1.5 bg-[#5a5a40] text-white text-xs font-bold rounded-xl"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCategoryForCustom('')}
                      className="px-2.5 py-1.5 border border-[#e8e7df] text-xs font-medium rounded-xl text-[#7a7a70]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategoryForCustom(cat.category);
                      setCustomInputText('');
                    }}
                    className="text-[11px] font-semibold text-[#5a5a40] hover:text-[#1a1a15] flex items-center space-x-1 pt-1"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-600" />
                    <span>Add custom item to this category</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Automatic Integration Controls Bar: Schedule & Priority List Sync */}
          <div className="pt-4 border-t border-[#f1f0e8] bg-[#faf9f5] border p-4.5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <CalendarPlus className="w-4 h-4 text-[#d97706]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1a1a15]">
                  Auto-Add Activity to Schedule Calendar & Priority List
                </h4>
              </div>
              <span className="text-[10px] text-[#7a7a70]">No need to type this headline twice!</span>
            </div>

            {/* Config controls: Date, Time, Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#7a7a70] mb-0.5">Target Date</label>
                <input
                  type="date"
                  value={calDate}
                  onChange={(e) => setCalDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[#e8e7df] bg-white text-[#1a1a15]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#7a7a70] mb-0.5">Start Time</label>
                <input
                  type="time"
                  value={calTime}
                  onChange={(e) => setCalTime(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[#e8e7df] bg-white text-[#1a1a15]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#7a7a70] mb-0.5">Priority Level</label>
                <select
                  value={priorityLevel}
                  onChange={(e) => setPriorityLevel(e.target.value as any)}
                  className="w-full p-2 rounded-xl border border-[#e8e7df] bg-white text-[#1a1a15]"
                >
                  <option value="high">High Priority</option>
                  <option value="mid">Mid Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Add to Schedule Calendar Button */}
              <button
                type="button"
                onClick={handleAddToScheduleCalendar}
                className="px-4 py-2.5 rounded-xl bg-[#5a5a40] hover:bg-[#4a4a30] text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
              >
                <CalendarPlus className="w-4 h-4 text-amber-300" />
                <span>Add Activity to Schedule Calendar</span>
              </button>

              {/* Add to Priority List Button */}
              <button
                type="button"
                onClick={handleAddToPriorityList}
                className="px-4 py-2.5 rounded-xl border border-[#5a5a40] bg-white text-[#5a5a40] hover:bg-[#f8f7f2] text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
              >
                <ListPlus className="w-4 h-4 text-amber-600" />
                <span>Add Activity to Priority List</span>
              </button>

              {/* Copy Checklist Button */}
              <button
                type="button"
                onClick={handleCopyChecklist}
                className="px-3.5 py-2.5 rounded-xl border border-[#e8e7df] bg-white text-[#7a7a70] hover:text-[#1a1a15] text-xs font-semibold flex items-center space-x-1.5 transition-all"
              >
                {copiedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Checklist Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Checklist</span>
                  </>
                )}
              </button>
            </div>

            {/* Success Feedback Toasts */}
            {addedToCalendarSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between animate-in fade-in">
                <div className="flex items-center space-x-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Activity "{activity}" has been automatically added to your <strong>Schedule Calendar</strong>!</span>
                </div>
                {onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('schedule')}
                    className="text-xs font-bold text-emerald-800 hover:underline flex items-center space-x-1 ml-2 shrink-0"
                  >
                    <span>View Schedule</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {addedToPrioritiesSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between animate-in fade-in">
                <div className="flex items-center space-x-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Activity "{activity}" has been automatically added to your <strong>Priority List</strong>!</span>
                </div>
                {onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('priorities')}
                    className="text-xs font-bold text-emerald-800 hover:underline flex items-center space-x-1 ml-2 shrink-0"
                  >
                    <span>View Priorities</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
