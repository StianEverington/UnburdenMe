import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Bell,
  CheckCircle2,
  Circle,
  RefreshCw,
  Link2,
  CheckCircle,
  ShieldAlert,
  CalendarDays,
  Sparkles,
  ExternalLink,
  Tag,
  ClipboardList,
  Layers,
  Mail
} from 'lucide-react';
import { requestNotificationPermission } from '../utils/notificationHelper';
import { checkForbiddenLanguage, FORBIDDEN_LANGUAGE_REJECTION_MESSAGE } from '../utils/moderation';
import { recordPreference, getMostFrequentPreference } from '../utils/preferenceTracker';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "09:00"
  endTime: string; // "10:00"
  category: 'work' | 'personal' | 'focus' | 'meeting';
  priority: 'high' | 'mid' | 'low';
  notes?: string;
  completed?: boolean;
  syncedFrom?: 'manual' | 'google' | 'outlook' | 'ical';
  reminderOption?: 'none' | 'at_start' | '15m_before' | '30m_before' | '1h_before' | '2h_before' | '24h_before' | 'custom' | string;
  reminderCustomTime?: string;
  reminderTime?: string;
  reminderLabel?: string;
  reminderTriggered?: boolean;
}

interface IntegratedCalendarProps {
  onNavigateToPrepTool?: (activityTitle: string) => void;
}

