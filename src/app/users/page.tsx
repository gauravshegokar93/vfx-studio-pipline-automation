"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, UserPlus, ShieldCheck, Search, Key,
  UserX, UserCheck, AlertTriangle,
  Lock, RefreshCw, Trash2, Building2, ChevronRight,
  GitBranch, UsersRound, Plus, Edit2, ToggleLeft
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { apiClient } from '@/services/apiClient';
import { userService } from '@/services/userService';

// ============================================================
// Types
// ============================================================
interface ReportingLead {
  id: string;
  userId: string;
  employeeCode: string;
  fullName: string;
  roleId: string;
  roleName: string;
  departmentId: string;
  departmentName: string;
  teamId?: string;
  teamName?: string;
}

interface Team {
  id: string;
  teamId: string;
  teamCode: string;
  teamName: string;
  departmentId: string;
  departmentName: string;
  isActive: boolean;
  leadId?: string;
  leadName?: string;
  memberCount?: number;
}

interface HierarchyUser {
  userId: string;
  employeeCode: string;
  fullName: string;
  roleId: string;
  roleName: string;
  roleLevel: number;
  reportingManagerId?: string;
  reportingManagerName?: string;
}

interface HierarchyTeam {
  teamId: string;
  teamName: string;
  teamCode: string;
  leadId?: string;
  leadName?: string;
  members: HierarchyUser[];
}

interface HierarchyDept {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  teams: HierarchyTeam[];
  unassignedUsers: HierarchyUser[];
}

// ============================================================
// Roles that require org fields (from real RoleMaster)
// ============================================================
const ROLE_REQUIRES_DEPT = ['Artist', 'QC Artist', 'Team Lead', 'Project Manager'];
const ROLE_REQUIRES_TEAM = ['Artist', 'QC Artist', 'Team Lead'];
const ROLE_REQUIRES_LEAD = ['Artist', 'QC Artist'];

