import { createFileRoute } from '@tanstack/react-router';

import type React from "react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Clock,
  ExternalLink,
  Server,
  Container,
  Globe,
  GitBranch,
  User,
  Calendar,
  AlertCircle,
  Copy,
} from "lucide-react";
import { DevToolsSidebar } from "@/components/dev-tools-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface ProvisioningData {
  project: {
    id: string;
    title: string;
    description: string;
    repoUrl: string;
    containerId: string | null;
    containerPort: string | null;
    userId: string;
    createdAt: string;
    updatedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
      ghUsername: string;
      ghAccessToken: string;
      ghId: number;
      avatarUrl: string;
      createdAt: string;
      updatedAt: string;
    };
  };
  containerId: string;
  containerName: string;
  port: string;
  url: string;
  repository: string;
}

const EnvironmentProvisioningPage: React.FC = () => {
  const params = Route.useParams();
  const [provisioningData, setProvisioningData] =
    useState<ProvisioningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const provisionEnvironment = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_URL}/project/${params.id}/provision`,
          {},
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );

        if (response.data.success) {
          setProvisioningData(response.data.data);
          toast.success("Environment provisioned successfully!");
        } else {
          throw new Error(
            response.data.message || "Failed to provision environment"
          );
        }
      } catch (error: any) {
        console.error("Error provisioning environment:", error);
        setError(
          error.response?.data?.message ||
          error.message ||
          "Failed to provision environment"
        );
        toast.error("Failed to provision environment");
      } finally {
        setLoading(false);
      }
    };

    if (params?.id) {
      provisionEnvironment();
    }
  }, [params]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getRepoName = (repoUrl: string) => {
    const match = repoUrl.match(/github\.com\/(.+)/);
    return match ? match[1] : repoUrl;
  };

  if (loading) {
    return (
      <SidebarProvider>
        <DevToolsSidebar id={params.id} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-grain">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        to="/dashboard"
                        className="hover:text-primary transition-colors"
                      >
                        Dashboard
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        to="/dashboard/$id"
                        params={{ id: params.id }}
                        className="hover:text-primary transition-colors"
                      >
                        Repository
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Environment Provisioning</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-6 p-6 bg-grain">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <Clock className="h-12 w-12 animate-spin mx-auto text-primary" />
                <h2 className="text-2xl font-semibold">
                  Provisioning Environment
                </h2>
                <p className="text-muted-foreground">
                  Setting up your development environment...
                </p>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (error) {
    return (
      <SidebarProvider>
        <DevToolsSidebar id={params.id} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-grain">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        to="/dashboard"
                        className="hover:text-primary transition-colors"
                      >
                        Dashboard
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        to="/dashboard/$id"
                        params={{ id: params.id }}
                        className="hover:text-primary transition-colors"
                      >
                        Repository
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Environment Provisioning</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-6 p-6 bg-grain">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
                <h2 className="text-2xl font-semibold">Provisioning Failed</h2>
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!provisioningData) {
    return (
      <SidebarProvider>
        <DevToolsSidebar id={params.id} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-grain">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        to="/dashboard"
                        className="hover:text-primary transition-colors"
                      >
                        Dashboard
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        to="/dashboard/$id"
                        params={{ id: params.id }}
                        className="hover:text-primary transition-colors"
                      >
                        Repository
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Environment Provisioning</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-6 p-6 bg-grain">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="text-2xl font-semibold">No Data Available</h2>
                <p className="text-muted-foreground">
                  No provisioning data found
                </p>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <DevToolsSidebar id={params.id} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-grain">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/dashboard" className="hover:text-primary transition-colors">
                      Dashboard
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/dashboard/$id" params={{ id: params.id }} className="hover:text-primary transition-colors">
                      Repository
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Environment Provisioning</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-6 bg-grain">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Server className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Environment Provisioned
                </h1>
                <p className="text-muted-foreground">
                  Your development environment is ready to use
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Container Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Container className="h-5 w-5" />
                    Container Details
                  </CardTitle>
                  <CardDescription>
                    Information about your provisioned container
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Container Name
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">
                          {provisioningData.containerName}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            copyToClipboard(
                              provisioningData.containerName,
                              "Container Name"
                            )
                          }
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Access URL</span>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={provisioningData.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            copyToClipboard(provisioningData.url, "Access URL")
                          }
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Project Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Project Details
                  </CardTitle>
                  <CardDescription>
                    Information about your project
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Project ID</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {provisioningData.project.id}
                      </code>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Repository</span>
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4" />
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={provisioningData.project.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {getRepoName(provisioningData.project.repoUrl)}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Created</span>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          {formatDate(provisioningData.project.createdAt)}
                        </span>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Last Updated</span>
                      <span className="text-sm">
                        {formatDate(provisioningData.project.updatedAt)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Owner Details
                  </CardTitle>
                  <CardDescription>
                    Information about the project owner
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        provisioningData.project.user.avatarUrl ||
                        "/placeholder.svg"
                      }
                      alt={provisioningData.project.user.name}
                      className="h-10 w-10 rounded-full"
                    />
                    <div>
                      <p className="font-medium">
                        {provisioningData.project.user.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{provisioningData.project.user.ghUsername}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Email</span>
                      <span className="text-sm">
                        {provisioningData.project.user.email}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">GitHub ID</span>
                      <span className="text-sm">
                        {provisioningData.project.user.ghId}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>
                    Common actions for your environment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" asChild>
                    <a
                      href={provisioningData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Development Environment
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={provisioningData.project.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <GitBranch className="h-4 w-4 mr-2" />
                      View Repository
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      copyToClipboard(provisioningData.url, "Environment URL")
                    }
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Environment URL
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};



export const Route = createFileRoute('/dashboard/$id/environment-provisioning/')({ component: EnvironmentProvisioningPage });
