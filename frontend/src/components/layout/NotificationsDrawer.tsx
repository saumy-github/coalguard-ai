import React from 'react';
import { useDashboardDataStore } from '../../store/dashboardDataStore';
import { useUIStore } from '../../store/uiStore';
import { X, Bell, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

export const NotificationsDrawer = () => {
  const { isNotificationsOpen, setNotificationsOpen } = useUIStore();
  const { notifications, setNotifications } = useDashboardDataStore();

  if (!isNotificationsOpen) return null;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={() => setNotificationsOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-96 max-w-[90vw] bg-[#141415] border-l border-[#51443d]/80 shadow-2xl z-50 flex flex-col justify-between animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div>
          <div className="p-4 border-b border-[#353534] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#f6b994]" />
              <h3 className="text-sm font-bold text-white font-['Sora']">Notifications & Alerts</h3>
            </div>
            <button
              onClick={() => setNotificationsOpen(false)}
              className="p-1 rounded-lg bg-[#252423] text-[#d6c3b9] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 bg-[#1a1919] border-b border-[#353534] flex items-center justify-between text-xs font-mono">
            <span className="text-[#9e8d85]">{notifications.length} Total Alerts</span>
            <button
              onClick={markAllRead}
              className="text-[#f6b994] hover:underline font-semibold"
            >
              Mark all read
            </button>
          </div>

          {/* List */}
          <div className="p-3 space-y-2.5 overflow-y-auto max-h-[calc(100vh-160px)]">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  n.unread
                    ? 'bg-[#251e18] border-[#8d5d3e] text-white shadow-md'
                    : 'bg-[#181717] border-[#353534] text-[#d6c3b9]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {n.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  ) : n.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-[#f6b994] shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-white font-['Sora'] truncate">
                        {n.title}
                      </h4>
                      <span className="text-[10px] font-mono text-[#9e8d85] shrink-0">
                        {n.time}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-[#d6c3b9] mt-1 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#353534] bg-[#111112]">
          <button
            onClick={() => setNotificationsOpen(false)}
            className="w-full py-2.5 rounded-xl bg-[#252423] hover:bg-[#353534] text-xs font-mono font-bold text-white transition-all"
          >
            Close Notifications
          </button>
        </div>

      </div>
    </>
  );
};
