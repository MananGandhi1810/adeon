import * as React from "react";
import { Check, ChevronsUpDown, GitBranch, Loader2 } from "lucide-react";
import axios from "axios";
import { useNavigate, useParams } from "@tanstack/react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface Project {
  id: string;
  title: string;
  description: string;
  repoUrl: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface Repository {
  id: string;
  name: string;
  owner: string;
  language: string;
  repoUrl: string;
  title: string;
}

export function RepositorySelector() {
  const { isMobile } = useSidebar();
  const router = useNavigate();
  const params = useParams({ strict: false });
  const [repositories, setRepositories] = React.useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = React.useState<Repository | null>(
    null,
  );
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Get current project ID from URL slug
  const currentProjectId = params?.id as string;

  // Extract repository info from GitHub URL
  const parseRepoUrl = (url: string) => {
    const match = url.match(/github\.com\/([\w.-]+)\/([\w.-]+)/);
    if (match) {
      return {
        owner: match[1],
        name: match[2],
      };
    }
    return { owner: "Unknown", name: "Unknown Repository" };
  };

  // Fetch projects from API
  const fetchProjects = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        router({ to: "/signup" });
        return;
      }

      const response = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/project/list`,
        { headers: { authorization: `Bearer ${accessToken}` } },
      );

      const projects: Project[] = response.data.data.projectData;

      // Transform projects to repository format
      const repos: Repository[] = projects.map((project) => {
        const { owner, name } = parseRepoUrl(project.repoUrl);
        return {
          id: project.id,
          name: project.title || name,
          owner,
          language: "Unknown", // You might want to fetch this from GitHub API or store it
          repoUrl: project.repoUrl,
          title: project.title,
        };
      });

      setRepositories(repos);

      // Set selected repository based on current URL slug
      if (currentProjectId && repos.length > 0) {
        const currentRepo = repos.find((repo) => repo.id === currentProjectId);
        if (currentRepo) {
          setSelectedRepo(currentRepo);
        } else {
          // If project ID in URL doesn't exist, redirect to dashboard
          router({ to: "/dashboard" });
        }
      } else if (repos.length > 0 && !selectedRepo && !currentProjectId) {
        // If no project ID in URL and no selected repo, set first one
        setSelectedRepo(repos[0]);
      }
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      setError("Failed to load repositories");

      // If unauthorized, redirect to signup
      if (error.response?.status === 401) {
        router({ to: "/signup" });
      }
    } finally {
      setIsLoading(false);
    }
  }, [router, currentProjectId]);

  // Fetch projects on component mount
  React.useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Handle repository selection
  const handleRepoSelect = (repo: Repository) => {
    setSelectedRepo(repo);
    // Navigate to the selected repository's page
    router({ to: `/dashboard/${repo.id}` });
  };

  // Update selected repo when URL changes
  React.useEffect(() => {
    if (currentProjectId && repositories.length > 0) {
      const currentRepo = repositories.find(
        (repo) => repo.id === currentProjectId,
      );
      if (currentRepo && selectedRepo?.id !== currentRepo.id) {
        setSelectedRepo(currentRepo);
      }
      console.log("Current repo updated:", currentRepo);
      console.log("Selected repo:", selectedRepo);
    }
  }, [currentProjectId, repositories, selectedRepo?.id]);

  // Loading state
  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Loading...</span>
              <span className="truncate text-xs text-sidebar-foreground/70">
                Fetching repositories
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Error state
  if (error) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-red-500 text-white">
              <GitBranch className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Error</span>
              <span className="truncate text-xs text-sidebar-foreground/70">
                {error}
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // No repositories state
  if (repositories.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            onClick={() => router({ to: "/dashboard" })}
            className="cursor-pointer"
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <GitBranch className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">No Repositories</span>
              <span className="truncate text-xs text-sidebar-foreground/70">
                Click to import
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Normal state with repositories
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <GitBranch className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {selectedRepo?.name || "Select Repository"}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {selectedRepo
                    ? `${selectedRepo.owner}`
                    : "No repository selected"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Select Repository ({repositories.length})
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {repositories.map((repo) => (
              <DropdownMenuItem
                key={repo.id}
                onClick={() => handleRepoSelect(repo)}
                className="gap-2 p-2 cursor-pointer"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <GitBranch className="size-4 shrink-0" />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-medium truncate">{repo.name}</span>
                  <span className="text-xs text-muted-foreground truncate ">
                    {repo.owner}
                  </span>
                </div>
                {selectedRepo?.id === repo.id && (
                  <Check className="ml-auto size-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router({ to: "/dashboard" })}
              className="gap-2 p-2 cursor-pointer text-primary"
            >
              <div className="flex size-6 items-center justify-center rounded-sm border border-primary">
                <GitBranch className="size-4 shrink-0" />
              </div>
              <span className="font-medium">Import New Repository</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