const SYSTEM_MODULES = [
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

// ============================================================
// Hierarchy Node Component
// ============================================================
function HierarchyTeamNode({ team }: { team: HierarchyTeam }) {
  const [expanded, setExpanded] = useState(true);
  const leads = team.members.filter(m => m.roleLevel <= 4);
  const artists = team.members.filter(m => m.roleLevel > 4);

  return (
    <div className="ml-6 border-l border-sidebar-border pl-4 mt-2">
      <button
        className="flex items-center gap-2 text-sm font-bold text-white hover:text-crimson transition-colors py-1"
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronRight className={cn("w-4 h-4 transition-transform", expanded && "rotate-90")} />
        <UsersRound className="w-4 h-4 text-blue-400" />
        {team.teamName}
        {team.leadName && (
          <span className="text-[10px] text-muted-foreground font-normal ml-1">
            Lead: {team.leadName}
          </span>
        )}
        <Badge variant="outline" className="text-[10px] border-sidebar-border ml-1">
          {team.members.length} members
        </Badge>
      </button>
      {expanded && (
        <div className="mt-1 ml-4 space-y-1">
          {leads.map(u => (
            <div key={u.userId} className="flex items-center gap-2 text-xs text-yellow-400 py-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              {u.fullName}
              <span className="text-muted-foreground">({u.roleName})</span>
            </div>
          ))}
          {artists.map(u => (
            <div key={u.userId} className="flex items-center gap-2 text-xs text-muted-foreground py-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              {u.fullName}
              <span className="text-muted-foreground/60">({u.roleName})</span>
              {u.reportingManagerName && (
                <span className="text-[10px] text-muted-foreground/40">→ {u.reportingManagerName}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HierarchyDeptNode({ dept }: { dept: HierarchyDept }) {
  const [expanded, setExpanded] = useState(true);
  const totalMembers = dept.teams.reduce((sum, t) => sum + t.members.length, 0) + dept.unassignedUsers.length;

  return (
    <div className="border border-sidebar-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 bg-sidebar-accent/20 hover:bg-sidebar-accent/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronRight className={cn("w-4 h-4 transition-transform text-crimson", expanded && "rotate-90")} />
        <Building2 className="w-5 h-5 text-crimson" />
        <span className="font-headline text-white font-bold text-base">{dept.departmentName}</span>
        <Badge variant="outline" className="text-[10px] border-sidebar-border ml-auto">
          {dept.teams.length} teams · {totalMembers} members
        </Badge>
      </button>
      {expanded && (
        <div className="p-4 space-y-2">
          {dept.teams.length === 0 && dept.unassignedUsers.length === 0 && (
            <p className="text-xs text-muted-foreground italic ml-6">No teams or members in this department.</p>
          )}
          {dept.teams.map(team => (
            <HierarchyTeamNode key={team.teamId} team={team} />
          ))}
          {dept.unassignedUsers.length > 0 && (
            <div className="ml-6 border-l border-sidebar-border pl-4 mt-2">
              <p className="text-xs text-muted-foreground font-bold mb-1">Unassigned to team:</p>
              {dept.unassignedUsers.map(u => (
                <div key={u.userId} className="flex items-center gap-2 text-xs text-muted-foreground py-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  {u.fullName} <span className="text-muted-foreground/60">({u.roleName})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================
export default function UserManagementPage() {
  const {
    currentUser, users, roles, permissions, departments, teams,
    fetchUsers, fetchRoles, fetchPermissions, fetchDepartments, fetchTeams, toggleUserStatus
  } = useLuminaStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('registry');

  // Org cascade state for Create form
  const [formData, setFormData] = useState({
    name: '', email: '', employeeCode: '', role: '',
    departmentId: '', teamId: '', leadId: '',
    joiningDate: '',
    password: '',
    selectedModules: [] as string[]
  });
  const [formTeams, setFormTeams] = useState<Team[]>([]);
  const [formLeads, setFormLeads] = useState<ReportingLead[]>([]);
  const [loadingFormTeams, setLoadingFormTeams] = useState(false);
  const [loadingFormLeads, setLoadingFormLeads] = useState(false);

  // Hierarchy
  const [hierarchy, setHierarchy] = useState<HierarchyDept[]>([]);
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);

  // Team management
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [teamFormOpen, setTeamFormOpen] = useState(false);
  const [teamFormData, setTeamFormData] = useState({ teamName: '', departmentId: '' });
  const [savingTeam, setSavingTeam] = useState(false);

  // Permissions modal
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<any>(null);
  const [userEffectiveModules, setUserEffectiveModules] = useState<string[]>([]);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Role-based access
  const roleName = currentUser?.roleName || currentUser?.role || '';
  const isPH = roleName === 'Production Head' || roleName === 'Super Admin';
  const isAdmin = roleName === 'Super Admin';
  const isSup = roleName === 'Project Manager';
  const isLead = roleName === 'Team Lead';
  const canManageUsers = isPH || isSup;
  const canManageTeams = isPH || isSup;

  // ==================== Load data ====================

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchRoles(), fetchPermissions(), fetchDepartments(), fetchTeams()]);
      setLoading(false);
    };
    load();
  }, [fetchUsers, fetchRoles, fetchPermissions, fetchDepartments, fetchTeams]);

  const loadAllTeams = useCallback(async () => {
    try {
      const res = await apiClient.get('/teams');
      setAllTeams(res.data.items || []);
    } catch (e) {
      console.error('[loadAllTeams]', e);
    }
  }, []);

  useEffect(() => {
    loadAllTeams();
  }, [loadAllTeams]);

  const loadHierarchy = useCallback(async () => {
    setLoadingHierarchy(true);
    try {
      const res = await apiClient.get('/users/hierarchy');
      setHierarchy(res.data.hierarchy || []);
    } catch (e) {
      console.error('[loadHierarchy]', e);
    } finally {
      setLoadingHierarchy(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'hierarchy') {
      loadHierarchy();
    }
  }, [activeTab, loadHierarchy]);

  // ==================== Org cascade for Create form ====================

  const handleRoleChange = (role: string) => {
    setFormData(prev => ({ ...prev, role, departmentId: '', teamId: '', leadId: '' }));
    setFormTeams([]);
    setFormLeads([]);
  };

  const handleDeptChange = async (departmentId: string) => {
    setFormData(prev => ({ ...prev, departmentId, teamId: '', leadId: '' }));
    setFormLeads([]);
    setFormTeams([]);

    if (!departmentId || !ROLE_REQUIRES_TEAM.includes(formData.role)) return;

    setLoadingFormTeams(true);
    try {
      const res = await apiClient.get(`/teams?departmentId=${departmentId}`);
      setFormTeams(res.data.items || []);
    } catch (e) {
      console.error('[handleDeptChange teams]', e);
    } finally {
      setLoadingFormTeams(false);
    }

    // Also load leads for dept (if role requires lead)
    if (ROLE_REQUIRES_LEAD.includes(formData.role)) {
      await loadLeadsForDept(departmentId, '');
    }
  };

  const handleTeamChange = async (teamId: string) => {
    setFormData(prev => ({ ...prev, teamId, leadId: '' }));
    if (!ROLE_REQUIRES_LEAD.includes(formData.role)) return;
    await loadLeadsForDept(formData.departmentId, teamId);
  };

  const loadLeadsForDept = async (departmentId: string, teamId: string) => {
    setLoadingFormLeads(true);
    try {
      let url = `/users/reporting-leads?departmentId=${departmentId}`;
      if (teamId && teamId !== 'none') url += `&teamId=${teamId}`;
      const res = await apiClient.get(url);
      setFormLeads(res.data.items || []);
    } catch (e) {
      console.error('[loadLeadsForDept]', e);
    } finally {
      setLoadingFormLeads(false);
    }
  };

  // ==================== Filtering ====================

  const filteredUsers = users.filter(u => {
    const userActive = Boolean(u.isActive ?? (u as any).IsActive);
    if (statusFilter === 'active' && !userActive) return false;
    if (statusFilter === 'inactive' && userActive) return false;

    if (deptFilter && deptFilter !== 'all' && String(u.departmentId) !== deptFilter) return false;
    if (teamFilter && teamFilter !== 'all' && String(u.teamId) !== teamFilter) return false;
    if (roleFilter && roleFilter !== 'all' && u.roleName !== roleFilter) return false;

    const q = searchTerm.toLowerCase();
    const match = !q ||
      (u.fullName || (u as any).name || '').toLowerCase().includes(q) ||
      (u.employeeCode || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q);
    if (!match) return false;

    // Role scope
    if (isPH) return true;
    if (isSup) return String(u.departmentId) === String(currentUser?.departmentId);
    if (isLead) return String((u as any).reportingManagerId) === String(currentUser?.userId);
    return false;
  });

  // ==================== Handlers ====================

  const handleToggleUserStatus = async (user: any) => {
    const userId = user.userId || user.id;
    const currentActive = Boolean(user.isActive ?? user.IsActive);
    try {
      await userService.updateUserStatus(userId, !currentActive);
      toast({
        title: "Status Updated",
        description: `${user.fullName || user.name} is now ${!currentActive ? 'Active' : 'Inactive'}.`
      });
      fetchUsers();
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Action Denied", description: e.message || 'Failed to update user status' });
    }
  };

  const handleOpenDeleteModal = (user: any) => {
    setUserToDelete(user);
    setDeleteConfirmCode('');
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const userId = userToDelete.userId || userToDelete.id;
    setDeleting(true);
    try {
      const res = await userService.deleteUser(userId);
      toast({ title: "User Deleted", description: res.message || "User deleted successfully." });
      setDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Deletion Failed", description: e.message || "User cannot be deleted." });
    } finally {
      setDeleting(false);
    }
  };

  const getPermissionIdByName = (name: string) => {
    return permissions.find((p: any) => p.PermissionName === name)?.PermissionId;
  };

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email || !formData.employeeCode) {
      toast({ variant: 'destructive', title: 'Missing Data', description: 'Basic profile details are required.' });
      return;
    }
    if (!formData.role) {
      toast({ variant: 'destructive', title: 'Missing Data', description: 'Role is required.' });
      return;
    }
    const trimmedPassword = formData.password.trim();
    if (!trimmedPassword || trimmedPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Invalid Data', description: 'Password must be at least 6 characters.' });
      return;
    }
    if (ROLE_REQUIRES_DEPT.includes(formData.role) && !formData.departmentId) {
      toast({ variant: 'destructive', title: 'Missing Data', description: `Department is required for ${formData.role} role.` });
      return;
    }

    try {
      const payload: any = {
        employeeCode: formData.employeeCode,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        departmentId: formData.departmentId || null,
        teamId: formData.teamId && formData.teamId !== 'none' ? formData.teamId : null,
        leadId: formData.leadId && formData.leadId !== 'none' ? formData.leadId : null,
        joiningDate: formData.joiningDate || null,
        password: trimmedPassword
      };

      const res = await apiClient.post('/users', payload);
      const newUserId = res.data.userId;

      // Configure permissions
      if (formData.selectedModules.length > 0) {
        const grantIds = formData.selectedModules
          .map(name => getPermissionIdByName(name))
          .filter(id => id !== undefined);
        const denyIds = SYSTEM_MODULES.map(m => m.id)
          .filter(id => !formData.selectedModules.includes(id))
          .map(name => getPermissionIdByName(name))
          .filter(id => id !== undefined);

        await apiClient.put(`/users/${newUserId}/permissions`, {
          overrides: { grant: grantIds, deny: denyIds }
        });
      }

      toast({ title: "Staff Created", description: `${formData.name} added successfully.` });
      setFormData({ name: '', email: '', employeeCode: '', role: '', departmentId: '', teamId: '', leadId: '', joiningDate: '', password: '', selectedModules: [] });
      setFormTeams([]);
      setFormLeads([]);
      fetchUsers();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.response?.data?.message || 'Failed to create user' });
    }
  };

  const handleOpenUserPermissions = async (user: any) => {
    setSelectedUserForPerms(user);
    try {
      const res = await apiClient.get(`/users/${user.userId || user.id}/permissions`);
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

  const handleCreateTeam = async () => {
    if (!teamFormData.teamName.trim() || !teamFormData.departmentId) {
      toast({ variant: 'destructive', title: 'Missing Data', description: 'Team name and department are required.' });
      return;
    }
    setSavingTeam(true);
    try {
      await apiClient.post('/teams', {
        teamName: teamFormData.teamName.trim(),
        departmentId: teamFormData.departmentId
      });
      toast({ title: 'Team Created', description: `${teamFormData.teamName} created successfully.` });
      setTeamFormOpen(false);
      setTeamFormData({ teamName: '', departmentId: '' });
      await Promise.all([loadAllTeams(), fetchTeams()]);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.response?.data?.message || 'Failed to create team' });
    } finally {
      setSavingTeam(false);
    }
  };

  const handleToggleTeamStatus = async (team: Team) => {
    try {
      await apiClient.patch(`/teams/${team.teamId}/status`, { isActive: !team.isActive });
      toast({ title: 'Team Updated', description: `${team.teamName} is now ${!team.isActive ? 'Active' : 'Inactive'}.` });
      loadAllTeams();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.response?.data?.message || 'Failed to update team' });
    }
  };

  const toggleModuleInState = (moduleId: string, checked: boolean, stateGetter: string[], stateSetter: any) => {
    if (checked) {
      stateSetter([...stateGetter, moduleId]);
    } else {
      stateSetter(stateGetter.filter((id: string) => id !== moduleId));
    }
  };

  // ==================== Role badge colors ====================
  const roleBadgeColor = (role: string) => {
    switch (role) {
      case 'Super Admin': return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'Production Head': return 'bg-crimson/15 text-red-400 border-crimson/30';
      case 'Project Manager': return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      case 'Team Lead': return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
      case 'Artist': return 'bg-green-500/15 text-green-400 border-green-500/30';
      case 'QC Artist': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      default: return 'bg-sidebar-accent text-muted-foreground';
    }
  };

  // ==================== Teams grouped by dept ====================
  const teamsByDept = departments.reduce((acc: Record<string, typeof allTeams>, dept: any) => {
    const deptTeams = allTeams.filter(t => String(t.departmentId) === String(dept.id));
    if (deptTeams.length > 0) acc[dept.name] = deptTeams;
    return acc;
  }, {});

  // Filter teams for the filter dropdown (based on selected dept filter)
  const availableTeamsForFilter = deptFilter && deptFilter !== 'all'
    ? allTeams.filter(t => String(t.departmentId) === deptFilter)
    : allTeams;

  // Unique roles from current users for filter
  const uniqueRoles = [...new Set(users.map((u: any) => u.roleName || u.role).filter(Boolean))];

  // ==================== Hierarchy hint ====================
  const showHierarchyHint = ROLE_REQUIRES_DEPT.includes(formData.role) && formData.departmentId;

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
              <p className="text-muted-foreground">Centralized directory for studio onboarding, team management, and org hierarchy.</p>
            </div>
            <Button variant="outline" className="border-sidebar-border" onClick={() => {
              fetchUsers(); fetchRoles(); fetchPermissions(); fetchDepartments(); fetchTeams(); loadAllTeams();
            }}>
              <RefreshCw className="w-4 h-4 mr-2" /> Sync Data
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-sidebar border border-sidebar-border p-1 h-14 sticky top-0 z-20 shadow-xl">
              <TabsTrigger value="registry" className="px-6 font-bold flex gap-2">
                <Users className="w-4 h-4" /> Staff Directory
              </TabsTrigger>
              {canManageUsers && (
                <TabsTrigger value="create" className="px-6 font-bold flex gap-2">
                  <UserPlus className="w-4 h-4" /> Add Staff
                </TabsTrigger>
              )}
              <TabsTrigger value="hierarchy" className="px-6 font-bold flex gap-2">
                <GitBranch className="w-4 h-4" /> Org Hierarchy
              </TabsTrigger>
              {canManageTeams && (
                <TabsTrigger value="teams" className="px-6 font-bold flex gap-2">
                  <UsersRound className="w-4 h-4" /> Teams
                </TabsTrigger>
              )}
            </TabsList>

            {/* ============================
                STAFF DIRECTORY TAB
            ============================ */}
            <TabsContent value="registry" className="mt-6">
              <Card className="bg-card border-none shadow-2xl overflow-hidden">
                {/* Filters */}
                <div className="p-6 bg-sidebar-accent/20 border-b border-sidebar-border space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-72">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search name, code, email..."
                        className="pl-10 bg-sidebar border-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>

                    {/* Status filter */}
                    <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                      <SelectTrigger className="w-36 bg-sidebar border-none text-xs font-bold">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent className="bg-sidebar border-sidebar-border text-white text-xs">
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active Only</SelectItem>
                        <SelectItem value="inactive">Inactive Only</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Role filter */}
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-44 bg-sidebar border-none text-xs font-bold">
                        <SelectValue placeholder="All Roles" />
                      </SelectTrigger>
                      <SelectContent className="bg-sidebar border-sidebar-border text-white text-xs">
                        <SelectItem value="all">All Roles</SelectItem>
                        {uniqueRoles.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Dept filter */}
                    <Select value={deptFilter} onValueChange={(val) => { setDeptFilter(val); setTeamFilter(''); }}>
                      <SelectTrigger className="w-44 bg-sidebar border-none text-xs font-bold">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent className="bg-sidebar border-sidebar-border text-white text-xs">
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map((d: any) => (
                          <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Team filter */}
                    <Select value={teamFilter} onValueChange={setTeamFilter}>
                      <SelectTrigger className="w-44 bg-sidebar border-none text-xs font-bold">
                        <SelectValue placeholder="All Teams" />
                      </SelectTrigger>
                      <SelectContent className="bg-sidebar border-sidebar-border text-white text-xs">
                        <SelectItem value="all">All Teams</SelectItem>
                        {availableTeamsForFilter.map((t: any) => (
                          <SelectItem key={t.teamId || t.id} value={String(t.teamId || t.id)}>{t.teamName || t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Badge variant="outline" className="border-sidebar-border ml-auto">
                      {filteredUsers.length} staff in scope
                    </Badge>
                  </div>
                </div>

                {loading ? (
                  <div className="p-12 text-center text-muted-foreground">Loading staff directory...</div>
                ) : (
                  <Table>
                    <TableHeader className="bg-sidebar-accent/50">
                      <TableRow className="border-sidebar-border h-12">
                        <TableHead className="pl-6">Employee</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Reporting Lead</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="pr-6 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                            No staff matching current filters.
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.map(u => (
                        <TableRow key={u.userId || (u as any).id} className="border-sidebar-border hover:bg-sidebar-accent/10 h-16 transition-colors">
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-sidebar-accent flex items-center justify-center font-bold text-crimson">
                                {(u.fullName || (u as any).name)?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-white text-sm">{u.fullName || (u as any).name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono uppercase">{u.employeeCode}</p>
                                <p className="text-[10px] text-muted-foreground">{u.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-[10px] uppercase border", roleBadgeColor(u.roleName || (u as any).role || ''))}>
                              {u.roleName || (u as any).role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-white font-semibold">
                            {u.departmentName || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {(u as any).teamName || <span className="text-muted-foreground/40">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {(u as any).reportingManagerName || <span className="text-muted-foreground/40">—</span>}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-[8px] uppercase border",
                              (u.isActive || (u as any).IsActive)
                                ? "bg-green-500/10 text-green-500 border-green-500/20"
                                : "bg-red-500/10 text-red-500 border-red-500/20"
                            )}>
                              {(u.isActive || (u as any).IsActive) ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <div className="flex justify-end gap-1 items-center">
                              {isPH && (
                                <Button size="sm" variant="outline" className="border-sidebar-border bg-sidebar text-xs"
                                  onClick={() => handleOpenUserPermissions(u)}>
                                  <Lock className="w-3 h-3 mr-1 text-crimson" /> Perms
                                </Button>
                              )}
                              {canManageUsers && (
                                <Button size="sm" variant="ghost"
                                  title={(u.isActive || (u as any).IsActive) ? "Deactivate" : "Activate"}
                                  className={cn((u.isActive || (u as any).IsActive) ? "text-muted-foreground hover:text-red-500" : "text-green-500")}
                                  onClick={() => handleToggleUserStatus(u)}>
                                  {(u.isActive || (u as any).IsActive) ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </Button>
                              )}
                              {isAdmin && (
                                <Button size="sm" variant="ghost"
                                  title="Delete User Permanently"
                                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                  onClick={() => handleOpenDeleteModal(u)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                              {canManageUsers && (
                                <Button size="sm" variant="ghost"
                                  title="Reset Password"
                                  className="text-muted-foreground hover:text-white"
                                  onClick={async () => {
                                    const newPass = window.prompt('Enter new password (min 6 characters):');
                                    if (!newPass) return;
                                    if (newPass.length < 6) {
                                      toast({ variant: 'destructive', title: 'Error', description: 'Password must be at least 6 characters' });
                                      return;
                                    }
                                    try {
                                      await apiClient.post(`/users/${u.userId || (u as any).id}/reset-password`, { newPassword: newPass });
                                      toast({ title: 'Success', description: 'Password reset successfully' });
                                    } catch (e: any) {
                                      toast({ variant: 'destructive', title: 'Error', description: e.response?.data?.message || 'Failed' });
                                    }
                                  }}>
                                  <Key className="w-4 h-4" />
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

            {/* ============================
                CREATE STAFF TAB
            ============================ */}
            {canManageUsers && (
              <TabsContent value="create" className="mt-6">
                <Card className="bg-card border-none shadow-2xl max-w-5xl mx-auto">
                  <CardHeader className="border-b border-sidebar-border pb-6">
                    <CardTitle className="text-white flex items-center gap-2">
                      <UserPlus className="text-crimson" /> Add Staff Member
                    </CardTitle>
                    <CardDescription>Create a new staff member. Organization fields adapt based on selected role.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-8 space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                      {/* Left: Personal */}
                      <div className="space-y-4">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">1. Personal Profile</p>
                        <div className="space-y-2">
                          <Label>Full Name *</Label>
                          <Input className="bg-sidebar-accent border-sidebar-border" placeholder="e.g. Rahul Sharma"
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Employee Code *</Label>
                          <Input className="bg-sidebar-accent border-sidebar-border" placeholder="EMP-VFX-001"
                            value={formData.employeeCode} onChange={e => setFormData({ ...formData, employeeCode: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Email Address *</Label>
                          <Input className="bg-sidebar-accent border-sidebar-border" placeholder="rahul@studio.vfx"
                            value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Joining Date</Label>
                          <Input type="date" className="bg-sidebar-accent border-sidebar-border"
                            value={formData.joiningDate} onChange={e => setFormData({ ...formData, joiningDate: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Initial Password *</Label>
                          <Input type="password" className="bg-sidebar-accent border-sidebar-border" placeholder="Min. 6 characters"
                            value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                        </div>
                      </div>

                      {/* Right: Org Assignment */}
                      <div className="space-y-4">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">2. Organization Assignment</p>

                        {/* Role */}
                        <div className="space-y-2">
                          <Label>Role *</Label>
                          <Select value={formData.role} onValueChange={handleRoleChange}>
                            <SelectTrigger className="bg-sidebar-accent border-sidebar-border"><SelectValue placeholder="Select Role" /></SelectTrigger>
                            <SelectContent className="bg-sidebar border-sidebar-border text-white">
                              {roles.map((r: any) => (
                                <SelectItem key={r.RoleId || r.id} value={r.RoleName || r.name}>
                                  {r.RoleName || r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Department — shown when role requires it */}
                        {formData.role && ROLE_REQUIRES_DEPT.includes(formData.role) && (
                          <div className="space-y-2">
                            <Label>Department {ROLE_REQUIRES_DEPT.includes(formData.role) ? '*' : ''}</Label>
                            <Select value={formData.departmentId} onValueChange={handleDeptChange}>
                              <SelectTrigger className="bg-sidebar-accent border-sidebar-border">
                                <SelectValue placeholder="Select Department" />
                              </SelectTrigger>
                              <SelectContent className="bg-sidebar border-sidebar-border text-white">
                                {departments.map((d: any) => (
                                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Team — shown when role requires it and dept selected */}
                        {formData.departmentId && ROLE_REQUIRES_TEAM.includes(formData.role) && (
                          <div className="space-y-2">
                            <Label>Team</Label>
                            <Select value={formData.teamId} onValueChange={handleTeamChange}>
                              <SelectTrigger className="bg-sidebar-accent border-sidebar-border">
                                <SelectValue placeholder={loadingFormTeams ? 'Loading teams...' : 'Select Team'} />
                              </SelectTrigger>
                              <SelectContent className="bg-sidebar border-sidebar-border text-white">
                                <SelectItem value="none">No specific team</SelectItem>
                                {formTeams.map((t: any) => (
                                  <SelectItem key={t.teamId || t.id} value={String(t.teamId || t.id)}>
                                    {t.teamName || t.name}
                                    {t.leadName && <span className="text-muted-foreground text-[10px] ml-1">(Lead: {t.leadName})</span>}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Reporting Lead — shown for Artist/QC Artist */}
                        {formData.departmentId && ROLE_REQUIRES_LEAD.includes(formData.role) && (
                          <div className="space-y-2">
                            <Label>Reporting Lead</Label>
                            <Select value={formData.leadId} onValueChange={val => setFormData({ ...formData, leadId: val })}>
                              <SelectTrigger className="bg-sidebar-accent border-sidebar-border">
                                <SelectValue placeholder={loadingFormLeads ? 'Loading leads...' : 'Select Reporting Lead'} />
                              </SelectTrigger>
                              <SelectContent className="bg-sidebar border-sidebar-border text-white">
                                <SelectItem value="none">No Reporting Lead</SelectItem>
                                {formLeads.map(l => (
                                  <SelectItem key={l.userId} value={String(l.userId)}>
                                    {l.fullName}
                                    <span className="text-muted-foreground text-[10px] ml-1">({l.roleName})</span>
                                  </SelectItem>
                                ))}
                                {formLeads.length === 0 && !loadingFormLeads && (
                                  <div className="px-3 py-2 text-xs text-muted-foreground">
                                    No active leads in this scope.
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Hierarchy Hint */}
                        {showHierarchyHint && (
                          <div className="bg-sidebar border border-sidebar-border rounded-lg p-4 text-xs space-y-1 mt-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Org Position Preview</p>
                            <div className="flex flex-col gap-1 text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-3 h-3 text-crimson" />
                                <span className="font-bold text-white">
                                  {departments.find((d: any) => String(d.id) === formData.departmentId)?.name || '—'}
                                </span>
                              </div>
                              {formData.teamId && formData.teamId !== 'none' && (
                                <div className="flex items-center gap-2 ml-4">
                                  <ChevronRight className="w-3 h-3" />
                                  <UsersRound className="w-3 h-3 text-blue-400" />
                                  <span>{formTeams.find(t => String(t.teamId || t.id) === formData.teamId)?.teamName || '—'}</span>
                                </div>
                              )}
                              {formData.leadId && formData.leadId !== 'none' && (
                                <div className="flex items-center gap-2 ml-8">
                                  <ChevronRight className="w-3 h-3" />
                                  <span className="text-yellow-400">
                                    {formLeads.find(l => String(l.userId) === formData.leadId)?.fullName || '—'}
                                    <span className="text-muted-foreground ml-1">(Lead)</span>
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 ml-12">
                                <ChevronRight className="w-3 h-3" />
                                <span className="text-green-400">{formData.name || 'New Staff'}</span>
                                <span className="text-muted-foreground">({formData.role})</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Permissions */}
                    <div className="bg-crimson/5 border border-crimson/20 p-6 rounded-xl space-y-6">
                      <p className="text-[10px] font-bold text-crimson uppercase tracking-widest">3. System Access (Modules)</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                        {SYSTEM_MODULES.map(module => (
                          <div key={module.id} className="flex items-center space-x-3">
                            <Switch
                              id={`create-${module.id}`}
                              checked={formData.selectedModules.includes(module.id)}
                              onCheckedChange={(checked) =>
                                toggleModuleInState(module.id, checked, formData.selectedModules,
                                  (v: string[]) => setFormData({ ...formData, selectedModules: v }))
                              }
                            />
                            <Label htmlFor={`create-${module.id}`} className="text-sm font-bold cursor-pointer">{module.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button className="bg-crimson h-12 px-12 font-bold shadow-lg shadow-crimson/20" onClick={handleCreateUser}>
                        Create Staff Member
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* ============================
                ORG HIERARCHY TAB
            ============================ */}
            <TabsContent value="hierarchy" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-headline text-white">Production Organization</h2>
                    <p className="text-sm text-muted-foreground">Live view of your studio's department → team → member structure (active users only).</p>
                  </div>
                  <Button variant="outline" className="border-sidebar-border" onClick={loadHierarchy}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                  </Button>
                </div>

                {loadingHierarchy ? (
                  <div className="p-12 text-center text-muted-foreground">Building hierarchy from database...</div>
                ) : hierarchy.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    No active departments or users found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {hierarchy.map(dept => (
                      <HierarchyDeptNode key={dept.departmentId} dept={dept} />
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-6 text-xs text-muted-foreground pt-2">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-400" /> Team Lead / Project Manager</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-400" /> Artist / QC Artist</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-400" /> Unassigned to team</div>
                </div>
              </div>
            </TabsContent>

            {/* ============================
                TEAMS TAB
            ============================ */}
            {canManageTeams && (
              <TabsContent value="teams" className="mt-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-headline text-white">Team Management</h2>
                      <p className="text-sm text-muted-foreground">Manage production teams. Team leads are derived from team members with Team Lead role.</p>
                    </div>
                    <Button className="bg-crimson font-bold" onClick={() => setTeamFormOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" /> Add Team
                    </Button>
                  </div>

                  {Object.entries(teamsByDept).length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">No teams found.</div>
                  ) : (
                    Object.entries(teamsByDept).map(([deptName, deptTeams]) => (
                      <div key={deptName} className="space-y-2">
                        <div className="flex items-center gap-2 pb-1 border-b border-sidebar-border">
                          <Building2 className="w-4 h-4 text-crimson" />
                          <h3 className="text-sm font-bold text-white uppercase tracking-widest">{deptName}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {deptTeams.map((team: any) => (
                            <Card key={team.teamId || team.id} className={cn(
                              "bg-sidebar border transition-all",
                              team.isActive ? "border-sidebar-border" : "border-red-500/20 opacity-60"
                            )}>
                              <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-bold text-white">{team.teamName || team.name}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">{team.teamCode}</p>
                                  </div>
                                  <Badge className={cn("text-[10px]",
                                    team.isActive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                  )}>
                                    {team.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>

                                <div className="text-xs space-y-1">
                                  {team.leadName ? (
                                    <div className="flex items-center gap-2 text-yellow-400">
                                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                      Lead: {team.leadName}
                                    </div>
                                  ) : (
                                    <div className="text-muted-foreground/50 italic">No team lead assigned</div>
                                  )}
                                  <div className="text-muted-foreground">
                                    {team.memberCount ?? 0} active member{(team.memberCount ?? 0) !== 1 ? 's' : ''}
                                  </div>
                                </div>

                                <div className="flex gap-2 pt-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs text-muted-foreground hover:text-white"
                                    onClick={() => handleToggleTeamStatus(team)}
                                  >
                                    <ToggleLeft className="w-3 h-3 mr-1" />
                                    {team.isActive ? 'Deactivate' : 'Activate'}
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* ============================
            PERMISSIONS MODAL
        ============================ */}
        <Dialog open={permModalOpen} onOpenChange={setPermModalOpen}>
          <DialogContent className="bg-sidebar border-sidebar-border text-white shadow-2xl max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-headline">
                <Lock className="text-crimson" />
                System Access: {selectedUserForPerms?.fullName} ({selectedUserForPerms?.roleName || selectedUserForPerms?.role})
              </DialogTitle>
              <DialogDescription>
                Enable or disable system modules for this user. Overrides default role configuration.
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

        {/* ============================
            DELETE USER MODAL
        ============================ */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent className="bg-sidebar border-sidebar-border text-white shadow-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-headline text-red-500">
                <AlertTriangle className="w-5 h-5" /> Delete User Permanently?
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs pt-2 space-y-2">
                <span>This permanently removes <strong>{userToDelete?.fullName || userToDelete?.name}</strong> ({userToDelete?.employeeCode}).</span>
                <span className="block pt-1">
                  If the user has active assignments or history records, deletion will be safely blocked (409). Deactivation is the recommended path.
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <Label className="text-xs text-white">
                Type the Employee Code <strong>{userToDelete?.employeeCode}</strong> to confirm:
              </Label>
              <Input
                value={deleteConfirmCode}
                onChange={e => setDeleteConfirmCode(e.target.value)}
                placeholder={`Type ${userToDelete?.employeeCode || 'Employee Code'}...`}
                className="bg-sidebar-accent border-sidebar-border text-white font-mono text-sm"
              />
            </div>
            <DialogFooter className="pt-4 border-t border-sidebar-border">
              <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 font-bold"
                disabled={deleteConfirmCode.trim() !== (userToDelete?.employeeCode || '').trim() || deleting}
                onClick={handleConfirmDeleteUser}
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================
            CREATE TEAM MODAL
        ============================ */}
        <Dialog open={teamFormOpen} onOpenChange={setTeamFormOpen}>
          <DialogContent className="bg-sidebar border-sidebar-border text-white shadow-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-headline">
                <UsersRound className="text-crimson" /> Create New Team
              </DialogTitle>
              <DialogDescription>
                Add a new team to an existing department. Artists can then be assigned to this team.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select value={teamFormData.departmentId} onValueChange={val => setTeamFormData({ ...teamFormData, departmentId: val })}>
                  <SelectTrigger className="bg-sidebar-accent border-sidebar-border">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent className="bg-sidebar border-sidebar-border text-white">
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Team Name *</Label>
                <Input
                  className="bg-sidebar-accent border-sidebar-border"
                  placeholder="e.g. Animation Team A"
                  value={teamFormData.teamName}
                  onChange={e => setTeamFormData({ ...teamFormData, teamName: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="pt-4 border-t border-sidebar-border">
              <Button variant="outline" onClick={() => setTeamFormOpen(false)}>Cancel</Button>
              <Button className="bg-crimson font-bold" onClick={handleCreateTeam} disabled={savingTeam}>
                {savingTeam ? 'Creating...' : 'Create Team'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
