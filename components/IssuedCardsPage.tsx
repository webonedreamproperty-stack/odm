import React, { useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "./ui/table";
import { Button } from "./ui/button";
import {
  Plus, Search, CreditCard, MonitorPlay, MoreHorizontal, Trash, ExternalLink, Lock, QrCode
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { cn } from "../lib/utils";
import { Customer, Template, IssuedCard, Transaction } from '../types';
import { KioskMode } from './KioskMode';
import { IssueCardDialog } from './IssueCardDialog';
import { resolveCardTemplate, toStoredTemplate } from '../lib/templateSerialization';
import { useAuth } from './AuthProvider';
import { buildPublicCardUrl } from '../lib/links';
import { ScanQrDialog } from './ScanQrDialog';
import { insertIssuedCard, updateIssuedCard, deleteIssuedCard, insertTransaction } from '../lib/db/issuedCards';
import { upsertCustomer } from '../lib/db/customers';
import { useSubscriptionContext } from './SubscriptionContext';

interface IssuedCardsPageProps {
  customers: Customer[];
  campaigns: Template[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  refreshData?: () => void;
  onUpgrade?: () => void;
}

export const IssuedCardsPage: React.FC<IssuedCardsPageProps> = ({ customers, campaigns, setCustomers, refreshData, onUpgrade }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { currentOwner, isVerified, isStaff, currentUser } = useAuth();
  const { canIssueCard, issuedCardCount, cardLimit, isProTier } = useSubscriptionContext();
  const canIssue = isVerified;

  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [activeKioskData, setActiveKioskData] = useState<{ customer: Customer, card: IssuedCard, template: Template } | null>(null);
  const [isScanOpen, setIsScanOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsScanOpen(true);
    window.addEventListener('open-qr-scan', handler);
    return () => window.removeEventListener('open-qr-scan', handler);
  }, []);

  const [preSelectedCampaign, setPreSelectedCampaign] = useState<Template | null>(null);
  const [preSelectedCustomer, setPreSelectedCustomer] = useState<Customer | null>(null);

  const handleUpdateCard = async (customerId: string, cardId: string, updates: Partial<IssuedCard>) => {
    const dbUpdates: Parameters<typeof updateIssuedCard>[1] = {};
    if (updates.stamps !== undefined) dbUpdates.stamps = updates.stamps;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.completedDate !== undefined) dbUpdates.completedDate = updates.completedDate;
    if (updates.lastVisit !== undefined) dbUpdates.lastVisit = updates.lastVisit;

    if (Object.keys(dbUpdates).length > 0) {
      await updateIssuedCard(cardId, dbUpdates);
    }

    if (updates.history) {
      const existingCard = customers
        .find(c => c.id === customerId)?.cards
        .find(c => c.id === cardId);
      const existingIds = new Set((existingCard?.history ?? []).map(t => t.id));
      const newTxs = updates.history.filter(t => !existingIds.has(t.id));
      for (const tx of newTxs) {
        await insertTransaction(cardId, tx);
      }
    }

    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          cards: c.cards.map(card => card.id === cardId ? { ...card, ...updates } : card)
        };
      }
      return c;
    }));

    if (activeKioskData && activeKioskData.customer.id === customerId) {
      setActiveKioskData(prev => {
        if (!prev) return null;
        return { ...prev, card: { ...prev.card, ...updates } };
      });
    }
  };

  const handleRevokeCard = async (customerId: string, cardId: string) => {
    if (confirm("Are you sure you want to revoke this card? This cannot be undone.")) {
      await deleteIssuedCard(cardId);
      setCustomers(prev => prev.map(c => {
        if (c.id === customerId) {
          return { ...c, cards: c.cards.filter(card => card.id !== cardId) };
        }
        return c;
      }));
    }
  };

  const handleKioskIssueNew = (customer: Customer, template: Template) => {
    if (!canIssue) return;
    setPreSelectedCampaign(template);
    setPreSelectedCustomer(customer);
    setIsIssueOpen(true);
  };

  const openIssueWizard = () => {
    if (!canIssue) return;
    if (!canIssueCard) {
      onUpgrade?.();
      return;
    }
    setPreSelectedCampaign(null);
    setPreSelectedCustomer(null);
    setIsIssueOpen(true);
  };

  const handleIssueCard = async (campaign: Template, customer: Customer | null, newCustomerData: { name: string, email: string, mobile: string }): Promise<IssuedCard> => {
    const actorName = currentUser?.businessName ?? "Owner";
    const actorRole = currentUser?.role ?? "owner";
    const actorId = currentUser?.id;

    let targetCustomer = customer;

    if (!targetCustomer) {
      const newId = `cust-${Date.now()}`;
      targetCustomer = {
        id: newId,
        name: newCustomerData.name,
        email: newCustomerData.email,
        mobile: newCustomerData.mobile,
        status: "Active",
        cards: []
      };
      if (currentOwner) {
        await upsertCustomer(
          { id: newId, name: newCustomerData.name, email: newCustomerData.email, mobile: newCustomerData.mobile, status: 'Active' },
          currentOwner.id
        );
      }
    }

    const now = new Date();
    const initialTransaction: Transaction = {
      id: `tx-init-${Date.now()}`,
      type: 'issued',
      amount: 0,
      date: now.toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
      }),
      timestamp: now.getTime(),
      title: "Card Issued",
      actorName,
      actorRole,
      actorId
    };

    const newCard: IssuedCard = {
      id: `card-${Date.now()}`,
      uniqueId: crypto.randomUUID(),
      campaignId: campaign.id,
      campaignName: campaign.name,
      stamps: 0,
      lastVisit: new Date().toISOString().split('T')[0],
      status: 'Active',
      history: [initialTransaction],
      templateSnapshot: toStoredTemplate(campaign)
    };

    if (currentOwner) {
      await insertIssuedCard({
        id: newCard.id,
        uniqueId: newCard.uniqueId,
        customerId: targetCustomer.id,
        campaignId: campaign.id,
        campaignName: campaign.name,
        templateSnapshot: toStoredTemplate(campaign),
      }, currentOwner.id);

      await insertTransaction(newCard.id, initialTransaction);
    }

    const targetId = targetCustomer.id;
    const customerToAdd = targetCustomer;

    setCustomers(prev => {
      const exists = prev.find(c => c.id === targetId);
      if (exists) {
        return prev.map(c => c.id === targetId
          ? { ...c, cards: [...c.cards, newCard] }
          : c
        );
      } else {
        return [...prev, { ...customerToAdd, cards: [newCard] }];
      }
    });

    return newCard;
  };

  const extractCardId = (value: string) => {
    let raw = value.trim();
    if (!raw) return "";
    try {
      const url = new URL(raw);
      const parts = url.pathname.split('/').filter(Boolean);
      raw = parts[parts.length - 1] ?? raw;
    } catch {
      // not a URL
    }
    raw = raw.replace(/^#/, '');
    raw = raw.replace(/\/+$/, '');
    const segments = raw.split('/').filter(Boolean);
    return segments[segments.length - 1] ?? raw;
  };

  const handleScanResult = (value: string) => {
    const cardId = extractCardId(value);
    if (!cardId) return false;
    for (const customer of customers) {
      const found = customer.cards.find((card) => card.uniqueId === cardId);
      if (found) {
        const template = resolveCardTemplate(found, campaigns);
        if (!template) return false;
        setActiveKioskData({ customer, card: found, template });
        return true;
      }
    }
    return false;
  };

  const flatList = customers.flatMap(c => c.cards.map(card => ({ customer: c, card })));

  const sortedList = flatList.sort((a, b) => {
    if (a.card.status === 'Active' && b.card.status === 'Redeemed') return -1;
    if (a.card.status === 'Redeemed' && b.card.status === 'Active') return 1;
    return 0;
  });

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredList = sortedList.filter(({ customer, card }) =>
    (customer.name || "").toLowerCase().includes(normalizedQuery) ||
    (customer.email || "").toLowerCase().includes(normalizedQuery) ||
    (customer.mobile || "").toLowerCase().includes(normalizedQuery) ||
    (card.campaignName || "").toLowerCase().includes(normalizedQuery) ||
    (card.uniqueId || "").toLowerCase().includes(normalizedQuery) ||
    (card.id || "").toLowerCase().includes(normalizedQuery)
  );

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in h-full flex flex-col bg-gray-50/50">

      {activeKioskData && (
        <KioskMode
          customer={activeKioskData.customer}
          card={activeKioskData.card}
          template={activeKioskData.template}
          onClose={() => setActiveKioskData(null)}
          onUpdateCard={handleUpdateCard}
          onIssueNew={handleKioskIssueNew}
          canIssue={canIssue}
          allowRedeem={true}
          actorName={currentUser?.businessName ?? "Owner"}
          actorRole={currentUser?.role ?? "owner"}
          actorId={currentUser?.id}
          onScanRequest={() => setIsScanOpen(true)}
        />
      )}

      <IssueCardDialog
        isOpen={isIssueOpen}
        onClose={() => setIsIssueOpen(false)}
        campaigns={campaigns}
        customers={customers}
        onIssue={handleIssueCard}
        preSelectedCampaign={preSelectedCampaign}
        preSelectedCustomer={preSelectedCustomer}
      />

      <ScanQrDialog
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onDetected={handleScanResult}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Issued Cards</h1>
          <p className="text-muted-foreground">Monitor active cards and open Kiosk Mode for stamping.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          <Button variant="outline" className="gap-2 rounded-full" onClick={() => setIsScanOpen(true)}>
            <QrCode size={16} /> Scan QR
          </Button>
          {!isProTier && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs text-muted-foreground">
              <CreditCard size={14} />
              <span className="font-semibold text-foreground">{issuedCardCount}</span>
              <span>/</span>
              <span>{cardLimit}</span>
            </div>
          )}
          <div className="flex flex-col items-end gap-2">
            <Button onClick={openIssueWizard} className="gap-2 shadow-sm rounded-full px-6" disabled={!canIssue}>
              <Plus size={16} /> Issue New Card
            </Button>
            {!canIssue && (
              <div className="text-xs text-amber-600 flex items-center gap-2">
                <Lock size={12} /> Verify your email to issue cards.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border w-full max-w-sm shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <Search className="text-gray-400" size={20} />
        <input
          className="flex-1 outline-none text-sm bg-transparent placeholder:text-muted-foreground"
          placeholder="Find a card..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="rounded-xl border bg-white flex-1 overflow-auto shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[300px]">Card Details</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Progress</TableHead>
              <TableHead className="text-right">Action</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                  No cards found. Issue one to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredList.map(({ customer, card }) => {
                const campaign = resolveCardTemplate(card, campaigns);
                if (!campaign) return null;

                const progress = (card.stamps / campaign.totalStamps) * 100;
                const canRedeem = card.stamps >= campaign.totalStamps;
                const isRedeemed = card.status === 'Redeemed';

                return (
                  <TableRow key={card.id} className={cn("transition-colors", isRedeemed ? "bg-gray-50/50 hover:bg-gray-50" : "hover:bg-muted/30")}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          isRedeemed ? "bg-gray-100 text-gray-400" : "bg-primary/10 text-primary"
                        )}>
                          {isRedeemed ? <Lock size={18} /> : <CreditCard size={20} />}
                        </div>
                        <div className={cn(isRedeemed && "opacity-60")}>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {card.campaignName}
                            {isRedeemed && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold uppercase">Redeemed</span>}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">ID: {card.uniqueId.slice(0, 8)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={cn("flex items-center gap-2", isRedeemed && "opacity-60")}>
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                          {customer.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {isRedeemed ? (
                        <div className="text-sm text-muted-foreground font-medium">Completed</div>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <div className="text-sm font-bold">
                            {card.stamps} <span className="text-muted-foreground font-normal">/ {campaign.totalStamps}</span>
                          </div>
                          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", canRedeem ? "bg-green-500" : "bg-primary")}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={isRedeemed ? "outline" : "default"}
                        className={cn("gap-2 rounded-full", canRedeem && !isRedeemed ? "bg-green-600 hover:bg-green-700" : "")}
                        onClick={() => setActiveKioskData({ customer, card, template: campaign })}
                      >
                        {isRedeemed ? <Lock size={14} /> : <MonitorPlay size={14} />}
                        {isRedeemed ? "View" : (canRedeem ? "Redeem" : "Kiosk")}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Manage Card</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => {
                            const slug = currentOwner?.slug;
                            if (!slug) return;
                            window.open(buildPublicCardUrl(slug, card.uniqueId), '_blank');
                          }}>
                            <ExternalLink className="mr-2 h-4 w-4" /> Public Link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {!isStaff && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleRevokeCard(customer.id, card.id)}
                            >
                              <Trash className="mr-2 h-4 w-4" /> Revoke
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
