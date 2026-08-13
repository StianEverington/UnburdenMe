import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import {
  NotificationPayload,
  isNotificationSupported,
  requestNotificationPermission
} from '../utils/notificationHelper';

export const NotificationToastBanner: React.FC = () => {
  const [activeToast, setActiveToast] = useState<NotificationPayload | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [permissionDismissed, setPermissionDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Check initial permission
    if (isNotificationSupported() && Notification.permission === 'granted') {
      setHasPermission(true);
    }

    // Listen for device notification events
    const handleNotification = (e: Event) => {
      const customEvent = e as CustomEvent<NotificationPayload>;
      if (customEvent.detail) {
        setActiveToast(customEvent.detail);

        // Auto dismiss toast after 8 seconds
        setTimeout(() => {
          setActiveToast(prev => (prev?.id === customEvent.detail.id ? null : prev));
        }, 8000);
      }
    };

    window.addEventListener('unburdenme_device_notification_triggered', handleNotification);

    return () => {
      window.removeEventListener('unburdenme_device_notification_triggered', handleNotification);
    };
  }, []);

  const handleEnablePermissions = async () => {
    const granted = await requestNotificationPermission();
    setHasPermission(granted);
    if (granted) {
      setPermissionDismissed(true);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2 max-w-xs sm:max-w-sm w-full pointer-events-none">
      {/* 1. Request Native Notification Permission Banner (if not granted yet) */}
      {!hasPermission && !permissionDismissed && isNotificationSupported() && (
        <div className="pointer-events-auto bg-[#faf8f5]/95 backdrop-blur-xs text-[#2d2d25] p-3 rounded-2xl shadow-lg border border-[#e5e2d8] animate-in slide-in-from-bottom-2 duration-300 flex items-start justify-between gap-2.5 text-xs">
          <div className="flex items-start space-x-2.5">
            <div className="p-1.5 bg-amber-100/90 text-amber-800 rounded-xl shrink-0 mt-0.5">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-[#1a1a15] block mb-0.5">Enable Device Reminders?</span>
              <p className="text-[#65655b] text-[11px] leading-snug">
                Allow browser notifications to receive alerts for scheduled events and priorities.
              </p>
              <button
                type="button"
                onClick={handleEnablePermissions}
                className="mt-2 px-3 py-1 bg-[#5a5a40] hover:bg-[#4a4a32] text-white font-medium rounded-lg text-[11px] transition-colors shadow-2xs cursor-pointer"
              >
                Allow Notifications
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPermissionDismissed(true)}
            className="p-1 text-[#8e8e82] hover:text-[#1a1a15] hover:bg-[#eae7dd] rounded-md transition-colors"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Active Notification Toast Banner */}
      {activeToast && (
        <div className="pointer-events-auto bg-[#faf8f5]/95 backdrop-blur-xs text-[#2d2d25] p-3.5 rounded-2xl shadow-xl border border-amber-300/80 animate-in slide-in-from-bottom-3 duration-300 space-y-1.5 relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500" />
          <div className="flex items-start justify-between gap-2 pl-1">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                <Bell className="w-3.5 h-3.5 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  {activeToast.type === 'priority' ? 'Priority Reminder' : activeToast.type === 'calendar' ? 'Schedule Event Alert' : 'Device Reminder'}
                </span>
                <h4 className="text-xs font-bold text-[#1a1a15] leading-tight">
                  {activeToast.title}
                </h4>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-[10px] text-[#7a7a70]">{activeToast.timestamp}</span>
              <button
                type="button"
                onClick={() => setActiveToast(null)}
                className="p-1 text-[#8e8e82] hover:text-[#1a1a15] hover:bg-[#eae7dd] rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="text-xs text-[#4a4a40] pl-1 leading-relaxed">
            {activeToast.body}
          </p>
        </div>
      )}
    </div>
  );
};
