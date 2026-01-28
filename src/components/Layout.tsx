import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ClipboardList, Plus, Settings, BarChart3, Tv, Users, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import eeLogo from '@/assets/ee_logga.png';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: '/', label: 'Ordrar', icon: ClipboardList },
  { to: '/create', label: 'Ny order', icon: Plus, requiresEdit: true },
  { to: '/steps', label: 'Behandlingssteg', icon: Settings },
  { to: '/statistics', label: 'Statistik', icon: BarChart3 },
  { to: '/production', label: 'Produktion', icon: Tv },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isAdmin, canEdit, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Filter nav items based on role
  const visibleNavItems = navItems.filter(item => {
    if (item.requiresEdit && !canEdit) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-3">
              <img src={eeLogo} alt="EE Logo" className="h-8 w-auto" />
              <span className="font-bold text-lg tracking-tight">Orderhantering</span>
            </Link>
            
            <div className="flex items-center gap-1">
              {/* Navigation */}
              <nav className="flex items-center gap-1">
                {visibleNavItems.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
                
                {/* Admin link - only for admins */}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-medium transition-colors',
                      location.pathname === '/admin'
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )}
                  >
                    <Users className="h-4 w-4" />
                    Admin
                  </Link>
                )}
              </nav>

              {/* Divider */}
              <div className="w-px h-6 bg-sidebar-border mx-2" />

              {/* User info and logout */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-sidebar-foreground/70">
                  {profile?.full_name || profile?.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
