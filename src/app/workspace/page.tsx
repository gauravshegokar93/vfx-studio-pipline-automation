"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { WorkspaceCard } from "@/components/workspace/WorkspaceCard";
import { AdminPanelCard } from "@/components/workspace/AdminPanelCard";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { workspaceRoles } from "@/config/workspace";
import { workspaceNavigation } from "@/config/navigation";
import { hasPermission } from "@/lib/permissions";
import type { WorkspaceRole } from "@/config/workspace";

export default function WorkspacePage() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const router = useRouter();
  const { role } = useAuth();

  const selectedRoleConfig = workspaceRoles.find(
    (r) => r.roleKey === selectedRole
  );

  const handleCardClick = (roleKey: string) => {
    setSelectedRole(roleKey);

    const navigationItem = workspaceNavigation.find(
      (item) => item.roleKey === roleKey
    );

    if (navigationItem) {
      router.push(navigationItem.route);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Workspace
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Select your working area
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-8 lg:flex-row">
              {/* Role Cards Grid */}
              <div className="flex-1">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {workspaceRoles.map((role: WorkspaceRole) => {
                    const Icon = role.icon;
                    return (
                      <WorkspaceCard
                        key={role.roleKey}
                        roleKey={role.roleKey}
                        title={role.title}
                        description={role.description}
                        icon={<Icon className="h-6 w-6" />}
                        color={role.color}
                        isSelected={selectedRole === role.roleKey}
                        onClick={() => handleCardClick(role.roleKey)}
                      />
                    );
                  })}
                </div>

                {/* Selection Information Box */}
                <div className="mt-6 rounded-lg border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">
                    {selectedRoleConfig ? (
                      <>
                        Selected Workspace:<br />
                        {selectedRoleConfig.title}
                      </>
                    ) : (
                      "Please select a workspace."
                    )}
                  </p>
                </div>
              </div>

              {/* Admin Panel - Top Right */}
              {role && hasPermission(role, "admin.view") && (
                <div className="lg:w-80">
                  <div className="lg:sticky lg:top-8">
                    <AdminPanelCard visible={true} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
