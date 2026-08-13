/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Calendar,
  Sparkles,
  RefreshCw,
  Layers,
  CheckCircle,
  CheckCircle2,
  Circle,
  Trash2,
  Edit3,
  Plus,
  MessageSquare,
  AlertCircle,
  Check,
  X,
  Filter,
  ArrowUpDown,
  CheckSquare,
  FileText,
  ShieldCheck,
  CalendarDays,
  RotateCcw,
  Share2,
  Download,
  Copy,
  ChevronDown,
  FileSpreadsheet,
  Send,
  Bell,
  Clock
} from 'lucide-react';
import { TriageSignalInput, TriageSignalOutput } from '../types';
import { requestNotificationPermission } from '../utils/notificationHelper';
import { checkForbiddenLanguage, FORBIDDEN_LANGUAGE_REJECTION_MESSAGE } from '../utils/moderation';
import { recordPreference, getMostFrequentPreference } from '../utils/preferenceTracker';

export interface PriorityItem {
  id: string;
  title: string;
  priority: 'high' | 'mid' | 'low';
  type: 'Email' | 'Message' | 'Calendar Event' | 'Task' | 'General';
  completed: boolean;
  deadline?: string;
  reminderTime?: string;
  reminderLabel?: string;
  reminderTriggered?: boolean;
}

const DEFAULT_ITEMS: PriorityItem[] = [];

const getRecommendedActionForTask = (task: PriorityItem) => {
  const lower = task.title.toLowerCase();
  
  const isAlarmOrSafety = lower.includes('safety') || lower.includes('hazard') || lower.includes('injury') || lower.includes('security breach') || lower.includes('harm') || lower.includes('emergency') || lower.includes('medical');

  if (isAlarmOrSafety) {
    return {
      suggestedReply: "Please pause automated drafting. Contact a qualified professional, trusted manager, or safety officer directly.",
      recommendedSolution: "Safety Protocol Notice: For tasks involving potential safety, medical, or security concerns, do not rely on digital summaries alone. Speak with someone trusted or seek professional guidance immediately."
    };
  }

  if (lower.includes('escalation') || lower.includes('urgent') || lower.includes('client') || lower.includes('acme')) {
    return {
      suggestedReply: "e.g. 'Hello, I have logged this as top priority. I am actively reviewing the deliverables now and will share a full status update by 11:30 AM.'",
      recommendedSolution: "1. Block an immediate 30-minute focus window to isolate key deliverables.\n2. Send a status update to client stakeholders before delegating sub-tasks."
    };
  }
  if (lower.includes('review') || lower.includes('board') || lower.includes('deck') || lower.includes('slide')) {
    return {
      suggestedReply: "e.g. 'Thank you. I am reviewing the slide deck today and will share specific comments and feedback by 3 PM.'",
      recommendedSolution: "1. Focus strictly on executive summary slides and key metrics first.\n2. Confirm feedback directly with VP to maintain executive alignment."
    };
  }
  if (lower.includes('budget') || lower.includes('finance') || lower.includes('sign-off')) {
    return {
      suggestedReply: "e.g. 'I have received the budget proposal. I am verifying line items against Q3 allocations and will confirm approval today.'",
      recommendedSolution: "1. Verify figures against quarterly allocations.\n2. Provide written confirmation to unblock dependent team workflows."
    };
  }
  if (lower.includes('standup') || lower.includes('sync') || lower.includes('meeting')) {
    return {
      suggestedReply: "e.g. 'I will be attending with a concise 3-bullet update on current sprint progress and blockers.'",
      recommendedSolution: "1. Prepare a 3-bullet progress summary before the call.\n2. Keep discussion focused strictly on immediate blockers."
    };
  }
  if (task.type === 'Email') {
    return {
      suggestedReply: "e.g. 'Thank you for reaching out. I am prioritising this request and will send a response shortly.'",
      recommendedSolution: "1. Send a concise 2-sentence reply setting clear delivery expectations.\n2. Archive thread until your next dedicated inbox window."
    };
  }
  if (task.type === 'Message') {
    return {
      suggestedReply: "e.g. 'Got it! I am currently in a focus block but will review this directly during my afternoon break.'",
      recommendedSolution: "1. Reply directly via a short status update during your next communication break.\n2. Flag as complete once sent."
    };
  }
  return {
    suggestedReply: "e.g. 'Acknowledged. Working through today's top priorities and will update as soon as this milestone is reached.'",
    recommendedSolution: "1. Prioritise during your morning peak focus period.\n2. Break down complex steps into simple, actionable sub-tasks."
  };
};

