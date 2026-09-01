import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  DEMO_USERS, 
  OPERATING_MINES, 
  LIVE_SENSORS, 
  INITIAL_TICKETS, 
  INITIAL_AUDIT_TRAIL, 
  INITIAL_INSPECTIONS,
  WORKER_TASKS,
  NOTIFICATIONS_DATA
} from '../data/mockData';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // Current user state
  const [currentUser, setCurrentUser] = useState(DEMO_USERS.safety_officer);
  
  // Navigation state
  const [activeView, setActiveView] = useState('landing');
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [preSelectedRole, setPreSelectedRole] = useState('safety_officer');
  
  // UI controls
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Live simulation states
  const [isHazardSimulated, setIsHazardSimulated] = useState(false);
  const [evacuationBroadcasted, setEvacuationBroadcasted] = useState(false);

  // App Data
  const [mines, setMines] = useState(OPERATING_MINES);
  const [sensors, setSensors] = useState(LIVE_SENSORS);
  const [tickets, setTickets] = useState(INITIAL_TICKETS);
  const [auditTrail, setAuditTrail] = useState(INITIAL_AUDIT_TRAIL);
  const [inspections, setInspections] = useState(INITIAL_INSPECTIONS);
  const [workerTasks, setWorkerTasks] = useState(WORKER_TASKS);
  const [notifications, setNotifications] = useState(NOTIFICATIONS_DATA);
  const [toasts, setToasts] = useState([]);

  // Toast helper
  const addToast = (type, title, message) => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Role authentication helper
  const loginAsRole = (role, customName) => {
    const baseUser = DEMO_USERS[role] || DEMO_USERS.safety_officer;
    const user = {
      ...baseUser,
      name: customName && customName.trim() ? customName.trim() : baseUser.name
    };
    setCurrentUser(user);
    setActiveSubTab('overview');

    if (role === 'field_worker') {
      setActiveView('worker_dashboard');
    } else if (role === 'safety_officer') {
      setActiveView('safety_officer_dashboard');
    } else if (role === 'corporate_management') {
      setActiveView('corporate_dashboard');
    } else if (role === 'regulatory_authority') {
      setActiveView('regulatory_dashboard');
    } else if (role === 'system_admin') {
      setActiveView('admin_dashboard');
    } else if (role === 'sih_evaluator') {
      setActiveView('sih_evaluator');
    } else {
      setActiveView('safety_officer_dashboard');
    }

    addToast('success', `Signed In as ${user.roleTitle}`, `Welcome back, ${user.name}`);
  };

  const logout = () => {
    setActiveView('login');
    setIsSidebarOpen(false);
    addToast('info', 'Signed Out', 'You have been safely signed out.');
  };

  // Ticket actions
  const addTicket = (ticketData, silent = false) => {
    const newId = `TCK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket = {
      id: newId,
      title: ticketData.title || 'Safety Issue Reported',
      description: ticketData.description || '',
      category: ticketData.category || 'General Safety',
      severity: ticketData.severity || 'medium',
      status: 'action_required',
      mineId: 'mine-01',
      mineName: 'Sector 7G Deep Coalfield',
      location: ticketData.location || 'Sub-Level -320m',
      reportedBy: ticketData.reportedBy || `${currentUser.name} (${currentUser.roleTitle})`,
      assignedTo: 'Mine Safety Officer',
      createdAt: 'Just now',
      dgmsRegulationRef: ticketData.dgmsRegulationRef || 'CMR 2017 Safety Code',
      aiSuggestedAction: ticketData.aiSuggestedAction || 'Inspect the area and confirm safe conditions before resuming work.',
      ledgerHash: `REC-0x${Math.random().toString(16).substring(2, 12)}`
    };

    setTickets((prev) => [newTicket, ...prev]);

    // Record in audit trail
    const auditEntry = {
      blockNumber: auditTrail.length > 0 ? auditTrail[0].blockNumber + 1 : 5000,
      timestamp: 'Just now',
      action: 'Safety Ticket Created',
      actor: currentUser.name,
      actorRole: currentUser.roleTitle,
      targetId: newId,
      details: `${newTicket.title} (${newTicket.location})`,
      verified: true
    };
    setAuditTrail((prev) => [auditEntry, ...prev]);

    if (!silent) addToast('warning', 'Safety Ticket Created', `Ticket ${newId} logged and assigned.`);
    return newTicket;
  };

  const resolveTicket = (ticketId, correctiveAction, silent = false) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            status: 'resolved',
            resolvedAt: 'Just now',
            correctiveActionTaken: correctiveAction || 'Issue verified and resolved by safety officer.'
          };
        }
        return t;
      })
    );

    const auditEntry = {
      blockNumber: auditTrail[0]?.blockNumber ? auditTrail[0].blockNumber + 1 : 5001,
      timestamp: 'Just now',
      action: 'Safety Issue Resolved',
      actor: currentUser.name,
      actorRole: currentUser.roleTitle,
      targetId: ticketId,
      details: correctiveAction || 'Safety condition restored to normal.',
      verified: true
    };
    setAuditTrail((prev) => [auditEntry, ...prev]);

    if (!silent) addToast('success', 'Issue Resolved', `Ticket ${ticketId} marked as resolved.`);
  };

  // Hazard Simulation
  const simulateHazard = (silent = false) => {
    setIsHazardSimulated(true);
    // Update main methane sensor to critical
    setSensors((prev) =>
      prev.map((s) => {
        if (s.id === 'sns-01') {
          return {
            ...s,
            methaneLEL: 1.42,
            carbonMonoxidePPM: 42,
            status: 'critical',
            lastPing: 'Just now'
          };
        }
        return s;
      })
    );

    addTicket({
      title: 'High Methane Level in Face 4B Return Incline',
      description: 'Sensor SN-7G-CH4-04 recorded methane at 1.42% (limit: 1.25%). Immediate ventilation adjustment and evacuation alert recommended.',
      category: 'Gas Leakage',
      severity: 'critical',
      location: 'Shaft 3, Seam IV, Sub-Level -320m',
      reportedBy: 'Automatic Sensor Warning (SN-7G-CH4-04)',
      dgmsRegulationRef: 'CMR 2017 Regulation 169 (Gas Safety)',
      aiSuggestedAction: '1. Pause machinery power at Face 4B.\n2. Increase auxiliary fan booster.\n3. Move workers to Fresh Air Station.\n4. Take manual reading before restart.'
    }, silent);

    if (!silent) addToast('error', 'Safety Alert Triggered', 'High Methane level (1.42%) detected at Face 4B.');
  };

  const resetHazard = (silent = false) => {
    setIsHazardSimulated(false);
    setEvacuationBroadcasted(false);
    setSensors((prev) =>
      prev.map((s) => {
        if (s.id === 'sns-01') {
          return {
            ...s,
            methaneLEL: 0.42,
            carbonMonoxidePPM: 14,
            status: 'optimal',
            lastPing: 'Just now'
          };
        }
        return s;
      })
    );
    if (!silent) addToast('success', 'Sensor Reset', 'Methane level back to normal (0.42%).');
  };

  const broadcastEvacuation = (message) => {
    setEvacuationBroadcasted(true);
    const notif = {
      id: 'notif_' + Date.now(),
      title: 'Emergency Evacuation Notice',
      message: message || 'All personnel in Face 4B: Move to Fresh Air Base at Crosscut 9 immediately.',
      time: 'Just now',
      type: 'warning',
      unread: true
    };
    setNotifications((prev) => [notif, ...prev]);
    addToast('warning', 'Evacuation Broadcast Sent', 'Audio-visual alert sent to 14 workers in Face 4B.');
  };

  const markTaskComplete = (taskId) => {
    setWorkerTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, status: 'completed' } : task))
    );
    addToast('success', 'Task Completed', 'Inspection item marked as complete.');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        activeView,
        setActiveView,
        activeSubTab,
        setActiveSubTab,
        preSelectedRole,
        setPreSelectedRole,
        isSidebarOpen,
        setIsSidebarOpen,
        toggleSidebar: () => setIsSidebarOpen((prev) => !prev),
        isSearchOpen,
        setSearchOpen,
        isNotificationsOpen,
        setNotificationsOpen,
        isOfflineMode,
        setIsOfflineMode,
        isHazardSimulated,
        evacuationBroadcasted,
        mines,
        setMines,
        sensors,
        setSensors,
        tickets,
        setTickets,
        auditTrail,
        setAuditTrail,
        inspections,
        setInspections,
        workerTasks,
        setWorkerTasks,
        notifications,
        setNotifications,
        toasts,
        addToast,
        removeToast,
        loginAsRole,
        logout,
        addTicket,
        resolveTicket,
        simulateHazard,
        resetHazard,
        broadcastEvacuation,
        markTaskComplete
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
