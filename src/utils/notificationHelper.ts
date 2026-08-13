/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type?: 'priority' | 'calendar' | 'general';
}

// Check if Notifications are supported
export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

// Request Notification Permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) return false;

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Play a gentle notification chime
export const playNotificationChime = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create two soft harmonic tones
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(audioCtx.currentTime + 0.8);
    osc2.stop(audioCtx.currentTime + 0.8);
  } catch (err) {
    // Web Audio API may be restricted until user interaction
    console.warn('Audio chime notice:', err);
  }
};

// Trigger Device Notification (Native Browser Notification + In-App Event)
export const triggerDeviceNotification = (title: string, body: string, type: 'priority' | 'calendar' | 'general' = 'general') => {
  // 1. Play chime sound
  playNotificationChime();

  // 2. Browser Native Notification
  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      new Notification(`🔔 UnburdenMe: ${title}`, {
        body,
        icon: '/favicon.ico',
        tag: `unburdenme-${Date.now()}`
      });
    } catch (e) {
      console.warn('Native notification display fallback:', e);
    }
  }

  // 3. Dispatch In-App Banner Event
  const payload: NotificationPayload = {
    id: `notif-${Date.now()}`,
    title,
    body,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type
  };

  window.dispatchEvent(new CustomEvent('unburdenme_device_notification_triggered', { detail: payload }));
};

// Background Timer Scanner to check due reminders periodically
let scannerInterval: number | null = null;

export const initNotificationScanner = () => {
  if (scannerInterval !== null) return;

  const checkDueReminders = () => {
    const nowIso = new Date().toISOString();

    // 1. Check Priority List Reminders
    try {
      const storedPriorities = localStorage.getItem('unburdenme_priority_checklist');
      if (storedPriorities) {
        let items: any[] = JSON.parse(storedPriorities);
        let updated = false;

        items = items.map(item => {
          if (item.reminderTime && !item.reminderTriggered && !item.completed) {
            if (new Date(item.reminderTime).getTime() <= new Date().getTime()) {
              // Trigger reminder!
              triggerDeviceNotification(
                `Priority Reminder: ${item.title}`,
                `Task "${item.title}" is due for attention! (${item.priority.toUpperCase()} Priority)`,
                'priority'
              );
              updated = true;
              return { ...item, reminderTriggered: true };
            }
          }
          return item;
        });

        if (updated) {
          localStorage.setItem('unburdenme_priority_checklist', JSON.stringify(items));
          window.dispatchEvent(new CustomEvent('unburdenme_priorities_updated'));
        }
      }
    } catch (err) {
      console.error('Error scanning priority reminders:', err);
    }

    // 2. Check Schedule Calendar Reminders
    try {
      const storedEvents = localStorage.getItem('unburdenme_calendar_events');
      if (storedEvents) {
        let events: any[] = JSON.parse(storedEvents);
        let updated = false;

        events = events.map(evt => {
          if (evt.reminderTime && !evt.reminderTriggered && !evt.completed) {
            if (new Date(evt.reminderTime).getTime() <= new Date().getTime()) {
              // Trigger reminder!
              triggerDeviceNotification(
                `Schedule Alert: ${evt.title}`,
                `Upcoming Event: "${evt.title}" starting at ${evt.startTime || 'scheduled time'}`,
                'calendar'
              );
              updated = true;
              return { ...evt, reminderTriggered: true };
            }
          }
          return evt;
        });

        if (updated) {
          localStorage.setItem('unburdenme_calendar_events', JSON.stringify(events));
          window.dispatchEvent(new CustomEvent('unburdenme_calendar_updated'));
        }
      }
    } catch (err) {
      console.error('Error scanning calendar reminders:', err);
    }
  };

  // Run initial check immediately
  checkDueReminders();

  // Run every 10 seconds
  scannerInterval = window.setInterval(checkDueReminders, 10000) as unknown as number;
};
