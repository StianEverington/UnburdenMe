/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TextReplacerBar } from './TextReplacerBar';
import {
  FileText,
  Sparkles,
  Copy,
  Scissors,
  Trash2,
  Bookmark,
  BookmarkCheck,
  Check,
  RefreshCw,
  Mail,
  FileSpreadsheet,
  Users,
  MessageSquare,
  Clock,
  ListChecks,
  AlertCircle,
  FolderArchive,
  ArrowRight,
  ShieldCheck,
  Layers,
  CheckCircle2,
  SlidersHorizontal,
  Share2,
  UploadCloud,
  Paperclip,
  X
} from 'lucide-react';
import { MicroSummaryContentType, MicroSummaryOutcome, MicroSummaryResult } from '../types';
import { checkForbiddenLanguage, FORBIDDEN_LANGUAGE_REJECTION_MESSAGE } from '../utils/moderation';
import { recordPreference, getMostFrequentPreference } from '../utils/preferenceTracker';

const SAMPLE_EMAIL_THREAD = `Subject: RE: Q3 Product Strategy & Resource Re-allocation - Urgent Review
From: Sarah Jenkins (VP Product) <s.jenkins@acme.corp>
To: Alex Chen, Marcus Vance, Engineering Lead Team

Hi Alex & Marcus,

Following up on yesterday's executive review meeting regarding our Q3 roadmap and resource capacity. 

As discussed, the launch of the Enterprise Security Module is currently blocked due to backend API dependencies and pending compliance audits. After reviewing the workload metrics with HR and engineering leads, we need to make several tactical adjustments:

1. We are officially pausing the Mobile App Redesign project until Q4 to reassign 3 senior backend engineers to the Enterprise Security team.
2. Marcus will lead the compliance audit remediation and must submit the final security assessment document by Thursday, August 13th at 5:00 PM.
3. Alex needs to schedule a sync with the client success team by tomorrow morning (10:00 AM) to communicate the adjusted timeline for the mobile release.

Decisions agreed upon during the call:
- Budget approval for external penetration testing has been granted ($15,000 max).
- Weekly status calls are reduced from 1 hour to 15-minute async Slack updates to preserve focus time.

Please review the revised timelines and reply to confirm your action items before EOD.

Best regards,
Sarah Jenkins`;

const SAMPLE_MEETING_NOTES = `Executive Operations & Project Sync - August 10, 2026
Attendees: Marcus Vance, Priya Patel, David Ross, Lisa Wong

Meeting Objective: Resolve operational bottlenecks across regional customer onboarding.

Key Discussion Points:
- Current customer onboarding completion time has increased from 4 days to 11 days due to manual document verification.
- Priya presented an automated document processing workflow using AI classification which reduces manual overhead by 70%.
- David raised concerns about data privacy and requested an immediate legal review before pilot deployment.

Agreed Decisions:
1. Approved pilot testing of the AI document workflow for the EMEA region starting next Monday.
2. Legal compliance review must be finalized by Friday at 3:00 PM.
3. Lisa will pause non-critical bug triage for 2 days to support the EMEA pilot setup.

Deadlines & Next Steps:
- Legal review sign-off due: Friday 3:00 PM (David)
- EMEA pilot deployment: Next Monday 9:00 AM (Priya & Lisa)
- Post-pilot review meeting: August 24th at 2:00 PM`;

const SAMPLE_REPORT = `Quarterly Workload & Productivity Impact Assessment Report (Q2 2026)
Prepared by: Organisational Effectiveness Team

Executive Summary:
An internal audit across 340 staff members revealed that context switching and unstructured communication channels (unfiltered chat pings and back-to-back meeting invites) account for a 38% drop in deep focus time. Average daily unread message counts exceed 60 items per employee, creating significant cognitive overload.

Key Recommendations & Policy Decisions:
- Implement 'Focus Windows' across all departments between 9:00 AM - 11:30 AM with zero internal meetings permitted.
- Mandate structured asynchronous communication protocols for non-urgent requests.
- Limit all routine status updates to 15-minute standing syncs or written bullet points.

Action Items:
1. HR to distribute the updated Async Communication Guidelines document to all department heads by August 18th.
2. IT to configure default calendar blockouts for focus windows across company accounts by August 22nd.
3. Department leads to review team meeting schedules and reduce total weekly meeting hours by 25%.`;

