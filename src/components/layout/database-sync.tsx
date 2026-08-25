"use client";

import React, { useEffect, useState } from 'react';
import { useLuminaStore } from '@/lib/store';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';

interface DatabaseSyncProps {
  children: React.ReactNode;
}

export function DatabaseSync({ children }: DatabaseSyncProps) {
  const { user: authUser, role } = useAuth();
  const [loading, setLoading] = useState(true);

  const syncDatabase = async () => {
    try {
      console.log('[DatabaseSync] Fetching fresh data from SQL Server for role:', role);
      
      const [sequencesRes, shotsRes, tasksRes, usersRes, departmentsRes, credentialsRes] = await Promise.all([
        // apiClient.get('/projects'),
        apiClient.get('/sequences'),
        apiClient.get('/shots'),
        apiClient.get('/tasks'),
        apiClient.get('/users'),
        apiClient.get('/departments'),
        apiClient.get('/users/credentials'),
      ]);

      const projects: any[] = [];
      const sequences = sequencesRes.data.items || [];
      const rawShots = shotsRes.data.items || [];
      const tasks = tasksRes.data.items || [];
      const departments = departmentsRes.data.items || [];

      const normalizeUser = (user: any) => ({
        ...user,
        id: user.id ?? user.UserId ?? user.userId ?? '',
        employeeCode: user.employeeCode ?? user.EmployeeCode ?? '',
        name: user.name ?? user.Name ?? user.fullName ?? user.displayName ?? user.username ?? '',
        fullName: user.fullName ?? user.Name ?? user.name ?? user.displayName ?? user.username ?? '',
        username: user.username ?? user.Username ?? user.Email ?? '',
        displayName: user.displayName ?? user.Name ?? user.name ?? user.fullName ?? user.username ?? '',
        email: user.email ?? user.Email ?? '',
        role: user.role ?? user.RoleName ?? user.Role ?? 'Artist',
        departmentId: user.departmentId ?? user.DepartmentId ?? '',
        leadId: user.leadId ?? user.LeadId ?? '',
        isActive: user.isActive ?? user.IsActive ?? true,
        avatarUrl: user.avatarUrl ?? user.AvatarUrl ?? '',
        isFirstLogin: user.isFirstLogin ?? user.IsFirstLogin ?? true,
      });

      const users = (usersRes.data.items || []).map(normalizeUser);

      // Map projectId to Shots because the database schema links Shot to Sequence, but frontend expects projectId on Shot too
      const seqToProjectMap = new Map<string, string>();
      sequences.forEach((seq: any) => {
        seqToProjectMap.set(seq.id, seq.projectId);
      });

      const shots = rawShots.map((shot: any) => ({
        ...shot,
        projectId: seqToProjectMap.get(shot.sequenceId) || '',
      }));

      // Dynamically select the current active user matching the authenticated identity
      const matchingUser = users.find((u: any) => 
        (u.id && authUser?.id && u.id === authUser.id) || 
        (u.userId && authUser?.userId && u.userId === authUser.userId) || 
        (u.email && authUser?.email && u.email === authUser.email)
      ) || authUser || null;

      console.log('[DatabaseSync] currentUser payload:', matchingUser);
      console.log('[DatabaseSync] Synchronized records count:', {
        projects: projects.length,
        sequences: sequences.length,
        shots: shots.length,
        tasks: tasks.length,
        users: users.length,
        departments: departments.length,
      });

      // Update the Zustand store with live SQL Server data
      useLuminaStore.setState({
        projects,
        sequences,
        shots,
        tasks: tasks.map((t: any) => ({
          ...t,
          progress: t.progress || 0,
          reviewStatus: t.reviewStatus || 'Pending',
          internalEta: t.internalEta || t.dueDate || '',
          leadId: t.leadId || '',
          assignedArtistId: t.assignedArtistId || '',
        })),
        users,
        departments,
        userCredentials: credentialsRes?.data?.items || [],
        currentUser: matchingUser,
      });

    } catch (err) {
      console.error('[DatabaseSync] Error fetching live SQL Server data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncDatabase();

    // Set up an event listener to trigger re-syncing from database (e.g. after upload)
    const handleSyncEvent = () => {
      syncDatabase();
    };

    window.addEventListener('sync-database', handleSyncEvent);
    return () => {
      window.removeEventListener('sync-database', handleSyncEvent);
    };
  }, [role]);

  return <>{children}</>;
}
