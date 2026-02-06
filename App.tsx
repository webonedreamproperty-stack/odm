import React, { useEffect, useRef, useState } from 'react';
import { LoyaltyCard } from './components/LoyaltyCard';
import { CardEditor } from './components/CardEditor';
import { Sidebar, NAV_ITEMS, SidebarContent } from './components/Sidebar';
import { MyCards } from './components/MyCards';
import { IssuedCardsPage } from './components/IssuedCardsPage';
import { CustomerDirectory } from './components/CustomerDirectory';
import { TemplatesGallery } from './components/TemplatesGallery';
import { TransactionsPage } from './components/TransactionsPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { Template, Customer, IssuedCard, StoredTemplate } from './types';
import { INITIAL_CUSTOMERS } from './data/mockData';
import { templates } from './data/templates';
import { HashRouter, Routes, Route, Outlet, useParams, useNavigate, Navigate, useSearchParams, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { fromStoredTemplate, resolveCardTemplate, toStoredTemplate } from './lib/templateSerialization';
import { cn } from './lib/utils';

const STORAGE_KEYS = {
  campaigns: 'cookees.campaigns.v1',
  customers: 'cookees.customers.v1'
};

const DEFAULT_CREATED_CARDS: Template[] = [
  { ...templates[0], id: 'camp-001' },
  { ...templates[2], id: 'camp-002' }
];

const loadFromStorage = <T,>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const saveToStorage = <T,>(key: string, value: T) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Swallow storage errors (quota, privacy modes, etc.)
  }
};

// Wrapper for Public Card View to handle params logic
const PublicCardWrapper: React.FC<{ customers: Customer[]; templates: Template[] }> = ({ customers, templates }) => {
    const { uniqueId } = useParams<{ uniqueId: string }>();
    
    // Find customer and specific card
    let foundCustomer: Customer | undefined;
    let foundCard: IssuedCard | undefined;
    
    for (const c of customers) {
        const card = c.cards.find(card => card.uniqueId === uniqueId);
        if (card) {
            foundCustomer = c;
            foundCard = card;
            break;
        }
    }

    if (!foundCustomer || !foundCard) {
        return <div className="h-screen flex items-center justify-center text-muted-foreground">Card not found.</div>;
    }

    const template = resolveCardTemplate(foundCard, templates);
    if (!template) {
        return <div className="h-screen flex items-center justify-center text-muted-foreground">Campaign template not found.</div>;
    }

    const isRedeemed = foundCard.status === 'Redeemed';

    return (
        <div className="min-h-screen w-full bg-gray-100 relative flex flex-col items-center justify-center animate-fade-in">
             <div className="w-full min-h-[100dvh] flex items-center justify-center p-0 relative">
                <div className={cn(
                    "w-full h-[100dvh] md:w-full md:h-[100dvh] md:rounded-none md:shadow-none md:ring-0",
                    isRedeemed && "opacity-50 grayscale-[0.6] pointer-events-none"
                )}>
                    <LoyaltyCard 
                        template={template}
                        mode="public"
                        readOnly={true}
                        currentStamps={foundCard.stamps}
                        customerName={foundCustomer.name}
                        cardId={foundCard.uniqueId}
                        className="h-full w-full"
                        history={foundCard.history}
                        isRedeemed={isRedeemed}
                    />
                </div>
                {isRedeemed && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center">
                    <div className="mx-6 w-full max-w-sm rounded-2xl bg-white/90 backdrop-blur-md shadow-xl border border-gray-200 p-6 text-center">
                      <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <Lock size={22} className="text-gray-600" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">Redeemed</h2>
                      <p className="mt-1 text-sm text-gray-600">This card is closed.</p>
                      <div className="mt-3 text-xs text-gray-500 font-mono">
                        Card ID: {foundCard.uniqueId}
                      </div>
                    </div>
                  </div>
                )}
             </div>
        </div>
    );
};

// Wrapper for Active Card View (Business Owner View)
const ActiveCardWrapper: React.FC<{ templates: Template[] }> = ({ templates }) => {
    const { cardId } = useParams<{ cardId: string }>();
    const navigate = useNavigate();
    const template = templates.find(t => t.id === cardId);

    if (!template) return <Navigate to="/" />;

    return (
        <div className="h-screen w-full bg-background relative flex flex-col items-center justify-center animate-fade-in">
            <button 
                onClick={() => navigate('/')}
                className="absolute top-6 left-6 z-50 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors backdrop-blur-sm"
                title="Close"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
            <LoyaltyCard 
                template={template}
                mode="active"
                className="h-full w-full"
            />
        </div>
    );
}

// Wrapper for Preview View
const PreviewWrapper: React.FC<{ }> = () => {
    const { templateId } = useParams<{ templateId: string }>();
    const navigate = useNavigate();
    const template = templates.find(t => t.id === templateId);

    if (!template) return <Navigate to="/gallery" />;

    return (
      <div className="h-screen w-full">
        <LoyaltyCard 
          template={template}
          mode="preview"
          onBack={() => navigate('/gallery')}
          onCreate={() => navigate(`/editor/new?templateId=${templateId}`)}
          className="h-full w-full"
        />
      </div>
    );
}

// Wrapper for Editor
const EditorWrapper: React.FC<{ onSave: (t: Template) => void, templates: Template[] }> = ({ onSave, templates: createdTemplates }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    let initialTemplate: Template | undefined;

    if (id === 'new') {
        const baseId = searchParams.get('templateId');
        initialTemplate = templates.find(t => t.id === baseId);
        // Default fallback
        if (!initialTemplate) initialTemplate = templates[0];
    } else {
        initialTemplate = createdTemplates.find(t => t.id === id);
    }

    if (!initialTemplate) return <Navigate to="/" />;

    return (
        <CardEditor 
            initialTemplate={initialTemplate} 
            onSave={(t) => { onSave(t); navigate('/'); }}
        />
    );
}

