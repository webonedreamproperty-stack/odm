import React, { useState } from 'react';
import { Customer, IssuedCard, Template, Transaction } from '../types';
import { LoyaltyCard } from './LoyaltyCard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { X, Plus, Gift, History, User, CreditCard, ChevronLeft, Minus, Lock, CheckCircle, RefreshCcw, Hash, QrCode } from 'lucide-react';
import { cn } from '../lib/utils';

interface KioskModeProps {
  customer: Customer;
  card: IssuedCard;
  template: Template;
  onClose: () => void;
  onUpdateCard: (customerId: string, cardId: string, updates: Partial<IssuedCard>) => void;
  onIssueNew: (customer: Customer, template: Template) => void;
  canIssue: boolean;
  allowRedeem: boolean;
  actorId?: string;
  actorName: string;
  actorRole: 'owner' | 'staff';
  onScanRequest?: () => void;
}

// Helper to create timestamped transaction
const createTransaction = (
    type: Transaction['type'],
    amount: number,
    title: string,
    remarks?: string,
    actor?: { id?: string; name: string; role: 'owner' | 'staff' }
): Transaction => {
    const now = new Date();
    return {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        amount,
        date: now.toLocaleString(undefined, { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
        }),
        timestamp: now.getTime(),
        title,
        remarks,
        actorId: actor?.id,
        actorName: actor?.name,
        actorRole: actor?.role
    };
};