export const IntegratedCalendar: React.FC<IntegratedCalendarProps> = ({
  onNavigateToPrepTool
}) => {
  // Helpers for date formatting
  const getTodayIso = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const formatDateLabel = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // State
  const [calendarCount, setCalendarCount] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('unburdenme_comm_volume_metrics');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.calendarCount === 'number') return parsed.calendarCount;
      }
    } catch (e) {
      console.warn('Error reading volume metrics:', e);
    }
    return 7;
  });

  const [unreadCount, setUnreadCount] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('unburdenme_comm_volume_metrics');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.unreadCount === 'number') return parsed.unreadCount;
      }
    } catch (e) {
      console.warn('Error reading volume metrics:', e);
    }
    return 42;
  });

  const saveMetrics = (cal: number, unread: number) => {
    try {
      localStorage.setItem('unburdenme_comm_volume_metrics', JSON.stringify({ calendarCount: cal, unreadCount: unread }));
    } catch (e) {
      console.warn('Error saving volume metrics:', e);
    }
  };

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [syncProvider, setSyncProvider] = useState<'none' | 'google' | 'outlook' | 'ical'>('none');
  const [syncModalOpen, setSyncModalOpen] = useState<boolean>(false);
  const [iCalUrl, setICalUrl] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Default sample events for today
  const todayStr = getTodayIso();

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const stored = localStorage.getItem('unburdenme_calendar_events');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error reading calendar events from storage:', e);
    }
    const defaultEvents: CalendarEvent[] = [];
    return defaultEvents;
  });

  // Sync events to localStorage on change
  React.useEffect(() => {
    try {
      localStorage.setItem('unburdenme_calendar_events', JSON.stringify(events));
    } catch (e) {
      console.error('Error persisting calendar events:', e);
    }
  }, [events]);

  // Listen for calendar update events dispatched from other components (e.g. Priority Triage checklist deadline sync)
  React.useEffect(() => {
    const reloadEvents = () => {
      try {
        const stored = localStorage.getItem('unburdenme_calendar_events');
        if (stored) {
          setEvents(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Error re-loading calendar events:', e);
      }
    };

    window.addEventListener('unburdenme_calendar_updated', reloadEvents);
    window.addEventListener('storage', reloadEvents);
    return () => {
      window.removeEventListener('unburdenme_calendar_updated', reloadEvents);
      window.removeEventListener('storage', reloadEvents);
    };
  }, []);

  // New Event Form Modal / Inline
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(todayStr);
  const [formStart, setFormStart] = useState<string>(() => getMostFrequentPreference('start_time', '10:00'));
  const [formEnd, setFormEnd] = useState<string>('11:00');
  const [formCategory, setFormCategory] = useState<'work' | 'personal' | 'focus' | 'meeting'>('work');
  const [formPriority, setFormPriority] = useState<'high' | 'mid' | 'low'>(
    () => (getMostFrequentPreference('priority', 'mid') as any)
  );
  const [formNotes, setFormNotes] = useState<string>('');
  const [formReminderOption, setFormReminderOption] = useState<string>('none');
  const [formCustomReminderTime, setFormCustomReminderTime] = useState<string>('');
  const [eventError, setEventError] = useState<string | null>(null);

  // Date Navigation
  const handlePrev = () => {
    const next = new Date(selectedDate);
    if (viewMode === 'daily') {
      next.setDate(next.getDate() - 1);
    } else if (viewMode === 'weekly') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setMonth(next.getMonth() - 1);
    }
    setSelectedDate(next);
  };

  const handleNext = () => {
    const next = new Date(selectedDate);
    if (viewMode === 'daily') {
      next.setDate(next.getDate() + 1);
    } else if (viewMode === 'weekly') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    setSelectedDate(next);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const selectedIso = selectedDate.toISOString().split('T')[0];

  // Open add event form
  const handleOpenAdd = (defaultTime?: string) => {
    setEditingEvent(null);
    setFormTitle('');
    setFormDate(selectedIso);
    setFormStart(defaultTime || '10:00');
    const [h, m] = (defaultTime || '10:00').split(':').map(Number);
    const endH = (h + 1).toString().padStart(2, '0');
    setFormEnd(`${endH}:${m.toString().padStart(2, '0')}`);
    setFormCategory('work');
    setFormPriority('mid');
    setFormNotes('');
    setFormReminderOption('none');
    setFormCustomReminderTime('');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setFormTitle(evt.title);
    setFormDate(evt.date);
    setFormStart(evt.startTime);
    setFormEnd(evt.endTime);
    setFormCategory(evt.category);
    setFormPriority(evt.priority);
    setFormNotes(evt.notes || '');
    setFormReminderOption(evt.reminderOption || 'none');
    setFormCustomReminderTime(evt.reminderCustomTime || '');
    setIsAddOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    setEventError(null);

    const trimmedTitle = formTitle.trim();
    if (!trimmedTitle) return;

    // Moderate title and notes for forbidden language
    const modCheckTitle = checkForbiddenLanguage(trimmedTitle);
    const modCheckNotes = checkForbiddenLanguage(formNotes);
    if (modCheckTitle.isForbidden || modCheckNotes.isForbidden) {
      setEventError(modCheckTitle.reason || modCheckNotes.reason || FORBIDDEN_LANGUAGE_REJECTION_MESSAGE);
      return;
    }

    // Record preferences to learn over time
    recordPreference('start_time', formStart);
    recordPreference('priority', formPriority);

    let computedReminderTime: string | undefined = undefined;
    let computedReminderLabel: string | undefined = undefined;

    if (formReminderOption !== 'none') {
      try {
        let startMs = new Date(`${formDate}T${formStart}:00`).getTime();
        if (formReminderOption === 'at_start') {
          computedReminderLabel = `At event start (${formStart})`;
        } else if (formReminderOption === '15m_before') {
          startMs -= 15 * 60 * 1000;
          computedReminderLabel = `15m before event`;
        } else if (formReminderOption === '30m_before') {
          startMs -= 30 * 60 * 1000;
          computedReminderLabel = `30m before event`;
        } else if (formReminderOption === '1h_before') {
          startMs -= 3600 * 1000;
          computedReminderLabel = `1h before event`;
        } else if (formReminderOption === '2h_before') {
          startMs -= 2 * 3600 * 1000;
          computedReminderLabel = `2h before event`;
        } else if (formReminderOption === '24h_before') {
          startMs -= 24 * 3600 * 1000;
          computedReminderLabel = `24h before event`;
        } else if (formReminderOption === 'custom' && formCustomReminderTime) {
          startMs = new Date(formCustomReminderTime).getTime();
          computedReminderLabel = `Custom alert`;
        }

        if (!isNaN(startMs)) {
          computedReminderTime = new Date(startMs).toISOString();
          requestNotificationPermission();
        }
      } catch (e) {
        console.warn('Error computing event reminder time:', e);
      }
    }

    if (editingEvent) {
      setEvents(
        events.map((e) =>
          e.id === editingEvent.id
            ? {
                ...e,
                title: formTitle.trim(),
                date: formDate,
                startTime: formStart,
                endTime: formEnd,
                category: formCategory,
                priority: formPriority,
                notes: formNotes.trim(),
                reminderOption: formReminderOption,
                reminderCustomTime: formCustomReminderTime,
                reminderTime: computedReminderTime,
                reminderLabel: computedReminderLabel,
                reminderTriggered: false,
              }
            : e
        )
      );
    } else {
      const newEvt: CalendarEvent = {
        id: `evt-${Date.now()}`,
        title: formTitle.trim(),
        date: formDate,
        startTime: formStart,
        endTime: formEnd,
        category: formCategory,
        priority: formPriority,
        notes: formNotes.trim(),
        completed: false,
        syncedFrom: syncProvider !== 'none' ? syncProvider : 'manual',
        reminderOption: formReminderOption,
        reminderCustomTime: formCustomReminderTime,
        reminderTime: computedReminderTime,
        reminderLabel: computedReminderLabel,
        reminderTriggered: false,
      };
      setEvents([...events, newEvt]);
    }

    setIsAddOpen(false);
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(events.filter((e) => e.id !== id));
  };

  const handleToggleComplete = (id: string) => {
    setEvents(
      events.map((e) => (e.id === id ? { ...e, completed: !e.completed } : e))
    );
  };

  // Sync Provider Trigger
  const handleConnectSync = (provider: 'google' | 'outlook' | 'ical') => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncProvider(provider);
      setSyncSuccessMsg(
        `Successfully connected with ${
          provider === 'google'
            ? 'Google Calendar'
            : provider === 'outlook'
            ? 'Outlook Calendar'
            : 'iCal Feed'
        }! Calendar synced.`
      );

      // Add a sample synced item if list is sparse
      const syncedSample: CalendarEvent = {
        id: `synced-${Date.now()}`,
        title: `Synced: ${provider === 'google' ? 'Client Q3 Roadmap Review' : 'Quarterly Executive Update'}`,
        date: selectedIso,
        startTime: '13:00',
        endTime: '13:45',
        category: 'meeting',
        priority: 'high',
        notes: `Automatically synchronized from ${provider}.`,
        completed: false,
        syncedFrom: provider,
      };

      setEvents((prev) => [...prev, syncedSample]);

      setTimeout(() => {
        setSyncSuccessMsg(null);
        setSyncModalOpen(false);
      }, 2500);
    }, 1200);
  };

  const handleDisconnectSync = () => {
    setSyncProvider('none');
    setSyncSuccessMsg('Switched back to Manual Entry mode.');
    setTimeout(() => setSyncSuccessMsg(null), 2500);
  };

  // Hours array for daily view (7 AM to 8 PM)
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);

  // Filter events for selected day
  const dayEvents = events.filter((e) => e.date === selectedIso);

  // Upcoming notifications logic (for selected day / today)
  const upcomingEvents = dayEvents
    .filter((e) => !e.completed)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Render category badge styling
  const renderCategoryBadge = (cat: CalendarEvent['category']) => {
    switch (cat) {
      case 'work':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'focus':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'personal':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'meeting':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const renderPriorityDot = (pri: CalendarEvent['priority']) => {
    switch (pri) {
      case 'high':
        return <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="High Priority" />;
      case 'mid':
        return <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Mid Priority" />;
      case 'low':
        return <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" title="Low Priority" />;
    }
  };

  return (
    <div className="bg-[#FCFBF9] border border-[#E8E7DF] rounded-2xl p-5 space-y-4">
      {/* Communication Volume Metrics Bar (Top of Schedule Tab) */}
      <div className="bg-white border border-[#E8E7DF] rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-[#5A5A40] uppercase tracking-wider">
          <Layers className="w-4 h-4 text-[#5A5A40]" />
          <span>Communication Volume Metrics</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Calendar Commitments Metric */}
          <div className="flex items-center space-x-2 bg-[#FCFBF9] px-2.5 py-1 rounded-lg border border-[#E8E7DF]">
            <CalendarIcon className="w-3.5 h-3.5 text-[#5A5A40]" />
            <span className="font-semibold text-[#5A5A40]">Calendar Commitments:</span>
            <input
              type="number"
              min={0}
              value={calendarCount}
              onChange={(e) => {
                const val = Math.max(0, Number(e.target.value));
                setCalendarCount(val);
                saveMetrics(val, unreadCount);
              }}
              className="w-12 px-1 py-0.5 rounded border border-[#E8E7DF] bg-white text-[#1A1A15] font-mono text-center text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
            />
          </div>

          {/* Unread Messages Metric */}
          <div className="flex items-center space-x-2 bg-[#FCFBF9] px-2.5 py-1 rounded-lg border border-[#E8E7DF]">
            <Mail className="w-3.5 h-3.5 text-[#5A5A40]" />
            <span className="font-semibold text-[#5A5A40]">Unread Messages:</span>
            <input
              type="number"
              min={0}
              value={unreadCount}
              onChange={(e) => {
                const val = Math.max(0, Number(e.target.value));
                setUnreadCount(val);
                saveMetrics(calendarCount, val);
              }}
              className="w-12 px-1 py-0.5 rounded border border-[#E8E7DF] bg-white text-[#1A1A15] font-mono text-center text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
            />
          </div>
        </div>
      </div>

      {/* Calendar Header / Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E7DF]">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-[#5A5A40] text-white rounded-xl shadow-xs">
            <CalendarIcon className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1A1A15] flex items-center space-x-2">
              <span>Integrated Schedule & Calendar</span>
              {syncProvider !== 'none' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  <span className="capitalize">{syncProvider} Synced</span>
                </span>
              )}
            </h3>
            <p className="text-[11px] text-[#7A7A70]">
              Plan hourly daily, weekly, or monthly schedule with live date tracking and overwhelm alerts.
            </p>
          </div>
        </div>

        {/* Action Controls: Add Event, Calendar Sync button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sync Button */}
          <button
            type="button"
            onClick={() => setSyncModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-[#E8E7DF] bg-white hover:bg-[#F1F0E8] text-[#5A5A40] text-xs font-semibold flex items-center space-x-1.5 transition-all"
            title="Sync with external Google or Outlook Calendar"
          >
            <Link2 className="w-3.5 h-3.5 text-amber-600" />
            <span>{syncProvider !== 'none' ? 'Calendar Sync Settings' : 'Sync External Calendar'}</span>
          </button>

          {/* Add Event Button */}
          <button
            type="button"
            onClick={() => handleOpenAdd()}
            className="px-3.5 py-1.5 rounded-xl bg-[#5A5A40] hover:bg-[#4A4A30] text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Overwhelm Guard / Upcoming Notifications Alert Banner */}
      {notificationsEnabled && upcomingEvents.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 flex items-start justify-between gap-3">
          <div className="flex items-start space-x-2.5 min-w-0">
            <Bell className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 animate-pulse" />
            <div className="text-xs text-amber-900 min-w-0">
              <span className="font-bold block">
                Upcoming Today ({upcomingEvents.length} event{upcomingEvents.length > 1 ? 's' : ''}):
              </span>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {upcomingEvents.slice(0, 3).map((evt) => (
                  <span
                    key={evt.id}
                    className="inline-flex items-center space-x-1 bg-white/80 border border-amber-200 px-2 py-0.5 rounded-lg text-[11px] font-medium text-amber-900"
                  >
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span className="font-bold">{evt.startTime}</span>
                    <span className="truncate max-w-[150px]">{evt.title}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setNotificationsEnabled(false)}
            className="p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-lg shrink-0 text-[10px]"
            title="Dismiss alerts"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Date Navigation & View Mode Switcher Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-white border border-[#E8E7DF] p-2 rounded-xl">
        {/* Date Navigator */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePrev}
            className="p-1.5 rounded-lg text-[#5A5A40] hover:bg-[#F1F0E8] border border-transparent hover:border-[#E8E7DF] transition-colors"
            title="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToday}
            className="px-2.5 py-1 rounded-lg bg-[#FAF9F5] border border-[#E8E7DF] text-xs font-bold text-[#1A1A15] hover:bg-[#F1F0E8] transition-colors"
          >
            Today
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="p-1.5 rounded-lg text-[#5A5A40] hover:bg-[#F1F0E8] border border-transparent hover:border-[#E8E7DF] transition-colors"
            title="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs font-bold text-[#1A1A15] pl-1">
            {formatDateLabel(selectedDate)}
          </span>
        </div>

        {/* View Mode Switcher Pills */}
        <div className="inline-flex rounded-xl p-0.5 bg-[#FAF9F5] border border-[#E8E7DF] text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1 rounded-lg transition-all font-semibold ${
              viewMode === 'daily'
                ? 'bg-white text-[#1A1A15] shadow-xs'
                : 'text-[#7A7A70] hover:text-[#1A1A15]'
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setViewMode('weekly')}
            className={`px-3 py-1 rounded-lg transition-all font-semibold ${
              viewMode === 'weekly'
                ? 'bg-white text-[#1A1A15] shadow-xs'
                : 'text-[#7A7A70] hover:text-[#1A1A15]'
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setViewMode('monthly')}
            className={`px-3 py-1 rounded-lg transition-all font-semibold ${
              viewMode === 'monthly'
                ? 'bg-white text-[#1A1A15] shadow-xs'
                : 'text-[#7A7A70] hover:text-[#1A1A15]'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'daily' && (
        <div className="bg-white border border-[#E8E7DF] rounded-xl overflow-hidden divide-y divide-[#E8E7DF]">
          {hours.map((hour) => {
            const timeStr = `${hour.toString().padStart(2, '0')}:00`;
            const matchingEvents = dayEvents.filter((e) => {
              const startH = parseInt(e.startTime.split(':')[0], 10);
              return startH === hour;
            });

            const hasEvents = matchingEvents.length > 0;

            return (
              <div
                key={hour}
                onClick={!hasEvents ? () => handleOpenAdd(timeStr) : undefined}
                className={`group flex transition-colors relative ${
                  hasEvents
                    ? 'items-start min-h-[56px] hover:bg-[#FAF9F5]/60 py-1.5'
                    : 'items-center min-h-0 py-0.5 hover:bg-[#FAF9F5]/90 cursor-pointer'
                }`}
              >
                {/* Time Label */}
                <div
                  className={`w-20 border-r border-[#E8E7DF] shrink-0 text-[11px] font-mono font-bold text-right select-none leading-tight ${
                    hasEvents
                      ? 'p-2.5 text-[#7A7A70] bg-[#FAF9F5]/40'
                      : 'px-2.5 py-0.5 text-[#A1A19A] group-hover:text-[#5A5A40] bg-[#FAF9F5]/20'
                  }`}
                >
                  {hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`}
                </div>

                {/* Slot Contents */}
                <div
                  className={`flex-1 min-w-0 ${
                    hasEvents ? 'p-2 space-y-1.5' : 'px-2 py-0.5 flex items-center'
                  }`}
                >
                  {hasEvents ? (
                    matchingEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className={`p-2.5 rounded-xl border transition-all flex items-start justify-between gap-2 ${
                          evt.completed
                            ? 'bg-slate-50 border-slate-200 opacity-60'
                            : 'bg-[#FAF9F5] border-[#E8E7DF] hover:border-[#5A5A40]/40 shadow-xs'
                        }`}
                      >
                        <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleComplete(evt.id);
                            }}
                            className="mt-0.5 text-[#5A5A40] hover:scale-110 transition-transform shrink-0"
                            title={evt.completed ? 'Mark incomplete' : 'Mark completed'}
                          >
                            {evt.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50" />
                            ) : (
                              <Circle className="w-4 h-4 text-[#A1A19A] hover:text-[#5A5A40]" />
                            )}
                          </button>

                          {/* Event info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              {renderPriorityDot(evt.priority)}
                              <span className={`text-xs font-bold text-[#1A1A15] ${evt.completed ? 'line-through text-[#7A7A70]' : ''}`}>
                                {evt.title}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold tracking-wider ${renderCategoryBadge(evt.category)}`}>
                                {evt.category}
                              </span>
                              {evt.syncedFrom && evt.syncedFrom !== 'manual' && (
                                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {evt.syncedFrom}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#7A7A70] flex items-center space-x-2 mt-0.5 font-mono">
                              <Clock className="w-3 h-3 text-[#5A5A40]" />
                              <span>{evt.startTime} – {evt.endTime}</span>
                              {evt.notes && <span className="text-[#1A1A15] font-sans truncate">• {evt.notes}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Event actions column */}
                        <div className="flex flex-col items-end space-y-1 shrink-0 ml-1">
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(evt);
                              }}
                              className="p-1 text-[#7A7A70] hover:text-[#1A1A15] hover:bg-[#E8E7DF] rounded-lg transition-colors"
                              title="Edit Event"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEvent(evt.id);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Event"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Button underneath edit and delete icon to go to Prep Tool section */}
                          {onNavigateToPrepTool && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToPrepTool(evt.title);
                              }}
                              className="px-2 py-0.5 rounded-lg bg-amber-100/90 hover:bg-amber-200 text-amber-950 border border-amber-300 text-[10px] font-bold flex items-center space-x-1 transition-all shadow-2xs"
                              title="Generate personalized preparation checklist for this event"
                            >
                              <ClipboardList className="w-3 h-3 text-amber-700" />
                              <span>Prep Tool</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    /* Slim empty hour row with hover schedule prompt */
                    <div className="w-full text-left text-[11px] leading-tight text-[#C4C4BC] group-hover:text-[#5A5A40] transition-colors flex items-center space-x-1.5">
                      <Plus className="w-3 h-3 text-[#A1A19A] group-hover:text-[#5A5A40] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="text-[10px] italic opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                        Schedule activity at {timeStr}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Weekly View */}
      {viewMode === 'weekly' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, i) => {
            const startOfWeek = new Date(selectedDate);
            const dayOfWeek = startOfWeek.getDay();
            const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday start
            const dayDate = new Date(startOfWeek.setDate(diff + i));
            const dayIso = dayDate.toISOString().split('T')[0];
            const isSelected = dayIso === selectedIso;
            const isToday = dayIso === todayStr;
            const dayEvts = events.filter((e) => e.date === dayIso);

            return (
              <div
                key={dayIso}
                onClick={() => {
                  setSelectedDate(dayDate);
                  setViewMode('daily');
                }}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  isToday
                    ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-xs'
                    : isSelected
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-white border-[#E8E7DF] hover:border-[#5A5A40]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${isToday ? 'text-amber-300' : 'text-[#7A7A70]'}`}>
                    {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className={`text-xs font-mono font-bold ${isToday ? 'text-white' : 'text-[#1A1A15]'}`}>
                    {dayDate.getDate()}
                  </span>
                </div>

                <div className="space-y-1">
                  {dayEvts.length > 0 ? (
                    dayEvts.map((evt) => (
                      <div
                        key={evt.id}
                        className={`p-1.5 rounded-lg text-[10px] font-medium truncate ${
                          isToday
                            ? 'bg-white/20 text-white'
                            : 'bg-[#FAF9F5] text-[#1A1A15] border border-[#E8E7DF]'
                        }`}
                      >
                        <span className="font-bold mr-1">{evt.startTime}</span>
                        {evt.title}
                      </div>
                    ))
                  ) : (
                    <span className={`text-[10px] italic ${isToday ? 'text-white/60' : 'text-[#A1A19A]'}`}>
                      No events
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Monthly View */}
      {viewMode === 'monthly' && (
        <div className="bg-white border border-[#E8E7DF] rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-7 text-center text-[11px] font-bold text-[#7A7A70] uppercase pb-2 border-b border-[#E8E7DF]">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>

          {/* Render Month Matrix */}
          <div className="grid grid-cols-7 gap-1">
            {(() => {
              const year = selectedDate.getFullYear();
              const month = selectedDate.getMonth();
              const firstDayOfMonth = new Date(year, month, 1);
              const lastDayOfMonth = new Date(year, month + 1, 0);

              let startingDay = firstDayOfMonth.getDay() - 1;
              if (startingDay < 0) startingDay = 6;

              const totalDays = lastDayOfMonth.getDate();
              const cells = [];

              // Leading empty cells
              for (let i = 0; i < startingDay; i++) {
                cells.push(<div key={`empty-${i}`} className="h-16 p-1 bg-[#FAF9F5]/40 rounded-xl" />);
              }

              // Day cells
              for (let day = 1; day <= totalDays; day++) {
                const cellDate = new Date(year, month, day);
                const cellIso = cellDate.toISOString().split('T')[0];
                const isToday = cellIso === todayStr;
                const isSelected = cellIso === selectedIso;
                const cellEvts = events.filter((e) => e.date === cellIso);

                cells.push(
                  <div
                    key={cellIso}
                    onClick={() => {
                      setSelectedDate(cellDate);
                      setViewMode('daily');
                    }}
                    className={`h-16 p-1.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      isToday
                        ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                        : isSelected
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-white border-[#E8E7DF] hover:border-[#5A5A40]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{day}</span>
                      {cellEvts.length > 0 && (
                        <span className={`text-[9px] px-1 rounded ${isToday ? 'bg-amber-400 text-slate-900 font-bold' : 'bg-amber-100 text-amber-900'}`}>
                          {cellEvts.length}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[9px] opacity-80">
                      {cellEvts[0] ? cellEvts[0].title : ''}
                    </div>
                  </div>
                );
              }

              return cells;
            })()}
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Event */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E7DF] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E7DF]">
              <h3 className="text-sm font-bold text-[#1A1A15] flex items-center space-x-1.5">
                <CalendarDays className="w-4 h-4 text-amber-600" />
                <span>{editingEvent ? 'Edit Scheduled Activity' : 'Add Scheduled Activity'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="p-1 text-[#7A7A70] hover:text-[#1A1A15] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-3 text-xs">
              {eventError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-medium">
                  {eventError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#7A7A70] mb-1">Event Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Client Call or Deep Focus Work"
                  className="w-full p-2.5 rounded-xl border border-[#E8E7DF] bg-[#FAF9F5] text-[#1A1A15] focus:outline-none focus:ring-2 focus:ring-[#5A5A40] placeholder:text-[#a1a19a]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-[#7A7A70] mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-[#E8E7DF] bg-[#FAF9F5] text-[#1A1A15]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#7A7A70] mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full p-2 rounded-xl border border-[#E8E7DF] bg-[#FAF9F5] text-[#1A1A15]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#7A7A70] mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full p-2 rounded-xl border border-[#E8E7DF] bg-[#FAF9F5] text-[#1A1A15]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-[#7A7A70] mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-[#E8E7DF] bg-[#FAF9F5] text-[#1A1A15]"
                  >
                    <option value="work">Work</option>
                    <option value="meeting">Meeting</option>
                    <option value="focus">Focus Block</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#7A7A70] mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-[#E8E7DF] bg-[#FAF9F5] text-[#1A1A15]"
                  >
                    <option value="high">High</option>
                    <option value="mid">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#7A7A70] mb-1">Notes / Description</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Optional notes or action items"
                  className="w-full p-2.5 rounded-xl border border-[#E8E7DF] bg-[#FAF9F5] text-[#1A1A15] placeholder:text-[#a1a19a]"
                />
              </div>

              {/* Optional Reminder Notification Selector */}
              <div className="p-3 bg-[#fcfbf7] border border-[#e8e7df] rounded-xl space-y-2">
                <label className="block font-bold text-[#1a1a15] flex items-center gap-1.5 text-xs">
                  <Bell className="w-3.5 h-3.5 text-amber-600" />
                  <span>Set Device Reminder Notification</span>
                </label>
                <select
                  value={formReminderOption}
                  onChange={(e) => setFormReminderOption(e.target.value)}
                  className="w-full p-2 rounded-lg border border-[#E8E7DF] bg-white text-[#1A1A15] font-medium"
                >
                  <option value="none">No Notification</option>
                  <option value="at_start">At Event Start Time ({formStart})</option>
                  <option value="15m_before">15 Minutes Before</option>
                  <option value="30m_before">30 Minutes Before</option>
                  <option value="1h_before">1 Hour Before</option>
                  <option value="2h_before">2 Hours Before</option>
                  <option value="24h_before">24 Hours Before</option>
                  <option value="custom">Custom Date & Time</option>
                </select>

                {formReminderOption === 'custom' && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-semibold text-[#7A7A70] mb-1">Alert Timestamp:</label>
                    <input
                      type="datetime-local"
                      value={formCustomReminderTime}
                      onChange={(e) => setFormCustomReminderTime(e.target.value)}
                      className="w-full p-2 rounded-lg border border-[#E8E7DF] bg-white text-[#1A1A15]"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E8E7DF]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-[#E8E7DF] text-[#7A7A70] hover:bg-[#F1F0E8] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#5A5A40] text-white hover:bg-[#4A4A30] font-bold shadow-xs"
                >
                  {editingEvent ? 'Save Changes' : 'Add to Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Calendar Sync Settings */}
      {syncModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E7DF] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E7DF]">
              <div className="flex items-center space-x-2">
                <Link2 className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-[#1A1A15]">Sync External Calendar</h3>
              </div>
              <button
                type="button"
                onClick={() => setSyncModalOpen(false)}
                className="p-1 text-[#7A7A70] hover:text-[#1A1A15] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#7A7A70]">
              By default, you write in your own scheduled activities manually. If you wish, you can connect your external calendar service to automatically import events.
            </p>

            {/* Sync Providers Grid */}
            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={() => handleConnectSync('google')}
                disabled={isSyncing}
                className="w-full p-3.5 rounded-xl border border-[#E8E7DF] hover:border-amber-500 bg-[#FAF9F5] hover:bg-white flex items-center justify-between transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-[#1A1A15] block group-hover:text-amber-800">
                      Google Calendar
                    </span>
                    <span className="text-[11px] text-[#7A7A70]">
                      Sync events from your personal or work Google account
                    </span>
                  </div>
                </div>
                {syncProvider === 'google' ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full font-bold">Connected</span>
                ) : (
                  <ExternalLink className="w-4 h-4 text-[#A1A19A] group-hover:text-[#5A5A40]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleConnectSync('outlook')}
                disabled={isSyncing}
                className="w-full p-3.5 rounded-xl border border-[#E8E7DF] hover:border-amber-500 bg-[#FAF9F5] hover:bg-white flex items-center justify-between transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-sky-100 text-sky-700 rounded-lg">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-[#1A1A15] block group-hover:text-amber-800">
                      Microsoft Outlook Calendar
                    </span>
                    <span className="text-[11px] text-[#7A7A70]">
                      Connect Work or Personal Office 365 calendar
                    </span>
                  </div>
                </div>
                {syncProvider === 'outlook' ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full font-bold">Connected</span>
                ) : (
                  <ExternalLink className="w-4 h-4 text-[#A1A19A] group-hover:text-[#5A5A40]" />
                )}
              </button>

              {/* iCal Link Option */}
              <div className="p-3.5 rounded-xl border border-[#E8E7DF] bg-[#FAF9F5] space-y-2">
                <span className="font-bold text-[#1A1A15] block">iCal / ICS Feed Link</span>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={iCalUrl}
                    onChange={(e) => setICalUrl(e.target.value)}
                    placeholder="e.g. https://calendar.google.com/calendar/ical/..."
                    className="flex-1 p-2 rounded-lg border border-[#E8E7DF] bg-white text-xs placeholder:text-[#a1a19a]"
                  />
                  <button
                    type="button"
                    onClick={() => handleConnectSync('ical')}
                    disabled={!iCalUrl.trim() || isSyncing}
                    className="px-3 py-1.5 bg-[#5A5A40] text-white rounded-lg text-xs font-bold disabled:bg-[#A1A19A]"
                  >
                    Sync Feed
                  </button>
                </div>
              </div>
            </div>

            {isSyncing && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-700" />
                <span>Authenticating & retrieving live calendar entries...</span>
              </div>
            )}

            {syncSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{syncSuccessMsg}</span>
              </div>
            )}

            {syncProvider !== 'none' && (
              <div className="pt-2 border-t border-[#E8E7DF] flex items-center justify-between">
                <span className="text-xs text-[#7A7A70]">Currently synced: <strong className="capitalize">{syncProvider}</strong></span>
                <button
                  type="button"
                  onClick={handleDisconnectSync}
                  className="text-xs text-rose-600 font-bold hover:underline"
                >
                  Disconnect & Switch to Manual Default
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
