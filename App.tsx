import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Sidebar, NAV_ITEMS, SidebarContent } from './components/Sidebar';
import { Template, Customer, IssuedCard } from './types';
import { templates } from './data/templates';
import { BrowserRouter, Routes, Route, Outlet, useParams, useNavigate, Navigate, useSearchParams, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { toStoredTemplate, fromStoredTemplate } from './lib/templateSerialization';
import { cn } from './lib/utils';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { RequireAuth } from './components/RequireAuth';
import { RequireRole } from './components/RequireRole';
import { VerifyBanner } from './components/VerifyBanner';
import { fetchCampaigns, upsertCampaign, deleteCampaign as dbDeleteCampaign } from './lib/db/campaigns';
import { fetchCustomersWithCards } from './lib/db/customers';
import { isSupabaseConfigured, SUPABASE_CONFIG_ERROR, supabase } from './lib/supabase';
import { useSubscription } from './lib/useSubscription';
import { SubscriptionProvider } from './components/SubscriptionContext';
import { UpgradePrompt } from './components/UpgradePrompt';

const LoyaltyCard = lazy(() => import('./components/LoyaltyCard').then((module) => ({ default: module.LoyaltyCard })));
const CardEditor = lazy(() => import('./components/CardEditor').then((module) => ({ default: module.CardEditor })));
const MyCards = lazy(() => import('./components/MyCards').then((module) => ({ default: module.MyCards })));
const IssuedCardsPage = lazy(() => import('./components/IssuedCardsPage').then((module) => ({ default: module.IssuedCardsPage })));
const CustomerDirectory = lazy(() => import('./components/CustomerDirectory').then((module) => ({ default: module.CustomerDirectory })));
const TemplatesGallery = lazy(() => import('./components/TemplatesGallery').then((module) => ({ default: module.TemplatesGallery })));
const TransactionsPage = lazy(() => import('./components/TransactionsPage').then((module) => ({ default: module.TransactionsPage })));
const AnalyticsPage = lazy(() => import('./components/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })));
const LoginPage = lazy(() => import('./components/LoginClassicPage').then((module) => ({ default: module.LoginClassicPage })));
const SignupPage = lazy(() => import('./components/SignupClassicPage').then((module) => ({ default: module.SignupClassicPage })));
const StaffLoginPage = lazy(() => import('./components/StaffLoginPage').then((module) => ({ default: module.StaffLoginPage })));
const SettingsPage = lazy(() => import('./components/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const LandingPage = lazy(() => import('./components/LandingPage').then((module) => ({ default: module.LandingPage })));
const ForgotPasswordPage = lazy(() => import('./components/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const DashboardPage = lazy(() => import('./components/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const GettingStartedArticlePage = lazy(() => import('./components/GettingStartedArticlePage').then((module) => ({ default: module.GettingStartedArticlePage })));
const ShowcasePage = lazy(() => import('./components/ShowcasePage').then((module) => ({ default: module.ShowcasePage })));

const RouteLoader: React.FC = () => (
  <div className="flex min-h-[40vh] w-full items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const withSuspense = (node: React.ReactNode) => (
  <Suspense fallback={<RouteLoader />}>
    {node}
  </Suspense>
);

const PublicCardWrapper: React.FC = () => {
  const { slug, uniqueId } = useParams<{ slug: string; uniqueId: string }>();
  const [loading, setLoading] = useState(true);
  const [cardData, setCardData] = useState<{
    card: IssuedCard;
    customer: Customer;
    template: Template;
  } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !slug || !uniqueId) { setLoading(false); return; }
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
        email: '',
        status: 'Active',
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
    return (
      <div className="h-screen flex items-center justify-center px-6 text-center text-muted-foreground">
        {isSupabaseConfigured ? 'Card not found.' : SUPABASE_CONFIG_ERROR}
      </div>
    );
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
          {withSuspense(
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
          )}
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
      {withSuspense(
        <LoyaltyCard
          template={template}
          mode="active"
          className="h-full w-full"
        />
      )}
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
      {withSuspense(
        <LoyaltyCard
          template={template}
          mode="preview"
          onBack={() => navigate('/gallery')}
          onCreate={() => navigate(`/editor/new?templateId=${templateId}`)}
          className="h-full w-full"
        />
      )}
    </div>
  );
};

const EditorWrapper: React.FC<{ onSave: (t: Template) => Promise<void>; templates: Template[] }> = ({ onSave, templates: createdTemplates }) => {
  const { id } = useParams<{ id: string }>();
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
    withSuspense(
      <CardEditor
        initialTemplate={initialTemplate}
        onSave={onSave}
      />
    )
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
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'campaign' | 'card' | 'staff' | undefined>();

  const sub = useSubscription(createdCards, customers);

  const loadData = useCallback(async (ownerId: string) => {
    const [storedCampaigns, storedCustomers] = await Promise.all([
      fetchCampaigns(ownerId),
      fetchCustomersWithCards(ownerId),
    ]);
    setCreatedCards(storedCampaigns.map(fromStoredTemplate));
    setCustomers(storedCustomers);
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
    if (!currentOwner) {
      throw new Error('No active owner account found.');
    }
    const isNew = !createdCards.find(c => c.id === template.id);
    if (isNew && !sub.canCreateCampaign) {
      showUpgrade('campaign');
      throw new Error('Upgrade required to create more campaigns.');
    }
    const saved = isNew ? { ...template, id: `custom-${Date.now()}` } : template;
    const stored = toStoredTemplate(saved);
    const result = await upsertCampaign(stored, currentOwner.id);
    if (!result.ok) {
      throw new Error(result.error ?? 'Failed to save the campaign.');
    }

    if (isNew) {
      setCreatedCards(prev => [...prev, saved]);
    } else {
      setCreatedCards(prev => prev.map(c => c.id === saved.id ? saved : c));
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    const result = await dbDeleteCampaign(cardId);
    if (!result.ok) {
      throw new Error(result.error ?? 'Failed to delete the campaign.');
    }
    setCreatedCards(prev => prev.filter(c => c.id !== cardId));
  };

  return (
    <SubscriptionProvider value={sub}>
      {!isSupabaseConfigured && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {SUPABASE_CONFIG_ERROR}
        </div>
      )}
      <UpgradePrompt
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason={upgradeReason}
        currentUsage={{ campaigns: sub.campaignCount, cards: sub.issuedCardCount, staff: sub.staffCount }}
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={withSuspense(<LandingPage />)} />
        <Route path="/showcase" element={withSuspense(<ShowcasePage />)} />
        <Route path="/articles/getting-started" element={withSuspense(<GettingStartedArticlePage />)} />
        <Route path="/:slug/staff" element={withSuspense(<StaffLoginPage />)} />
        <Route path="/:slug/:uniqueId" element={<PublicCardWrapper />} />
        <Route path="/login" element={withSuspense(<LoginPage />)} />
        <Route path="/signup" element={withSuspense(<SignupPage />)} />
        <Route path="/forgot-password" element={withSuspense(<ForgotPasswordPage />)} />

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
                withSuspense(<DashboardPage campaigns={createdCards} customers={customers} />)
              } />
              <Route path="/campaigns" element={
                withSuspense(<MyCards cards={createdCards} onDeleteCard={handleDeleteCard} onUpgrade={() => showUpgrade('campaign')} />)
              } />
              <Route path="/gallery" element={withSuspense(<TemplatesGallery />)} />
              <Route path="/analytics" element={withSuspense(<AnalyticsPage customers={customers} campaigns={createdCards} />)} />
              <Route path="/transactions" element={withSuspense(<TransactionsPage customers={customers} />)} />
              <Route path="/settings" element={withSuspense(<SettingsPage onUpgrade={() => showUpgrade('staff')} />)} />
            </Route>

            <Route element={<RequireRole allowed={["owner", "staff"]} />}>
              <Route path="/issued-cards" element={
                withSuspense(
                  <IssuedCardsPage
                    customers={customers}
                    campaigns={createdCards}
                    setCustomers={setCustomers}
                    refreshData={refreshData}
                    onUpgrade={() => showUpgrade('card')}
                  />
                )
              } />
              <Route path="/customers" element={
                withSuspense(
                  <CustomerDirectory
                    customers={customers}
                    setCustomers={setCustomers}
                    readOnly={isStaff}
                    refreshData={refreshData}
                  />
                )
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
