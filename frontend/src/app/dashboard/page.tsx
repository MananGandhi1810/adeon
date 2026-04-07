"use client";

import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  LogOut,
  User,
  Github,
  LayoutDashboard,
  Rocket,
  CheckIcon,
  ChevronsUpDownIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import React, { createContext, useContext } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconMenu2, IconX } from "@tabler/icons-react";
import Image from "next/image";
import { MagicCard } from "@/components/magicui/magic-card";

// Add Command and Popover imports
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Types
interface Project {
  id: string;
  title: string;
  description: string;
  repoUrl: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  name: string;
  email: string;
  avatarUrl?: string;
}

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

// Import Repository Dialog Component
function ImportRepositoryDialog({
  isOpen,
  onOpenChange,
  onImport,
  isImporting,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: { url: string; title: string; description: string }) => void;
  isImporting: boolean;
}) {
  const [repositories, setRepositories] = useState<
    { url: string; title: string; description: string }[]
  >([]);
  const [repoUrl, setRepoUrl] = useState("");
  const [repoTitle, setRepoTitle] = useState("");
  const [repoDescription, setRepoDescription] = useState("");
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false); // New state for Combobox

  useEffect(() => {
    if (isOpen) {
      setLoadingRepos(true);

      axios
        .get(`${process.env.NEXT_PUBLIC_SERVER_URL}/auth/repositories`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        })
        .then((res) => {
          const repositories = res.data?.data?.repositories;
          console.log("Fetched repositories:", repositories);

          if (Array.isArray(repositories)) {
            const repos = repositories.map(
              (repo: { name: string; url: string }) => ({
                url: repo.url.replace(/\.git$/, ""),
                title: repo.name,
                description: "",
              }),
            );
            setRepositories(repos);
          } else {
            toast.error("Unexpected response from server.");
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error("Failed to fetch repositories");
        })
        .finally(() => {
          setLoadingRepos(false);
        });
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!repoUrl.trim()) {
      toast.error("Please select or enter a repository URL");
      return;
    }

    const ghRepoRegex = /https?:\/\/(www\.)?github.com\/[\w.-]+\/[\w.-]+/;
    if (!ghRepoRegex.test(repoUrl)) {
      toast.error("Please enter a valid GitHub repository URL");
      return;
    }

    onImport({ url: repoUrl, title: repoTitle, description: repoDescription });
  };

  const handleClose = () => {
    onOpenChange(false);
    setRepoUrl("");
    setRepoTitle("");
    setRepoDescription("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Import GitHub Repository
          </DialogTitle>
          <DialogDescription>
            Select or enter a GitHub repository to import and analyze.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {loadingRepos ? (
            <p className="text-sm text-muted-foreground">
              Loading repositories...
            </p>
          ) : repositories.length > 0 ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Choose from your repositories
              </label>
              {/* Replace Select with Combobox */}
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-full justify-between"
                  >
                    {repoUrl
                      ? repositories.find((repo) => repo.url === repoUrl)?.title
                      : "Select a repository..."}
                    <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>{" "}
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 max-h-[300px] overflow-hidden">
                  <Command>
                    <CommandInput placeholder="Search repository..." />
                    <CommandList
                      className="max-h-[250px] overflow-y-scroll"
                      style={{
                        scrollbarWidth: "thin",
                        scrollBehavior: "smooth",
                      }}
                    >
                      <CommandEmpty>No repository found.</CommandEmpty>
                      <CommandGroup>
                        {repositories.map((repo) => (
                          <CommandItem
                            key={repo.url}
                            value={repo.url}
                            onSelect={(currentValue) => {
                              if (currentValue === repoUrl) {
                                // Deselecting the current item
                                setRepoUrl("");
                                setRepoTitle("");
                                setRepoDescription("");
                              } else {
                                const selectedRepo = repositories.find(
                                  (r) => r.url === currentValue,
                                );
                                if (selectedRepo) {
                                  setRepoUrl(selectedRepo.url);
                                  setRepoTitle(selectedRepo.title);
                                  setRepoDescription(
                                    selectedRepo.description || "",
                                  );
                                }
                              }
                              setComboboxOpen(false);
                            }}
                          >
                            <CheckIcon
                              className={cn(
                                "mr-2 h-4 w-4",
                                repoUrl === repo.url
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {repo.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      a
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No repositories found.
            </p>
          )}

          <div className="space-y-2">
            <label htmlFor="repo-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="repo-title"
              placeholder="My Awesome Project"
              value={repoTitle}
              onChange={(e) => setRepoTitle(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="repo-description" className="text-sm font-medium">
              Description
            </label>
            <Input
              id="repo-description"
              placeholder="A brief description of your project"
              value={repoDescription}
              onChange={(e) => setRepoDescription(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isImporting}>
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Importing...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
        placeholder="Search repositories..."
        className="pl-9 h-11 shadow-sm border-2 border-border focus-visible:ring-0 focus-visible:ring-offset-0"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
}

// Project Card Component
function ProjectCard({ project }: { project: Project }) {
  const getRepoName = (url: string) => {
    const match = url.match(/github\.com\/[\w.-]+\/([\w.-]+)/);
    return match ? match[1] : "Unknown Repository";
  };

  const getRepoOwner = (url: string) => {
    const match = url.match(/github\.com\/([\w.-]+)\/[\w.-]+/);
    return match ? match[1] : "Unknown Owner";
  };

  return (
    <MagicCard className="group hover:border-primary/50 transition-all duration-200 hover:shadow-md rounded-xl">
      <Link href={`/dashboard/${project.id}`} className="block p-6">
        <div className="pb-3">
          <h3 className=" transition-colors text-lg font-semibold">
            {project.title || getRepoName(project.repoUrl)}
          </h3>
          <p className="text-muted-foreground line-clamp-2">
            {project.description ||
              `Repository: ${getRepoOwner(project.repoUrl)}/${getRepoName(
                project.repoUrl,
              )}`}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Github className="h-4 w-4" />
            <span className="truncate max-w-[120px]">
              {getRepoOwner(project.repoUrl)}
            </span>
          </div>
        </div>
      </Link>
    </MagicCard>
  );
}

// Loading Skeleton Component
function DashboardSkeleton() {
  return (
    <div className="space-y-8 p-6 container mx-auto py-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
      </div>

      {/* Search and Import Skeleton */}
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
  hasProjects,
  onImportClick,
}: {
  hasProjects: boolean;
  onImportClick: () => void;
}) {
  return (
    <div className="text-center py-12">
      <Github className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">No repositories found</h3>
      <p className="text-muted-foreground mb-4">
        {!hasProjects
          ? "Get started by importing your first repository"
          : "No repositories match your search criteria"}
      </p>
      {!hasProjects && (
        <MagicCard className="inline-block">
          <Button
            onClick={onImportClick}
            className="gap-2 bg-transparent hover:bg-transparent text-white"
          >
            <Plus className="h-4 w-4" />
            Import Repository
          </Button>
        </MagicCard>
      )}
    </div>
  );
}

// Main Dashboard Component
export default function Dashboard() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      await fetchUser();
      await fetchProjects();
    };
    init();
  }, [router]);

  const fetchUser = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/auth/user`,
        {
          headers: { authorization: `Bearer ${accessToken}` },
        },
      );
      setUser(data.data.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      router.push("/signup");
    }
  };

  const fetchProjects = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/project/list`,
        {
          headers: { authorization: `Bearer ${accessToken}` },
        },
      );
      setProjects(response.data.data.projectData);
      console.log("Fetched projects:", response.data.data.projectData);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setIsLoading(false);
      toast.error("Failed to fetch projects");
    }
  };

  const handleImportRepository = async (data: {
    url: string;
    title: string;
    description: string;
  }) => {
    setIsImporting(true);
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await axios.post(
        `${
          process.env.NEXT_PUBLIC_SERVER_URL
        }/project/create?repo=${encodeURIComponent(
          data.url,
        )}&title=${encodeURIComponent(
          data.title,
        )}&description=${encodeURIComponent(data.description)}`,
        {},
        { headers: { authorization: `Bearer ${accessToken}` } },
      );

      toast.success("Repository imported successfully!");
      await fetchProjects();
      setIsImportDialogOpen(false);
    } catch (error: unknown) {
      console.error("Error importing repository:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to import repository";
      toast.error(errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    router.push("/signup");
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.repoUrl.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1920px] flex-col overflow-hidden rounded-md bg-muted md:flex-row",
          "h-screen",
        )}
      >
        <div className="flex flex-1 flex-col overflow-hidden bg-card border border-border rounded-2xl h-full w-full max-h-[97vh] max-w-[97vw] m-auto ml-4">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[1920px] flex-col overflow-hidden rounded-md  bg-black md:flex-row ",
        "h-screen",
      )}
    >
      <div className="flex flex-1 flex-col overflow-hidden bg-card border border-border rounded-2xl h-full w-full max-h-[97vh] max-w-[97vw] m-auto m">
        <div className="space-y-8 p-6 container mx-auto py-6 bg-transparent overflow-y-auto">
          {" "}
          {/* Header */}
          <div className="flex items-center justify-between gap-4 ">
            {" "}
            <div className="flex items-center gap-4">
              <Link href="/deployments">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Rocket className="h-4 w-4" />
                  Deployments
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  Your Repositories
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage and analyze your code repositories
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
          {/* Search and Import */}
          <div className="flex items-center gap-4 justify-between w-full">
            <SearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
            <Dialog
              open={isImportDialogOpen}
              onOpenChange={setIsImportDialogOpen}
            >
              <DialogTrigger asChild>
                <MagicCard className="cursor-pointer rounded-lg p-2">
                  <Button
                    className="gap-2 shadow-sm hover:shadow-md transition-all whitespace-nowrap bg-transparent hover:bg-transparent cursor-pointer text-foreground"
                    onClick={() => setIsImportDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Import Repository
                  </Button>
                </MagicCard>
              </DialogTrigger>
            </Dialog>
          </div>
          {/* Content */}
          {filteredProjects.length === 0 ? (
            <EmptyState
              hasProjects={projects.length > 0}
              onImportClick={() => setIsImportDialogOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Import Dialog */}
      <ImportRepositoryDialog
        isOpen={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImport={handleImportRepository}
        isImporting={isImporting}
      />
    </div>
  );
}
