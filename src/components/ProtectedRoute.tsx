import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { AppRole } from '@/types/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, roles, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Laddar...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user is active
  if (profile && !profile.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-6">
          <h1 className="text-2xl font-bold text-destructive mb-2">Kontot inaktiverat</h1>
          <p className="text-muted-foreground">
            Ditt konto har inaktiverats. Kontakta administratören för mer information.
          </p>
        </div>
      </div>
    );
  }

  // Check for required role
  if (requiredRole && !roles.includes(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-6">
          <h1 className="text-2xl font-bold text-destructive mb-2">Åtkomst nekad</h1>
          <p className="text-muted-foreground">
            Du har inte behörighet att se denna sida.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
