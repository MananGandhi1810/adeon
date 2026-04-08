import { createFileRoute } from '@tanstack/react-router';

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Play,
  Square,
  RefreshCw,
  ExternalLink,
  Server,
  GitBranch,
  Clock,
  Key,
  LogOut,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { MagicCard } from "@/components/magicui/magic-card";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";

interface EnvSecret {
  key: string;
  value: string;
}

interface Deployment {
  id: string;
  name: string;
  description?: string;
  framework: string;
  githubUrl: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  envSecrets?: EnvSecret[];
  containerId?: string;
  containerPort?: number;
  appUrl?: string | null;
}

interface User {
  name: string;
  email: string;
  avatarUrl?: string;
}

// Loading Skeleton Component
function DeploymentDetailSkeleton() {
  return (
    <div className="space-y-8 p-6 container mx-auto py-6">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-20" />
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Cards Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>

      {/* Environment Variables Skeleton */}
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

function DeploymentDetailPage() {
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const params = Route.useParams();
  const router = useNavigate();

  const getFallbackAppUrl = (port?: number) => {
    if (!port || typeof window === "undefined") {
      return null;
    }
    return `${window.location.protocol}//${window.location.hostname}:${port}`;
  };

  useEffect(() => {
    const init = async () => {
      await fetchUser();
      await fetchDeployment();
    };
    init();
  }, [params.id]);

  const fetchUser = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const { data } = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/auth/user`,
        {
          headers: { authorization: `Bearer ${accessToken}` },
        },
      );
      setUser(data.data.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      router({ to: "/signup" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    router({ to: "/signup" });
  };

  const fetchDeployment = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/deployment/${params.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );
      setDeployment(response.data.data.deployment);
    } catch (error) {
      toast.error("Failed to fetch deployment details");
      // router({ to: "/deployments" });
    } finally {
      setLoading(false);
    }
  };
  const refreshStatus = async () => {
    if (!deployment) return;

    setStatusLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/deployment/${deployment.id}/status`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );
      setDeployment((prev) =>
        prev ? { ...prev, status: response.data.data.status } : null,
      );
    } catch (error) {
      toast.error("Failed to refresh status");
    } finally {
      setStatusLoading(false);
    }
  };

  const startDeployment = async () => {
    if (!deployment) return;

    try {
      await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/deployment/${deployment.id}/start`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );
      toast.success("Deployment started successfully");
      refreshStatus();
    } catch (error) {
      toast.error("Failed to start deployment");
    }
  };

  const stopDeployment = async () => {
    if (!deployment) return;

    try {
      await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/deployment/${deployment.id}/stop`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );
      toast.success("Deployment stopped successfully");
      refreshStatus();
    } catch (error) {
      toast.error("Failed to stop deployment");
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "running":
        return <Badge className="bg-green-100 text-green-800">Running</Badge>;
      case "stopped":
        return <Badge variant="secondary">Stopped</Badge>;
      case "exited":
        return <Badge variant="destructive">Exited</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  if (loading) {
    return (
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1920px] flex-col overflow-hidden rounded-md bg-muted md:flex-row",
          "h-screen",
        )}
      >
        <div className="flex flex-1 flex-col overflow-hidden bg-card border border-border rounded-2xl h-full w-full max-h-[97vh] max-w-[97vw] m-auto ml-4">
          <DeploymentDetailSkeleton />
        </div>
      </div>
    );
  }

  if (!deployment) {
    return (
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1920px] flex-col overflow-hidden rounded-md bg-black md:flex-row",
          "h-screen",
        )}
      >
        <div className="flex flex-1 flex-col overflow-hidden bg-card border border-border rounded-2xl h-full w-full max-h-[97vh] max-w-[97vw] m-auto m">
          <div className="flex flex-1 flex-col items-center justify-center p-6">
            <h1 className="text-2xl font-bold">Deployment Not Found</h1>
            <p className="text-muted-foreground mt-2">
              The deployment you&apos;re looking for doesn&apos;t exist or could
              not be loaded.
            </p>
            <Button className="mt-4" asChild>
              <Link to="/deployments">Back to Deployments</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const appUrl =
    deployment.appUrl || getFallbackAppUrl(deployment.containerPort);

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1920px] flex-col overflow-hidden rounded-md bg-black md:flex-row",
        "h-screen",
      )}
    >
      <div className="flex flex-1 flex-col overflow-hidden bg-card border border-border rounded-2xl h-full w-full max-h-[97vh] max-w-[97vw] m-auto m">
        <div className="space-y-8 p-6 container mx-auto py-6 bg-transparent overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="h-6 w-px bg-border" />
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold tracking-tight">
                    {deployment.name}
                  </h1>
                  {getStatusBadge(deployment.status)}
                </div>
                <p className="text-muted-foreground mt-1">
                  {deployment.description || "No description"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>
                          {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:inline">
                        {user.name || user.email}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>{" "}
          {/* Content */}
          <div className="grid gap-8 md:grid-cols-2">
            <MagicCard className="hover:border-primary/50 transition-all duration-200 hover:shadow-md rounded-xl p-6">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Server className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Deployment Info</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Status
                    </span>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(deployment.status)}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={refreshStatus}
                        disabled={statusLoading}
                        className="h-8 w-8 p-0"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${
                            statusLoading ? "animate-spin" : ""
                          }`}
                        />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Framework
                    </span>
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {deployment.framework}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Created
                    </span>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {new Date(deployment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Last Updated
                    </span>
                    <span className="text-sm font-medium">
                      {new Date(deployment.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {deployment.containerPort && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Container Port
                        </span>
                        <span className="text-sm font-medium font-mono">
                          {deployment.containerPort}
                        </span>
                      </div>

                      {appUrl && (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between py-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              App URL
                            </span>
                            <a
                              href={appUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              Open
                            </a>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </MagicCard>

            <MagicCard className="hover:border-primary/50 transition-all duration-200 hover:shadow-md rounded-xl p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Actions</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your deployment
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Button
                      onClick={startDeployment}
                      disabled={deployment.status === "running"}
                      className="flex-1 h-11"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                    <Button
                      variant="outline"
                      onClick={stopDeployment}
                      disabled={deployment.status !== "running"}
                      className="flex-1 h-11"
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                  </div>

                  <Button variant="outline" className="w-full h-11" asChild>
                    <a
                      href={deployment.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on GitHub
                    </a>
                  </Button>

                  {appUrl && (
                    <Button variant="outline" className="w-full h-11" asChild>
                      <a
                        href={appUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Deployment
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </MagicCard>
          </div>{" "}
          {deployment.envSecrets && deployment.envSecrets.length > 0 && (
            <MagicCard className="hover:border-primary/50 transition-all duration-200 hover:shadow-md rounded-xl p-6">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      Environment Variables
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Environment variables configured for this deployment
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {deployment.envSecrets.map((secret, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border/50"
                    >
                      <span className="font-mono text-sm font-medium">
                        {secret.key}
                      </span>
                      <span className="text-sm text-muted-foreground font-mono">
                        ••••••••
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </MagicCard>
          )}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/deployments/$id/')({ component: DeploymentDetailPage });
