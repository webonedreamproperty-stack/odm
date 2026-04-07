import React from 'react';
import { Customer, Template } from '../types';
import { useAuth } from './AuthProvider';
import { SettingsPage } from './SettingsPage';
import { VendorDashboardOnboarding } from './VendorDashboardOnboarding';

interface DashboardPageProps {
  campaigns: Template[];
  customers: Customer[];
}

/**
 * Vendor home: minimal chrome (see App DashboardLayout) + setup-focused content
 * aligned with Settings. Campaigns / sidebar live under /settings.
 */
export const DashboardPage: React.FC<DashboardPageProps> = () => {
  const { currentUser, currentOwner } = useAuth();

  return (
    <div className="flex flex-col animate-fade-in">
      {currentUser?.role === 'owner' && currentOwner && <VendorDashboardOnboarding />}
      <div className="flex-1">
        <SettingsPage embedded />
      </div>
    </div>
  );
};
