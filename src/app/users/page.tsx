"use client";

import React, { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, UserPlus, ShieldCheck, FileUp, Search, Download, Key, 
  UserX, UserCheck, CheckCircle, AlertCircle, AlertTriangle, 
  Lock, Edit3, FileSpreadsheet, Fingerprint, RefreshCw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { apiClient } from '@/services/apiClient';

export const SYSTEM_MODULES = [
  { id: 'dashboard.view', label: 'Dashboard' },
  { id: 'tasks.view', label: 'My Tasks' },
  { id: 'tasks.approve', label: 'My Reviews' },
  { id: 'workspace.artist', label: 'Daily Standup' },
  { id: 'teams.view', label: 'Team Tasks' },
  { id: 'workspace.team_lead', label: 'Review Queue' },
  { id: 'workspace.project_manager', label: 'Capacity Planning' },
  { id: 'departments.view', label: 'Department Queue' },
  { id: 'workspace.production_head', label: 'Department Progress' },
  { id: 'artists.view', label: 'Artist Allocation' },
  { id: 'leave.view', label: 'Calendar' },
  { id: 'users.view', label: 'Staff Directory' },
  { id: 'projects.view', label: 'Projects' },
  { id: 'projects.create', label: 'Import Bid Sheet' },
  { id: 'reports.view', label: 'Analytics' },
  { id: 'leave.approve', label: 'Leave Requests' },
  { id: 'notifications.view', label: 'Notifications' },
  { id: 'settings.view', label: 'Profile & Settings' },
];

export default function UserManagementPage() {
  const { 
    currentUser, users, roles, permissions, departments, teams,
    fetchUsers, fetchRoles, fetchPermissions, fetchDepartments, fetchTeams, addUser, toggleUserStatus
  } = useLuminaStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState('registry');

  // Manual Form State
  const [formData, setFormData] = useState({
    name: '', email: '', employeeCode: '', role: 'Artist',
    departmentId: departments[0]?.id?.toString() || '',
    teamId: '', leadId: '',
    username: '', password: '',
    selectedModules: [] as string[]
  });

  // User Permissions Form State
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<any>(null);
  const [userEffectiveModules, setUserEffectiveModules] = useState<string[]>([]); 

  // Load Initial Data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchRoles(), fetchPermissions(), fetchDepartments(), fetchTeams()]);
      setLoading(false);
    };
    load();
  }, [fetchUsers, fetchRoles, fetchPermissions, fetchDepartments, fetchTeams]);

  const isPH = currentUser?.role === 'Production Head' || currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin';
  const isSup = currentUser?.role === 'Project Manager'; 
  const isLead = currentUser?.role === 'Team Lead';

  console.log("USER REGISTRY VERSION: LOGIN ID UI ACTIVE");
  console.log("USERS RUNTIME DATA:", users);
  console.log("CURRENT USER:", currentUser);
  console.log("IS PH:", isPH);

  // FILTERING ENGINE
  const filteredUsers = users.filter(u => {
    const match = u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  u.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  u.name?.toLowerCase().includes(searchTerm.toLowerCase()); 
    if (isPH) return match;
    if (isSup) return match && u.departmentId === currentUser?.departmentId;
    if (isLead) return match && u.leadId === currentUser?.id;
    return false;
  });

  const getPermissionIdByName = (name: string) => {
    return permissions.find(p => p.PermissionName === name)?.PermissionId;
  };

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email || !formData.employeeCode) {
      toast({ variant: 'destructive', title: 'Missing Data', description: 'Basic profile details are required.' });
      return;
    }

    const trimmedPassword = formData.password.trim();
    if (!trimmedPassword) {
      toast({ variant: 'destructive', title: 'Missing Data', description: 'Initial password is required.' });
      return;
    }
    
    if (trimmedPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Invalid Data', description: 'Password must be at least 6 characters.' });
      return;
    }
    
    try {
      const payload: any = {
        employeeCode: formData.employeeCode,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        departmentId: formData.departmentId,
        teamId: formData.teamId,
        leadId: formData.leadId,
        password: trimmedPassword
      };

      if (formData.username && formData.username.trim() !== '') {
        payload.username = formData.username.trim();
      }

      const res = await apiClient.post('/users', payload);

      const newUserId = res.data.userId;

      // Handle Modules Access Configuration
      const grantIds = formData.selectedModules.map(name => getPermissionIdByName(name)).filter(id => id !== undefined);
      const denyIds = SYSTEM_MODULES.map(m => m.id)
                        .filter(id => !formData.selectedModules.includes(id))
                        .map(name => getPermissionIdByName(name))
                        .filter(id => id !== undefined);

      await apiClient.put(`/users/${newUserId}/permissions`, {
        overrides: { grant: grantIds, deny: denyIds }
      });

      toast({ title: "Staff Created", description: `${formData.name} added to SSoT with configured access.` });
      setFormData({ ...formData, name: '', email: '', employeeCode: '', username: '', password: '', selectedModules: [] });
      fetchUsers();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.response?.data?.message || 'Failed to create user' });
    }
  };

  const handleOpenUserPermissions = async (user: any) => {
    setSelectedUserForPerms(user);
    try {
      const res = await apiClient.get(`/users/${user.userId || user.id}/permissions`);
      // res.data.permissions is now an array of effective permission strings mapped from backend
      setUserEffectiveModules(res.data.permissions || []);
      setPermModalOpen(true);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch user permissions' });
    }
  };

  const handleSaveUserPermissions = async () => {
    if (!selectedUserForPerms) return;
    
    const grantIds = userEffectiveModules.map(name => getPermissionIdByName(name)).filter(id => id !== undefined);
    const denyIds = SYSTEM_MODULES.map(m => m.id)
                      .filter(id => !userEffectiveModules.includes(id))
                      .map(name => getPermissionIdByName(name))
                      .filter(id => id !== undefined);

    try {
      await apiClient.put(`/users/${selectedUserForPerms.userId || selectedUserForPerms.id}/permissions`, {
        overrides: { grant: grantIds, deny: denyIds }
      });
      toast({ title: "Permissions Updated", description: "User module access saved." });
      setPermModalOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.response?.data?.message || 'Failed to save permissions' });
    }
  };

  const toggleModuleInState = (moduleId: string, checked: boolean, stateGetter: string[], stateSetter: any) => {
    if (checked) {
      stateSetter([...stateGetter, moduleId]);
    } else {
      stateSetter(stateGetter.filter(id => id !== moduleId));
    }
  };

  const leadsInDept = users.filter(u => 
    (u.role === 'Team Lead' || u.role === 'Project Manager' || u.role === 'Production Head') && 
    (u.departmentId?.toString() === formData.departmentId?.toString())
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="text-crimson w-5 h-5" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Enterprise Identity Hub</span>
              </div>
              <h1 className="text-4xl font-headline text-white mb-2">Staff & Access Management</h1>
              <p className="text-muted-foreground">Centralized directory for studio onboarding and access configuration.</p>
            </div>
            <Button variant="outline" className="border-sidebar-border" onClick={() => { fetchUsers(); fetchRoles(); fetchPermissions(); }}>
              <RefreshCw className="w-4 h-4 mr-2" /> Sync Data
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-sidebar border border-sidebar-border p-1 h-14 sticky top-0 z-20 shadow-xl">
              <TabsTrigger value="registry" className="px-6 font-bold flex gap-2"><Users className="w-4 h-4" /> User Registry</TabsTrigger>
              {(isPH || isSup) && (
                <TabsTrigger value="create" className="px-6 font-bold flex gap-2"><UserPlus className="w-4 h-4" /> Create Staff</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="registry" className="mt-6">
              <Card className="bg-card border-none shadow-2xl overflow-hidden">
                <div className="p-6 bg-sidebar-accent/20 border-b border-sidebar-border flex justify-between items-center">
                  <div className="relative w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search employee code or name..." className="pl-10 bg-sidebar border-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <Badge variant="outline" className="border-sidebar-border">{filteredUsers.length} Members in Scope</Badge>
                </div>
                
                {loading ? (
                  <div className="p-12 text-center text-muted-foreground">Loading users...</div>
                ) : (
                  <Table>
                    <TableHeader className="bg-sidebar-accent/50">
                      <TableRow className="border-sidebar-border h-12">
                        <TableHead className="pl-6">Employee</TableHead>
                        <TableHead>Login ID</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Account Status</TableHead>
                        <TableHead className="pr-6 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map(u => (
                        <TableRow key={u.userId || u.id} className="border-sidebar-border hover:bg-sidebar-accent/10 h-16 transition-colors">
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-sidebar-accent flex items-center justify-center font-bold text-crimson">{(u.fullName || u.name)?.charAt(0)}</div>
                              <div>
                                <p className="font-bold text-white text-sm">{u.fullName || u.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono uppercase">{u.employeeCode}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1 text-xs">
                                <Key className="w-3 h-3 text-muted-foreground" />
                                <span className="text-white font-mono">{u.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">Pwd:</span>
                                <span className="text-white tracking-widest">••••••••</span>
                                {isPH && (
                                  <Button 
                                    variant="link" 
                                    size="sm" 
                                    className="h-auto p-0 text-[10px] text-crimson" 
                                    onClick={async () => {
                                      const newPass = window.prompt('Enter new password (min 6 characters):');
                                      if (!newPass) return;
                                      if (newPass.length < 6) {
                                        toast({ variant: 'destructive', title: 'Error', description: 'Password must be at least 6 characters' });
                                        return;
                                      }
                                      try {
                                        await apiClient.post(`/users/${u.userId || u.id}/reset-password`, { newPassword: newPass });
                                        toast({ title: 'Success', description: 'Password reset successfully' });
                                      } catch (e: any) {
                                        toast({ variant: 'destructive', title: 'Error', description: e.response?.data?.message || 'Failed to reset password' });
                                      }
                                    }}
                                  >
                                    [Reset Password]
                                  </Button>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><Badge className="bg-sidebar-accent text-[10px] uppercase">{u.role}</Badge></TableCell>
                          <TableCell className="text-xs uppercase text-white font-bold">{u.departmentName || 'Studio'}</TableCell>
                          <TableCell>
                            <Badge className={cn("text-[8px] uppercase", u.isActive || u.IsActive ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>
                              {u.isActive || u.IsActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <div className="flex justify-end gap-1">
                              {isPH && (
                                <Button size="sm" variant="outline" className="border-sidebar-border mr-2 bg-sidebar" onClick={() => handleOpenUserPermissions(u)}>
                                  <Lock className="w-3 h-3 mr-2 text-crimson" /> Manage Permissions
                                </Button>
                              )}
                              {(isPH || isSup) && (
                                <Button size="sm" variant="ghost" className={cn(u.isActive || u.IsActive ? "text-muted-foreground hover:text-red-500" : "text-green-500")} onClick={async () => { await toggleUserStatus(u.userId || u.id); fetchUsers(); }}>
                                  {u.isActive || u.IsActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="create" className="mt-6">
              <Card className="bg-card border-none shadow-2xl max-w-4xl mx-auto">
                <CardHeader className="border-b border-sidebar-border pb-6">
                  <CardTitle className="text-white flex items-center gap-2"><UserPlus className="text-crimson" /> Manual Onboarding Form</CardTitle>
                  <CardDescription>Directly inject a new staff member and configure their system access.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">1. Personal Profile</p>
                      <div className="space-y-2"><Label>Full Name</Label><Input className="bg-sidebar-accent border-sidebar-border" placeholder="e.g. Ellen Ripley" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Employee Code</Label><Input className="bg-sidebar-accent border-sidebar-border" placeholder="EMP-VFX-001" value={formData.employeeCode} onChange={e => setFormData({...formData, employeeCode: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Email Address</Label><Input className="bg-sidebar-accent border-sidebar-border" placeholder="ripley@smfx.vfx" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                      <div className="space-y-2 pt-2"><Label>Initial Password</Label><Input type="password" className="bg-sidebar-accent border-sidebar-border" placeholder="Required" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">2. Studio Assignment</p>
                      <div className="space-y-2"><Label>Role Type</Label>
                        <Select value={formData.role} onValueChange={(val: any) => setFormData({...formData, role: val})}>
                          <SelectTrigger className="bg-sidebar-accent border-sidebar-border"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-sidebar border-sidebar-border text-white">
                            {roles.map(r => <SelectItem key={r.RoleId} value={r.RoleName}>{r.RoleName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>Department</Label>
                        <Select value={formData.departmentId} onValueChange={val => setFormData({...formData, departmentId: val})}>
                          <SelectTrigger className="bg-sidebar-accent border-sidebar-border"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-sidebar border-sidebar-border text-white">
                            {departments.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>Team</Label>
                        <Select value={formData.teamId} onValueChange={val => setFormData({...formData, teamId: val})}>
                          <SelectTrigger className="bg-sidebar-accent border-sidebar-border"><SelectValue placeholder="Select Team (Optional)" /></SelectTrigger>
                          <SelectContent className="bg-sidebar border-sidebar-border text-white">
                            <SelectItem value="none">No Team</SelectItem>
                            {teams.filter(t => t.departmentId?.toString() === formData.departmentId?.toString()).map(t => (
                              <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {(formData.role === 'Artist' || formData.role === 'QC Artist') && (
                        <div className="space-y-2"><Label>Reporting Lead</Label>
                          <Select value={formData.leadId} onValueChange={val => setFormData({...formData, leadId: val})}>
                            <SelectTrigger className="bg-sidebar-accent border-sidebar-border"><SelectValue placeholder="Select Lead" /></SelectTrigger>
                            <SelectContent className="bg-sidebar border-sidebar-border text-white">
                              {leadsInDept.map(l => <SelectItem key={l.userId || l.id} value={(l.userId || l.id)?.toString() || ''}>{l.fullName || l.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-crimson/5 border border-crimson/20 p-6 rounded-xl space-y-6 mt-8">
                    <p className="text-[10px] font-bold text-crimson uppercase tracking-widest">3. System Access (Modules)</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                      {SYSTEM_MODULES.map(module => (
                        <div key={module.id} className="flex items-center space-x-3">
                          <Switch 
                            id={`create-${module.id}`}
                            checked={formData.selectedModules.includes(module.id)}
                            onCheckedChange={(checked) => toggleModuleInState(module.id, checked, formData.selectedModules, (v: any) => setFormData({...formData, selectedModules: v}))}
                          />
                          <Label htmlFor={`create-${module.id}`} className="text-sm font-bold cursor-pointer">{module.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end pt-4"><Button className="bg-crimson h-12 px-12 font-bold shadow-lg shadow-crimson/20" onClick={handleCreateUser}>Commit Member to SSoT</Button></div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* User Permission Overrides Dialog */}
        <Dialog open={permModalOpen} onOpenChange={setPermModalOpen}>
          <DialogContent className="bg-sidebar border-sidebar-border text-white shadow-2xl max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-headline">
                <Lock className="text-crimson" /> 
                System Access: {selectedUserForPerms?.fullName} ({selectedUserForPerms?.role})
              </DialogTitle>
              <DialogDescription>
                Enable or disable system modules for this user. This explicitly overrides any default role configurations.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-6 pr-2">
              <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                {SYSTEM_MODULES.map(module => (
                  <div key={module.id} className="flex items-center justify-between bg-sidebar-accent/30 p-3 rounded-lg border border-sidebar-border">
                    <Label htmlFor={`edit-${module.id}`} className="text-sm font-bold cursor-pointer">{module.label}</Label>
                    <Switch 
                      id={`edit-${module.id}`}
                      checked={userEffectiveModules.includes(module.id)}
                      onCheckedChange={(checked) => toggleModuleInState(module.id, checked, userEffectiveModules, setUserEffectiveModules)}
                    />
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter className="pt-4 border-t border-sidebar-border">
              <Button variant="outline" onClick={() => setPermModalOpen(false)}>Cancel</Button>
              <Button className="bg-crimson font-bold" onClick={handleSaveUserPermissions}>Save Access</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
