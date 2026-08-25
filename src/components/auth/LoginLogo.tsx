"use client";

import React from "react";
import { Film } from "lucide-react";

export function LoginLogo() {
  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Company Logo Placeholder */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg">
        <Film className="h-8 w-8 text-white" />
      </div>

      {/* Application Name */}
      <div className="text-center">
        <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground">
          SM Rolling FX
        </h1>
        <p className="text-sm text-muted-foreground">
          Lumina VFX Hub ERP
        </p>
      </div>
    </div>
  );
}
