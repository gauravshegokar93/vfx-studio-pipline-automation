
"use client";

import React, { useState, useMemo } from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Loader2,
  Lock,
  Eye,
  EyeOff
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
  const { currentRole, currentUser, users, userCredentials, addUser, bulkImportUsers, toggleUserStatus, resetUserPassword, departments } = useLuminaStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<User[] | null>(null);

  // Permission Logic
  const isProductionHead = currentRole === 'Production Head';
  const isSupervisor = currentRole === 'Department Supervisor';
  const canManageStaff = isProductionHead || isSupervisor;

  // Manual Creation State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employeeCode: '',
    role: 'Artist' as Role,
    departmentId: currentUser?.departmentId || '',
    leadId: '',
    username: '',
    password: ''
  });

  // Filter users based on scope
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
    if (isProductionHead) return matchesSearch;
    if (isSupervisor) return matchesSearch && u.departmentId === currentUser?.departmentId;
    return false;
  });

  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImporting(true);
      // Simulate reading Excel columns: EmployeeCode, EmployeeName, Email, Department, Lead, Role
      setTimeout(() => {
        const mockParsed: User[] = [
          { id: `u_bulk_${Date.now()}_1`, employeeCode: 'EMP-VFX-900', name: 'John Matrix', email: 'matrix@lumina.vfx', role: 'Artist', departmentId: 'dept-comp', isActive: true, isFirstLogin: true },
          { id: `u_bulk_${Date.now()}_2`, employeeCode: 'EMP-VFX-901', name: 'Sarah Connor', email: 'sarah@lumina.vfx', role: 'Artist', departmentId: 'dept-comp', isActive: true, isFirstLogin: true },
          { id: `u_bulk_${Date.now()}_3`, employeeCode: 'EMP-VFX-902', name: 'Kyle Reese', email: 'kyle@lumina.vfx', role: 'Lead', departmentId: 'dept-comp', isActive: true, isFirstLogin: true },
        ];
        setImportPreview(mockParsed);
        setImporting(false);
      }, 1000);
    }
  };

  const confirmBulkImport = () => {
    if (importPreview) {
      bulkImportUsers(importPreview);
      setImportPreview(null);
      toast({ title: "Import Successful", description: `${importPreview.length} users added to SSoT.` });
    }
  };

  const handleCreateUser = () => {
    if (!formData.name || !formData.email || !formData.employeeCode) {
      toast({ variant: 'destructive', title: 'Missing Info', description: 'Basic details are required.' });
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

    addUser(newUser, { 
      username: formData.username, 
      tempPassword: formData.password 
    });
    
    setIsModalOpen(false);
    toast({ title: "User Created", description: `${newUser.name} added to ${formData.departmentId}.` });
  };

  const exportCredentials = () => {
    // Simulate generation of a CSV/Excel list
    const list = users.map(u => {
      const cred = userCredentials.find(c => c.userId === u.id);
      return `${u.name}, ${cred?.username}, ${cred?.tempPassword || '******'}`;
    }).join('\n');
    
    const blob = new Blob([`Employee Name, Username, Temporary Password\n${list}`], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Lumina_Employee_Credentials.csv';
    a.click();
    toast({ title: "Export Started", description: "Credential list downloaded." });
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
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Enterprise Employee Master</span>
              </div>
              <h1 className="text-4xl font-headline text-white mb-2">Staff & Identity Management</h1>
              <p className="text-muted-foreground">Managing secure access lifecycle and hierarchical resource registry.</p>
            </div>
            
            <div className="flex gap-4">
              <Button variant="outline" className="border-sidebar-border" onClick={exportCredentials}>
                <Download className="w-4 h-4 mr-2" /> Export Credentials
              </Button>
              
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-crimson h-12 px-8 font-bold shadow-lg shadow-crimson/20">
                    <UserPlus className="w-5 h-5 mr-2" /> Create Production Staff
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-sidebar border-sidebar-border text-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-headline">Manual User Onboarding</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-6 py-6 border-b border-sidebar-border/30">
                    <div className="space-y-4">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Profile Details</p>
                      <div className="space-y-2">
                        <Label className="text-xs">Full Name</Label>
                        <Input className="bg-sidebar-accent border-sidebar-border" placeholder="e.g. Ellen Ripley" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Employee Code</Label>
                        <Input className="bg-sidebar-accent border-sidebar-border" placeholder="EMP-VFX-001" value={formData.employeeCode} onChange={e => setFormData({...formData, employeeCode: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Email</Label>
                        <Input className="bg-sidebar-accent border-sidebar-border" placeholder="ripley@lumina.vfx" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Hierarchy & Access</p>
                      <div className="space-y-2">
                        <Label className="text-xs">Role</Label>
                        <Select value={formData.role} onValueChange={(val: any) => setFormData({...formData, role: val})}>
                          <SelectTrigger className="bg-sidebar-accent border-sidebar-border"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-sidebar border-sidebar-border text-white">
                            <SelectItem value="Artist">Artist</SelectItem>
                            <SelectItem value="Lead">Lead</SelectItem>
                            <SelectItem value="Department Supervisor">Supervisor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Department</Label>
                        <Select value={formData.departmentId} onValueChange={val => setFormData({...formData, departmentId: val})} disabled={!isProductionHead}>
                          <SelectTrigger className="bg-sidebar-accent border-sidebar-border"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-sidebar border-sidebar-border text-white">
                            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {formData.role === 'Artist' && (
                        <div className="space-y-2">
                          <Label className="text-xs">Reporting Lead</Label>
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
                  <div className="py-6 space-y-4">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Login Credentials (Optional - Defaults to System Gen)</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Username Override</Label>
                        <Input className="bg-sidebar-accent border-sidebar-border" placeholder="ripley.e" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Password Override</Label>
                        <div className="relative">
                          <Input type={showPass ? 'text' : 'password'} className="bg-sidebar-accent border-sidebar-border pr-10" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                          <button className="absolute right-3 top-2.5 text-muted-foreground hover:text-white" onClick={() => setShowPass(!showPass)}>
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button className="bg-crimson font-bold px-8" onClick={handleCreateUser}>Commit Member to SSoT</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Tabs defaultValue="registry" className="w-full">
            <TabsList className="bg-sidebar border border-sidebar-border p-1 h-12">
              <TabsTrigger value="registry" className="px-8 font-bold flex gap-2"><Users className="w-4 h-4" /> User Registry</TabsTrigger>
              <TabsTrigger value="import" className="px-8 font-bold flex gap-2"><FileUp className="w-4 h-4" /> Bulk Onboarding</TabsTrigger>
              <TabsTrigger value="audit" className="px-8 font-bold flex gap-2"><Lock className="w-4 h-4" /> Credentials Audit</TabsTrigger>
            </TabsList>

            <TabsContent value="registry" className="mt-6">
              <Card className="bg-card border-none shadow-2xl overflow-hidden">
                <div className="p-6 bg-sidebar-accent/20 border-b border-sidebar-border flex justify-between items-center">
                  <div className="relative w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search employee master..." className="pl-10 bg-sidebar border-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <Badge variant="outline" className="border-sidebar-border">{filteredUsers.length} active records</Badge>
                </div>
                <Table>
                  <TableHeader className="bg-sidebar-accent/50">
                    <TableRow className="border-sidebar-border h-12">
                      <TableHead className="pl-6">Employee</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(u => (
                      <TableRow key={u.id} className="border-sidebar-border hover:bg-sidebar-accent/10 h-16 transition-colors">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center font-bold text-crimson">{u.name.charAt(0)}</div>
                            <div className="flex flex-col">
                              <span className="font-bold text-white text-sm">{u.name}</span>
                              <span className="text-[10px] text-muted-foreground">{u.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-white">{u.employeeCode}</TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "text-[10px] font-bold uppercase",
                            u.role === 'Production Head' ? "bg-crimson text-white" : "bg-sidebar-accent text-muted-foreground"
                          )}>{u.role}</Badge>
                        </TableCell>
                        <TableCell className="text-xs uppercase font-bold text-muted-foreground">
                          {departments.find(d => d.id === u.departmentId)?.name || 'Studio'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={u.isActive ? 'default' : 'secondary'} 
                            className={cn(
                              "text-[8px] uppercase",
                              u.isActive ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                            )}
                          >
                            {u.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex justify-end gap-1">
                             <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-white" onClick={() => resetUserPassword(u.id)} title="Reset Password"><Key className="w-4 h-4" /></Button>
                             {u.id !== currentUser?.id && (
                               <Button 
                                 size="sm" 
                                 variant="ghost" 
                                 className={cn(
                                   "transition-colors",
                                   u.isActive ? "text-muted-foreground hover:text-red-500" : "text-green-500 hover:text-green-400"
                                 )} 
                                 onClick={() => toggleUserStatus(u.id)}
                                 title={u.isActive ? "Deactivate Account" : "Activate Account"}
                               >
                                 {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                               </Button>
                             )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="import" className="mt-6 space-y-6">
              {!importPreview ? (
                <Card className="bg-card border-dashed border-2 border-sidebar-border hover:border-crimson/30 transition-all">
                  <CardContent className="p-20 flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-crimson/10 rounded-full flex items-center justify-center">
                      <FileUp className="w-8 h-8 text-crimson" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Upload Employee Master</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Upload .xlsx or .csv containing: EmployeeCode, EmployeeName, Email, Department, Lead, Role.
                    </p>
                    <input type="file" id="bulk-users" className="hidden" onChange={handleBulkFileSelect} />
                    <label htmlFor="bulk-users" className="cursor-pointer bg-crimson text-white px-10 py-3 rounded-lg font-bold shadow-lg shadow-crimson/20 hover:scale-105 transition-transform">
                      {importing ? <Loader2 className="animate-spin w-5 h-5" /> : "Select Excel File"}
                    </label>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-headline text-white flex items-center gap-2"><CheckCircle className="text-green-500 w-5 h-5" /> Import Preview ({importPreview.length} Members)</h3>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setImportPreview(null)}>Discard</Button>
                      <Button className="bg-crimson font-bold px-8" onClick={confirmBulkImport}>Finalize Import</Button>
                    </div>
                  </div>
                  <Card className="bg-card border-none overflow-hidden shadow-2xl">
                    <Table>
                      <TableHeader className="bg-sidebar-accent">
                        <TableRow className="border-sidebar-border">
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.map((u, i) => (
                          <TableRow key={i} className="border-sidebar-border">
                            <TableCell className="font-mono text-white text-xs">{u.employeeCode}</TableCell>
                            <TableCell className="font-bold text-white">{u.name}</TableCell>
                            <TableCell className="text-muted-foreground">{u.email}</TableCell>
                            <TableCell className="text-[10px] uppercase font-bold">{u.departmentId}</TableCell>
                            <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                            <TableCell><CheckCircle className="text-green-500 w-4 h-4" /></TableCell>
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
                   <CardTitle className="text-white text-lg flex items-center gap-2">
                     <Lock className="text-crimson w-5 h-5" /> Credentials Access Matrix
                   </CardTitle>
                 </CardHeader>
                 <Table>
                   <TableHeader className="bg-sidebar-accent/50">
                     <TableRow className="border-sidebar-border">
                       <TableHead className="pl-6">Employee Name</TableHead>
                       <TableHead>SSoT Username</TableHead>
                       <TableHead>Temporary Password</TableHead>
                       <TableHead>Security State</TableHead>
                       <TableHead className="pr-6 text-right">Audit</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {users.map(u => {
                       const cred = userCredentials.find(c => c.userId === u.id);
                       return (
                         <TableRow key={u.id} className="border-sidebar-border h-16 hover:bg-sidebar-accent/10 transition-colors">
                           <TableCell className="pl-6 font-bold text-white">{u.name}</TableCell>
                           <TableCell className="font-mono text-xs text-crimson">{cred?.username || '--'}</TableCell>
                           <TableCell className="font-mono text-xs">
                             {cred?.tempPassword ? (
                               <div className="flex items-center gap-2 group">
                                 <span className="text-white opacity-40 group-hover:opacity-100 transition-opacity">{cred.tempPassword}</span>
                                 <AlertCircle className="w-3 h-3 text-yellow-500" />
                               </div>
                             ) : (
                               <Badge variant="outline" className="text-green-500 border-green-500/20">Secured (User Set)</Badge>
                             )}
                           </TableCell>
                           <TableCell>
                             <div className="flex flex-col gap-0.5">
                               <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Last Reset</span>
                               <span className="text-[10px] text-white font-mono">{cred?.lastChangedAt ? new Date(cred.lastChangedAt).toLocaleDateString() : 'N/A'}</span>
                             </div>
                           </TableCell>
                           <TableCell className="pr-6 text-right">
                              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-crimson" onClick={() => resetUserPassword(u.id)}>Issue Force Reset</Button>
                           </TableCell>
                         </TableRow>
                       );
                     })}
                   </TableBody>
                 </Table>
               </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
