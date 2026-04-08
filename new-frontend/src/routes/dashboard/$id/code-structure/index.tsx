import { createFileRoute } from '@tanstack/react-router';

import React, { useEffect } from "react";
import { DevToolsSidebar } from "@/components/dev-tools-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { GitBranch, GitFork, Clock, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Suspense } from "react";
import mermaid from "mermaid";

const MermaidChart = ({ chartData }: { chartData: string }) => {
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: "default",
      securityLevel: "loose",
    });
    mermaid.contentLoaded();
  }, [chartData]);

  return (
    <div className="w-full overflow-x-auto p-4">
      <pre className="mermaid">{chartData}</pre>
    </div>
  );
};

function CodeStructurePage() {
  const params = Route.useParams();
  const [mermaidChart, setMermaidChart] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMermaidChart = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SERVER_URL}/project/${params.id}/diagram`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch code structure");
        }

        const data = await response.json();
        console.log("datataa ", data.data);

        // Clean the data by removing markdown code block syntax and everything after 'end'
        let cleanedData = data.data.diagram || "";
        cleanedData = cleanedData
          .replace(/^```mermaid\s*/i, "") // Remove starting ```mermaid
          .replace(/```$/, "") // Remove ending ```
          .replace(/\\n/g, "\n") // Replace escaped newlines
          .trim(); // Remove extra whitespace

        setMermaidChart(cleanedData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching mermaid chart:", error);
        setError("Failed to load code structure");
        setLoading(false);
      }
    };

    fetchMermaidChart();
  }, [params.id]);

  return (
    <SidebarProvider className="bg-grain">
      <DevToolsSidebar id={params.id} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/dashboard/$id" params={{ id: params.id }}>
                      Dashboard
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Code Structure</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                  <GitBranch className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    Code Structure
                  </h1>
                  <p className="text-muted-foreground mt-1.5">
                    Visualize your codebase structure
                  </p>
                </div>
              </div>
              <Button className="gap-2">
                <GitFork className="h-4 w-4" />
                Refresh Structure
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Project Structure Diagram</CardTitle>
                <CardDescription>
                  Visual representation of your codebase structure
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <Clock className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading structure diagram...</span>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-64 text-destructive">
                    <AlertCircle className="h-6 w-6 mr-2" />
                    <span>{error}</span>
                  </div>
                ) : mermaidChart ? (
                  <Suspense fallback={<>Loading...</>}>
                    <div className="w-full mx-auto">
                      <ScrollArea className="h-[600px] w-full">
                        <MermaidChart chartData={mermaidChart} />
                      </ScrollArea>
                    </div>{" "}
                  </Suspense>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <GitBranch className="h-6 w-6 mr-2" />
                    <span>No structure diagram available</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export const Route = createFileRoute('/dashboard/$id/code-structure/')({ component: CodeStructurePage });
