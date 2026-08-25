
"use client";

import React from 'react';
import { AppSidebar } from '@/components/layout/sidebar';
import { useLuminaStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, User, Shield, Bell, Moon, Database } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function SettingsPage() {
  const { currentUser, currentRole } = useLuminaStore();

  const displayName =
    currentUser?.name ??
    currentUser?.fullName ??
    currentUser?.username ??
    currentUser?.displayName ??
    'User';
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-headline text-white mb-2">Profile & Settings</h1>
            <p className="text-muted-foreground">Manage your studio identity and production preferences.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-6">
              <Card className="bg-card border-none p-6 text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4 border-2 border-crimson">
                  <AvatarImage src={currentUser?.avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl">{avatarInitial}</AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold text-white">{displayName}</h3>
                <p className="text-xs text-crimson font-bold uppercase tracking-widest mt-1">{currentRole}</p>
                <p className="text-xs text-muted-foreground mt-4 font-mono">{currentUser?.employeeCode}</p>
                <Button variant="outline" className="w-full mt-6 text-xs h-8">Change Avatar</Button>
              </Card>

              <nav className="space-y-1">
                {[
                  { label: 'General', icon: Settings },
                  { label: 'Security', icon: Shield },
                  { label: 'Notifications', icon: Bell },
                  { label: 'SSoT Status', icon: Database },
                ].map(item => (
                  <button key={item.label} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:text-white hover:bg-sidebar-accent rounded-lg transition-colors">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="md:col-span-2 space-y-6">
              <Card className="bg-card border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Personal Information</CardTitle>
                  <CardDescription>Update your contact details for studio communications.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Full Name</Label>
                      <Input className="bg-sidebar-accent border-sidebar-border text-white" defaultValue={displayName} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Email Address</Label>
                      <Input className="bg-sidebar-accent border-sidebar-border text-white" defaultValue={currentUser?.email} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Department</Label>
                    <Input className="bg-sidebar-accent border-sidebar-border text-white" defaultValue={currentUser?.departmentId} disabled />
                  </div>
                  <Button className="bg-crimson font-bold">Save Profile</Button>
                </CardContent>
              </Card>

              <Card className="bg-card border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Studio Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">Dark Mode</p>
                      <p className="text-xs text-muted-foreground">Force high-contrast cinematic interface.</p>
                    </div>
                    <Switch checked />
                  </div>
                  <Separator className="bg-sidebar-border" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">Email Notifications</p>
                      <p className="text-xs text-muted-foreground">Receive daily standup summaries via email.</p>
                    </div>
                    <Switch />
                  </div>
                  <Separator className="bg-sidebar-border" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">Timer Auto-Sync</p>
                      <p className="text-xs text-muted-foreground">Automatically push time logs to SSoT every 5 minutes.</p>
                    </div>
                    <Switch checked />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
