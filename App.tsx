import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LoyaltyCard } from './components/LoyaltyCard';
import { CardEditor } from './components/CardEditor';
import { Sidebar, NAV_ITEMS, SidebarContent } from './components/Sidebar';
import { MyCards } from './components/MyCards';
import { IssuedCardsPage } from './components/IssuedCardsPage';
import { CustomerDirectory } from './components/CustomerDirectory';
import { TemplatesGallery } from './components/TemplatesGallery';
import { TransactionsPage } from './components/TransactionsPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { Template, Customer, IssuedCard } from './types';
import { templates } from './data/templates';
import { BrowserRouter, Routes, Route, Outlet, useParams, useNavigate, Navigate, useSearchParams, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { resolveCardTemplate, toStoredTemplate, fromStoredTemplate } from './lib/templateSerialization';
import { cn } from './lib/utils';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { RequireAuth } from './components/RequireAuth';
import { RequireRole } from './components/RequireRole';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { StaffLoginPage } from './components/StaffLoginPage';
import { VerifyBanner } from './components/VerifyBanner';
import { SettingsPage } from './components/SettingsPage';
import { LandingPage } from './components/LandingPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { DashboardPage } from './components/DashboardPage';
import { fetchCampaigns, upsertCampaign, deleteCampaign as dbDeleteCampaign } from './lib/db/campaigns';
import { fetchCustomersWithCards } from './lib/db/customers';
import { supabase } from './lib/supabase';
import { useSubscription } from './lib/useSubscription';
import { SubscriptionProvider } from './components/SubscriptionContext';
import { UpgradePrompt } from './components/UpgradePrompt';

const PublicCardWrapper: React.FC = () => {
  const { slug, uniqueId } = useParams<{ slug: string; uniqueId: string }>();
  const [loading, setLoading] = useState(true);
  const [cardData, setCardData] = useState<{
    card: IssuedCard;
    customer: Customer;
    template: Template;
  } | null>(null);

  useEffect(() => {
    if (!slug || !uniqueId) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase.rpc('get_public_card', {
        slug_input: slug,
        card_unique_id: uniqueId,
      });
      if (error || !data) { setLoading(false); return; }

      const card: IssuedCard = {
        id: data.card.id,
        uniqueId: data.card.uniqueId,
        campaignId: data.card.campaignId,
        campaignName: data.card.campaignName,
        stamps: data.card.stamps,
        lastVisit: data.card.lastVisit,
        status: data.card.status,
        completedDate: data.card.completedDate,
        history: data.card.history ?? [],
        templateSnapshot: data.card.templateSnapshot,
      };

      const customer: Customer = {
        id: data.customer.id,
        name: data.customer.name,
        email: data.customer.email,
        mobile: data.customer.mobile,
        status: data.customer.status,
        cards: [card],
      };

      let template: Template | undefined;
      if (card.templateSnapshot) {
        template = fromStoredTemplate(card.templateSnapshot);
      } else if (data.campaign) {
        const stored = {
          id: data.campaign.id,
          name: data.campaign.name,
          description: data.campaign.description ?? '',
          rewardName: data.campaign.reward_name ?? '',
          tagline: data.campaign.tagline,
          backgroundImage: data.campaign.background_image,
          backgroundOpacity: data.campaign.background_opacity,
          logoImage: data.campaign.logo_image,
          showLogo: data.campaign.show_logo,
          titleSize: data.campaign.title_size,
          iconKey: data.campaign.icon_key ?? 'cookie',
          colors: data.campaign.colors,
          totalStamps: data.campaign.total_stamps,
          social: data.campaign.social,
        };
        template = fromStoredTemplate(stored);
      }

      if (template) setCardData({ card, customer, template });
      setLoading(false);
    })();
  }, [slug, uniqueId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!cardData) {
    return <div className="h-screen flex items-center justify-center text-muted-foreground">Card not found.</div>;
  }

  const { card, customer, template } = cardData;
  const isRedeemed = card.status === 'Redeemed';

  return (
    <div className="min-h-screen w-full bg-background relative flex flex-col items-center justify-center animate-fade-in">
      <div className="w-full min-h-[100dvh] flex items-center justify-center p-0 relative">
        <div className={cn(
          "w-full h-[100dvh] md:w-full md:h-[100dvh] md:rounded-none md:shadow-none md:ring-0",
          isRedeemed && "opacity-50 grayscale-[0.6] pointer-events-none"
        )}>
          <LoyaltyCard
            template={template}
            mode="public"
            readOnly={true}
            currentStamps={card.stamps}
            customerName={customer.name}
            cardId={card.uniqueId}
            className="h-full w-full"
            history={card.history}
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
                Card ID: {card.uniqueId}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ActiveCardWrapper: React.FC<{ templates: Template[] }> = ({ templates }) => {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const template = templates.find(t => t.id === cardId);

  if (!template) return <Navigate to="/campaigns" />;

  return (
    <div className="h-screen w-full bg-background relative flex flex-col items-center justify-center animate-fade-in">
      <button
        onClick={() => navigate('/campaigns')}
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
};

const PreviewWrapper: React.FC = () => {
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
};

const EditorWrapper: React.FC<{ onSave: (t: Template) => void; templates: Template[] }> = ({ onSave, templates: createdTemplates }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  let initialTemplate: Template | undefined;

  if (id === 'new') {
    const baseId = searchParams.get('templateId');
    const baseTemplate = templates.find(t => t.id === baseId);
    initialTemplate = baseTemplate
      ? { ...baseTemplate, backgroundOpacity: 80 }
      : undefined;
    if (!initialTemplate && templates[0]) {
      initialTemplate = { ...templates[0], backgroundOpacity: 80 };
    }
  } else {
    initialTemplate = createdTemplates.find(t => t.id === id);
  }

  if (!initialTemplate) return <Navigate to="/campaigns" />;

  return (
    <CardEditor
      initialTemplate={initialTemplate}
      onSave={(t) => { onSave(t); navigate('/campaigns'); }}
    />
  );
};

const DashboardLayout: React.FC = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const location = useLocation();

  const activeTitle = NAV_ITEMS.find((item) => item.path === location.pathname)?.label ?? "Dashboard";

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar
        onScanQr={() => window.dispatchEvent(new Event('open-qr-scan'))}
      />
      <main className="flex-1 overflow-hidden h-screen relative flex flex-col">
        <div className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-border/80 bg-card/95 px-4 py-3 backdrop-blur-sm">
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/80 bg-background shadow-subtle"
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
            "absolute left-0 top-0 h-full w-72 border-r border-border/80 bg-card shadow-panel transition-transform duration-200",
            isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <div className="flex items-center justify-between px-4 py-4 border-b">
              <span className="text-sm font-semibold">Menu</span>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/80"
                onClick={() => setIsMobileNavOpen(false)}
                aria-label="Close navigation menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <SidebarContent
              onNavigate={() => setIsMobileNavOpen(false)}
              onScanQr={() => {
                window.dispatchEvent(new Event('open-qr-scan'));
                setIsMobileNavOpen(false);
              }}
            />
          </div>
        </div>

        <VerifyBanner />
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { currentOwner, isStaff } = useAuth();
  const [createdCards, setCreatedCards] = useState<Template[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'campaign' | 'card' | 'staff' | undefined>();

  const sub = useSubscription(createdCards, customers);

  const loadData = useCallback(async (ownerId: string) => {
    setDataLoading(true);
    const [storedCampaigns, storedCustomers] = await Promise.all([
      fetchCampaigns(ownerId),
      fetchCustomersWithCards(ownerId),
    ]);
    setCreatedCards(storedCampaigns.map(fromStoredTemplate));
    setCustomers(storedCustomers);
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (!currentOwner) {
      setCreatedCards([]);
      setCustomers([]);
      return;
    }
    loadData(currentOwner.id);
  }, [currentOwner?.id, loadData]);

  const refreshData = useCallback(() => {
    if (currentOwner) loadData(currentOwner.id);
  }, [currentOwner, loadData]);

  const showUpgrade = useCallback((reason: 'campaign' | 'card' | 'staff') => {
    setUpgradeReason(reason);
    setUpgradeOpen(true);
  }, []);

  const handleSaveCard = async (template: Template) => {
    if (!currentOwner) return;
    const isNew = !createdCards.find(c => c.id === template.id);
    if (isNew && !sub.canCreateCampaign) {
      showUpgrade('campaign');
      return;
    }
    const saved = isNew ? { ...template, id: `custom-${Date.now()}` } : template;
    const stored = toStoredTemplate(saved);
    const result = await upsertCampaign(stored, currentOwner.id);
    if (result.ok) {
      if (isNew) {
        setCreatedCards(prev => [...prev, saved]);
      } else {
        setCreatedCards(prev => prev.map(c => c.id === saved.id ? saved : c));
      }
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    const result = await dbDeleteCampaign(cardId);
    if (result.ok) {
      setCreatedCards(prev => prev.filter(c => c.id !== cardId));
    }
  };

  return (
    <SubscriptionProvider value={sub}>
      <UpgradePrompt
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason={upgradeReason}
        currentUsage={{ campaigns: sub.campaignCount, cards: sub.issuedCardCount, staff: sub.staffCount }}
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/:slug/staff" element={<StaffLoginPage />} />
        <Route path="/:slug/:uniqueId" element={<PublicCardWrapper />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Authenticated Routes */}
        <Route element={<RequireAuth />}>
          <Route element={<RequireRole allowed={["owner"]} />}>
            <Route path="/active/:cardId" element={<ActiveCardWrapper templates={createdCards} />} />
            <Route path="/preview/:templateId" element={<PreviewWrapper />} />
            <Route path="/editor/:id" element={<EditorWrapper onSave={handleSaveCard} templates={createdCards} />} />
          </Route>

          <Route element={<DashboardLayout />}>
            <Route element={<RequireRole allowed={["owner"]} />}>
              <Route path="/dashboard" element={
                <DashboardPage campaigns={createdCards} customers={customers} />
              } />
              <Route path="/campaigns" element={
                <MyCards cards={createdCards} onDeleteCard={handleDeleteCard} onUpgrade={() => showUpgrade('campaign')} />
              } />
              <Route path="/gallery" element={<TemplatesGallery />} />
              <Route path="/analytics" element={<AnalyticsPage customers={customers} campaigns={createdCards} />} />
              <Route path="/transactions" element={<TransactionsPage customers={customers} />} />
              <Route path="/settings" element={<SettingsPage onUpgrade={() => showUpgrade('staff')} />} />
            </Route>

            <Route element={<RequireRole allowed={["owner", "staff"]} />}>
              <Route path="/issued-cards" element={
                <IssuedCardsPage
                  customers={customers}
                  campaigns={createdCards}
                  setCustomers={setCustomers}
                  refreshData={refreshData}
                  onUpgrade={() => showUpgrade('card')}
                />
              } />
              <Route path="/customers" element={
                <CustomerDirectory
                  customers={customers}
                  setCustomers={setCustomers}
                  readOnly={isStaff}
                  refreshData={refreshData}
                />
              } />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </SubscriptionProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
