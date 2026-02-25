import React from 'react';
import { LayoutDashboard, Users, CreditCard, Settings, LogOut, PlusCircle, Wallet, History, QrCode } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface SidebarProps {
  className?: string;
  onScanQr?: () => void;
}

interface SidebarContentProps {
  onNavigate?: () => void;
  onScanQr?: () => void;
}

export const NAV_ITEMS = [
  { path: '/', label: 'Campaigns', icon: CreditCard, roles: ['owner'] },
  { path: '/issued-cards', label: 'Issued Cards', icon: Wallet, roles: ['owner', 'staff'] },
  { path: '/transactions', label: 'Transactions', icon: History, roles: ['owner'] },
  { path: '/customers', label: 'Customers', icon: Users, roles: ['owner', 'staff'] },
  { path: '/analytics', label: 'Analytics', icon: LayoutDashboard, roles: ['owner'] },
  { path: '/settings', label: 'Settings', icon: Settings, roles: ['owner'] },
];

export const SidebarContent: React.FC<SidebarContentProps> = ({ onNavigate, onScanQr }) => {
  const navigate = useNavigate();
  const { currentUser, currentOwner, isStaff, logout } = useAuth();

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <div className="relative h-full space-y-8 py-8">
      <div className="px-3 py-2">
        <div className="mb-6 px-4 flex items-center gap-3">
          <img
            src="/stampee.svg"
            alt="Stampee logo"
            className="h-12 w-auto"
          />
        </div>
        <div className="space-y-2">
          {NAV_ITEMS.filter((item) => item.roles.includes(isStaff ? 'staff' : 'owner')).map((item) => (
            <NavLink to={item.path} key={item.path} onClick={onNavigate}>
              {({ isActive }) => (
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2"
                >
                  <item.icon size={20} />
                  {item.label}
                </Button>
              )}
            </NavLink>
          ))}
          {isStaff && (
            <Button
              variant="default"
              className="w-full justify-start gap-2 mt-2"
              onClick={() => {
                onScanQr?.();
                onNavigate?.();
              }}
            >
              <QrCode size={20} />
              Scan QR Code
            </Button>
          )}
        </div>
      </div>
      {!isStaff && (
        <div className="px-3 py-2">
          <h2 className="mb-3 px-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Actions
          </h2>
          <div className="space-y-2">
             <Button 
                variant="default" 
                className="w-full justify-start gap-2"
                onClick={() => handleNavigate('/gallery')}
             >
                <PlusCircle size={20} />
                Create New Campaign
             </Button>
          </div>
        </div>
      )}
      <div className="absolute bottom-4 left-4 right-4 space-y-3">
         {currentUser && (
          <div className="rounded-lg border border-border/80 bg-card px-3 py-3 text-xs text-muted-foreground shadow-subtle">
              <div className="font-semibold text-foreground">{currentUser.businessName}</div>
              <div className="font-mono">@{currentOwner?.slug ?? "staff"}</div>
              {isStaff && <div className="text-[10px] uppercase tracking-widest mt-1">Staff Access</div>}
          </div>
         )}
         <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={() => {
              logout();
              navigate("/login");
            }}
         >
            <LogOut size={20} />
            Log Out
         </Button>
      </div>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ className, onScanQr }) => {
  return (
    <div className={cn("hidden min-h-screen w-72 border-r border-border/80 bg-card pb-8 md:block", className)}>
      <SidebarContent onScanQr={onScanQr} />
    </div>
  );
};
