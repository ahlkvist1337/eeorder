import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Loader2, UserPlus } from 'lucide-react';
import type { AppRole, Profile, UserWithRole } from '@/types/auth';

const roleLabels: Record<AppRole, string> = {
  admin: 'Admin',
  redigera: 'Redigera',
  lasa: 'Läsa',
};

const roleBadgeVariants: Record<AppRole, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  redigera: 'secondary',
  lasa: 'outline',
};

export default function AdminPanel() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state for new user
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('lasa');

  const fetchUsers = async () => {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with their roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => ({
        ...profile as Profile,
        roles: (allRoles || [])
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role as AppRole),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Kunde inte hämta användare');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) {
      toast.error('E-post och lösenord krävs');
      return;
    }

    setIsCreating(true);

    try {
      // Create user via edge function to avoid session switching
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newEmail,
          password: newPassword,
          full_name: newFullName,
          role: newRole,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Användare skapad');
      setIsCreateDialogOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      setNewRole('lasa');
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Kunde inte skapa användare');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: isActive } : u))
      );

      toast.success(isActive ? 'Användare aktiverad' : 'Användare inaktiverad');
    } catch (error) {
      console.error('Error toggling user active state:', error);
      toast.error('Kunde inte uppdatera användare');
    }
  };

  const handleChangeRole = async (userId: string, newRole: AppRole) => {
    try {
      // Delete existing roles for user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insert new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (insertError) throw insertError;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, roles: [newRole] } : u))
      );

      toast.success('Roll uppdaterad');
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('Kunde inte ändra roll');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Laddar användare...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Användarhantering</h1>
            <p className="text-muted-foreground">
              {users.length} {users.length === 1 ? 'användare' : 'användare'} totalt
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Skapa användare
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Skapa ny användare</DialogTitle>
                <DialogDescription>
                  Fyll i uppgifterna för den nya användaren
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-email">E-post *</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="namn@exempel.se"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Lösenord *</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minst 6 tecken"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-name">Namn</Label>
                  <Input
                    id="new-name"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Förnamn Efternamn"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-role">Roll</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="redigera">Redigera</SelectItem>
                      <SelectItem value="lasa">Läsa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Avbryt
                </Button>
                <Button onClick={handleCreateUser} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Skapar...
                    </>
                  ) : (
                    'Skapa användare'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Namn</TableHead>
                <TableHead>E-post</TableHead>
                <TableHead>Roll</TableHead>
                <TableHead className="text-center">Aktiv</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name || '-'}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={user.roles[0] || 'lasa'}
                      onValueChange={(v) => handleChangeRole(user.id, v as AppRole)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue>
                          <Badge variant={roleBadgeVariants[user.roles[0] || 'lasa']}>
                            {roleLabels[user.roles[0] || 'lasa']}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="redigera">Redigera</SelectItem>
                        <SelectItem value="lasa">Läsa</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={user.is_active}
                      onCheckedChange={(checked) =>
                        handleToggleActive(user.id, checked)
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Inga användare hittades
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-3">
          {users.map((user) => (
            <div key={user.id} className="border rounded-lg p-4 bg-card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{user.full_name || '-'}</p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Aktiv</span>
                  <Switch
                    checked={user.is_active}
                    onCheckedChange={(checked) =>
                      handleToggleActive(user.id, checked)
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Roll:</span>
                <Select
                  value={user.roles[0] || 'lasa'}
                  onValueChange={(v) => handleChangeRole(user.id, v as AppRole)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue>
                      <Badge variant={roleBadgeVariants[user.roles[0] || 'lasa']}>
                        {roleLabels[user.roles[0] || 'lasa']}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="redigera">Redigera</SelectItem>
                    <SelectItem value="lasa">Läsa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              Inga användare hittades
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
