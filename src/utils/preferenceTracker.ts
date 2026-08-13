/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PreferenceCategory = 
  | 'tone'               // Desired Tone (e.g., Assertive, Polite, Formal, Informal)
  | 'summary_length'     // Summary outcome style (e.g., Bullet Points, Single Paragraph, Executive Summary)
  | 'context_mode'       // Context mode (e.g., work, personal, hybrid)
  | 'start_time'         // Default event start time (e.g., 09:00, 10:00)
  | 'priority'           // Default priority level (e.g., high, mid, low)
  | 'type'               // Default activity/item type (e.g., Email, Message, Task, Meeting)
  | 'reminder_option';   // Default notification option (e.g., 1h, 30m_before, at_start)

interface PreferenceStore {
  counts: Record<string, Record<string, number>>; // category -> { value -> count }
}

const STORAGE_KEY = 'unburdenme_user_preference_tracker';

const loadStore = (): PreferenceStore => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to read preference tracker from storage', err);
  }
  return { counts: {} };
};

const saveStore = (store: PreferenceStore): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn('Failed to save preference tracker to storage', err);
  }
};

/**
 * Record a user selection for a category to learn preferences over time.
 */
export const recordPreference = (category: PreferenceCategory, value: string): void => {
  if (!category || !value) return;

  const store = loadStore();
  if (!store.counts[category]) {
    store.counts[category] = {};
  }

  const currentCount = store.counts[category][value] || 0;
  store.counts[category][value] = currentCount + 1;

  saveStore(store);
};

/**
 * Get the most frequently selected option for a category, or fallback to default.
 */
export const getMostFrequentPreference = (category: PreferenceCategory, fallback: string): string => {
  const store = loadStore();
  const categoryCounts = store.counts[category];

  if (!categoryCounts || Object.keys(categoryCounts).length === 0) {
    return fallback;
  }

  let topVal = fallback;
  let maxCount = 0;

  for (const [val, count] of Object.entries(categoryCounts)) {
    if (count > maxCount) {
      maxCount = count;
      topVal = val;
    }
  }

  return topVal;
};