// Layout Component including Sidebar
const DashboardLayout: React.FC = () => {
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const location = useLocation();

    const activeTitle = NAV_ITEMS.find((item) => item.path === location.pathname)?.label ?? "Dashboard";

    return (
        <div className="flex min-h-screen bg-background font-sans">
            <Sidebar />
            <main className="flex-1 overflow-hidden h-screen relative">
                <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b bg-white/90 backdrop-blur-sm">
                    <button
                        className="h-10 w-10 inline-flex items-center justify-center rounded-full border border-amber-100 bg-white shadow-sm"
                        onClick={() => setIsMobileNavOpen(true)}
                        aria-label="Open navigation menu"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="text-sm font-semibold">{activeTitle}</div>
                    <div className="h-10 w-10" />
                </div>

                <div className={cn(
                    "fixed inset-0 z-50 md:hidden transition-opacity duration-200",
                    isMobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0"
                )}>
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setIsMobileNavOpen(false)}
                    />
                    <div className={cn(
                        "absolute left-0 top-0 h-full w-72 bg-card shadow-2xl border-r transition-transform duration-200",
                        isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
                    )}>
                        <div className="flex items-center justify-between px-4 py-4 border-b">
                            <span className="text-sm font-semibold">Menu</span>
                            <button
                                className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-slate-200"
                                onClick={() => setIsMobileNavOpen(false)}
                                aria-label="Close navigation menu"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                                </svg>
                            </button>
                        </div>
                        <SidebarContent onNavigate={() => setIsMobileNavOpen(false)} />
                    </div>
                </div>

                <Outlet />
            </main>
        </div>
    );
}

const App: React.FC = () => {
  const [createdCards, setCreatedCards] = useState<Template[]>(() => {
    const stored = loadFromStorage<StoredTemplate[]>(STORAGE_KEYS.campaigns);
    if (!stored || stored.length === 0) return DEFAULT_CREATED_CARDS;
    return stored.map(fromStoredTemplate);
  });
  
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const stored = loadFromStorage<Customer[]>(STORAGE_KEYS.customers);
    return stored && stored.length > 0 ? stored : INITIAL_CUSTOMERS;
  });

  const hasBackfilledSnapshots = useRef(false);

  useEffect(() => {
    if (hasBackfilledSnapshots.current) return;
    hasBackfilledSnapshots.current = true;

    // Backfill template snapshots for existing cards once (keeps issued designs fixed).
    let changed = false;
    const nextCustomers = customers.map((customer) => {
      const nextCards = customer.cards.map((card) => {
        if (card.templateSnapshot) return card;
        const campaign = createdCards.find((c) => c.id === card.campaignId);
        if (!campaign) return card;
        changed = true;
        return { ...card, templateSnapshot: toStoredTemplate(campaign) };
      });
      return nextCards === customer.cards ? customer : { ...customer, cards: nextCards };
    });

    if (changed) {
      setCustomers(nextCustomers);
    }
  }, [createdCards, customers]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.campaigns, createdCards.map(toStoredTemplate));
  }, [createdCards]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.customers, customers);
  }, [customers]);

  const handleSaveCard = (template: Template) => {
    const isNew = !createdCards.find(c => c.id === template.id);
    if (isNew) {
        // Assign new ID if it was a new creation (it might still have the template ID if just edited from template)
        // Check if ID already exists in createdCards (collision with template ID or previous ID)
        const newCard = { ...template, id: `custom-${Date.now()}` };
        setCreatedCards([...createdCards, newCard]);
    } else {
        setCreatedCards(prev => prev.map(c => c.id === template.id ? template : c));
    }
  };

  const handleDeleteCard = (cardId: string) => {
    setCreatedCards(prev => prev.filter(c => c.id !== cardId));
  };

  return (
    <HashRouter>
        <Routes>
            {/* Public Routes */}
            <Route path="/card/:uniqueId" element={<PublicCardWrapper customers={customers} templates={createdCards} />} />
            
            {/* Full Screen App Routes */}
            <Route path="/active/:cardId" element={<ActiveCardWrapper templates={createdCards} />} />
            <Route path="/preview/:templateId" element={<PreviewWrapper />} />
            <Route path="/editor/:id" element={<EditorWrapper onSave={handleSaveCard} templates={createdCards} />} />

            {/* Dashboard Routes with Sidebar */}
            <Route element={<DashboardLayout />}>
                <Route path="/" element={<MyCards cards={createdCards} onDeleteCard={handleDeleteCard} />} />
                <Route path="/issued-cards" element={<IssuedCardsPage customers={customers} campaigns={createdCards} setCustomers={setCustomers} />} />
                <Route path="/transactions" element={<TransactionsPage customers={customers} />} />
                <Route path="/customers" element={<CustomerDirectory customers={customers} setCustomers={setCustomers} />} />
                <Route path="/gallery" element={<TemplatesGallery />} />
                <Route path="/analytics" element={<AnalyticsPage customers={customers} campaigns={createdCards} />} />
                <Route path="/settings" element={<div className="flex items-center justify-center h-full text-muted-foreground">Settings Coming Soon</div>} />
            </Route>
        </Routes>
    </HashRouter>
  );
};

export default App;
