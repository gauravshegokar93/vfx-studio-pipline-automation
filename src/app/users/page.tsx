"use client";

import React, { useState } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  FileUp, 
  Search, 
  Download, 
  Key, 
  UserX, 
  UserCheck,
  CheckCircle, 
  AlertCircle,
  AlertTriangle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Edit3,
  FileSpreadsheet,
  Fingerprint
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Role, User } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function UserManagementPage() {
  const { currentRole, currentUser, users, userCredentials, addUser, bulkImportUsers, toggleUserStatus, updateUserCredentials, departments } = useLuminaStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<User[] | null>(null);

  // Scoping Logic
  const isPH = currentRole === 'Production Head';
  const isSup = currentRole === 'Department Supervisor';
  const isLead = currentRole === 'Lead';

  // Manual Form State
  const [formData, setFormData] = useState({
    name: '', email: '', employeeCode: '', role: 'Artist' as Role,
    departmentId: currentUser?.departmentId || '', leadId: '',
    username: '', password: ''
  });

  // Credential Edit State
  const [credModalOpen, setCredModalOpen] = useState(false);
  const [selectedUserForCreds, setSelectedUserForCreds] = useState<User | null>(null);
  const [credFormData, setCredFormData] = useState({ username: '', password: '' });

  const filteredUsers = users.filter(u => {
    const match = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
    if (isPH) return match;
    if (isSup) return match && u.departmentId === currentUser?.departmentId;
    if (isLead) return match && u.leadId === currentUser?.id;
    return false;
  });

  const handleCreateUser = () => {
    if (!formData.name || !formData.email || !formData.employeeCode) {
      toast({ variant: 'destructive', title: 'Missing Data', description: 'Basic profile details are required.' });
      return;
    }
    const newUser: User = {
      id: `u_${Date.now()}`,
      name: formData.name,
      email: formData.email,
      employeeCode: formData.employeeCode,
      role: formData.role,
      departmentId: formData.departmentId,
      leadId: formData.leadId,
      isActive: true,
      isFirstLogin: true,
      avatarUrl: `https://picsum.photos/seed/${formData.employeeCode}/100/100`
    };
    addUser(newUser, { username: formData.username, tempPassword: formData.password });
    toast({ title: "Staff Created", description: `${newUser.name} added to SSoT.` });
    setFormData({ ...formData, name: '', email: '', employeeCode: '', username: '', password: '' });
  };

  const handleOpenCredUpdate = (user: User) => {
    const cred = userCredentials.find(c => c.userId === user.id);
    setSelectedUserForCreds(user);
    setCredFormData({ username: cred?.username || '', password: '' });
    setCredModalOpen(true);
  };

  const exportCredentials = () => {
    const list = filteredUsers.map(u => {
      const cred = userCredentials.find(c => c.userId === u.id);
      return `${u.name},${cred?.username},${cred?.tempPassword || 'SECURED'}`;
    }).join('\n');
    const blob = new Blob([`Name,Username,Password\n${list}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Lumina_Credentials_Master.csv';
    a.click();
  };

  const leadsInDept = users.filter(u => u.role === 'Lead' && u.departmentId === formData.departmentId);

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
              <p className="text-muted-foreground">Centralized directory for studio onboarding and security lifecycle.</p>
            </div>
            <Button variant="outline" className="border-sidebar-border" onClick={exportCredentials}>
              <Download className="w-4 h-4 mr-2" /> Export Master List
            </Button>
          </div>

          <Tabs defaultValue="registry" className="w-full">
            <TabsList className="bg-sidebar border border-sidebar-border p-1 h-14 sticky top-0 z-20 shadow-xl">
              <TabsTrigger value="registry" className="px-6 font-bold flex gap-2"><Users className="w-4 h-4" /> User Registry</TabsTrigger>
              <TabsTrigger value="create" className="px-6 font-bold flex gap-2"><UserPlus className="w-4 h-4" /> Create Staff</TabsTrigger>
              <TabsTrigger value="import" className="px-6 font-bold flex gap-2"><FileUp className="w-4 h-4" /> Bulk Onboarding</TabsTrigger>
              <TabsTrigger value="audit" className="px-6 font-bold flex gap-2"><Lock className="w-4 h-4" /> Credentials Audit</TabsTrigger>
              <TabsTrigger value="matrix" className="px-6 font-bold flex gap-2"><Fingerprint className="w-4 h-4" /> Access Matrix</TabsTrigger>
            </TabsList>

            <TabsContent value="registry" className="mt-6">
              <Card className="bg-card border-none shadow-2xl overflow-hidden">
                <div className="p-6 bg-sidebar-accent/20 border-b border-sidebar-border flex justify-between items-center">
                  <div className="relative w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search employee code or name..." className="pl-10 bg-sidebar border-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <Badge variant="outline" className="border-sidebar-border">{filteredUsers.length} Users Found</Badge>
                </div>
                <Table>
                  <TableHeader className="bg-sidebar-accent/50">
                    <TableRow className="border-sidebar-border h-12">
                      <TableHead className="pl-6">Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Account Status</TableHead>
                      <TableHead className="pr-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(u => (
                      <TableRow key={u.id} className="border-sidebar-border hover:bg-sidebar-accent/10 h-16 transition-colors">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-sidebar-accent flex items-center justify-center font-bold text-crimson">{u.name.charAt(0)}</div>
                            <div>
                              <p className="font-bold text-white text-sm">{u.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono uppercase">{u.employeeCode}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge className="bg-sidebar-accent text-[10px] uppercase">{u.role}</Badge></TableCell>
                        <TableCell className="text-xs uppercase text-white font-bold">{departments.find(d => d.id === u.departmentId)?.name || 'Studio'}</TableCell>
                        <TableCell>
                          <Badge className={cn("text-[8px] uppercase", u.isActive ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleOpenCredUpdate(u)}><Edit3 className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" className={cn(u.isActive ? "text-muted-foreground hover:text-red-500" : "text-green-500")} onClick={() => toggleUserStatus(u.id)}>
                              {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="create" className="mt-6">
              <Card className="bg-card border-none shadow-2xl max-w-4xl mx-auto">
                <CardHeader className="border-b border-sidebar-border pb-6">
                  <CardTitle className="text-white flex items-center gap-2"><UserPlus className="text-crimson" /> Manual Onboarding Form</CardTitle>
                  <CardDescription>Directly inject a new staff member into the SSoT Registry.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">1. Personal Profile</p>
                      <div className="space-y-2"><Label>Full Name</Label><Input className="bg-sidebar-accent border-sidebar-border" placeholder="e.g. Ellen Ripley" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Employee Code</Label><Input className="bg-sidebar-accent border-sidebar-border" placeholder="EMP-VFX-001" value={formData.employeeCode} onChange={e => setFormData({...formData, employeeCode: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Email Address</Label><Input className="bg-sidebar-accent border-sidebar-border" placeholder="ripley@lumina.vfx" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">2. Studio Assignment</p>
                      <div className="space-y-2"><Label>Role Type</Label>
                        <Select value={formData.role} onValueChange={(val: any) => setFormData({...formData, role: val})}>
                          <SelectTrigger className="bg-sidebar-accent border-sidebar-border"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-sidebar border-sidebar-border text-white">
                            <SelectItem value="Artist">Artist</SelectItem>
                            <SelectItem value="Lead">Lead</SelectItem>
                            <SelectItem value="Department Supervisor">Supervisor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>Department</Label>
                        <Select value={formData.departmentId} onValueChange={val => setFormData({...formData, departmentId: val})}>
                          <SelectTrigger className="bg-sidebar-accent border-sidebar-border"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-sidebar border-sidebar-border text-white">
                            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {formData.role === 'Artist' && (
                        <div className="space-y-2"><Label>Reporting Lead</Label>
                          <Select value={formData.leadId} onValueChange={val => setFormData({...formData, leadId: val})}>
                            <SelectTrigger className="bg-sidebar-accent border-sidebar-border"><SelectValue placeholder="Select Lead" /></SelectTrigger>
                            <SelectContent className="bg-sidebar border-sidebar-border text-white">
                              {leadsInDept.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-crimson/5 border border-crimson/20 p-6 rounded-xl space-y-4">
                    <p className="text-[10px] font-bold text-crimson uppercase tracking-widest">3. Access Credentials (Optional Overrides)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Username</Label><Input className="bg-sidebar-accent border-sidebar-border" placeholder="Leave blank for auto-gen" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Password</Label><Input type="password" className="bg-sidebar-accent border-sidebar-border" placeholder="Leave blank for auto-gen" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4"><Button className="bg-crimson h-12 px-12 font-bold shadow-lg shadow-crimson/20" onClick={handleCreateUser}>Commit Member to SSoT</Button></div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="import" className="mt-6 space-y-6">
              {!importPreview ? (
                <Card className="bg-card border-dashed border-2 border-sidebar-border hover:border-crimson/30 transition-all">
                  <CardContent className="p-24 flex flex-col items-center text-center space-y-6">
                    <div className="w-20 h-20 bg-crimson/10 rounded-full flex items-center justify-center"><FileSpreadsheet className="w-10 h-10 text-crimson" /></div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-white">Bulk Employee Onboarding</h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">Upload Employee Master file (.xlsx) with columns: EmployeeCode, Name, Email, Dept, Role.</p>
                    </div>
                    <div className="flex gap-4">
                       <Button variant="outline" className="border-sidebar-border">Download Template</Button>
                       <input type="file" id="bulk-users" className="hidden" onChange={() => setImporting(true)} />
                       <label htmlFor="bulk-users" className="cursor-pointer bg-crimson text-white px-10 py-3 rounded-lg font-bold shadow-lg hover:scale-105 transition-transform">Select Excel File</label>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-headline text-white flex items-center gap-2"><CheckCircle className="text-green-500 w-5 h-5" /> Import Preview ({importPreview.length} Members)</h3>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setImportPreview(null)}>Discard</Button>
                      <Button className="bg-crimson font-bold px-8" onClick={() => {bulkImportUsers(importPreview); setImportPreview(null);}}>Finalize Import</Button>
                    </div>
                  </div>
                  <Card className="bg-card border-none overflow-hidden shadow-2xl">
                    <Table>
                      <TableHeader className="bg-sidebar-accent"><TableRow className="border-sidebar-border"><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {importPreview.map((u, i) => (
                          <TableRow key={i} className="border-sidebar-border">
                            <TableCell className="font-mono text-white text-xs">{u.employeeCode}</TableCell>
                            <TableCell className="font-bold text-white">{u.name}</TableCell>
                            <TableCell className="text-muted-foreground">{u.email}</TableCell>
                            <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="audit" className="mt-6">
               <Card className="bg-card border-none shadow-2xl overflow-hidden border-l-4 border-crimson">
                 <CardHeader className="bg-sidebar-accent/30 border-b border-sidebar-border">
                   <CardTitle className="text-white text-lg flex items-center gap-2"><Lock className="text-crimson w-5 h-5" /> Access Profile Audit Trail</CardTitle>
                 </CardHeader>
                 <Table>
                   <TableHeader className="bg-sidebar-accent/50">
                     <TableRow className="border-sidebar-border"><TableHead className="pl-6">Employee</TableHead><TableHead>Username</TableHead><TableHead>Temp Password</TableHead><TableHead className="pr-6 text-right">Security Update</TableHead></TableRow>
                   </TableHeader>
                   <TableBody>
                     {filteredUsers.map(u => {
                       const cred = userCredentials.find(c => c.userId === u.id);
                       return (
                         <TableRow key={u.id} className="border-sidebar-border h-16 hover:bg-sidebar-accent/10 transition-colors">
                           <TableCell className="pl-6 font-bold text-white">{u.name}</TableCell>
                           <TableCell className="font-mono text-xs text-crimson">{cred?.username || '--'}</TableCell>
                           <TableCell className="font-mono text-xs">
                             {cred?.tempPassword ? <span className="opacity-40 hover:opacity-100 transition-opacity cursor-help" title="Click Update to change">{cred.tempPassword}</span> : <Badge variant="outline" className="text-green-500 border-green-500/20">Secured</Badge>}
                           </TableCell>
                           <TableCell className="pr-6 text-right"><Button size="sm" variant="ghost" onClick={() => handleOpenCredUpdate(u)}>Update Auth Profile</Button></TableCell>
                         </TableRow>
                       );
                     })}
                   </TableBody>
                 </Table>
               </Card>
            </TabsContent>

            <TabsContent value="matrix" className="mt-6">
              <Card className="bg-card border-none shadow-2xl p-8">
                <CardHeader className="px-0"><CardTitle className="text-white">Studio Role Matrix</CardTitle></CardHeader>
                <div className="space-y-6">
                   <div className="p-4 bg-sidebar-accent/30 rounded-xl border border-sidebar-border">
                      <h4 className="text-sm font-bold text-crimson mb-2">Production Head</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">Full studio access. Can manage all users, projects, and security parameters. Responsible for executive reporting and studio-wide capacity planning.</p>
                   </div>
                   <div className="p-4 bg-sidebar-accent/30 rounded-xl border border-sidebar-border">
                      <h4 className="text-sm font-bold text-white mb-2">Department Supervisor</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">Scoped to a specific pipeline unit. Can onboard Leads and Artists for their department. Executes final sign-offs on shot production.</p>
                   </div>
                   <div className="p-4 bg-sidebar-accent/30 rounded-xl border border-sidebar-border">
                      <h4 className="text-sm font-bold text-muted-foreground mb-2">Department Lead</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">Operational manager for a team of artists. Assigns shots, performs technical QC, and supports artists with credential management for their team only.</p>
                   </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Credential Update Dialog */}
        <Dialog open={credModalOpen} onOpenChange={setCredModalOpen}>
          <DialogContent className="bg-sidebar border-sidebar-border text-white shadow-2xl">
            <DialogHeader><DialogTitle className="flex items-center gap-2 font-headline"><Lock className="text-crimson" /> Update Authentication Profile</DialogTitle></DialogHeader>
            <div className="space-y-6 py-6">
              <div className="p-4 bg-crimson/5 border border-crimson/20 rounded-xl">
                 <p className="text-xs font-bold text-crimson uppercase mb-1">Target Account</p>
                 <p className="text-lg font-bold text-white">{selectedUserForCreds?.name}</p>
                 <p className="text-[10px] text-muted-foreground font-mono">{selectedUserForCreds?.employeeCode}</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2"><Label>SSoT Username</Label><Input className="bg-sidebar-accent border-sidebar-border" value={credFormData.username} onChange={e => setCredFormData({...credFormData, username: e.target.value})} /></div>
                <div className="space-y-2"><Label>New Temporary Password</Label><Input type="password" className="bg-sidebar-accent border-sidebar-border" placeholder="Set new temporary password" value={credFormData.password} onChange={e => setCredFormData({...credFormData, password: e.target.value})} /></div>
                <p className="text-[10px] text-muted-foreground italic flex items-center gap-2"><AlertTriangle className="w-3 h-3" /> This will force a password reset on user's next login.</p>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setCredModalOpen(false)}>Cancel</Button><Button className="bg-crimson px-8 font-bold shadow-lg shadow-crimson/20" onClick={() => { if(selectedUserForCreds) updateUserCredentials(selectedUserForCreds.id, credFormData.username, credFormData.password); setCredModalOpen(false); }}>Sync SSoT Credentials</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}