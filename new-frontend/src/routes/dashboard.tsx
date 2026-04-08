import { createFileRoute, Outlet } from '@tanstack/react-router';

import { Toaster } from "@/components/ui/sonner";

function DashboardLayout() {
  return (
    <div className="min-h-screen">
      <Outlet />
      <Toaster />
    </div>
  );
}

export const Route = createFileRoute('/dashboard')({ component: DashboardLayout });
