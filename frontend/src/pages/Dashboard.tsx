import React from 'react';
import { useAuthStore } from '../store/authStore';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { WorkerDashboard } from '../components/views/WorkerDashboard';
import { SafetyOfficerDashboard } from '../components/views/SafetyOfficerDashboard';
import { CorporateDashboard } from '../components/views/CorporateDashboard';
import { RegulatoryDashboard } from '../components/views/RegulatoryDashboard';
import { AdminDashboard } from '../components/views/AdminDashboard';

export const Dashboard = () => {
  const userType = useAuthStore((state) => state.user?.user_type);

  const renderDashboard = () => {
    switch (userType) {
      case 'worker':
        return <WorkerDashboard />;
      case 'mine_safety_officer':
        return <SafetyOfficerDashboard />;
      case 'corporate_management':
        return <CorporateDashboard />;
      case 'regulatory_authority':
        return <RegulatoryDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return null;
    }
  };

  return <DashboardLayout>{renderDashboard()}</DashboardLayout>;
};