export const KioskMode: React.FC<KioskModeProps> = ({
  customer,
  card,
  template,
  onClose,
  onUpdateCard,
  onIssueNew,
  canIssue,
  allowRedeem,
  actorId,
  actorName,
  actorRole,
  onScanRequest
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Confirmation States
  const [confirmAction, setConfirmAction] = useState<'stamp' | 'remove' | 'redeem' | null>(null);
  const [redemptionRemarks, setRedemptionRemarks] = useState("");

  const canAdd = card.status === 'Active' && card.stamps < template.totalStamps;
  const canRedeem = allowRedeem && card.status === 'Active' && card.stamps >= template.totalStamps;
  const canRemove = card.status === 'Active' && card.stamps > 0;
  const isLocked = card.status === 'Redeemed';

  // --- Handlers ---

  const handleConfirmAction = () => {
      if (confirmAction === 'stamp') {
          performAddStamp();
      } else if (confirmAction === 'remove') {
          performRemoveStamp();
      } else if (confirmAction === 'redeem') {
          performRedeem();
      }
      setConfirmAction(null);
      setRedemptionRemarks(""); // Reset remarks
  };

  const performAddStamp = () => {
      setIsAnimating(true);
      const tx = createTransaction('stamp_add', 1, 'Stamp Collected', undefined, { id: actorId, name: actorName, role: actorRole });
      
      onUpdateCard(customer.id, card.id, { 
          stamps: card.stamps + 1,
          lastVisit: new Date().toISOString().split('T')[0],
          history: [tx, ...card.history]
      });
      setTimeout(() => setIsAnimating(false), 300);
  };

  const performRemoveStamp = () => {
      const tx = createTransaction('stamp_remove', -1, 'Stamp Removed', 'Manual Correction', { id: actorId, name: actorName, role: actorRole });
      
      onUpdateCard(customer.id, card.id, { 
          stamps: Math.max(0, card.stamps - 1),
          history: [tx, ...card.history]
      });
  };

  const performRedeem = () => {
      const tx = createTransaction('redeem', 0, 'Reward Redeemed', redemptionRemarks, { id: actorId, name: actorName, role: actorRole });

      // Lock the card by setting status to Redeemed
      onUpdateCard(customer.id, card.id, { 
          status: 'Redeemed',
          completedDate: new Date().toISOString().split('T')[0],
          history: [tx, ...card.history]
      });
  };

  const handleIssueNext = () => {
      if (!canIssue) return;
      onClose(); // Close kiosk
      // Small delay to allow close animation then trigger parent wizard
      setTimeout(() => onIssueNew(customer, template), 100);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col md:flex-row animate-fade-in">
      {/* LEFT: Card Visual */}
      <div className="w-full md:w-1/2 lg:w-5/12 h-[45vh] md:h-full bg-muted/30 p-8 flex flex-col items-center justify-center relative border-r">
        <button 
            onClick={onClose}
            className="absolute top-6 left-6 z-50 bg-white/80 backdrop-blur hover:bg-white text-foreground rounded-full p-3 shadow-sm border transition-all"
        >
            <ChevronLeft size={24} />
        </button>

        <div className="w-full max-w-[380px] aspect-[340/600] md:aspect-[420/780] rounded-[2.75rem] shadow-2xl ring-1 ring-black/5 overflow-hidden bg-white relative">
            <LoyaltyCard 
                template={template}
                mode="active"
                currentStamps={card.stamps}
                readOnly={true} 
                className={cn("w-full h-full transition-opacity", isLocked && "opacity-50 grayscale-[0.5]")}
                history={card.history}
                isRedeemed={isLocked}
                sizeVariant="compact"
            />
            
            {/* Stamp Animation Overlay */}
            {isAnimating && (
                <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                    <div className="animate-zoom-in-95 bg-primary text-primary-foreground rounded-full p-6 shadow-xl">
                        <Plus size={48} />
                    </div>
                </div>
            )}

            {/* Locked Overlay */}
            {isLocked && (
                <div className="absolute inset-0 z-40 bg-black/10 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="bg-white/90 p-6 rounded-2xl shadow-xl flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Redeemed</h3>
                        <p className="text-sm text-gray-500 mt-1">This card is closed.</p>
                    </div>
                </div>
            )}
        </div>
        
        {isLocked && (
          <div className="mt-8 text-center">
            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold uppercase tracking-wider">
              Card Archived
            </span>
          </div>
        )}

      </div>

      {/* RIGHT: Controls */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Header */}
        <div className="h-20 border-b flex items-center justify-between px-8 bg-card">
            <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", isLocked ? "bg-gray-100 text-gray-500" : "bg-primary/10 text-primary")}>
                    <CreditCard size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-lg leading-none">{template.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Kiosk Mode</p>
                </div>
            </div>
            <div className="text-right hidden md:flex items-center gap-3">
                <div>
                    <p className="text-sm font-medium">Balance</p>
                    <p className="text-2xl font-bold text-primary">{card.stamps} <span className="text-muted-foreground text-base font-normal">/ {template.totalStamps}</span></p>
                </div>
                {onScanRequest && (
                    <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={onScanRequest}>
                        <QrCode size={14} /> Scan QR
                    </Button>
                )}
            </div>
        </div>

        {/* Main Actions */}
        <div className="flex-1 p-8 flex flex-col justify-center gap-6 max-w-2xl mx-auto w-full">
            <div className="w-full text-center space-y-1">
                <div className="text-xl font-bold text-foreground">{customer.name}</div>
                <div className="text-sm text-muted-foreground">{customer.email}</div>
                <div className="text-xs text-muted-foreground font-mono">ID: {card.uniqueId.slice(0, 8)}...</div>
            </div>
            
            {isLocked ? (
                // LOCKED STATE ACTIONS
                <div className="flex flex-col items-center justify-center gap-6 h-full">
                    <div className="text-center space-y-2">
                        <Lock size={48} className="mx-auto text-gray-300" />
                        <h2 className="text-2xl font-bold">Reward Redeemed</h2>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            This card has been completed and redeemed on {card.completedDate || 'today'}. To continue collecting stamps, issue a new card.
                        </p>
                    </div>
                    <Button size="lg" onClick={handleIssueNext} className="h-14 px-8 text-lg rounded-full gap-2 shadow-lg animate-bounce-short" disabled={!canIssue}>
                        <RefreshCcw size={20} /> Issue New Card
                    </Button>
                    {!canIssue && (
                        <div className="text-xs text-amber-600">Verify your email to issue cards.</div>
                    )}
                </div>
            ) : (
                // ACTIVE STATE ACTIONS
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Stamp Button */}
                    <button
                        onClick={() => setConfirmAction('stamp')}
                        disabled={!canAdd}
                        className={cn(
                            "group relative flex flex-col items-center justify-center gap-4 h-64 rounded-3xl border-2 transition-all duration-200",
                            !canAdd 
                                ? "border-muted bg-muted/20 opacity-50 cursor-not-allowed" 
                                : "border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary hover:shadow-lg active:scale-[0.98]"
                        )}
                    >
                        <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                            <Plus size={40} strokeWidth={3} />
                        </div>
                        <div className="text-center">
                            <span className="text-2xl font-bold text-foreground block">Add Stamp</span>
                            <span className="text-sm text-muted-foreground">Record a visit</span>
                        </div>
                    </button>

                    {/* Redeem Button */}
                    {allowRedeem ? (
                        <button
                            onClick={() => setConfirmAction('redeem')}
                            disabled={!canRedeem}
                            className={cn(
                                "group relative flex flex-col items-center justify-center gap-4 h-64 rounded-3xl border-2 transition-all duration-200",
                                !canRedeem 
                                    ? "border-muted bg-muted/20 opacity-50 cursor-not-allowed" 
                                    : "border-purple-200 bg-purple-50 hover:bg-purple-100 hover:border-purple-500 hover:shadow-lg active:scale-[0.98]"
                            )}
                        >
                            <div className={cn(
                                "w-20 h-20 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300",
                                canRedeem ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground"
                            )}>
                                <Gift size={40} strokeWidth={3} />
                            </div>
                            <div className="text-center">
                                <span className={cn("text-2xl font-bold block", canRedeem ? "text-purple-700" : "text-muted-foreground")}>Redeem Reward</span>
                                <span className="text-sm text-muted-foreground">{template.rewardName}</span>
                            </div>
                        </button>
                    ) : (
                        <div className="group relative flex flex-col items-center justify-center gap-4 h-64 rounded-3xl border-2 border-dashed border-muted bg-muted/10">
                            <div className="w-20 h-20 rounded-full bg-muted text-muted-foreground flex items-center justify-center shadow-md">
                                <Lock size={36} strokeWidth={2.5} />
                            </div>
                            <div className="text-center">
                                <span className="text-2xl font-bold block text-muted-foreground">Redeem</span>
                                <span className="text-sm text-muted-foreground">Owner only</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Bottom Tools */}
            {!isLocked && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                     {/* Remove Stamp Button */}
                     <button 
                        onClick={() => setConfirmAction('remove')}
                        disabled={!canRemove}
                        className={cn(
                            "bg-white rounded-2xl p-4 flex items-center gap-4 border hover:bg-red-50 hover:border-red-200 transition-colors text-left",
                            !canRemove && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border", canRemove ? "bg-red-100 text-red-600 border-red-200" : "bg-gray-100 text-gray-400")}>
                            <Minus size={18} />
                        </div>
                        <div>
                            <p className={cn("text-sm font-bold", canRemove ? "text-red-700" : "text-muted-foreground")}>Remove Stamp</p>
                            <p className="text-xs text-muted-foreground">Correction</p>
                        </div>
                    </button>
                    
                    <div className="bg-muted/30 rounded-2xl p-4 flex items-center gap-4 border">
                        <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border text-muted-foreground">
                            <History size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Visit</p>
                            <p className="font-medium">{card.lastVisit || 'Today'}</p>
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>

      {/* CONFIRMATION DIALOG */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>
                    {confirmAction === 'stamp' && "Confirm Stamp"}
                    {confirmAction === 'remove' && "Remove Stamp"}
                    {confirmAction === 'redeem' && "Confirm Redemption"}
                </DialogTitle>
                <DialogDescription>
                    {confirmAction === 'stamp' && `Add 1 stamp to ${customer.name}'s card?`}
                    {confirmAction === 'remove' && `Remove 1 stamp from ${customer.name}'s card?`}
                    {confirmAction === 'redeem' && (
                        <div className="space-y-3">
                            <span className="text-red-600 font-medium block">
                                Warning: This will complete the card and lock it permanently. You will need to issue a new card for future visits.
                            </span>
                            <div className="space-y-2">
                                <Label htmlFor="remarks">Redemption Remarks (Optional)</Label>
                                <Input 
                                    id="remarks" 
                                    placeholder="e.g. Verified ID, Coupon code used..." 
                                    value={redemptionRemarks}
                                    onChange={(e) => setRedemptionRemarks(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
                
                {confirmAction === 'stamp' && (
                    <Button onClick={handleConfirmAction}>Add Stamp</Button>
                )}
                {confirmAction === 'remove' && (
                    <Button variant="destructive" onClick={handleConfirmAction}>Remove Stamp</Button>
                )}
                {confirmAction === 'redeem' && (
                    <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleConfirmAction}>
                        Confirm & Redeem
                    </Button>
                )}
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
