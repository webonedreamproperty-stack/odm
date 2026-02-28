import React, { createContext, useContext } from 'react';
import type { SubscriptionTier } from '../types';

interface SubscriptionData {
  tier: SubscriptionTier;
  isProTier: boolean;
  campaignCount: number;
  issuedCardCount: number;
  staffCount: number;
  campaignLimit: number;
  cardLimit: number;
  staffLimit: number;
  canCreateCampaign: boolean;
  canIssueCard: boolean;
  canCreateStaff: boolean;
}

const defaultData: SubscriptionData = {
  tier: 'free',
  isProTier: false,
  campaignCount: 0,
  issuedCardCount: 0,
  staffCount: 0,
  campaignLimit: 3,
  cardLimit: 50,
  staffLimit: 1,
  canCreateCampaign: true,
  canIssueCard: true,
  canCreateStaff: true,
};

const SubscriptionContext = createContext<SubscriptionData>(defaultData);

export const SubscriptionProvider: React.FC<{
  value: SubscriptionData;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
);

export const useSubscriptionContext = () => useContext(SubscriptionContext);
