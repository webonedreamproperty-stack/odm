import React from 'react';
import { Customer, Template } from '../types';
import { useAuth } from './AuthProvider';
import { SettingsPage } from './SettingsPage';
import { VendorOnboardingWizard } from './VendorOnboardingWizard';

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
      {currentUser?.role === 'owner' && currentOwner && !currentOwner.vendorOnboardingCompleted && (
        <div className="border-b border-border/60 bg-muted/15 px-4 py-6 md:px-8">
          <div className="mx-auto max-w-3xl">
            <VendorOnboardingWizard />
          </div>
        </div>
      )}
      <div className="flex-1">
        <SettingsPage embedded />
      </div>
    </div>
  );
};
