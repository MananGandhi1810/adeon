import { createFileRoute } from '@tanstack/react-router';

import { useState, useEffect } from "react";
import {
  Plus,
  Play,
  Square,
  Eye,
  ExternalLink,
  GitBranch,
  Clock,
  Server,
  LogOut,
  User,
  Github,
  LayoutDashboard,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import axios from "axios";
import { useNavigate, Link } from "@tanstack/react-router";
import { MagicCard } from "@/components/magicui/magic-card";
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
import { cn } from "@/lib/utils";

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
}

interface User {
  name: string;
  email: string;
  avatarUrl?: string;
}

const frameworks = [
  "Node",
  "React",
  "Express",
  "Next",
  "Flask",
  "Django",
  "Docker",
  "Other",
];

// Search Bar Component
function SearchBar({
  searchQuery,
  onSearchChange,
}: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}) {
  return (
    <div className="relative flex-1 max-w-2xl">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search deployments..."
        className="pl-9 h-11 shadow-sm border-2 border-border focus-visible:ring-0 focus-visible:ring-offset-0"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
}

// Deployment Card Component
function DeploymentCard({
  deployment,
  onStart,
  onStop,
}: {
  deployment: Deployment;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
}) {
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

  return (
    <MagicCard className="group hover:border-primary/50 transition-all duration-200 hover:shadow-md rounded-xl">
      <div className="p-6">
        <div className="pb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">{deployment.name}</h3>
            {getStatusBadge(deployment.status)}
          </div>
          <p className="text-muted-foreground line-clamp-2">
            {deployment.description || "No description"}
          </p>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GitBranch className="h-4 w-4" />
            <span>{deployment.framework}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Updated {new Date(deployment.createdAt).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">Status:</span>
            <span>
              {deployment.status
                ? deployment.status.charAt(0).toUpperCase() +
                deployment.status.slice(1)
                : "Unknown"}
            </span>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStart(deployment.id)}
            disabled={deployment.status === "running"}
          >
            <Play className="h-4 w-4 mr-1" />
            Start
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStop(deployment.id)}
            disabled={deployment.status !== "running"}
          >
            <Square className="h-4 w-4 mr-1" />
            Stop
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/deployments/$id" params={{ id: deployment.id }}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Link>
          </Button>
        </div>

        <Button size="sm" variant="ghost" className="w-full" asChild>
          <a
            href={deployment.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            View on GitHub
          </a>
        </Button>
      </div>
    </MagicCard>
  );
}

// Loading Skeleton Component
function DeploymentsSkeleton() {
  return (
    <div className="space-y-8 p-6 container mx-auto py-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
      </div>

      {/* Search and Create Skeleton */}
      <div className="flex items-center gap-4 justify-between w-full">
        <div className="relative flex-1 max-w-2xl">
          <Skeleton className="h-11 w-full" />
        </div>
        <Skeleton className="h-11 w-40" />
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <MagicCard key={index} className="rounded-xl">
            <div className="p-6">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </MagicCard>
        ))}
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({
  hasDeployments,
  onCreateClick,
}: {
  hasDeployments: boolean;
  onCreateClick: () => void;
}) {
  return (
    <div className="text-center py-12">
      <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">No deployments found</h3>
      <p className="text-muted-foreground mb-4">
        {!hasDeployments
          ? "Get started by creating your first deployment"
          : "No deployments match your search criteria"}
      </p>
      {!hasDeployments && (
        <MagicCard className="inline-block">
          <Button
            onClick={onCreateClick}
            className="gap-2 bg-transparent hover:bg-transparent text-white"
          >
            <Plus className="h-4 w-4" />
            Create Deployment
          </Button>
        </MagicCard>
      )}
    </div>
  );
}

