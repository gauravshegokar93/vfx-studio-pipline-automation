
"use client";

import React, { useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  UserCog, 
  Lock, 
  UserX, 
  Search, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Role, User } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function UserManagementPage() {
  const { currentRole, currentUser, users, addUser, deactivateUser, resetUserPassword, departments } = useLuminaStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Permission Logic
  const canCreateSupervisor = currentRole === 'Production Head';
  const canCreateLeadArtist = currentRole === 'Department Supervisor' || currentRole === 'Production Head';

  // Creation State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employeeCode: '',
    role: 'Artist' as Role,
    departmentId: currentUser?.departmentId || '',
    leadId: '',
  });

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Role isolation: Production Head sees all. Supervisor sees their dept.
    if (currentRole === 'Production Head') return matchesSearch;
    if (currentRole === 'Department Supervisor') return matchesSearch && u.departmentId === currentUser?.departmentId;
    return false;
  });

  const handleCreateUser = () => {
    if (!formData.name || !formData.email || !formData.employeeCode) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'All fields are required.' });
      return;
    }

    const newUser: User = {
      id: `u_${Date.now()}`,
      ...formData,
      isActive: true,
      avatarUrl: `https://picsum.photos/seed/${formData.employeeCode}/100/100`
    };

    addUser(newUser);
    setIsModalOpen(false);
    setFormData({
      name: '',
      email: '',
      employeeCode: '',
      role: 'Artist',
      departmentId: currentUser?.departmentId || '',
      leadId: '',
    });

    toast({
      title: 'User Created',
      description: `Generated login credentials for ${newUser.name}. Temp Password: Lumina2024!`,
    });
  };

  const leadsInDept = users.filter(u => u.role === 'Lead' && u.departmentId === (formData.departmentId || currentUser?.departmentId));

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="text-crimson w-5 h-5" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Enterprise Identity Management</span>
              </div>
              <h1 className="text-4xl font-headline text-white mb-2">Staff Orchestration</h1>
              <p className="text-muted-foreground">Managing studio permissions and hierarchical resource creation.</p>
            </div>
            
            {canCreateLeadArtist && (
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-crimson h-12 px-8 font-bold shadow-lg shadow-crimson/20">
                    <UserPlus className="w-5 h-5 mr-2" /> 
                    {canCreateSupervisor ? "Create Studio Staff" : "Add Team Artist"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-sidebar border-sidebar-border text-white max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">Create New Production Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-5 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Full Name</Label>
                        <Input 
                          placeholder="e.g. Sarah Connor" 
                          className="bg-sidebar-accent border-sidebar-border" 
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Employee Code</Label>
                        <Input 
                          placeholder="EMP-VFX-001" 
                          className="bg-sidebar-accent border-sidebar-border" 
                          value={formData.employeeCode}
                          onChange={(e) => setFormData({...formData, employeeCode: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Email Address</Label>
                      <Input 
                        placeholder="artist@lumina.vfx" 
                        className="bg-sidebar-accent border-sidebar-border" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Role</Label>
                        <Select 
                          value={formData.role} 
                          onValueChange={(val: any) => setFormData({...formData, role: val})}
                        >
                          <SelectTrigger className="bg-sidebar-accent border-sidebar-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-sidebar border-sidebar-border text-white">
                            <SelectItem value="Artist">Artist</SelectItem>
                            <SelectItem value="Lead">Lead</SelectItem>
                            {canCreateSupervisor && <SelectItem value="Department Supervisor">Supervisor</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Department</Label>
                        <Select 
                          value={formData.departmentId} 
                          onValueChange={(val) => setFormData({...formData, departmentId: val})}
                          disabled={!canCreateSupervisor}
                        >
                          <SelectTrigger className="bg-sidebar-accent border-sidebar-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-sidebar border-sidebar-border text-white">
                            {departments.map(d => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {formData.role === 'Artist' && (
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Reporting Lead</Label>
                        <Select 
                          value={formData.leadId} 
                          onValueChange={(val) => setFormData({...formData, leadId: val})}
                        >
                          <SelectTrigger className="bg-sidebar-accent border-sidebar-border">
                            <SelectValue placeholder="Select Team Lead" />
                          </SelectTrigger>
                          <SelectContent className="bg-sidebar border-sidebar-border text-white">
                            {leadsInDept.map(l => (
                              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="p-4 bg-crimson/5 border border-crimson/20 rounded-xl">
                      <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                        Creation will generate a temporary login and push this user to the SSoT User Registry.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button className="bg-crimson font-bold" onClick={handleCreateUser}>Generate Credentials</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <Card className="bg-card border-none shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-sidebar-border flex justify-between items-center bg-sidebar-accent/30">
              <div className="relative w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name or code..." 
                  className="pl-10 bg-sidebar border-none" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Badge variant="outline" className="text-[10px] uppercase font-bold border-sidebar-border">
                {filteredUsers.length} Active Records in SSoT
              </Badge>
            </div>
            <Table>
              <TableHeader className="bg-sidebar-accent/50">
                <TableRow className="border-sidebar-border h-12">
                  <TableHead className="pl-6">Member</TableHead>
                  <TableHead>Employee Code</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.id} className="border-sidebar-border hover:bg-sidebar-accent/20 transition-colors h-20">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sidebar-accent border border-sidebar-border flex items-center justify-center font-bold text-crimson">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{user.name}</p>
                          <p className="text-[10px] text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-white">{user.employeeCode}</TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[10px] font-bold uppercase",
                        user.role === 'Production Head' ? "bg-crimson text-white" :
                        user.role === 'Department Supervisor' ? "bg-accent text-white" :
                        user.role === 'Lead' ? "bg-blue-500/20 text-blue-500" : "bg-sidebar-accent text-muted-foreground"
                      )}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground uppercase font-bold">
                        {departments.find(d => d.id === user.departmentId)?.name || "Studio"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "destructive"} className={cn(
                        "text-[8px] uppercase font-bold",
                        user.isActive ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                      )}>
                        {user.isActive ? "Active" : "Deactivated"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-muted-foreground hover:text-white"
                          onClick={() => {
                            resetUserPassword(user.id);
                            toast({ title: 'Reset Email Sent', description: `Instructions sent to ${user.email}` });
                          }}
                        >
                          <Lock className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-muted-foreground hover:text-red-500"
                          onClick={() => {
                            deactivateUser(user.id);
                            toast({ variant: 'destructive', title: 'User Deactivated', description: `${user.name} access revoked.` });
                          }}
                        >
                          <UserX className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </main>
    </div>
  );
}
