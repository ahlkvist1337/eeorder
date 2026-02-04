import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, UserPlus, MoreHorizontal, Trash2, KeyRound, Pencil } from 'lucide-react';
import type { AppRole, Profile, UserWithRole } from '@/types/auth';
import { useAuth } from '@/contexts/AuthContext';

import { roleLabels, roleBadgeVariants } from '@/types/auth';

export default function AdminPanel() {
  useDocumentTitle('Admin');
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state for new user
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('utforare');

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Password reset state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<UserWithRole | null>(null);
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Edit user state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserWithRole | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isEditingUser, setIsEditingUser] = useState(false);

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
      setNewRole('utforare');
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

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'delete',
          userId: userToDelete.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Användare raderad');
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Kunde inte radera användare');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!userToResetPassword || !newUserPassword) return;

    if (newUserPassword.length < 6) {
      toast.error('Lösenordet måste vara minst 6 tecken');
      return;
    }

    setIsResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'resetPassword',
          userId: userToResetPassword.id,
          newPassword: newUserPassword,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Lösenord uppdaterat');
      setPasswordDialogOpen(false);
      setUserToResetPassword(null);
      setNewUserPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || 'Kunde inte uppdatera lösenord');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const openDeleteDialog = (userItem: UserWithRole) => {
    setUserToDelete(userItem);
    setDeleteDialogOpen(true);
  };

  const openPasswordDialog = (userItem: UserWithRole) => {
    setUserToResetPassword(userItem);
    setNewUserPassword('');
    setPasswordDialogOpen(true);
  };

  const openEditDialog = (userItem: UserWithRole) => {
    setUserToEdit(userItem);
    setEditFullName(userItem.full_name || '');
    setEditEmail(userItem.email);
    setEditDialogOpen(true);
  };

  const handleEditUser = async () => {
    if (!userToEdit) return;

    // Basic validation
    if (!editEmail.trim()) {
      toast.error('E-post krävs');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail)) {
      toast.error('Ogiltig e-postadress');
      return;
    }

    if (editFullName.length > 100) {
      toast.error('Namnet får max vara 100 tecken');
      return;
    }

    setIsEditingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'updateProfile',
          userId: userToEdit.id,
          fullName: editFullName.trim(),
          email: editEmail.trim(),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Användare uppdaterad');
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userToEdit.id
            ? { ...u, full_name: editFullName.trim(), email: editEmail.trim() }
            : u
        )
      );
      setEditDialogOpen(false);
      setUserToEdit(null);
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Kunde inte uppdatera användare');
    } finally {
      setIsEditingUser(false);
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
                      <SelectItem value="produktion">Produktion</SelectItem>
                      <SelectItem value="utforare">Utförare</SelectItem>
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
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((userItem) => (
                <TableRow key={userItem.id}>
                  <TableCell className="font-medium">
                    {userItem.full_name || '-'}
                  </TableCell>
                  <TableCell>{userItem.email}</TableCell>
                  <TableCell>
                    <Select
                      value={userItem.roles[0] || 'utforare'}
                      onValueChange={(v) => handleChangeRole(userItem.id, v as AppRole)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue>
                          <Badge variant={roleBadgeVariants[userItem.roles[0] || 'utforare']}>
                            {roleLabels[userItem.roles[0] || 'utforare']}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="produktion">Produktion</SelectItem>
                        <SelectItem value="utforare">Utförare</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={userItem.is_active}
                      onCheckedChange={(checked) =>
                        handleToggleActive(userItem.id, checked)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(userItem)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Redigera
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openPasswordDialog(userItem)}>
                          <KeyRound className="h-4 w-4 mr-2" />
                          Ändra lösenord
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(userItem)}
                          className="text-destructive focus:text-destructive"
                          disabled={userItem.id === user?.id}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Radera användare
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Inga användare hittades
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-3">
          {users.map((userItem) => (
            <div key={userItem.id} className="border rounded-lg p-4 bg-card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{userItem.full_name || '-'}</p>
                  <p className="text-sm text-muted-foreground truncate">{userItem.email}</p>
                </div>
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(userItem)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Redigera
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openPasswordDialog(userItem)}>
                        <KeyRound className="h-4 w-4 mr-2" />
                        Ändra lösenord
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(userItem)}
                        className="text-destructive focus:text-destructive"
                        disabled={userItem.id === user?.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Radera användare
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Roll:</span>
                  <Select
                    value={userItem.roles[0] || 'utforare'}
                    onValueChange={(v) => handleChangeRole(userItem.id, v as AppRole)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue>
                        <Badge variant={roleBadgeVariants[userItem.roles[0] || 'utforare']}>
                          {roleLabels[userItem.roles[0] || 'utforare']}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="produktion">Produktion</SelectItem>
                      <SelectItem value="utforare">Utförare</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Aktiv</span>
                  <Switch
                    checked={userItem.is_active}
                    onCheckedChange={(checked) =>
                      handleToggleActive(userItem.id, checked)
                    }
                  />
                </div>
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Radera användare</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill radera{' '}
              <strong>{userToDelete?.full_name || userToDelete?.email}</strong>?
              <br />
              <br />
              Detta kan inte ångras. Användaren kommer att tas bort permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Raderar...
                </>
              ) : (
                'Radera'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password reset dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ändra lösenord</DialogTitle>
            <DialogDescription>
              Ange ett nytt lösenord för{' '}
              <strong>{userToResetPassword?.full_name || userToResetPassword?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">Nytt lösenord</Label>
              <Input
                id="reset-password"
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Minst 6 tecken"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
              disabled={isResettingPassword}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={isResettingPassword || !newUserPassword}
            >
              {isResettingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sparar...
                </>
              ) : (
                'Spara lösenord'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redigera användare</DialogTitle>
            <DialogDescription>
              Ändra namn och e-post för{' '}
              <strong>{userToEdit?.full_name || userToEdit?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Namn</Label>
              <Input
                id="edit-name"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="Förnamn Efternamn"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">E-post</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="namn@exempel.se"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isEditingUser}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleEditUser}
              disabled={isEditingUser || !editEmail}
            >
              {isEditingUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sparar...
                </>
              ) : (
                'Spara'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