export const MicroSummaryWidget: React.FC = () => {
  // Active sub-tab state: 'create' | 'saved'
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'saved'>('create');

  // Input form state
  const [contentType, setContentType] = useState<MicroSummaryContentType>(
    () => (getMostFrequentPreference('type', 'Email Thread') as MicroSummaryContentType)
  );
  const [summaryOutcome, setSummaryOutcome] = useState<MicroSummaryOutcome>(
    () => (getMostFrequentPreference('summary_length', 'Bullet Points') as MicroSummaryOutcome)
  );
  const [inputText, setInputText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Document Upload State
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    wordCount: number;
  } | null>(null);
  const [isExtractingFile, setIsExtractingFile] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Active / Recent Summaries List
  const [activeSummaries, setActiveSummaries] = useState<MicroSummaryResult[]>(() => {
    try {
      const stored = localStorage.getItem('unburdenme_active_summaries');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Saved Summaries List
  const [savedSummaries, setSavedSummaries] = useState<MicroSummaryResult[]>(() => {
    try {
      const stored = localStorage.getItem('unburdenme_saved_summaries');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Toast notification state
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('unburdenme_active_summaries', JSON.stringify(activeSummaries));
    } catch (e) {
      console.warn('Failed to save active summaries', e);
    }
  }, [activeSummaries]);

  useEffect(() => {
    try {
      localStorage.setItem('unburdenme_saved_summaries', JSON.stringify(savedSummaries));
    } catch (e) {
      console.warn('Failed to save saved summaries', e);
    }
  }, [savedSummaries]);

  // Show temporary toast message
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Load sample content
  const handleLoadSample = (type: MicroSummaryContentType) => {
    setUploadedFile(null);
    setContentType(type);
    if (type === 'Email Thread') setInputText(SAMPLE_EMAIL_THREAD);
    else if (type === 'Meeting Notes') setInputText(SAMPLE_MEETING_NOTES);
    else if (type === 'Report / Document') setInputText(SAMPLE_REPORT);
    else setInputText(SAMPLE_EMAIL_THREAD);
  };

  // Extract text from attached document file
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsExtractingFile(true);
    setErrorMsg(null);

    try {
      let extractedText = '';
      const fileType = file.name.split('.').pop()?.toLowerCase() || '';

      if (['txt', 'md', 'csv', 'json', 'rtf', 'html', 'xml', 'eml', 'log', 'tsv'].includes(fileType)) {
        extractedText = await file.text();
      } else {
        // Handle docx / pdf / binary fallback text extraction
        try {
          const arrayBuffer = await file.arrayBuffer();
          const decoder = new TextDecoder('utf-8', { fatal: false });
          const raw = decoder.decode(arrayBuffer);

          if (fileType === 'docx' || fileType === 'doc') {
            const matches = raw.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
            if (matches && matches.length > 0) {
              extractedText = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
            }
          }

          if (!extractedText) {
            extractedText = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          }
        } catch {
          extractedText = await file.text();
        }
      }

      if (!extractedText || extractedText.trim().length < 5) {
        throw new Error('Could not extract readable text from this file. Please paste or upload a plain text or document file.');
      }

      const wordCount = extractedText.trim().split(/\s+/).filter(Boolean).length;

      setInputText(extractedText);
      setUploadedFile({
        name: file.name,
        size: file.size,
        wordCount: wordCount
      });

      // Auto-update content type if natural match
      if (['doc', 'docx', 'pdf', 'rtf', 'txt', 'md'].includes(fileType)) {
        setContentType('Report / Document');
      } else if (['eml', 'msg'].includes(fileType)) {
        setContentType('Email Thread');
      }

      triggerToast(`Document "${file.name}" uploaded successfully! (${wordCount} words extracted)`);
    } catch (err: any) {
      console.error('File extraction error:', err);
      setErrorMsg(err.message || 'Failed to read document file.');
    } finally {
      setIsExtractingFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Generate Micro Summary
  const handleGenerateSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) {
      setErrorMsg('Please paste or type content to summarise.');
      return;
    }

    // Moderate input for forbidden language
    const modCheck = checkForbiddenLanguage(trimmed);
    if (modCheck.isForbidden) {
      setErrorMsg(modCheck.reason || FORBIDDEN_LANGUAGE_REJECTION_MESSAGE);
      return;
    }

    // Record preference
    recordPreference('summary_length', summaryOutcome);
    recordPreference('type', contentType);

    setErrorMsg(null);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/summary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: inputText,
          contentType: contentType,
          summaryOutcome: summaryOutcome
        })
      });

      if (!res.ok) {
        throw new Error('Server returned error during summary generation.');
      }

      const data: MicroSummaryResult = await res.json();
      setActiveSummaries(prev => [data, ...prev]);
      triggerToast('Micro summary generated successfully!');
      // Scroll to new result
      window.scrollTo({ top: 400, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Failed to generate micro summary:', err);
      setErrorMsg('Could not generate summary. Please check your network and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Format full summary text for clipboard copying
  const formatSummaryForClipboard = (summary: MicroSummaryResult) => {
    return `📌 ${summary.title.toUpperCase()} (${summary.contentType}${summary.summaryOutcome ? ` • ${summary.summaryOutcome}` : ''})
--------------------------------------------------
${summary.summaryParagraph ? `NARRATIVE OVERVIEW:\n${summary.summaryParagraph}\n\n` : ''}KEY SUMMARY (3-5 BULLET POINTS):
${summary.bulletPoints.map(b => `• ${b}`).join('\n')}

✅ ACTION ITEMS:
${summary.actionItems.length > 0 ? summary.actionItems.map(a => `• ${a}`).join('\n') : '• None identified'}

🎯 DECISIONS MADE:
${summary.decisions.length > 0 ? summary.decisions.map(d => `• ${d}`).join('\n') : '• None explicitly stated'}

⏰ DEADLINES & TIMELINES:
${summary.deadlines.length > 0 ? summary.deadlines.map(dl => `• ${dl}`).join('\n') : '• No explicit deadlines specified'}
--------------------------------------------------
Digested via UnburdenMe Micro Summariser`;
  };

  // Copy / Cut to Clipboard
  const handleCopySummary = async (summary: MicroSummaryResult, actionType: 'copy' | 'cut') => {
    const textToCopy = formatSummaryForClipboard(summary);
    try {
      await navigator.clipboard.writeText(textToCopy);
      triggerToast(actionType === 'cut' ? 'Summary cut & copied to clipboard!' : 'Summary copied to clipboard!');
      if (actionType === 'cut') {
        handleDeleteActive(summary.id);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
      triggerToast('Copied text to clipboard!');
    }
  };

  // Toggle Save Summary
  const handleToggleSaveSummary = (summary: MicroSummaryResult) => {
    const isAlreadySaved = savedSummaries.some(s => s.id === summary.id);

    if (isAlreadySaved) {
      setSavedSummaries(prev => prev.filter(s => s.id !== summary.id));
      setActiveSummaries(prev => prev.map(s => s.id === summary.id ? { ...s, isSaved: false } : s));
      triggerToast('Removed from Saved Summaries.');
    } else {
      const updatedSummary = { ...summary, isSaved: true };
      setSavedSummaries(prev => [updatedSummary, ...prev]);
      setActiveSummaries(prev => prev.map(s => s.id === summary.id ? { ...s, isSaved: true } : s));
      triggerToast('Saved to "Saved Summaries" sub-tab!');
    }
  };

  // Delete Active Summary
  const handleDeleteActive = (id: string) => {
    setActiveSummaries(prev => prev.filter(s => s.id !== id));
    triggerToast('Summary deleted.');
  };

  // Delete Saved Summary
  const handleDeleteSaved = (id: string) => {
    setSavedSummaries(prev => prev.filter(s => s.id !== id));
    setActiveSummaries(prev => prev.map(s => s.id === id ? { ...s, isSaved: false } : s));
    triggerToast('Removed from saved list.');
  };

  // Render a Single Summary Card
  const renderSummaryCard = (summary: MicroSummaryResult, isSavedView: boolean = false) => {
    const isSaved = savedSummaries.some(s => s.id === summary.id);
    const timeFormatted = new Date(summary.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <div
        key={summary.id}
        className="bg-white border border-[#e8e7df] rounded-2xl p-5 shadow-xs space-y-4 transition-all hover:border-[#d5d4cb]"
      >
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#e8e7df] pb-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#f1f0e8] text-[#5a5a40] border border-[#e8e7df]">
                {summary.contentType}
              </span>
              {summary.summaryOutcome && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                  {summary.summaryOutcome}
                </span>
              )}
              <span className="text-[11px] text-[#7a7a70] font-mono">{timeFormatted}</span>
            </div>
            <h4 className="text-base font-bold text-[#1a1a15] tracking-tight">{summary.title}</h4>
          </div>

          <div className="flex items-center space-x-1.5 self-end sm:self-center">
            {summary.originalWordCount > 0 && (
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Reduced {summary.originalWordCount} → {summary.summaryWordCount} words
              </span>
            )}
          </div>
        </div>

        {/* Narrative Paragraph Overview (if available or if outcome is Written Summary Paragraph) */}
        {summary.summaryParagraph && (
          <div className="bg-[#fcfbf9] border border-[#e8e7df] rounded-xl p-3.5 space-y-1 text-xs text-[#3a3a34]">
            <h5 className="font-bold text-[#5a5a40] uppercase tracking-wider text-[10px] flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Narrative Summary Overview</span>
            </h5>
            <p className="leading-relaxed text-[#1a1a15] font-medium">{summary.summaryParagraph}</p>
          </div>
        )}

        {/* Card Body: 4 Structured Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Section 1: 3-5 Bullet Points Summary */}
          <div className="bg-[#fcfbf9] border border-[#e8e7df] rounded-xl p-3.5 space-y-2">
            <h5 className="font-bold text-[#5a5a40] uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <ListChecks className="w-3.5 h-3.5 text-amber-600" />
              <span>Key Summary (3–5 Bullet Points)</span>
            </h5>
            <ul className="space-y-1.5 text-[#3a3a34]">
              {summary.bulletPoints.map((bullet, idx) => (
                <li key={idx} className="flex items-start space-x-2 leading-relaxed">
                  <span className="text-[#5a5a40] font-bold shrink-0">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 2: Action Items */}
          <div className="bg-[#fcfbf9] border border-[#e8e7df] rounded-xl p-3.5 space-y-2">
            <h5 className="font-bold text-[#5a5a40] uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Action Items</span>
            </h5>
            {summary.actionItems.length > 0 ? (
              <ul className="space-y-1.5 text-[#3a3a34]">
                {summary.actionItems.map((action, idx) => (
                  <li key={idx} className="flex items-start space-x-2 leading-relaxed">
                    <span className="text-emerald-600 font-bold shrink-0">✓</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[#7a7a70] italic">No immediate action items identified.</p>
            )}
          </div>

          {/* Section 3: Decisions Made */}
          <div className="bg-[#fcfbf9] border border-[#e8e7df] rounded-xl p-3.5 space-y-2">
            <h5 className="font-bold text-[#5a5a40] uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Decisions Made</span>
            </h5>
            {summary.decisions.length > 0 ? (
              <ul className="space-y-1.5 text-[#3a3a34]">
                {summary.decisions.map((decision, idx) => (
                  <li key={idx} className="flex items-start space-x-2 leading-relaxed">
                    <span className="text-blue-600 font-bold shrink-0">🎯</span>
                    <span>{decision}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[#7a7a70] italic">No explicit decisions recorded.</p>
            )}
          </div>

          {/* Section 4: Deadlines & Timelines */}
          <div className="bg-[#fcfbf9] border border-[#e8e7df] rounded-xl p-3.5 space-y-2">
            <h5 className="font-bold text-[#5a5a40] uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-600" />
              <span>Deadlines & Timelines</span>
            </h5>
            {summary.deadlines.length > 0 ? (
              <ul className="space-y-1.5 text-[#3a3a34]">
                {summary.deadlines.map((dl, idx) => (
                  <li key={idx} className="flex items-start space-x-2 leading-relaxed font-medium">
                    <span className="text-rose-600 shrink-0">⏰</span>
                    <span>{dl}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[#7a7a70] italic">No explicit deadlines specified.</p>
            )}
          </div>
        </div>

        {/* Card Footer Action Bar: Cut, Copy, Save, Delete */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#e8e7df] text-xs">
          <div className="flex items-center space-x-2">
            {/* Copy Button */}
            <button
              onClick={() => handleCopySummary(summary, 'copy')}
              className="px-3 py-1.5 bg-[#f1f0e8] hover:bg-[#e8e7df] text-[#3a3a34] rounded-lg font-bold flex items-center space-x-1.5 transition-colors border border-[#e8e7df]"
              title="Copy summary text to clipboard"
            >
              <Copy className="w-3.5 h-3.5 text-[#5a5a40]" />
              <span>Copy</span>
            </button>

            {/* Cut Button */}
            <button
              onClick={() => handleCopySummary(summary, 'cut')}
              className="px-3 py-1.5 bg-[#f1f0e8] hover:bg-[#e8e7df] text-[#3a3a34] rounded-lg font-bold flex items-center space-x-1.5 transition-colors border border-[#e8e7df]"
              title="Copy summary and remove from recent list"
            >
              <Scissors className="w-3.5 h-3.5 text-[#5a5a40]" />
              <span>Cut & Copy</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Save Button */}
            <button
              onClick={() => handleToggleSaveSummary(summary)}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition-all border ${
                isSaved
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-[#5a5a40] text-white border-[#5a5a40] hover:bg-[#3f3f2d]'
              }`}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Saved in Sub-tab</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Save Summary</span>
                </>
              )}
            </button>

            {/* Delete Button */}
            <button
              onClick={() => isSavedView ? handleDeleteSaved(summary.id) : handleDeleteActive(summary.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete summary card"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-[#e8e7df] rounded-[32px] p-6 shadow-sm space-y-6 relative">
      {/* Toast Floating Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1a1a15] text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg border border-[#3a3a34] flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Section Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#e8e7df] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-[#5a5a40]" />
            <h2 className="text-base font-bold text-[#1a1a15] tracking-tight">Micro Summariser Engine</h2>
          </div>
          <p className="text-xs text-[#7a7a70] mt-0.5">
            Digests high-volume emails, message threads, written reports, documents, and meeting notes into clear 3–5 point executive summaries, action items, decisions, and deadlines.
          </p>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center space-x-1 bg-[#f1f0e8] p-1 rounded-2xl border border-[#e8e7df] text-xs font-medium">
          <button
            onClick={() => setActiveSubTab('create')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 ${
              activeSubTab === 'create'
                ? 'bg-[#5a5a40] text-white font-semibold shadow-xs'
                : 'text-[#7a7a70] hover:text-[#1a1a15]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#d97706]" />
            <span>Create & Recent</span>
            {activeSummaries.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px]">
                {activeSummaries.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('saved')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 ${
              activeSubTab === 'saved'
                ? 'bg-[#5a5a40] text-white font-semibold shadow-xs'
                : 'text-[#7a7a70] hover:text-[#1a1a15]'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5 text-amber-500" />
            <span>Saved Summaries</span>
            {savedSummaries.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-600 text-white rounded-full text-[10px] font-bold">
                {savedSummaries.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: CREATE & RECENT SUMMARIES */}
      {activeSubTab === 'create' && (
        <div className="space-y-6">
          {/* Input Request Form */}
          <form onSubmit={handleGenerateSummary} className="bg-[#fcfbf9] border border-[#e8e7df] rounded-2xl p-5 space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[#5a5a40] uppercase tracking-wider flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-[#5a5a40]" />
                <span>Select Content Type to Summarise</span>
              </span>

              {/* Content Type Selector Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-medium pt-1">
                <button
                  type="button"
                  onClick={() => setContentType('Email Thread')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center space-x-2 transition-all ${
                    contentType === 'Email Thread'
                      ? 'bg-[#5a5a40] text-white border-[#5a5a40] font-bold shadow-xs'
                      : 'bg-[#ffffff] text-[#3a3a34] border-[#e8e7df] hover:bg-[#f1f0e8]'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email or Thread</span>
                </button>

                <button
                  type="button"
                  onClick={() => setContentType('Report / Document')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center space-x-2 transition-all ${
                    contentType === 'Report / Document'
                      ? 'bg-[#5a5a40] text-white border-[#5a5a40] font-bold shadow-xs'
                      : 'bg-[#ffffff] text-[#3a3a34] border-[#e8e7df] hover:bg-[#f1f0e8]'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Written Report / Doc</span>
                </button>

                <button
                  type="button"
                  onClick={() => setContentType('Meeting Notes')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center space-x-2 transition-all ${
                    contentType === 'Meeting Notes'
                      ? 'bg-[#5a5a40] text-white border-[#5a5a40] font-bold shadow-xs'
                      : 'bg-[#ffffff] text-[#3a3a34] border-[#e8e7df] hover:bg-[#f1f0e8]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Meeting Notes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setContentType('Message Chain')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center space-x-2 transition-all ${
                    contentType === 'Message Chain'
                      ? 'bg-[#5a5a40] text-white border-[#5a5a40] font-bold shadow-xs'
                      : 'bg-[#ffffff] text-[#3a3a34] border-[#e8e7df] hover:bg-[#f1f0e8]'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Message Chain</span>
                </button>
              </div>
            </div>

            {/* Select Desired Summary Outcome */}
            <div className="space-y-1 pt-1 border-t border-[#e8e7df]">
              <span className="text-xs font-bold text-[#5a5a40] uppercase tracking-wider flex items-center space-x-1.5 pt-1">
                <SlidersHorizontal className="w-4 h-4 text-[#5a5a40]" />
                <span>Select Desired Summary Outcome</span>
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-medium pt-1">
                <button
                  type="button"
                  onClick={() => setSummaryOutcome('Bullet Points')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center space-x-2 transition-all ${
                    summaryOutcome === 'Bullet Points'
                      ? 'bg-[#5a5a40] text-white border-[#5a5a40] font-bold shadow-xs'
                      : 'bg-[#ffffff] text-[#3a3a34] border-[#e8e7df] hover:bg-[#f1f0e8]'
                  }`}
                >
                  <ListChecks className="w-3.5 h-3.5 text-amber-500" />
                  <span>Bullet Points</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSummaryOutcome('Written Summary Paragraph')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center space-x-2 transition-all ${
                    summaryOutcome === 'Written Summary Paragraph'
                      ? 'bg-[#5a5a40] text-white border-[#5a5a40] font-bold shadow-xs'
                      : 'bg-[#ffffff] text-[#3a3a34] border-[#e8e7df] hover:bg-[#f1f0e8]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>Written Paragraph</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSummaryOutcome('Checklist')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center space-x-2 transition-all ${
                    summaryOutcome === 'Checklist'
                      ? 'bg-[#5a5a40] text-white border-[#5a5a40] font-bold shadow-xs'
                      : 'bg-[#ffffff] text-[#3a3a34] border-[#e8e7df] hover:bg-[#f1f0e8]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Checklist</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSummaryOutcome('Full Structured Digest')}
                  className={`p-2.5 rounded-xl border flex items-center justify-center space-x-2 transition-all ${
                    summaryOutcome === 'Full Structured Digest'
                      ? 'bg-[#5a5a40] text-white border-[#5a5a40] font-bold shadow-xs'
                      : 'bg-[#ffffff] text-[#3a3a34] border-[#e8e7df] hover:bg-[#f1f0e8]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-purple-500" />
                  <span>Full Structured Digest</span>
                </button>
              </div>
            </div>

            {/* Input Content Section with File Upload & Textarea */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-[#e8e7df]">
                <span className="text-xs font-bold text-[#5a5a40] uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-[#5a5a40]" />
                  <span>Paste Text or Attach Document</span>
                </span>

                {/* Upload File / Attach Document Control */}
                <label
                  htmlFor="micro-summary-doc-upload"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#ffffff] hover:bg-[#5a5a40] text-[#5a5a40] hover:text-white rounded-xl text-xs font-semibold border border-[#d8d6c8] cursor-pointer transition-all shadow-2xs active:scale-95"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Attach Document File</span>
                  <input
                    id="micro-summary-doc-upload"
                    type="file"
                    className="hidden"
                    accept=".txt,.md,.pdf,.doc,.docx,.rtf,.csv,.json,.eml,.msg,.log"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>

              {/* Active Uploaded File Status Bar */}
              {uploadedFile && (
                <div className="bg-[#f0f7f2] border border-[#b8dbc1] rounded-xl p-3 flex items-center justify-between text-xs text-[#1e3827] shadow-2xs animate-in fade-in duration-200">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#3d604b] text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <FileText className="w-4 h-4 text-[#e2f0e6]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold truncate text-[#13261a]">{uploadedFile.name}</span>
                        <span className="px-2 py-0.2 bg-[#d6ebdc] text-[#13261a] rounded-full text-[10px] font-semibold border border-[#b8dbc1]">
                          {(uploadedFile.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <p className="text-[11px] text-[#42614b] mt-0.5">
                        ✓ {uploadedFile.wordCount} words extracted • Will summarise into <strong>{summaryOutcome}</strong> format
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFile(null);
                      setInputText('');
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-2 shrink-0 cursor-pointer"
                    title="Remove attached document file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* File Extraction Progress State */}
              {isExtractingFile && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center space-x-2 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                  <span>Extracting and processing document contents...</span>
                </div>
              )}

              {/* Text Area Dropzone Wrapper */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative rounded-xl transition-all ${
                  isDragging
                    ? 'ring-2 ring-[#5a5a40] bg-amber-50/50 border-dashed border-[#5a5a40]'
                    : ''
                }`}
              >
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Paste your ${contentType.toLowerCase()} text here, or drag and drop a file (.txt, .docx, .pdf, .md, .eml)...`}
                  rows={6}
                  className="w-full p-3.5 rounded-xl border border-[#e8e7df] bg-[#ffffff] text-xs font-mono text-[#1a1a15] focus:outline-none focus:ring-2 focus:ring-[#5a5a40] leading-relaxed placeholder:text-[#a1a19a]"
                />

                {isDragging && (
                  <div className="absolute inset-0 bg-[#5a5a40]/10 backdrop-blur-[1px] rounded-xl flex items-center justify-center pointer-events-none border-2 border-dashed border-[#5a5a40]">
                    <div className="bg-white px-4 py-2 rounded-xl shadow-lg border border-[#5a5a40] flex items-center space-x-2 text-xs font-bold text-[#5a5a40]">
                      <UploadCloud className="w-4 h-4 text-[#d97706]" />
                      <span>Drop document here to extract text</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Text Replacer Bar */}
              <TextReplacerBar
                textValue={inputText}
                onUpdateText={setInputText}
              />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-[#7a7a70] pt-1 border-t border-[#e8e7df]">
                <div className="flex items-center space-x-1.5">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                    Privacy
                  </span>
                  <span>Processed on-demand • Zero background scanning or inbox reading</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span>
                    {inputText ? `${inputText.split(/\s+/).filter(Boolean).length} words` : '0 words'}
                  </span>
                  {inputText && (
                    <button
                      type="button"
                      onClick={() => {
                        setInputText('');
                        setUploadedFile(null);
                      }}
                      className="text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                    >
                      Clear Content
                    </button>
                  )}
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Submit Button */}
            <button
              type="submit"
              disabled={isGenerating || !inputText.trim()}
              className="w-full py-3 bg-[#5a5a40] hover:bg-[#3f3f2d] text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-xs disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Summarising content...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#d97706]" />
                  <span>Summarise content</span>
                </>
              )}
            </button>
          </form>

          {/* Generated Micro Summaries List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#e8e7df] pb-2">
              <h3 className="text-xs font-bold text-[#5a5a40] uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-[#5a5a40]" />
                <span>Generated Micro Summaries ({activeSummaries.length})</span>
              </h3>
              <span className="text-[11px] text-[#7a7a70]">
                Click 'Save Summary' to store in sub-tab
              </span>
            </div>

            {activeSummaries.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#a1a19a] bg-[#fcfbf9] border border-dashed border-[#e8e7df] rounded-2xl p-6 space-y-2">
                <FileText className="w-8 h-8 text-[#d5d4cb] mx-auto" />
                <p className="font-medium text-[#5a5a40]">No micro summaries generated yet.</p>
                <p className="max-w-md mx-auto text-[#7a7a70]">
                  Paste an email thread, document report, or meeting notes above and tap "Summarise Content via Gemini" to extract key bullets, action items, decisions, and deadlines.
                </p>
              </div>
            ) : (
              activeSummaries.map((summary) => renderSummaryCard(summary, false))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SAVED SUMMARIES */}
      {activeSubTab === 'saved' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#e8e7df] pb-2">
            <h3 className="text-xs font-bold text-[#5a5a40] uppercase tracking-wider flex items-center space-x-1.5">
              <FolderArchive className="w-4 h-4 text-amber-600" />
              <span>Stored & Saved Summaries ({savedSummaries.length})</span>
            </h3>
            <span className="text-[11px] text-[#7a7a70]">
              Stored locally for quick reference & cut/copying
            </span>
          </div>

          {savedSummaries.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#a1a19a] bg-[#fcfbf9] border border-dashed border-[#e8e7df] rounded-2xl p-6 space-y-2">
              <Bookmark className="w-8 h-8 text-[#d5d4cb] mx-auto" />
              <p className="font-medium text-[#5a5a40]">Your saved summaries store is empty.</p>
              <p className="max-w-md mx-auto text-[#7a7a70]">
                When you generate a micro summary, tap "Save Summary" to store it here for future reference and copying.
              </p>
              <button
                onClick={() => setActiveSubTab('create')}
                className="mt-2 px-3 py-1.5 bg-[#5a5a40] text-white rounded-lg font-bold text-xs inline-flex items-center space-x-1"
              >
                <span>Go to Generator</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            savedSummaries.map((summary) => renderSummaryCard(summary, true))
          )}
        </div>
      )}
    </div>
  );
};
