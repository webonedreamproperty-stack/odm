import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Button } from "./ui/button";
import { 
    Plus, Search, CreditCard, MonitorPlay, MoreHorizontal, Trash, ExternalLink, Lock
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { cn } from "../lib/utils";
import { Customer, Template, IssuedCard, Transaction } from '../types';
import { KioskMode } from './KioskMode';
import { IssueCardDialog } from './IssueCardDialog';
import { resolveCardTemplate, toStoredTemplate } from '../lib/templateSerialization';

interface IssuedCardsPageProps {
  customers: Customer[];
  campaigns: Template[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

export const IssuedCardsPage: React.FC<IssuedCardsPageProps> = ({ customers, campaigns, setCustomers }) => {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog & Kiosk States
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [activeKioskData, setActiveKioskData] = useState<{customer: Customer, card: IssuedCard, template: Template} | null>(null);

  // Pre-selection for dialog
  const [preSelectedCampaign, setPreSelectedCampaign] = useState<Template | null>(null);
  const [preSelectedCustomer, setPreSelectedCustomer] = useState<Customer | null>(null);
  
  // Data for updating
  const handleUpdateCard = (customerId: string, cardId: string, updates: Partial<IssuedCard>) => {
    setCustomers(prev => prev.map(c => {
        if (c.id === customerId) {
            return {
                ...c,
                cards: c.cards.map(card => {
                    if (card.id === cardId) {
                        return { ...card, ...updates };
                    }
                    return card;
                })
            }
        }
        return c;
    }));

    // Update the active kiosk data instantly so the UI reflects changes
    if (activeKioskData && activeKioskData.customer.id === customerId) {
        setActiveKioskData(prev => {
            if (!prev) return null;
            // Update the nested card object
            return {
                ...prev,
                card: { ...prev.card, ...updates }
            };
        });
    }
  };

  const handleRevokeCard = (customerId: string, cardId: string) => {
      if (confirm("Are you sure you want to revoke this card? This cannot be undone.")) {
        setCustomers(prev => prev.map(c => {
            if (c.id === customerId) {
                return { ...c, cards: c.cards.filter(card => card.id !== cardId) };
            }
            return c;
        }));
      }
  };

  // Called from Kiosk Mode when "Issue New Card" is clicked
  const handleKioskIssueNew = (customer: Customer, template: Template) => {
      setPreSelectedCampaign(template);
      setPreSelectedCustomer(customer);
      setIsIssueOpen(true);
  };

  const openIssueWizard = () => {
      setPreSelectedCampaign(null);
      setPreSelectedCustomer(null);
      setIsIssueOpen(true);
  };

  const handleIssueCard = (campaign: Template, customer: Customer | null, newCustomerData: {name: string, email: string, mobile: string}): IssuedCard => {
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
      }

      const now = new Date();
      const initialTransaction: Transaction = {
          id: `tx-init-${Date.now()}`,
          type: 'issued',
          amount: 0,
          date: now.toLocaleString(undefined, { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric', 
              hour: 'numeric', 
              minute: '2-digit', 
              hour12: true 
          }),
          timestamp: now.getTime(),
          title: "Card Issued"
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

      // We need to capture the target ID to use in the updater
      const targetId = targetCustomer!.id;
      const customerToAdd = targetCustomer!;

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

  // Flatten logic
  const flatList = customers.flatMap(c => c.cards.map(card => ({ customer: c, card })));
  
  // Sort: Active cards first, then by date
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
    <div className="p-8 space-y-6 animate-fade-in h-full flex flex-col bg-gray-50/50">
      
      {/* Kiosk Overlay */}
      {activeKioskData && (
        <KioskMode 
            customer={activeKioskData.customer}
            card={activeKioskData.card}
            template={activeKioskData.template}
            onClose={() => setActiveKioskData(null)}
            onUpdateCard={handleUpdateCard}
            onIssueNew={handleKioskIssueNew}
        />
      )}

      {/* New Issue Card Dialog */}
      <IssueCardDialog 
          isOpen={isIssueOpen}
          onClose={() => setIsIssueOpen(false)}
          campaigns={campaigns}
          customers={customers}
          onIssue={handleIssueCard}
          preSelectedCampaign={preSelectedCampaign}
          preSelectedCustomer={preSelectedCustomer}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Issued Cards</h1>
            <p className="text-muted-foreground">Monitor active cards and open Kiosk Mode for stamping.</p>
        </div>
        <Button onClick={openIssueWizard} className="gap-2 shadow-sm rounded-full px-6">
            <Plus size={16} /> Issue New Card
        </Button>
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
                                        <div className="text-xs text-muted-foreground font-mono">ID: {card.uniqueId.slice(0,8)}</div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className={cn("flex items-center gap-2", isRedeemed && "opacity-60")}>
                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                                        {customer.name.substring(0,2).toUpperCase()}
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
                                        <DropdownMenuItem onClick={() => window.open(`#/card/${card.uniqueId}`, '_blank')}>
                                            <ExternalLink className="mr-2 h-4 w-4" /> Public Link
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                            className="text-red-600"
                                            onClick={() => handleRevokeCard(customer.id, card.id)}
                                        >
                                            <Trash className="mr-2 h-4 w-4" /> Revoke
                                        </DropdownMenuItem>
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
