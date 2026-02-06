import React from 'react';
import { LayoutDashboard, Users, CreditCard, Settings, LogOut, PlusCircle, Wallet, History } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/', label: 'Campaigns', icon: CreditCard },
    { path: '/issued-cards', label: 'Issued Cards', icon: Wallet },
    { path: '/transactions', label: 'Transactions', icon: History },
    { path: '/customers', label: 'Customers', icon: Users },
    { path: '/analytics', label: 'Analytics', icon: LayoutDashboard },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className={cn("pb-12 min-h-screen w-64 border-r bg-card hidden md:block", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Loyalty App
          </h2>
          <div className="space-y-1">
            {menuItems.map((item) => (
              <NavLink to={item.path} key={item.path}>
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
                onClick={() => navigate('/gallery')}
             >
                <PlusCircle size={20} />
                Create New Campaign
             </Button>
          </div>
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