import React, { useState } from 'react';
import { Customer, IssuedCard, Template, Transaction } from '../types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Search, CreditCard, ChevronRight, UserPlus, CheckCircle2, User, ArrowLeft, Copy, ExternalLink } from "lucide-react";
import { useAuth } from './AuthProvider';
import { buildPublicCardUrl } from '../lib/links';

interface IssueCardDialogProps {
    isOpen: boolean;
    onClose: () => void;
    campaigns: Template[];
    customers: Customer[];
    onIssue: (campaign: Template, customer: Customer | null, newCustomerData: {name: string, email: string, mobile: string}) => IssuedCard;
    preSelectedCampaign?: Template | null;
    preSelectedCustomer?: Customer | null;
}

export const IssueCardDialog: React.FC<IssueCardDialogProps> = ({ 
    isOpen, 
    onClose, 
    campaigns, 
    customers, 
    onIssue,
    preSelectedCampaign = null,
    preSelectedCustomer = null
}) => {
    const { currentOwner } = useAuth();
    const slug = currentOwner?.slug ?? "";
    // State
    const [step, setStep] = useState<'campaign' | 'customer' | 'new-customer' | 'review' | 'success'>('campaign');
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCampaign, setSelectedCampaign] = useState<Template | null>(null);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [newCustomerData, setNewCustomerData] = useState({ name: '', email: '', mobile: '' });
    const [createdCard, setCreatedCard] = useState<IssuedCard | null>(null);
    const publicUrl = createdCard ? buildPublicCardUrl(slug, createdCard.uniqueId) : "";
    const displayUrl = publicUrl.length > 42 ? `${publicUrl.slice(0, 42)}...` : publicUrl;

    // Initial load effect
    React.useEffect(() => {
        if (isOpen) {
            setStep('campaign');
            setSearchQuery("");
            setNewCustomerData({ name: '', email: '', mobile: '' });
            setCreatedCard(null);

            if (preSelectedCampaign && preSelectedCustomer) {
                setSelectedCampaign(preSelectedCampaign);
                setSelectedCustomer(preSelectedCustomer);
                setStep('review');
            } else if (preSelectedCampaign) {
                setSelectedCampaign(preSelectedCampaign);
                setStep('customer');
            } else {
                setSelectedCampaign(null);
                setSelectedCustomer(null);
            }
        }
    }, [isOpen, preSelectedCampaign, preSelectedCustomer]);

    // Filtering
    const filteredCampaigns = campaigns.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Handlers
    const handleSelectCampaign = (c: Template) => {
        setSelectedCampaign(c);
        setSearchQuery("");
        setStep('customer');
    };

    const handleSelectCustomer = (c: Customer) => {
        setSelectedCustomer(c);
        setStep('review');
    };

    const handleCreateNewCustomer = () => {
        setSelectedCustomer(null);
        setNewCustomerData({ name: searchQuery, email: '', mobile: '' });
        setStep('new-customer');
    };

    const handleConfirmIssue = () => {
        if (!selectedCampaign) return;
        const card = onIssue(selectedCampaign, selectedCustomer, newCustomerData);
        setCreatedCard(card);
        setStep('success');
    };

    const handleCopyLink = () => {
        if (!publicUrl) return;
        navigator.clipboard.writeText(publicUrl);
        alert("Link copied to clipboard!");
    };

    const handleOpenLink = () => {
        if (!publicUrl) return;
        window.open(publicUrl, '_blank');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] h-[650px] flex flex-col p-0 gap-0 overflow-hidden transition-all">
                {/* Header */}
                <div className="p-6 border-b bg-muted/20">
                    <DialogTitle className="text-xl">
                        {step === 'campaign' && "Select Campaign"}
                        {step === 'customer' && "Select Customer"}
                        {step === 'new-customer' && "New Customer Details"}
                        {step === 'review' && "Review & Issue"}
                        {step === 'success' && "Card Issued Successfully!"}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'campaign' && "Choose which loyalty card to issue."}
                        {step === 'customer' && `Who should receive the "${selectedCampaign?.name}" card?`}
                        {step === 'new-customer' && "Enter details for the new cardholder."}
                        {step === 'review' && "Confirm details before issuing."}
                        {step === 'success' && "Scan the QR code or share the link below."}
                    </DialogDescription>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-0">
                    {/* STEP 1: CAMPAIGN */}
                    {step === 'campaign' && (
                        <div className="p-4 space-y-4">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search campaigns..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
                            </div>
                            <div className="grid gap-2">
                                {filteredCampaigns.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">No campaigns found.</p> :
                                filteredCampaigns.map(c => (
                                    <button key={c.id} onClick={() => handleSelectCampaign(c)} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left group">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground"><CreditCard size={20} /></div>
                                            <div><p className="font-semibold text-sm">{c.name}</p><p className="text-xs text-muted-foreground">{c.totalStamps} stamps</p></div>
                                        </div>
                                        <ChevronRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"/>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CUSTOMER */}
                    {step === 'customer' && (
                        <div className="p-4 space-y-4">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search existing customers..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
                            </div>
                            <Button variant="outline" className="w-full justify-start gap-2 border-dashed text-primary" onClick={handleCreateNewCustomer}>
                                <UserPlus size={16} /> Create New Customer "{searchQuery}"
                            </Button>
                            <div className="space-y-1">
                                {filteredCustomers.slice(0, 10).map(c => (
                                    <button key={c.id} onClick={() => handleSelectCustomer(c)} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">{c.name.substring(0,2).toUpperCase()}</div>
                                        <div className="flex-1 overflow-hidden"><p className="font-medium text-sm truncate">{c.name}</p><p className="text-xs text-muted-foreground truncate">{c.email}</p></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: NEW CUSTOMER */}
                    {step === 'new-customer' && (
                        <div className="p-6 space-y-4">
                            <div className="grid gap-2"><Label>Full Name</Label><Input value={newCustomerData.name} onChange={(e) => setNewCustomerData({...newCustomerData, name: e.target.value})} autoFocus /></div>
                            <div className="grid gap-2"><Label>Email</Label><Input value={newCustomerData.email} onChange={(e) => setNewCustomerData({...newCustomerData, email: e.target.value})} /></div>
                            <div className="grid gap-2"><Label>Mobile (Optional)</Label><Input value={newCustomerData.mobile} onChange={(e) => setNewCustomerData({...newCustomerData, mobile: e.target.value})} /></div>
                        </div>
                    )}

                    {/* STEP 4: REVIEW */}
                    {step === 'review' && (
                        <div className="p-6 flex flex-col items-center justify-center h-full text-center space-y-6">
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2"><CheckCircle2 size={32} /></div>
                            <div className="space-y-1 w-full"><p className="text-sm text-muted-foreground uppercase tracking-wider">Issuing Card</p><div className="text-xl font-bold">{selectedCampaign?.name}</div></div>
                            <div className="w-full border-t border-b py-4 space-y-1"><p className="text-sm text-muted-foreground uppercase tracking-wider">To Customer</p><div className="text-lg font-semibold flex items-center justify-center gap-2"><User size={18} />{selectedCustomer ? selectedCustomer.name : newCustomerData.name}</div></div>
                        </div>
                    )}

                    {/* STEP 5: SUCCESS (QR CODE) */}
                    {step === 'success' && createdCard && (
                        <div className="flex flex-col items-center justify-center h-full p-6 space-y-6 animate-fade-in">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(publicUrl)}`} 
                                    alt="QR Code" 
                                    className="w-72 h-72 object-contain"
                                />
                            </div>
                            <div className="text-center space-y-2 w-full max-w-xs">
                                <p className="text-sm text-muted-foreground">Scan to access loyalty card</p>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        readOnly 
                                        value={displayUrl || publicUrl} 
                                        className="text-xs font-mono bg-muted/50"
                                    />
                                    <Button size="icon" variant="outline" onClick={handleCopyLink}><Copy size={14} /></Button>
                                    <Button size="icon" variant="outline" onClick={handleOpenLink}><ExternalLink size={14} /></Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-muted/20 flex justify-between">
                    {step === 'campaign' && <Button variant="ghost" onClick={onClose}>Cancel</Button>}
                    
                    {step === 'customer' && <Button variant="outline" onClick={() => setStep('campaign')} className="gap-2"><ArrowLeft size={16} /> Back</Button>}
                    
                    {step === 'new-customer' && (
                        <>
                            <Button variant="outline" onClick={() => setStep('customer')} className="gap-2"><ArrowLeft size={16} /> Back</Button>
                            <Button onClick={() => setStep('review')} disabled={!newCustomerData.name}>Review</Button>
                        </>
                    )}

                    {step === 'review' && (
                        <>
                            <Button variant="outline" onClick={() => setStep(selectedCustomer ? 'customer' : 'new-customer')} className="gap-2"><ArrowLeft size={16} /> Back</Button>
                            <Button onClick={handleConfirmIssue} className="bg-green-600 hover:bg-green-700">Confirm & Issue</Button>
                        </>
                    )}

                    {step === 'success' && (
                        <Button onClick={onClose} className="w-full">Done</Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
