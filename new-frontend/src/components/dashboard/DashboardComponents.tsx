import { Input } from "@/components/ui/input";
import { Search, Plus, Github } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  title: string;
  description: string;
  repoUrl: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// Search Bar Component
export function SearchBar({
  searchQuery,
  onSearchChange,
}: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}) {
  return (
    <div className="flex gap-4 items-center">
      <div className="relative flex-1 max-w-2xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search repositories..."
          className="pl-9 h-11 shadow-sm"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}

// Project Card Component
export function ProjectCard({ project }: { project: Project }) {
  const getRepoName = (url: string) => {
    const match = url.match(/github\.com\/[\w.-]+\/([\w.-]+)/);
    return match ? match[1] : "Unknown Repository";
  };

  const getRepoOwner = (url: string) => {
    const match = url.match(/github\.com\/([\w.-]+)\/[\w.-]+/);
    return match ? match[1] : "Unknown Owner";
  };

  return (
    <Card className="group hover:border-primary/50 transition-all duration-200 hover:shadow-md">
      <Link to="/dashboard/$id" params={{ id: project.id }} className="block">
        <CardHeader className="pb-3">
          <CardTitle className="group-hover:text-primary transition-colors text-lg">
            {project.title || getRepoName(project.repoUrl)}
          </CardTitle>
          <CardDescription className="line-clamp-2">
            {project.description ||
              `Repository: ${getRepoOwner(project.repoUrl)}/${getRepoName(
                project.repoUrl
              )}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Github className="h-4 w-4" />
              <span className="truncate max-w-[120px]">
                {getRepoOwner(project.repoUrl)}
              </span>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

// Loading Skeleton Component
export function DashboardSkeleton() {
  return (
    <div className="space-y-8 p-6 container mx-auto py-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Empty State Component
export function EmptyState({
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
        <Button onClick={onImportClick} className="gap-2">
          <Plus className="h-4 w-4" />
          Import Repository
        </Button>
      )}
    </div>
  );
}