function DeploymentsPage() {
  const router = useNavigate();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<User | null>(null);

  // Form state for new deployment
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    githubUrl: "",
    framework: "",
    envSecrets: [{ key: "", value: "" }],
  });
  useEffect(() => {
    const init = async () => {
      await fetchUser();
      await fetchDeployments();

      const storedGithubUrl = localStorage.getItem("githubUrl");
      const projectName = localStorage.getItem("projectName");
      if (storedGithubUrl && projectName) {
        setFormData((prev) => ({
          ...prev,
          githubUrl: storedGithubUrl,
          name: projectName,
        }));
        setIsCreateDialogOpen(true);
        localStorage.removeItem("githubUrl");
        localStorage.removeItem("projectName");

      }
    };
    init();
  }, [router]);

  const fetchUser = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const { data } = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/auth/user`,
        {
          headers: { authorization: `Bearer ${accessToken}` },
        }
      );
      setUser(data.data.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      router({ to: "/signup" });
    }
  };

  const fetchDeployments = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/deployment`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      setDeployments(response.data.data.deployments);
    } catch (error) {
      console.error("Error fetching deployments:", error);
      toast.error("Failed to fetch deployments");
    } finally {
      setLoading(false);
    }
  };

  const createDeployment = async () => {
    try {
      const filteredEnvSecrets = formData.envSecrets.filter(
        (secret) => secret.key.trim() && secret.value.trim()
      );

      await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/deployment/new`,
        {
          ...formData,
          envSecrets: filteredEnvSecrets,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      toast.success("Deployment created successfully");

      setIsCreateDialogOpen(false);
      setFormData({
        name: "",
        description: "",
        githubUrl: "",
        framework: "",
        envSecrets: [{ key: "", value: "" }],
      });
      fetchDeployments();
    } catch (error: unknown) {
      console.error("Error creating deployment:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create deployment";
      toast.error(errorMessage);
    }
  };

  const startDeployment = async (deploymentId: string) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/deployment/${deploymentId}/start`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      toast.success("Deployment started successfully");
      fetchDeployments();
    } catch (error) {
      console.error("Error starting deployment:", error);
      toast.error("Failed to start deployment");
    }
  };

  const stopDeployment = async (deploymentId: string) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/deployment/${deploymentId}/stop`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      toast.success("Deployment stopped successfully");
      fetchDeployments();
    } catch (error) {
      console.error("Error stopping deployment:", error);
      toast.error("Failed to stop deployment");
    }
  };

  const getDeploymentStatus = async (deploymentId: string) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/deployment/${deploymentId}/status`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      return response.data.data.status;
    } catch (error) {
      return "unknown";
    }
  };

  const addEnvSecret = () => {
    setFormData((prev) => ({
      ...prev,
      envSecrets: [...prev.envSecrets, { key: "", value: "" }],
    }));
  };

  const removeEnvSecret = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      envSecrets: prev.envSecrets.filter((_, i) => i !== index),
    }));
  };

  const updateEnvSecret = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      envSecrets: prev.envSecrets.map((secret, i) =>
        i === index ? { ...secret, [field]: value } : secret
      ),
    }));
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

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    router({ to: "/signup" });
  };

  const filteredDeployments = deployments.filter(
    (deployment) =>
      deployment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deployment.description
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      deployment.framework.toLowerCase().includes(searchQuery.toLowerCase())
  );
  if (loading) {
    return (
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1920px] flex-col overflow-hidden rounded-md bg-muted md:flex-row",
          "h-screen"
        )}
      >
        <div className="flex flex-1 flex-col overflow-hidden bg-card border border-border rounded-2xl h-full w-full max-h-[97vh] max-w-[97vw] m-auto ml-4">
          <DeploymentsSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1920px] flex-col overflow-hidden rounded-md  bg-black md:flex-row ",
        "h-screen"
      )}
    >
      <div className="flex flex-1 flex-col overflow-hidden bg-card border border-border rounded-2xl h-full w-full max-h-[97vh] max-w-[97vw] m-auto m">
        <div className="space-y-8 p-6 container mx-auto py-6 bg-transparent overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  Your Deployments
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage and monitor your application deployments
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
          </div>
          {/* Search and Create */}
          <div className="flex items-center gap-4 justify-between w-full">
            <SearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <MagicCard className="cursor-pointer rounded-lg p-2">
                  <Button
                    className="gap-2 shadow-sm hover:shadow-md transition-all whitespace-nowrap bg-transparent hover:bg-transparent cursor-pointer text-foreground"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    New Deployment
                  </Button>
                </MagicCard>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Deployment</DialogTitle>
                  <DialogDescription>
                    Deploy your application from a GitHub repository
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="my-awesome-app"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="framework">Framework</Label>
                      <Select
                        value={formData.framework}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            framework: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select framework" />
                        </SelectTrigger>
                        <SelectContent>
                          {frameworks.map((framework) => (
                            <SelectItem key={framework} value={framework}>
                              {framework}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="githubUrl">GitHub URL</Label>
                    <Input
                      id="githubUrl"
                      value={formData.githubUrl}
                      placeholder="Github repository URL"
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          githubUrl: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Brief description of your application"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Environment Variables</Label>
                    {formData.envSecrets.map((secret, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="KEY"
                          value={secret.key}
                          onChange={(e) =>
                            updateEnvSecret(index, "key", e.target.value)
                          }
                        />
                        <Input
                          placeholder="VALUE"
                          type="password"
                          value={secret.value}
                          onChange={(e) =>
                            updateEnvSecret(index, "value", e.target.value)
                          }
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeEnvSecret(index)}
                          disabled={formData.envSecrets.length === 1}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addEnvSecret}>
                      Add Variable
                    </Button>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={createDeployment}>
                      Create Deployment
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>{" "}
          {/* Content */}
          {filteredDeployments.length === 0 ? (
            <EmptyState
              hasDeployments={deployments.length > 0}
              onCreateClick={() => setIsCreateDialogOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDeployments.map((deployment) => (
                <DeploymentCard
                  key={deployment.id}
                  deployment={deployment}
                  onStart={startDeployment}
                  onStop={stopDeployment}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/deployments/')({ component: DeploymentsPage });
