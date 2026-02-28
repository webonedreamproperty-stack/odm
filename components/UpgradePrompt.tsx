import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Crown, ExternalLink, KeyRound, Check, Loader2, Sparkles } from 'lucide-react';
import { activateLicenseKey } from '../lib/db/licenseKeys';
import { useAuth } from './AuthProvider';
import { TIER_LIMITS } from '../types';

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: 'campaign' | 'card' | 'staff';
  currentUsage?: { campaigns: number; cards: number; staff?: number };
}

const GUMROAD_URL = 'https://gumroad.com';

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  open, onOpenChange, reason, currentUsage,
}) => {
  const { refreshProfile } = useAuth();
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [activated, setActivated] = useState(false);

  const limits = TIER_LIMITS.free;

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    setKeyError('');
    setActivating(true);
    const result = await activateLicenseKey(licenseKey.trim());
    setActivating(false);
    if (result.success) {
      setActivated(true);
      await refreshProfile();
      setTimeout(() => {
        onOpenChange(false);
        setActivated(false);
        setShowKeyInput(false);
        setLicenseKey('');
      }, 2000);
    } else {
      setKeyError(result.error ?? 'Invalid license key');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setShowKeyInput(false);
    setLicenseKey('');
    setKeyError('');
    setActivated(false);
  };

  if (activated) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Pro Activated!</h2>
            <p className="text-muted-foreground">
              Enjoy unlimited campaigns, card issuances, and staff accounts.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <DialogTitle className="text-xl">Upgrade to Pro</DialogTitle>
          </div>
          <DialogDescription>
            {reason === 'campaign'
              ? `You've reached the free plan limit of ${limits.campaigns} campaigns.`
              : reason === 'card'
              ? `You've reached the free plan limit of ${limits.issuedCards} issued cards.`
              : reason === 'staff'
              ? `You've reached the free plan limit of ${limits.staff} staff account.`
              : 'Unlock unlimited access to grow your loyalty program.'}
          </DialogDescription>
        </DialogHeader>

        {currentUsage && (
          <div className={`grid gap-3 mt-2 ${currentUsage.staff !== undefined ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div className="rounded-xl border bg-muted/30 p-3 text-center">
              <div className="text-2xl font-bold">{currentUsage.campaigns}<span className="text-sm font-normal text-muted-foreground">/{limits.campaigns}</span></div>
              <div className="text-xs text-muted-foreground mt-0.5">Campaigns</div>
            </div>
            <div className="rounded-xl border bg-muted/30 p-3 text-center">
              <div className="text-2xl font-bold">{currentUsage.cards}<span className="text-sm font-normal text-muted-foreground">/{limits.issuedCards}</span></div>
              <div className="text-xs text-muted-foreground mt-0.5">Issued Cards</div>
            </div>
            {currentUsage.staff !== undefined && (
              <div className="rounded-xl border bg-muted/30 p-3 text-center">
                <div className="text-2xl font-bold">{currentUsage.staff}<span className="text-sm font-normal text-muted-foreground">/{limits.staff}</span></div>
                <div className="text-xs text-muted-foreground mt-0.5">Staff</div>
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-b from-amber-50 to-orange-50 p-5 mt-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-lg text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Pro Plan
              </div>
              <div className="text-sm text-muted-foreground">Everything you need to scale</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">$29.99</div>
              <div className="text-xs text-muted-foreground">per year</div>
            </div>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600 shrink-0" /> Unlimited campaigns</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600 shrink-0" /> Unlimited card issuances</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600 shrink-0" /> Unlimited staff accounts</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600 shrink-0" /> Priority support</li>
          </ul>
        </div>

        {!showKeyInput ? (
          <DialogFooter className="flex-col gap-2 sm:flex-col mt-2">
            <Button
              className="w-full h-12 rounded-full text-base font-semibold gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md"
              onClick={() => window.open(GUMROAD_URL, '_blank')}
            >
              <ExternalLink className="h-4 w-4" /> Buy on Gumroad
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-full gap-2"
              onClick={() => setShowKeyInput(true)}
            >
              <KeyRound className="h-4 w-4" /> I have a license key
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleClose}
            >
              Maybe later
            </Button>
          </DialogFooter>
        ) : (
          <div className="space-y-3 mt-2">
            <div className="flex gap-2">
              <Input
                value={licenseKey}
                onChange={(e) => { setLicenseKey(e.target.value); setKeyError(''); }}
                placeholder="Enter your license key"
                className="flex-1 font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
              />
              <Button
                onClick={handleActivate}
                disabled={!licenseKey.trim() || activating}
                className="shrink-0 rounded-full px-6"
              >
                {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Activate'}
              </Button>
            </div>
            {keyError && (
              <p className="text-sm text-red-600">{keyError}</p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => { setShowKeyInput(false); setKeyError(''); setLicenseKey(''); }}
            >
              Back
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
