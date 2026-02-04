import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ClipboardList, Plus, Settings, BarChart3, Tv, Users, LogOut, Menu, Receipt } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import eeLogo from '@/assets/ee_logga.png';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: '/', label: 'Ordrar', icon: ClipboardList },
  { to: '/create', label: 'Ny order', icon: Plus, requiresProduction: true },
  { to: '/steps', label: 'Inställningar', icon: Settings, requiresProduction: true },
  { to: '/statistics', label: 'Statistik', icon: BarChart3, requiresProduction: true },
  { to: '/production', label: 'Produktion', icon: Tv },
  { to: '/prices', label: 'Prislista', icon: Receipt, requiresProduction: true },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isAdmin, isProduction } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    const { signOut } = useAuth();
    await signOut();
    navigate('/login');
  };

  // Filter nav items based on role
  const visibleNavItems = navItems.filter(item => {
    if (item.requiresProduction && !isProduction) return false;
    return true;
  });

  const NavLinks = ({ onClick, isMobile }: { onClick?: () => void; isMobile?: boolean }) => (
    <>
      {visibleNavItems.map(item => {
        const Icon = item.icon;
        const isActive = location.pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClick}
            className={cn(
              isMobile 
                ? 'flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-base'
                : 'flex items-center justify-center p-2 rounded-sm transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}
            title={item.label}
          >
            <Icon className="h-5 w-5" />
            {isMobile && <span>{item.label}</span>}
          </Link>
        );
      })}
      
      {/* Admin link - only for admins */}
      {isAdmin && (
        <Link
          to="/admin"
          onClick={onClick}
          className={cn(
            isMobile 
              ? 'flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-base'
              : 'flex items-center justify-center p-2 rounded-sm transition-colors',
            location.pathname === '/admin'
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          )}
          title="Admin"
        >
          <Users className="h-5 w-5" />
          {isMobile && <span>Admin</span>}
        </Link>
      )}
    </>
  );

  const { signOut } = useAuth();
  
  const handleSignOutClick = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-3">
              <img src={eeLogo} alt="EE Logo" className="h-8 md:h-10 w-auto" />
              <span className="font-bold text-base md:text-lg tracking-tight">Orderhantering</span>
            </Link>
            
            {/* Desktop navigation */}
            <div className="hidden md:flex items-center gap-1">
              <nav className="flex items-center gap-1">
                <NavLinks />
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
                  onClick={handleSignOutClick}
                  className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Mobile: hamburger + logout */}
            <div className="flex md:hidden items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOutClick}
                className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-[280px] bg-sidebar text-sidebar-foreground">
          <SheetHeader>
            <SheetTitle className="text-sidebar-foreground">Meny</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 mt-6">
            <NavLinks onClick={() => setMobileMenuOpen(false)} isMobile />
          </nav>
          <div className="mt-6 pt-6 border-t border-sidebar-border">
            <p className="text-sm text-sidebar-foreground/70 px-3">
              Inloggad som: {profile?.full_name || profile?.email}
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
