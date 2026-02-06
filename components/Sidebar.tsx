import React from 'react';
import { LayoutDashboard, Users, CreditCard, Settings, LogOut, PlusCircle, Wallet, History } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { NavLink, useNavigate } from 'react-router-dom';

interface SidebarProps {
  className?: string;
}

export const NAV_ITEMS = [
  { path: '/', label: 'Campaigns', icon: CreditCard },
  { path: '/issued-cards', label: 'Issued Cards', icon: Wallet },
  { path: '/transactions', label: 'Transactions', icon: History },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/analytics', label: 'Analytics', icon: LayoutDashboard },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const SidebarContent: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <div className="space-y-4 py-4 h-full relative">
      <div className="px-3 py-2">
        <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
          Loyalty App
        </h2>
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
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
        </div>
      </div>
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
      <div className="absolute bottom-4 left-4 right-4">
         <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive">
            <LogOut size={20} />
            Log Out
         </Button>
      </div>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  return (
    <div className={cn("pb-12 min-h-screen w-64 border-r bg-card hidden md:block", className)}>
      <SidebarContent />
    </div>
  );
};
