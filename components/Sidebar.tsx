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

export const NAV_ITEMS = [
  { path: '/', label: 'Campaigns', icon: CreditCard, roles: ['owner'] },
  { path: '/issued-cards', label: 'Issued Cards', icon: Wallet, roles: ['owner', 'staff'] },
  { path: '/transactions', label: 'Transactions', icon: History, roles: ['owner'] },
  { path: '/customers', label: 'Customers', icon: Users, roles: ['owner', 'staff'] },
  { path: '/analytics', label: 'Analytics', icon: LayoutDashboard, roles: ['owner'] },
  { path: '/settings', label: 'Settings', icon: Settings, roles: ['owner'] },
];

export const SidebarContent: React.FC<{ onNavigate?: () => void; onScanQr?: () => void }> = ({ onNavigate, onScanQr }) => {
  const navigate = useNavigate();
  const { currentUser, currentOwner, isStaff, logout } = useAuth();

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <div className="space-y-4 py-4 h-full relative">
      <div className="px-3 py-2">
        <div className="mb-2 px-4 flex items-center gap-3">
          <img
            src="/stampverse.svg"
            alt="Stampverse logo"
            className="h-8 w-auto"
          />
          <span className="text-lg font-semibold tracking-tight">Stampverse</span>
        </div>
        <div className="space-y-1">
          {NAV_ITEMS.filter((item) => item.roles.includes(isStaff ? 'staff' : 'owner')).map((item) => (
            <NavLink to={item.path} key={item.path} onClick={onNavigate}>
              {({ isActive }) => (
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2 mb-1"
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
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Actions
          </h2>
          <div className="space-y-1">
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
          <div className="rounded-2xl border bg-white px-3 py-2 text-xs text-muted-foreground shadow-sm">
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
    <div className={cn("pb-12 min-h-screen w-64 border-r bg-card hidden md:block", className)}>
      <SidebarContent onScanQr={onScanQr} />
    </div>
  );
};
