/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PresetPicker } from './components/PresetPicker';
import { ScenarioForm, DEFAULT_SCENARIO_TEXT } from './components/ScenarioForm';
import { TriageResultsView } from './components/TriageResultsView';
import { DataDigestWidget } from './components/DataDigestWidget';
import { IntegratedCalendar } from './components/IntegratedCalendar';
import { MicroSummaryWidget } from './components/MicroSummaryWidget';
import { ProblemSolverWidget } from './components/ProblemSolverWidget';
import { PrepToolWidget } from './components/PrepToolWidget';
import { SavedHistoryDrawer } from './components/SavedHistoryDrawer';
import { ResetPromptBanner } from './components/ResetPromptBanner';
import { OneMinuteResetModal } from './components/OneMinuteResetModal';
import { ResetSettingsModal } from './components/ResetSettingsModal';
import { UDDIPrivacyModal } from './components/UDDIPrivacyModal';
import { NotificationToastBanner } from './components/NotificationToastBanner';
import { PRESET_SCENARIOS, PresetScenario } from './lib/constants';
import { FullTriagePayload, FullTriageResult, SavedTriageItem, ResetPromptSettings } from './types';
import { Compass, RefreshCw } from 'lucide-react';

export default function App() {
  const [contextMode, setContextMode] = useState<'work' | 'personal' | 'hybrid'>('work');
  const [activeTab, setActiveTab] = useState<'co-pilot' | 'priorities' | 'schedule' | 'micro-summary' | 'problem-solver' | 'prep-tool'>('co-pilot');
  const [selectedPreset, setSelectedPreset] = useState<PresetScenario | null>(null);
  const [prepToolInitialTitle, setPrepToolInitialTitle] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<FullTriageResult | null>(null);
  const [currentScenarioText, setCurrentScenarioText] = useState<string>(DEFAULT_SCENARIO_TEXT);
  const [currentChannel, setCurrentChannel] = useState<string>('Email');
  const [currentTone, setCurrentTone] = useState<string>('Assertive');

  // Reset Prompt Settings & Modals State
  const [resetSettings, setResetSettings] = useState<ResetPromptSettings>(() => {
    try {
      const stored = localStorage.getItem('unburdenme_reset_settings');
      return stored ? JSON.parse(stored) : {
        proactivity: 'gentle',
        autoDetectHighVolume: true,
        silencedUntil: null
      };
    } catch {
      return { proactivity: 'gentle', autoDetectHighVolume: true, silencedUntil: null };
    }
  });

  const [isOneMinuteResetOpen, setIsOneMinuteResetOpen] = useState<boolean>(false);
  const [isResetSettingsOpen, setIsResetSettingsOpen] = useState<boolean>(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
  const [forceShowResetPrompt, setForceShowResetPrompt] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('unburdenme_reset_settings', JSON.stringify(resetSettings));
    } catch (e) {
      console.warn('Failed to save reset settings', e);
    }
  }, [resetSettings]);

  // Saved Choices History
  const [savedItems, setSavedItems] = useState<SavedTriageItem[]>(() => {
    try {
      const stored = localStorage.getItem('unburdenme_saved_history') || localStorage.getItem('triage_engine_saved_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Save history to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('unburdenme_saved_history', JSON.stringify(savedItems));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }, [savedItems]);

  // Helper function to fetch with retry for transient server connection issues
  const fetchWithRetry = async (url: string, options: RequestInit, retries = 2, delay = 300): Promise<Response> => {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 2);
      }
      throw err;
    }
  };

  // Execute Triage Request
  const handleExecuteTriage = async (payload: FullTriagePayload) => {
    setIsLoading(true);
    setCurrentScenarioText(payload.user_input);
    if (payload.channel) setCurrentChannel(payload.channel);
    if (payload.desired_tone) setCurrentTone(payload.desired_tone);

    try {
      const res = await fetchWithRetry('/api/triage/full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data && (data.classification || data.raw_llm_response)) {
        setCurrentResult(data);
      } else {
        // Fallback default result if server response was malformed or errored
        setCurrentResult({
          classification: {
            category: 'STANDARD_WORKLOAD',
            requires_human_disclaimer: false,
            reason: 'Default fallback response'
          },
          grounding: {
            grounding_sentence: 'You cannot expand the working hours today, but you can choose the top priority deliverable to focus on.',
            word_count: 17
          },
          raw_llm_response: `### 1. BRIEF SYNOPSIS\nA request for immediate deliverables directly conflicts with scheduled commitments, requiring clear boundary setting and scope or timeline realignment.\n\n---\n\n### 2. ACTIONABLE OPTIONS\n* **Option A: Phased Delivery Counter-Offer** - Deliver core items first.\n* **Option B: Priority & Calendar Realignment** - Reschedule routine meetings to create focus time.\n* **Option C: Executive Summary First** - Provide a high-level summary initially.\n\n---\n\n### 3. EDITABLE DRAFTS\n#### Draft for Option A: Phased Delivery Counter-Offer\n\`\`\`text\nHi [Name],\n\nI received your request regarding the deliverable. Due to back-to-back commitments on my schedule today, I will not have sufficient focus time to complete a full draft by the initial deadline.\n\nI can deliver the complete output to you by tomorrow afternoon instead. Please let me know if this adjusted timeline works for your schedule.\n\`\`\`\n\n#### Draft for Option B: Priority & Calendar Realignment\n\`\`\`text\nHi [Name],\n\nI saw your request for the deliverable. I currently have consecutive commitments scheduled across that time window.\n\nIn order to meet this deadline today, I would need to reschedule our upcoming meeting to create dedicated focus time. Would you prefer I adjust that commitment, or shift the deliverable deadline?\n\`\`\`\n\n---\n\n### 4. CONSIDERATION / HUMAN CHECK\n#### Recommended Next Steps:\n1. Review your current schedule to identify any immediate conflict with this request.\n2. Select and edit the draft option that best matches your preferred timeline and boundary.\n3. Send or deliver your chosen response to establish clear expectations promptly.\n\n* **Focus Reminder** Whichever option you choose, remember to ensure it is the exact response you would like and give yourself time to relax`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.warn('Network issue during triage fetch, applying offline fallback state:', error);
      setCurrentResult({
        classification: {
          category: 'STANDARD_WORKLOAD',
          requires_human_disclaimer: false
        },
        grounding: {
          grounding_sentence: 'Focus on your immediate locus of control and define your top deliverable first.',
          word_count: 14
        },
        raw_llm_response: `### 1. BRIEF SYNOPSIS\nA request for immediate deliverables conflicts with scheduled commitments.\n\n### 2. ACTIONABLE OPTIONS\n* **Option A: Phased Delivery Counter-Offer**\n* **Option B: Priority & Calendar Realignment**\n\n### 3. EDITABLE DRAFTS\n#### Draft for Option A: Phased Delivery Counter-Offer\n\`\`\`text\nHi [Name],\n\nDue to scheduled commitments today, I will deliver the complete output to you by tomorrow afternoon instead.\n\`\`\``,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  // On initial mount, keep the main workspace clean and blank until the user submits a request
  useEffect(() => {
    // Intentionally left blank for initial clean slate
  }, []);

  const handleSelectPreset = (preset: PresetScenario) => {
    if (selectedPreset?.id === preset.id) {
      // Toggle off / deselect preset -> revert to grey default scenario text
      setSelectedPreset(null);
      setContextMode('work');
      setCurrentScenarioText(DEFAULT_SCENARIO_TEXT);
      setCurrentChannel('Email');

      handleExecuteTriage({
        user_input: DEFAULT_SCENARIO_TEXT,
        instruction: 'Respond to this message',
        channel: 'Email',
        context_type: 'work',
        desired_tone: 'Assertive',
        metadata: {
          calendar_events_count: 5,
          unread_email_count: 20,
          top_email_subject_lines: [
            'URGENT: Deliverable deadline confirmation',
            'Calendar synchronisation request'
          ],
          context_type: 'work'
        }
      });
    } else {
      // Select preset
      setSelectedPreset(preset);
      setContextMode(preset.category);
      setCurrentScenarioText(preset.scenario_text);
      setCurrentChannel(preset.channel);

      handleExecuteTriage({
        user_input: preset.scenario_text,
        instruction: preset.instruction || 'Respond to this message',
        channel: preset.channel,
        context_type: preset.category,
        desired_tone: 'Assertive',
        metadata: preset.metadata
      });
    }
  };

  const handleClearScenario = () => {
    setSelectedPreset(null);
    setCurrentScenarioText(DEFAULT_SCENARIO_TEXT);
    setCurrentResult(null);
  };

  const handleSaveChoice = (item: SavedTriageItem) => {
    setSavedItems(prev => [item, ...prev]);
  };

  const handleClearHistory = () => {
    setSavedItems([]);
  };

  const handleDeleteSingleSaved = (id: string) => {
    setSavedItems(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 font-sans flex flex-col selection:bg-slate-900 selection:text-white">
      {/* Header */}
      <Header
        savedCount={savedItems.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenResetSettings={() => setIsResetSettingsOpen(true)}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
        activeTab={activeTab as any}
        setActiveTab={setActiveTab as any}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Top Reset Notification Prompt (Extraneous Cognitive Load Reducer) */}
        <ResetPromptBanner
          settings={resetSettings}
          onUpdateSettings={setResetSettings}
          onOpenOneMinuteReset={() => setIsOneMinuteResetOpen(true)}
          onOpenMicroSummary={() => setActiveTab('micro-summary')}
          onOpenSettings={() => setIsResetSettingsOpen(true)}
          forceShowPrompt={forceShowResetPrompt}
          onDismissForcePrompt={() => setForceShowResetPrompt(false)}
          unreadCount={12}
          highPriorityCount={3}
        />
        
        {/* TAB 1: Companion Engine */}
        {activeTab === 'co-pilot' && (
          <>
            {/* Quick Presets Picker */}
            <PresetPicker
              onSelectPreset={handleSelectPreset}
              selectedPresetId={selectedPreset?.id}
              contextMode={contextMode}
              setContextMode={setContextMode}
            />

            {/* Input Form */}
            <ScenarioForm
              onSubmitPayload={handleExecuteTriage}
              isLoading={isLoading}
              initialText={selectedPreset?.scenario_text || ''}
              initialInstruction={selectedPreset?.instruction || 'Respond to this message'}
              initialChannel={selectedPreset?.channel || 'Email'}
              initialContext={contextMode}
              onClear={handleClearScenario}
            />

            {/* Results Section */}
            {isLoading ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-900">Running UnburdenMe Pipeline...</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Classifying safety risk (0.0 temp) → Generating grounding perspective → Constructing 2–3 structured options and editable response drafts.
                </p>
              </div>
            ) : currentResult ? (
              <TriageResultsView
                result={currentResult}
                userScenario={currentScenarioText}
                channel={currentChannel}
                contextType={contextMode}
                desiredTone={currentTone}
                onSaveChoice={handleSaveChoice}
              />
            ) : null}
          </>
        )}

        {/* TAB 2: Priorities */}
        {activeTab === 'priorities' && (
          <DataDigestWidget />
        )}

        {/* TAB 4: Schedule */}
        {activeTab === 'schedule' && (
          <IntegratedCalendar
            onNavigateToPrepTool={(title) => {
              setPrepToolInitialTitle(title);
              setActiveTab('prep-tool');
            }}
          />
        )}

        {/* TAB 3: Micro Summary Engine */}
        {activeTab === 'micro-summary' && (
          <MicroSummaryWidget />
        )}

        {/* TAB 6: Problem Solver */}
        {activeTab === 'problem-solver' && (
          <ProblemSolverWidget />
        )}

        {/* TAB 7: Preparation Tool */}
        {activeTab === 'prep-tool' && (
          <PrepToolWidget
            initialActivity={prepToolInitialTitle}
            onNavigateToTab={(tab) => setActiveTab(tab as any)}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-800">UnburdenMe</span>
            <span>— Interactive Communication Companion & Workload Management Assistant</span>
          </div>
          <div>
            <span>British English & Safety Protocols Active</span>
          </div>
        </div>
      </footer>

      {/* Saved History Drawer */}
      <SavedHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        savedItems={savedItems}
        onClearHistory={handleClearHistory}
        onDeleteSingle={handleDeleteSingleSaved}
      />

      {/* 1-Minute Calm Reset Modal */}
      <OneMinuteResetModal
        isOpen={isOneMinuteResetOpen}
        onClose={() => setIsOneMinuteResetOpen(false)}
      />

      {/* Reset Prompt Proactivity Settings Modal */}
      <ResetSettingsModal
        isOpen={isResetSettingsOpen}
        onClose={() => setIsResetSettingsOpen(false)}
        settings={resetSettings}
        onUpdateSettings={setResetSettings}
        onTriggerTestPrompt={() => setForceShowResetPrompt(true)}
      />

      {/* GDPR & User-Driven Data Input Privacy Architecture Modal */}
      <UDDIPrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />

      {/* Device Notification Permissions Banner & In-App Alerts */}
      <NotificationToastBanner />
    </div>
  );
}
