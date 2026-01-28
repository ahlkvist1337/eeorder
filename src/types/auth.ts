export type AppRole = 'admin' | 'redigera' | 'lasa';

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
