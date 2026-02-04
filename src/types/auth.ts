export type AppRole = 'admin' | 'produktion' | 'utforare';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface UserWithRole extends Profile {
  roles: AppRole[];
}

// Role labels in Swedish
export const roleLabels: Record<AppRole, string> = {
  admin: 'Admin',
  produktion: 'Produktion',
  utforare: 'Utförare',
};

// Role descriptions for admin panel
export const roleDescriptions: Record<AppRole, string> = {
  admin: 'Full kontroll över ordrar, priser, fakturering och användare',
  produktion: 'Planerar produktion, skapar arbetskort, hanterar flöde',
  utforare: 'Rapporterar arbete, markerar steg som klara',
};

// Badge variants for roles
export const roleBadgeVariants: Record<AppRole, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  produktion: 'secondary',
  utforare: 'outline',
};