export const DataDigestWidget: React.FC = () => {
  const [calendarCount, setCalendarCount] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('unburdenme_comm_volume_metrics');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.calendarCount === 'number') return parsed.calendarCount;
      }
    } catch (e) {
      console.warn('Error loading volume metrics:', e);
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
      console.warn('Error loading volume metrics:', e);
    }
    return 42;
  });
  
  // Priority checklist state
  const [items, setItems] = useState<PriorityItem[]>(() => {
    try {
      const stored = localStorage.getItem('unburdenme_priority_checklist');
      return stored ? JSON.parse(stored) : DEFAULT_ITEMS;
    } catch {
      return DEFAULT_ITEMS;
    }
  });

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('unburdenme_priority_checklist', JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save priority checklist to LocalStorage', e);
    }
  }, [items]);

  // Sync state when priorities are updated from Prep Tool or external events
  useEffect(() => {
    const handlePrioritiesUpdated = () => {
      try {
        const stored = localStorage.getItem('unburdenme_priority_checklist');
        if (stored) {
          setItems(JSON.parse(stored));
        }
      } catch (err) {
        console.warn('Failed to load updated priorities from storage', err);
      }
    };

    window.addEventListener('unburdenme_priorities_updated', handlePrioritiesUpdated);
    window.addEventListener('storage', handlePrioritiesUpdated);

    return () => {
      window.removeEventListener('unburdenme_priorities_updated', handlePrioritiesUpdated);
      window.removeEventListener('storage', handlePrioritiesUpdated);
    };
  }, []);

  // New item form state
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'mid' | 'low'>(
    () => (getMostFrequentPreference('priority', 'high') as any)
  );
  const [newType, setNewType] = useState<'Email' | 'Message' | 'Calendar Event' | 'Task' | 'General'>(
    () => (getMostFrequentPreference('type', 'Email') as any)
  );
  const [newDeadline, setNewDeadline] = useState<string>('');
  const [newDeadlineTime, setNewDeadlineTime] = useState<string>('09:00');
  const [isDeadlinePickerOpen, setIsDeadlinePickerOpen] = useState<boolean>(false);
  const [moderationError, setModerationError] = useState<string | null>(null);

  // Quick reminder dropdown state
  const [reminderOption, setReminderOption] = useState<string>('none'); // 'none' | '1h' | '3h' | '5h' | '24h' | 'custom'
  const [customReminderVal, setCustomReminderVal] = useState<number>(2);
  const [customReminderUnit, setCustomReminderUnit] = useState<'minutes' | 'hours' | 'days'>('hours');
  const [isReminderDropdownOpen, setIsReminderDropdownOpen] = useState<boolean>(false);

  // Deadline reminder options
  const [deadlineReminderOption, setDeadlineReminderOption] = useState<string>('at_time'); // 'none' | 'at_time' | '30m_before' | '1h_before' | '24h_before' | 'custom'
  const [customDeadlineReminderDate, setCustomDeadlineReminderDate] = useState<string>('');

  // Filter and sort state
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'mid' | 'low' | 'active' | 'completed'>('all');
  const [sortByPriority, setSortByPriority] = useState<boolean>(true);

  // Edit item inline state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'mid' | 'low'>('high');
  const [editType, setEditType] = useState<'Email' | 'Message' | 'Calendar Event' | 'Task' | 'General'>('Email');
  const [editDeadline, setEditDeadline] = useState<string>('');

  // AI Signal Digest output state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [digestResult, setDigestResult] = useState<TriageSignalOutput | null>(null);

  // Priority List Sharing state
  const [isShareMenuOpen, setIsShareMenuOpen] = useState<boolean>(false);
  const [copiedShareText, setCopiedShareText] = useState<boolean>(false);

  // Generate plain text version of priorities list
  const generatePriorityListText = () => {
    const high = items.filter(i => i.priority === 'high');
    const mid = items.filter(i => i.priority === 'mid');
    const low = items.filter(i => i.priority === 'low');
    const dateStr = new Date().toLocaleDateString('en-US', { dateStyle: 'full' });

    let text = `=====================================\n`;
    text += `MY PRIORITIES TO-DO LIST\n`;
    text += `Generated on ${dateStr}\n`;
    text += `=====================================\n\n`;

    if (high.length > 0) {
      text += `🔴 HIGH PRIORITY (${high.length}):\n`;
      high.forEach((item, idx) => {
        text += `  ${idx + 1}. [${item.completed ? '✓' : ' '}] ${item.title} (${item.type})\n`;
      });
      text += `\n`;
    }

    if (mid.length > 0) {
      text += `🟡 MID PRIORITY (${mid.length}):\n`;
      mid.forEach((item, idx) => {
        text += `  ${idx + 1}. [${item.completed ? '✓' : ' '}] ${item.title} (${item.type})\n`;
      });
      text += `\n`;
    }

    if (low.length > 0) {
      text += `⚪ LOW PRIORITY (${low.length}):\n`;
      low.forEach((item, idx) => {
        text += `  ${idx + 1}. [${item.completed ? '✓' : ' '}] ${item.title} (${item.type})\n`;
      });
      text += `\n`;
    }

    text += `Shared via UnburdenMe Executive Triage App`;
    return text;
  };

  // Export handlers
  const handleDownloadTextFile = () => {
    const text = generatePriorityListText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Priority_TodoList_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsShareMenuOpen(false);
  };

  const handleDownloadGoogleDoc = () => {
    const high = items.filter(i => i.priority === 'high');
    const mid = items.filter(i => i.priority === 'mid');
    const low = items.filter(i => i.priority === 'low');
    const dateStr = new Date().toLocaleDateString('en-US', { dateStyle: 'full' });

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>My Priority To-Do List</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.6; color: #1a1a15; margin: 40px; }
          h1 { color: #5a5a40; font-size: 22pt; border-bottom: 2px solid #5a5a40; padding-bottom: 8px; margin-bottom: 4px; }
          .meta { color: #7a7a70; font-size: 10pt; margin-bottom: 24px; font-style: italic; }
          h2 { font-size: 14pt; margin-top: 20px; margin-bottom: 10px; padding: 6px 12px; border-radius: 6px; }
          .high-header { background-color: #ffe4e6; color: #9f1239; }
          .mid-header { background-color: #fef3c7; color: #92400e; }
          .low-header { background-color: #f1f5f9; color: #475569; }
          ul { list-style-type: none; padding-left: 0; }
          li { padding: 10px 14px; margin-bottom: 8px; background-color: #fcfbf9; border: 1px solid #e8e7df; border-radius: 8px; font-size: 11pt; }
          .completed { text-decoration: line-through; color: #888888; }
          .badge { font-weight: bold; font-size: 9pt; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; margin-left: 8px; float: right; }
          .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e8e7df; font-size: 9pt; color: #999999; text-align: center; }
        </style>
      </head>
      <body>
        <h1>My Priorities To-Do List</h1>
        <p class='meta'>Generated on ${dateStr} • Exported via UnburdenMe</p>

        ${high.length > 0 ? `
          <h2 class='high-header'>🔴 High Priority Tasks (${high.length})</h2>
          <ul>
            ${high.map(item => `
              <li class='${item.completed ? 'completed' : ''}'>
                <strong>${item.completed ? '☑' : '☐'}</strong> ${item.title}
                <span class='badge' style='background-color:#ffe4e6; color:#9f1239;'>${item.type}</span>
              </li>
            `).join('')}
          </ul>
        ` : ''}

        ${mid.length > 0 ? `
          <h2 class='mid-header'>🟡 Mid Priority Tasks (${mid.length})</h2>
          <ul>
            ${mid.map(item => `
              <li class='${item.completed ? 'completed' : ''}'>
                <strong>${item.completed ? '☑' : '☐'}</strong> ${item.title}
                <span class='badge' style='background-color:#fef3c7; color:#92400e;'>${item.type}</span>
              </li>
            `).join('')}
          </ul>
        ` : ''}

        ${low.length > 0 ? `
          <h2 class='low-header'>⚪ Low Priority Tasks (${low.length})</h2>
          <ul>
            ${low.map(item => `
              <li class='${item.completed ? 'completed' : ''}'>
                <strong>${item.completed ? '☑' : '☐'}</strong> ${item.title}
                <span class='badge' style='background-color:#f1f5f9; color:#475569;'>${item.type}</span>
              </li>
            `).join('')}
          </ul>
        ` : ''}

        <div class='footer'>
          <p>UnburdenMe Executive Triage & Priority Management</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Priority_TodoList_${new Date().toISOString().slice(0, 10)}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsShareMenuOpen(false);
  };

  const handleEmailShare = () => {
    const text = generatePriorityListText();
    const subject = encodeURIComponent("My Priority To-Do List Summary");
    const body = encodeURIComponent(text);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    setIsShareMenuOpen(false);
  };

  const handleWhatsAppShare = () => {
    const text = generatePriorityListText();
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    setIsShareMenuOpen(false);
  };

  const handleSMSShare = () => {
    const text = generatePriorityListText();
    const encodedText = encodeURIComponent(text);
    window.open(`sms:?body=${encodedText}`, '_blank');
    setIsShareMenuOpen(false);
  };

  const handleCopyText = async () => {
    const text = generatePriorityListText();
    await navigator.clipboard.writeText(text);
    setCopiedShareText(true);
    setTimeout(() => setCopiedShareText(false), 2000);
    setIsShareMenuOpen(false);
  };

  // Helper to sync task deadline into the IntegratedCalendar
  const syncTaskToCalendar = (title: string, dateStr: string, priority: 'high' | 'mid' | 'low', type: string) => {
    try {
      const existingRaw = localStorage.getItem('unburdenme_calendar_events');
      let calendarEvents: any[] = existingRaw ? JSON.parse(existingRaw) : [];

      const category = type === 'Calendar Event' ? 'meeting' : type === 'Task' ? 'focus' : 'work';
      const newEvt = {
        id: `evt-${Date.now()}`,
        title: `[${type}] ${title}`,
        date: dateStr,
        startTime: '09:00',
        endTime: '10:00',
        category: category,
        priority: priority,
        notes: `Synced deadline from Priority Triage checklist (${type})`,
        completed: false,
        syncedFrom: 'manual'
      };

      calendarEvents.push(newEvt);
      localStorage.setItem('unburdenme_calendar_events', JSON.stringify(calendarEvents));
      window.dispatchEvent(new CustomEvent('unburdenme_calendar_updated', { detail: newEvt }));
    } catch (err) {
      console.error('Failed to sync task deadline with calendar:', err);
    }
  };

  // Add new item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    setModerationError(null);

    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;

    // Check forbidden/abusive language
    const modCheck = checkForbiddenLanguage(trimmedTitle);
    if (modCheck.isForbidden) {
      setModerationError(modCheck.reason || FORBIDDEN_LANGUAGE_REJECTION_MESSAGE);
      return;
    }

    // Record preference to learn user choices
    recordPreference('priority', newPriority);
    recordPreference('type', newType);

    let computedReminderTime: string | undefined = undefined;
    let computedReminderLabel: string | undefined = undefined;

    // 1. Calculate reminder if user chose duration option
    if (reminderOption !== 'none') {
      let delayMs = 0;
      if (reminderOption === '1h') { delayMs = 1 * 3600 * 1000; computedReminderLabel = 'In 1 Hour'; }
      else if (reminderOption === '3h') { delayMs = 3 * 3600 * 1000; computedReminderLabel = 'In 3 Hours'; }
      else if (reminderOption === '5h') { delayMs = 5 * 3600 * 1000; computedReminderLabel = 'In 5 Hours'; }
      else if (reminderOption === '24h') { delayMs = 24 * 3600 * 1000; computedReminderLabel = 'In 24 Hours'; }
      else if (reminderOption === 'custom') {
        const factor = customReminderUnit === 'minutes' ? 60 * 1000 : customReminderUnit === 'hours' ? 3600 * 1000 : 24 * 3600 * 1000;
        delayMs = customReminderVal * factor;
        computedReminderLabel = `In ${customReminderVal} ${customReminderUnit}`;
      }
      computedReminderTime = new Date(Date.now() + delayMs).toISOString();
      requestNotificationPermission();
    } 
    // 2. Or calculate reminder if set within 'set deadline' option
    else if (newDeadline && deadlineReminderOption !== 'none') {
      try {
        const timePart = newDeadlineTime || '09:00';
        const targetDate = new Date(`${newDeadline}T${timePart}:00`);
        let targetMs = targetDate.getTime();

        if (deadlineReminderOption === 'at_time') {
          computedReminderLabel = `At Deadline (${timePart})`;
        } else if (deadlineReminderOption === '30m_before') {
          targetMs -= 30 * 60 * 1000;
          computedReminderLabel = `30m before deadline`;
        } else if (deadlineReminderOption === '1h_before') {
          targetMs -= 3600 * 1000;
          computedReminderLabel = `1h before deadline`;
        } else if (deadlineReminderOption === '24h_before') {
          targetMs -= 24 * 3600 * 1000;
          computedReminderLabel = `24h before deadline`;
        } else if (deadlineReminderOption === 'custom' && customDeadlineReminderDate) {
          targetMs = new Date(customDeadlineReminderDate).getTime();
          computedReminderLabel = `Custom deadline alert`;
        }

        if (!isNaN(targetMs)) {
          computedReminderTime = new Date(targetMs).toISOString();
          requestNotificationPermission();
        }
      } catch (e) {
        console.warn('Invalid deadline date calculation:', e);
      }
    }

    const newItem: PriorityItem = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      priority: newPriority,
      type: newType,
      completed: false,
      deadline: newDeadline || undefined,
      reminderTime: computedReminderTime,
      reminderLabel: computedReminderLabel,
      reminderTriggered: false
    };

    setItems([newItem, ...items]);

    if (newDeadline) {
      syncTaskToCalendar(newTitle.trim(), newDeadline, newPriority, newType);
    }

    // Reset inputs
    setNewTitle('');
    setNewDeadline('');
    setReminderOption('none');
    setDeadlineReminderOption('at_time');
    setIsDeadlinePickerOpen(false);
    setIsReminderDropdownOpen(false);
  };

  // Toggle item completion
  const handleToggleComplete = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  // Delete item
  const handleDeleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Quick priority toggle
  const handleSetPriority = (id: string, priority: 'high' | 'mid' | 'low') => {
    setItems(items.map(item => item.id === id ? { ...item, priority } : item));
  };

  // Start editing
  const handleStartEdit = (item: PriorityItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditPriority(item.priority);
    setEditType(item.type);
    setEditDeadline(item.deadline || '');
  };

  // Save editing
  const handleSaveEdit = (id: string) => {
    if (!editTitle.trim()) return;
    const existing = items.find(i => i.id === id);
    if (existing && editDeadline && editDeadline !== existing.deadline) {
      syncTaskToCalendar(editTitle.trim(), editDeadline, editPriority, editType);
    }
    setItems(items.map(item => item.id === id ? { ...item, title: editTitle.trim(), priority: editPriority, type: editType, deadline: editDeadline || undefined } : item));
    setEditingId(null);
  };

  // Run AI Digest using checklist items
  const handleRunDigest = async () => {
    setIsLoading(true);
    try {
      // Map active items or all items into subject lines for AI analysis
      const subjectStrings = items.map(item => 
        `[${item.priority.toUpperCase()} PRIORITY - ${item.type}] ${item.title}${item.completed ? ' (Completed)' : ''}`
      );

      const payload: TriageSignalInput = {
        calendar_events_count: calendarCount,
        unread_email_count: unreadCount,
        top_email_subject_lines: subjectStrings,
        context_type: 'hybrid'
      };

      const res = await fetch('/api/triage/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      setDigestResult(data);
    } catch (err) {
      console.error('Error running data digest:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear summary and priority list
  const handleResetSummary = () => {
    setItems([]);
    setDigestResult(null);
  };

  // Run initial digest once on mount
  useEffect(() => {
    handleRunDigest();
  }, []);

  // Filter items
  const filteredItems = items.filter(item => {
    if (filterPriority === 'high') return item.priority === 'high';
    if (filterPriority === 'mid') return item.priority === 'mid';
    if (filterPriority === 'low') return item.priority === 'low';
    if (filterPriority === 'active') return !item.completed;
    if (filterPriority === 'completed') return item.completed;
    return true;
  });

  // Sort items (High -> Mid -> Low, then active before completed)
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortByPriority) return 0;
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const priorityOrder = { high: 0, mid: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Priority counts for workload management overview
  const highCount = items.filter(i => i.priority === 'high' && !i.completed).length;
  const midCount = items.filter(i => i.priority === 'mid' && !i.completed).length;
  const lowCount = items.filter(i => i.priority === 'low' && !i.completed).length;
  const completedCount = items.filter(i => i.completed).length;

  const renderTypeIcon = (type: PriorityItem['type']) => {
    switch (type) {
      case 'Calendar Event':
        return <Calendar className="w-3.5 h-3.5 text-amber-600" />;
      case 'Message':
        return <MessageSquare className="w-3.5 h-3.5 text-blue-600" />;
      case 'Task':
        return <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />;
      case 'General':
        return <FileText className="w-3.5 h-3.5 text-purple-600" />;
      case 'Email':
      default:
        return <Mail className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  return (
    <div className="bg-white border border-[#e8e7df] rounded-[32px] p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="border-b border-[#e8e7df] pb-4">
        <div>
          <h2 className="text-base font-bold text-[#1a1a15] tracking-tight">Priorities</h2>
          <p className="text-xs text-[#7a7a70] mt-0.5">
            Organise, prioritise, and manage message, email, and task cognitive load with a structured, editable priority checklist.
          </p>
        </div>
      </div>

      {/* Priority Checklist Manager */}
      <div className="bg-[#fcfbf9] border border-[#e8e7df] rounded-2xl p-5 space-y-5">
          {/* Priority Summary & Workload Heatmap Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-1.5 text-xs font-medium">
              <span className="text-[#a1a19a] uppercase tracking-wider text-[11px] font-bold">Priority Status:</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                {highCount} High
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {midCount} Mid
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {lowCount} Low
              </span>
              {completedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {completedCount} Addressed
                </span>
              )}
            </div>

            <button
              onClick={() => setSortByPriority(!sortByPriority)}
              className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center space-x-1 transition-all ${
                sortByPriority ? 'bg-[#5a5a40] text-white border-[#5a5a40]' : 'bg-white text-[#5a5a40] border-[#e8e7df]'
              }`}
              title="Toggle priority sorting"
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>{sortByPriority ? 'Sorted by Priority' : 'Custom Order'}</span>
            </button>
          </div>

          {/* Add New Item Form */}
          <form onSubmit={handleAddItem} className="bg-white border border-[#e8e7df] rounded-xl p-3.5 space-y-2.5 shadow-2xs">
            <span className="text-[11px] font-bold text-[#5a5a40] uppercase tracking-wider block">
              + Add New Message or Task
            </span>

            {moderationError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{moderationError}</span>
              </div>
            )}

            <div className="space-y-2">
              <input
                type="text"
                placeholder="e.g. Q3 Budget Sign-off / Family Dinner Request / Client Call"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#e8e7df] text-xs focus:outline-none focus:ring-2 focus:ring-[#5a5a40] bg-[#fcfbf9] placeholder:text-[#a1a19a]"
              />

              {/* Grid Layout for controls: Type, Priority, Set Deadline, Set Reminder */}
              <div className="grid grid-cols-2 gap-2">
                {/* 1. Type Select */}
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-lg border border-[#e8e7df] text-xs bg-[#fcfbf9] text-[#3a3a34] font-medium focus:outline-none focus:ring-2 focus:ring-[#5a5a40]"
                >
                  <option value="Email">Email</option>
                  <option value="Message">Message</option>
                  <option value="Calendar Event">Calendar Event</option>
                  <option value="Task">Task</option>
                  <option value="General">General</option>
                </select>

                {/* 2. Priority Select */}
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className={`w-full px-2.5 py-2 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#5a5a40] ${
                    newPriority === 'high'
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : newPriority === 'mid'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-slate-50 text-slate-700 border-slate-300'
                  }`}
                >
                  <option value="high">High Priority</option>
                  <option value="mid">Mid Priority</option>
                  <option value="low">Low Priority</option>
                </select>

                {/* 3. Deadline Calendar Picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeadlinePickerOpen(!isDeadlinePickerOpen);
                      setIsReminderDropdownOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-lg border text-xs font-medium flex items-center justify-between space-x-1 transition-all ${
                      newDeadline
                        ? 'bg-[#edf4f0] text-[#2e4d3a] border-[#b3d7bd] font-bold'
                        : 'bg-[#fcfbf9] text-[#5a5a40] border-[#e8e7df] hover:border-[#5a5a40]'
                    }`}
                    title="Set target deadline day and reminder for calendar sync"
                  >
                    <div className="flex items-center space-x-1.5 min-w-0 truncate">
                      <CalendarDays className="w-3.5 h-3.5 text-[#5a5a40] shrink-0" />
                      <span className="truncate">{newDeadline ? `Due: ${newDeadline}` : 'Set Deadline'}</span>
                    </div>
                    {newDeadline && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewDeadline('');
                        }}
                        className="ml-1 hover:text-rose-600 p-0.5 rounded cursor-pointer shrink-0"
                        title="Clear deadline"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    )}
                  </button>

                  {/* Pop-up Calendar Dropdown with Reminder Option */}
                  {isDeadlinePickerOpen && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 p-3 bg-white border border-[#e8e7df] rounded-xl shadow-xl space-y-2.5 w-68 text-xs">
                      <div className="flex items-center justify-between border-b border-[#e8e7df] pb-1.5">
                        <span className="font-bold text-[#1a1a15] flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-[#5a5a40]" />
                          Set Target Deadline & Reminder
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsDeadlinePickerOpen(false)}
                          className="text-[#a1a19a] hover:text-[#1a1a15] p-0.5 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Pop-up Date & Time Picker Input */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-[#7a7a70] font-semibold mb-0.5">
                            Day:
                          </label>
                          <input
                            type="date"
                            value={newDeadline}
                            onChange={(e) => setNewDeadline(e.target.value)}
                            className="w-full p-1.5 border border-[#e8e7df] rounded-lg bg-[#fcfbf9] text-xs text-[#3a3a34] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#7a7a70] font-semibold mb-0.5">
                            Time:
                          </label>
                          <input
                            type="time"
                            value={newDeadlineTime}
                            onChange={(e) => setNewDeadlineTime(e.target.value)}
                            className="w-full p-1.5 border border-[#e8e7df] rounded-lg bg-[#fcfbf9] text-xs text-[#3a3a34] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]"
                          />
                        </div>
                      </div>

                      {/* Reminder alert within 'set deadline' */}
                      <div className="space-y-1 pt-1 border-t border-[#f0efe8]">
                        <label className="block text-[10px] text-[#7a7a70] font-bold uppercase flex items-center gap-1">
                          <Bell className="w-3 h-3 text-amber-600" />
                          <span>Deadline Notification Reminder:</span>
                        </label>
                        <select
                          value={deadlineReminderOption}
                          onChange={(e) => setDeadlineReminderOption(e.target.value)}
                          className="w-full p-1.5 border border-[#e8e7df] rounded-lg bg-[#fcfbf9] text-xs text-[#3a3a34] font-medium"
                        >
                          <option value="at_time">At Deadline Start Time</option>
                          <option value="30m_before">30 Minutes Before</option>
                          <option value="1h_before">1 Hour Before</option>
                          <option value="24h_before">24 Hours Before</option>
                          <option value="custom">Custom Date & Time</option>
                          <option value="none">No Notification</option>
                        </select>

                        {deadlineReminderOption === 'custom' && (
                          <div className="pt-1">
                            <input
                              type="datetime-local"
                              value={customDeadlineReminderDate}
                              onChange={(e) => setCustomDeadlineReminderDate(e.target.value)}
                              className="w-full p-1.5 border border-[#e8e7df] rounded-lg bg-[#fcfbf9] text-xs text-[#3a3a34]"
                            />
                          </div>
                        )}
                      </div>

                      {/* Quick Presets */}
                      <div className="pt-1 border-t border-[#f0efe8] space-y-1">
                        <span className="text-[10px] text-[#7a7a70] uppercase font-bold block">Quick Presets:</span>
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const today = new Date().toISOString().split('T')[0];
                              setNewDeadline(today);
                            }}
                            className="px-2 py-1 bg-[#fcfbf9] hover:bg-[#edf4f0] border border-[#e8e7df] rounded text-[11px] text-[#2e4d3a] font-medium text-left"
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const tomorrow = new Date();
                              tomorrow.setDate(tomorrow.getDate() + 1);
                              setNewDeadline(tomorrow.toISOString().split('T')[0]);
                            }}
                            className="px-2 py-1 bg-[#fcfbf9] hover:bg-[#edf4f0] border border-[#e8e7df] rounded text-[11px] text-[#2e4d3a] font-medium text-left"
                          >
                            Tomorrow
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const in3Days = new Date();
                              in3Days.setDate(in3Days.getDate() + 3);
                              setNewDeadline(in3Days.toISOString().split('T')[0]);
                            }}
                            className="px-2 py-1 bg-[#fcfbf9] hover:bg-[#edf4f0] border border-[#e8e7df] rounded text-[11px] text-[#2e4d3a] font-medium text-left"
                          >
                            In 3 Days
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const in1Week = new Date();
                              in1Week.setDate(in1Week.getDate() + 7);
                              setNewDeadline(in1Week.toISOString().split('T')[0]);
                            }}
                            className="px-2 py-1 bg-[#fcfbf9] hover:bg-[#edf4f0] border border-[#e8e7df] rounded text-[11px] text-[#2e4d3a] font-medium text-left"
                          >
                            Next Week
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsDeadlinePickerOpen(false)}
                        className="w-full py-1.5 bg-[#5a5a40] text-white rounded-lg font-bold text-center text-xs mt-1"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. Set Reminder Dropdown Button (Between 'Set Deadline' and '+Add' buttons) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsReminderDropdownOpen(!isReminderDropdownOpen);
                      setIsDeadlinePickerOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-lg border text-xs font-medium flex items-center justify-between space-x-1 transition-all ${
                      reminderOption !== 'none'
                        ? 'bg-amber-100/80 text-amber-900 border-amber-300 font-bold'
                        : 'bg-[#fcfbf9] text-[#5a5a40] border-[#e8e7df] hover:border-[#5a5a40]'
                    }`}
                    title="Set a reminder timer for this task"
                  >
                    <div className="flex items-center space-x-1.5 min-w-0 truncate">
                      <Bell className={`w-3.5 h-3.5 shrink-0 ${reminderOption !== 'none' ? 'text-amber-700' : 'text-[#5a5a40]'}`} />
                      <span className="truncate">
                        {reminderOption === 'none'
                          ? 'Set Reminder'
                          : reminderOption === '1h'
                          ? 'Reminder: 1 Hour'
                          : reminderOption === '3h'
                          ? 'Reminder: 3 Hours'
                          : reminderOption === '5h'
                          ? 'Reminder: 5 Hours'
                          : reminderOption === '24h'
                          ? 'Reminder: 24 Hours'
                          : `Reminder: ${customReminderVal} ${customReminderUnit}`}
                      </span>
                    </div>
                    {reminderOption !== 'none' && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setReminderOption('none');
                        }}
                        className="ml-1 hover:text-rose-600 p-0.5 rounded cursor-pointer shrink-0"
                        title="Clear reminder"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    )}
                  </button>

                  {/* Reminder Dropdown Popover */}
                  {isReminderDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1.5 z-50 p-3 bg-white border border-[#e8e7df] rounded-xl shadow-xl space-y-2 w-64 text-xs">
                      <div className="flex items-center justify-between border-b border-[#e8e7df] pb-1.5">
                        <span className="font-bold text-[#1a1a15] flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-amber-600" />
                          Set Reminder Notification
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsReminderDropdownOpen(false)}
                          className="text-[#a1a19a] hover:text-[#1a1a15] p-0.5 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setReminderOption('1h');
                            setIsReminderDropdownOpen(false);
                          }}
                          className={`w-full px-2.5 py-1.5 text-left rounded-lg text-xs flex items-center justify-between ${
                            reminderOption === '1h' ? 'bg-amber-100 text-amber-900 font-bold' : 'hover:bg-[#f5f4ee] text-[#1a1a15]'
                          }`}
                        >
                          <span>1 Hour from now</span>
                          <Clock className="w-3 h-3 text-amber-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReminderOption('3h');
                            setIsReminderDropdownOpen(false);
                          }}
                          className={`w-full px-2.5 py-1.5 text-left rounded-lg text-xs flex items-center justify-between ${
                            reminderOption === '3h' ? 'bg-amber-100 text-amber-900 font-bold' : 'hover:bg-[#f5f4ee] text-[#1a1a15]'
                          }`}
                        >
                          <span>3 Hours from now</span>
                          <Clock className="w-3 h-3 text-amber-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReminderOption('5h');
                            setIsReminderDropdownOpen(false);
                          }}
                          className={`w-full px-2.5 py-1.5 text-left rounded-lg text-xs flex items-center justify-between ${
                            reminderOption === '5h' ? 'bg-amber-100 text-amber-900 font-bold' : 'hover:bg-[#f5f4ee] text-[#1a1a15]'
                          }`}
                        >
                          <span>5 Hours from now</span>
                          <Clock className="w-3 h-3 text-amber-600" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReminderOption('24h');
                            setIsReminderDropdownOpen(false);
                          }}
                          className={`w-full px-2.5 py-1.5 text-left rounded-lg text-xs flex items-center justify-between ${
                            reminderOption === '24h' ? 'bg-amber-100 text-amber-900 font-bold' : 'hover:bg-[#f5f4ee] text-[#1a1a15]'
                          }`}
                        >
                          <span>24 Hours from now</span>
                          <Clock className="w-3 h-3 text-amber-600" />
                        </button>

                        <div className="pt-2 border-t border-[#f0efe8] space-y-1.5">
                          <span className="font-bold text-[10px] text-[#7a7a70] uppercase block">Or Duration of Choice:</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              value={customReminderVal}
                              onChange={(e) => setCustomReminderVal(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-16 p-1.5 border border-[#e8e7df] rounded-lg bg-[#fcfbf9] text-xs font-mono text-center"
                            />
                            <select
                              value={customReminderUnit}
                              onChange={(e) => setCustomReminderUnit(e.target.value as any)}
                              className="p-1.5 border border-[#e8e7df] rounded-lg bg-[#fcfbf9] text-xs"
                            >
                              <option value="minutes">Minutes</option>
                              <option value="hours">Hours</option>
                              <option value="days">Days</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                setReminderOption('custom');
                                setIsReminderDropdownOpen(false);
                              }}
                              className="px-2.5 py-1.5 bg-[#5a5a40] text-white rounded-lg text-xs font-bold shrink-0"
                            >
                              Set
                            </button>
                          </div>
                        </div>

                        {reminderOption !== 'none' && (
                          <button
                            type="button"
                            onClick={() => {
                              setReminderOption('none');
                              setIsReminderDropdownOpen(false);
                            }}
                            className="w-full text-center text-[11px] text-rose-600 hover:underline pt-1 block"
                          >
                            Remove Reminder
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Add Button */}
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="w-full px-3 py-2 bg-[#5a5a40] hover:bg-[#3f3f2d] text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-xs text-[#7a7a70] border-b border-[#e8e7df]">
            <Filter className="w-3.5 h-3.5 text-[#a1a19a] mr-1 shrink-0" />
            <button
              onClick={() => setFilterPriority('all')}
              className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-semibold whitespace-nowrap ${
                filterPriority === 'all' ? 'bg-[#5a5a40] text-white' : 'hover:bg-[#e8e7df]'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilterPriority('high')}
              className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-semibold whitespace-nowrap ${
                filterPriority === 'high' ? 'bg-rose-700 text-white' : 'hover:bg-rose-50 text-rose-700'
              }`}
            >
              High ({items.filter(i => i.priority === 'high').length})
            </button>
            <button
              onClick={() => setFilterPriority('mid')}
              className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-semibold whitespace-nowrap ${
                filterPriority === 'mid' ? 'bg-amber-700 text-white' : 'hover:bg-amber-50 text-amber-700'
              }`}
            >
              Mid ({items.filter(i => i.priority === 'mid').length})
            </button>
            <button
              onClick={() => setFilterPriority('low')}
              className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-semibold whitespace-nowrap ${
                filterPriority === 'low' ? 'bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              Low ({items.filter(i => i.priority === 'low').length})
            </button>
            <button
              onClick={() => setFilterPriority('active')}
              className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-semibold whitespace-nowrap ${
                filterPriority === 'active' ? 'bg-[#3a3a34] text-white' : 'hover:bg-[#e8e7df]'
              }`}
            >
              To-Do ({items.filter(i => !i.completed).length})
            </button>
            <button
              onClick={() => setFilterPriority('completed')}
              className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-semibold whitespace-nowrap ${
                filterPriority === 'completed' ? 'bg-emerald-700 text-white' : 'hover:bg-emerald-50 text-emerald-700'
              }`}
            >
              Done ({completedCount})
            </button>
          </div>

          {/* Interactive To-Do Checklist List */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {sortedItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#a1a19a] bg-white border border-dashed border-[#e8e7df] rounded-xl p-4">
                No priorities found under this filter. Add new items or switch filter views.
              </div>
            ) : (
              sortedItems.map((item) => {
                const isEditing = editingId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all ${
                      item.completed
                        ? 'bg-[#f8f7f2] border-[#e8e7df] opacity-75'
                        : item.priority === 'high'
                        ? 'bg-rose-50/40 border-rose-200/80 hover:border-rose-300'
                        : item.priority === 'mid'
                        ? 'bg-amber-50/30 border-amber-200/70 hover:border-amber-300'
                        : 'bg-white border-[#e8e7df] hover:border-[#d5d4cb]'
                    }`}
                  >
                    {isEditing ? (
                      /* Editing Mode */
                      <div className="w-full flex flex-col sm:flex-row gap-2 items-center">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#e8e7df] text-xs bg-white w-full"
                          autoFocus
                        />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value as any)}
                            className="px-2 py-1 rounded-lg border text-xs bg-white"
                          >
                            <option value="Email">Email</option>
                            <option value="Message">Message</option>
                            <option value="Calendar Event">Calendar Event</option>
                            <option value="Task">Task</option>
                            <option value="General">General</option>
                          </select>
                          <select
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value as any)}
                            className="px-2 py-1 rounded-lg border text-xs bg-white font-bold"
                          >
                            <option value="high">High</option>
                            <option value="mid">Mid</option>
                            <option value="low">Low</option>
                          </select>
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            title="Save edits"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display Mode */
                      <div className="flex items-start space-x-2.5">
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleComplete(item.id)}
                          className="mt-0.5 text-[#5a5a40] hover:scale-110 transition-transform shrink-0"
                          title={item.completed ? 'Mark as incomplete' : 'Tick off item once completed'}
                        >
                          {item.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50" />
                          ) : (
                            <Circle className="w-4 h-4 text-[#a1a19a] hover:text-[#5a5a40]" />
                          )}
                        </button>

                        {/* Item details */}
                        <div className="min-w-0 flex-1">
                          {/* Channel & Action Row: Icon, type, deadline, plus edit & delete in top-right corner */}
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 min-w-0">
                              {renderTypeIcon(item.type)}
                              <span className="text-[10px] uppercase font-bold text-[#7a7a70]">
                                {item.type}
                              </span>
                              {item.deadline && (
                                <span className="text-[10px] bg-[#edf4f0] text-[#2e4d3a] px-2 py-0.5 rounded-full font-bold border border-[#c4dbc8] flex items-center gap-1 shrink-0">
                                  <CalendarDays className="w-3 h-3 text-[#5a5a40]" />
                                  <span>Due: {item.deadline}</span>
                                </span>
                              )}
                              {item.reminderLabel && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 shrink-0 ${
                                  item.reminderTriggered
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : 'bg-amber-50 text-amber-900 border-amber-200'
                                }`}>
                                  <Bell className="w-3 h-3 text-amber-600" />
                                  <span>{item.reminderTriggered ? 'Triggered' : item.reminderLabel}</span>
                                </span>
                              )}
                            </div>

                            {/* Top Right Corner Edit & Delete Buttons */}
                            <div className="flex items-center space-x-1 shrink-0 ml-1">
                              <button
                                onClick={() => handleStartEdit(item)}
                                className="p-1 text-[#7a7a70] hover:text-[#1a1a15] hover:bg-black/5 rounded-md transition-colors"
                                title="Edit priority description"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                title="Delete item permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Item Title */}
                          <p
                            className={`text-xs font-medium leading-snug break-words ${
                              item.completed
                                ? 'line-through text-[#a1a19a]'
                                : 'text-[#1a1a15]'
                            }`}
                          >
                            {item.title}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Actions Bar: Create Priority Summary & Share Priority List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 relative">
            {/* Create Priority Summary Button */}
            <button
              onClick={handleRunDigest}
              disabled={isLoading}
              className="w-full py-3 bg-[#5a5a40] hover:bg-[#3f3f2d] text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-xs disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Extracting Signal...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
                  <span>Create Priority Summary</span>
                </>
              )}
            </button>

            {/* Share Priority List Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                className="w-full py-3 bg-white hover:bg-[#f5f4ee] text-[#5a5a40] border border-[#d8d6c8] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-2xs active:scale-98 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-[#d97706]" />
                <span>Share Priority List</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isShareMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Share Dropdown / Popover Menu */}
              {isShareMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsShareMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-full sm:w-80 bg-white border border-[#e8e7df] rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 border-b border-[#f1f0e8] flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#a1a19a]">
                        Share Priority To-Do List
                      </span>
                      <span className="text-[10px] text-[#7a7a70]">{items.length} items</span>
                    </div>

                    {/* Download Text File */}
                    <button
                      type="button"
                      onClick={handleDownloadTextFile}
                      className="w-full p-2.5 rounded-xl hover:bg-[#f5f4ee] flex items-center space-x-3 text-left transition-colors cursor-pointer text-xs group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <Download className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-[#1a1a15] group-hover:text-[#5a5a40]">Download List (.txt)</div>
                        <div className="text-[10px] text-[#7a7a70]">Plain text file with priorities & checkboxes</div>
                      </div>
                    </button>

                    {/* Download Google Doc (.docx) */}
                    <button
                      type="button"
                      onClick={handleDownloadGoogleDoc}
                      className="w-full p-2.5 rounded-xl hover:bg-[#f5f4ee] flex items-center space-x-3 text-left transition-colors cursor-pointer text-xs group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-[#1a1a15] group-hover:text-[#5a5a40]">Download as Google Doc (.docx)</div>
                        <div className="text-[10px] text-[#7a7a70]">Formatted document for Google Docs & Word</div>
                      </div>
                    </button>

                    {/* Email */}
                    <button
                      type="button"
                      onClick={handleEmailShare}
                      className="w-full p-2.5 rounded-xl hover:bg-[#f5f4ee] flex items-center space-x-3 text-left transition-colors cursor-pointer text-xs group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-[#1a1a15] group-hover:text-[#5a5a40]">Email Priority List</div>
                        <div className="text-[10px] text-[#7a7a70]">Opens pre-filled email app</div>
                      </div>
                    </button>

                    {/* WhatsApp */}
                    <button
                      type="button"
                      onClick={handleWhatsAppShare}
                      className="w-full p-2.5 rounded-xl hover:bg-[#f5f4ee] flex items-center space-x-3 text-left transition-colors cursor-pointer text-xs group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-green-100 text-green-800 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-[#1a1a15] group-hover:text-[#5a5a40]">WhatsApp</div>
                        <div className="text-[10px] text-[#7a7a70]">Send list directly via WhatsApp</div>
                      </div>
                    </button>

                    {/* Text Message / SMS */}
                    <button
                      type="button"
                      onClick={handleSMSShare}
                      className="w-full p-2.5 rounded-xl hover:bg-[#f5f4ee] flex items-center space-x-3 text-left transition-colors cursor-pointer text-xs group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                        <Send className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-[#1a1a15] group-hover:text-[#5a5a40]">Text Message / SMS</div>
                        <div className="text-[10px] text-[#7a7a70]">Send list via mobile message</div>
                      </div>
                    </button>

                    {/* Copy to Clipboard */}
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="w-full p-2.5 rounded-xl hover:bg-[#f5f4ee] flex items-center space-x-3 text-left transition-colors cursor-pointer text-xs group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                        {copiedShareText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="font-semibold text-[#1a1a15] group-hover:text-[#5a5a40]">
                          {copiedShareText ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
                        </div>
                        <div className="text-[10px] text-[#7a7a70]">Copy formatted list to paste anywhere</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* AI Signal Digest Outcome Box */}
          {digestResult && (
            <div className="bg-[#edf4f0] border border-[#c4dbc8] rounded-2xl p-5 space-y-4 shadow-2xs transition-all">
              <div className="flex items-center justify-between border-b border-[#c4dbc8] pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-[#3d604b] text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4 text-[#e2f0e6]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#233a2d] uppercase tracking-wider">
                      Workload Summary
                    </h3>
                    <p className="text-[11px] text-[#486353]">
                      Automated signal extraction based on current priority checklist &amp; communications
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#d8ebde] text-[#233a2d] border border-[#b3d7bd]">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-[#2d4d3a]" />
                  Analysed
                </span>
              </div>

              {/* 1 to 3 Priority Tasks Workload Summary */}
              <div className="bg-white/80 border border-[#c4dbc8] rounded-xl p-3.5 space-y-2">
                <span className="text-[11px] font-bold text-[#233a2d] uppercase tracking-wider block">
                  Top Priority Focus (1–3 Key Tasks)
                </span>
                <div className="space-y-1.5">
                  {items.filter(i => !i.completed && (i.priority === 'high' || i.priority === 'mid')).slice(0, 3).map((topTask, idx) => (
                    <div key={topTask.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-[#d8ebde]">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="w-4 h-4 rounded-full bg-[#3d604b] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-[#1e2e24] truncate">{topTask.title}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        topTask.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {topTask.priority.toUpperCase()}
                      </span>
                    </div>
                  ))}
                  {items.filter(i => !i.completed && (i.priority === 'high' || i.priority === 'mid')).length === 0 && (
                    <p className="text-xs text-[#52705e] italic">All high and mid priority tasks are currently addressed!</p>
                  )}
                </div>
              </div>

              {/* Recommended Priority Actions & Guidance (Replaces old Urgent/Stakeholder/Process boxes) */}
              {(() => {
                const topFocusTasks = items.filter(i => !i.completed && (i.priority === 'high' || i.priority === 'mid')).slice(0, 3);
                const allHigh = topFocusTasks.length >= 2 && topFocusTasks.every(t => t.priority === 'high');

                return (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between border-b border-[#c4dbc8]/60 pb-2">
                      <span className="text-[11px] font-bold text-[#233a2d] uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#3d604b]" />
                        Recommended Priority Actions &amp; Solutions
                      </span>
                      <span className="text-[10px] text-[#486353] italic">
                        Based on Top Priority Focus
                      </span>
                    </div>

                    {/* High Pressure Workload Advisory when all top tasks are High */}
                    {allHigh && (
                      <div className="bg-amber-500/10 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-[11px] uppercase tracking-wide text-amber-800">
                            High Workload Pressure Advisory
                          </span>
                          <p className="mt-0.5 leading-relaxed text-[11px]">
                            All top priorities are currently flagged <strong>HIGH</strong>. Avoid context-switching. Complete task #1 first, establish clear boundary timelines for remaining requests, and take a 5-minute breather between focus blocks.
                          </p>
                        </div>
                      </div>
                    )}

                    {topFocusTasks.length === 0 ? (
                      <div className="bg-white/80 border border-[#c4dbc8] rounded-xl p-4 text-center text-xs text-[#486353] italic">
                        No active high or mid priority items requiring recommended actions right now.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {topFocusTasks.map((task, idx) => {
                          const action = getRecommendedActionForTask(task);
                          return (
                            <div key={task.id} className="bg-white/90 border border-[#c4dbc8] rounded-xl p-3.5 space-y-2.5 text-xs text-[#1e2e24] shadow-2xs">
                              {/* Task Header */}
                              <div className="flex items-center justify-between border-b border-[#e2ece4] pb-2">
                                <div className="flex items-center space-x-2 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-[#3d604b] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="font-bold text-[#1e2e24] truncate">{task.title}</span>
                                </div>
                                <div className="flex items-center space-x-1.5 shrink-0">
                                  <span className="text-[10px] bg-[#edf4f0] text-[#2e4d3a] px-2 py-0.5 rounded-full font-medium border border-[#c4dbc8]">
                                    {task.type}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    task.priority === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {task.priority.toUpperCase()}
                                  </span>
                                </div>
                              </div>

                              {/* Suggested Reply / Response */}
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-[#3d604b] uppercase tracking-wider block">
                                  Suggested Response / Reply:
                                </span>
                                <p className="bg-[#f7faf8] border border-[#d8ebde] p-2.5 rounded-lg text-xs font-mono text-[#73736c] leading-relaxed">
                                  {action.suggestedReply}
                                </p>
                              </div>

                              {/* Recommended Solution */}
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-[#233a2d] uppercase tracking-wider block">
                                  Recommended Solution &amp; Action Plan:
                                </span>
                                <p className="text-xs text-[#2b3d32] leading-relaxed whitespace-pre-line bg-white/60 p-2 rounded-lg border border-[#e2ece4]">
                                  {action.recommendedSolution}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Safety & Privacy Guidance Disclaimer */}
                    <div className="text-[10px] text-[#3d5a47] bg-[#e3efe6] p-2.5 rounded-lg border border-[#c4dbc8] flex items-start gap-1.5 leading-snug">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#2d4d3a] shrink-0 mt-0.5" />
                      <span>
                        <strong>Privacy &amp; Safety Guidance:</strong> Recommendations strictly uphold message privacy and contain no medical or security advice. For tasks with potential for safety concerns, alarm, or harm, please consult a trusted professional or authority directly.
                      </span>
                    </div>

                    {/* Reset Button */}
                    <div className="pt-2 border-t border-[#c4dbc8] flex justify-end">
                      <button
                        type="button"
                        onClick={handleResetSummary}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-2xs"
                        title="Clear priority list and summary recommendations"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                        <span>Reset Summary & Priority List</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
    </div>
  );
};
