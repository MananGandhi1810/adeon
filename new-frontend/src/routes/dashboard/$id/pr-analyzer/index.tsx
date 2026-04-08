import { createFileRoute } from '@tanstack/react-router';

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
import { GitPullRequest, CheckCircle2, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

// Add proper types for PR analysis
interface PRAnalysis {
  status: "completed" | "in_progress";
  summary: string;
  suggestions?: string[];
  security?: {
    issues: number;
    warnings: number;
  };
  performance?: {
    impact: "high" | "medium" | "low" | "none";
    suggestions: string[];
  };
}

interface PR {
  number: number;
  title: string;
  state: "open" | "merged" | "closed";
  url: string;
  createdAt: string;
  updatedAt: string;
  aiReview?: string;
}

function PRAnalyzerPage() {
  const [pullRequests, setPullRequests] = useState<PR[]>([]);
  const [selectedPR, setSelectedPR] = useState<PR | null>(null);
  const [loading, setLoading] = useState(true);
  const params = Route.useParams();

  useEffect(() => {
    const fetchPullRequests = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/project/${params.id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );
        const prs = response.data.data.pullRequests || [];
        setPullRequests(prs);
        if (prs.length > 0) {
          setSelectedPR(prs[0]);
        }
      } catch (error) {
        console.error("Error fetching pull requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPullRequests();
  }, [params.id]);

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
                  <BreadcrumbPage>Pull Request Analyzer</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-6 bg-grain">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <GitPullRequest className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Pull Request Analyzer
                </h1>
                <p className="text-muted-foreground mt-1.5">
                  Analyze and review pull requests with AI assistance
                </p>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
              {/* PR List */}
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Pull Requests</CardTitle>
                  <CardDescription>Select a PR to analyze</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-300px)]">
                    <div className="space-y-2">
                      {loading ? (
                        <div className="flex items-center justify-center p-4">
                          <p className="text-muted-foreground">
                            Loading pull requests...
                          </p>
                        </div>
                      ) : pullRequests.length === 0 ? (
                        <div className="flex items-center justify-center p-4">
                          <p className="text-muted-foreground">
                            No pull requests found
                          </p>
                        </div>
                      ) : (
                        pullRequests.map((pr) => (
                          <div
                            key={pr.number}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedPR?.number === pr.number
                                ? "bg-primary/10 border border-primary/20"
                                : "hover:bg-muted/50"
                              }`}
                            onClick={() => setSelectedPR(pr)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-medium">{pr.title}</h3>
                              <Badge
                                variant={
                                  pr.state === "merged"
                                    ? "default"
                                    : pr.state === "open"
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {pr.state}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>PR #{pr.number}</span>
                              <span>•</span>
                              <span>
                                {new Date(pr.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* PR Analysis */}
              <Card className="col-span-8">
                <CardHeader>
                  <CardTitle>PR Analysis</CardTitle>
                  <CardDescription>
                    {selectedPR?.aiReview
                      ? "AI-powered analysis of the selected pull request"
                      : "Select a PR to view analysis"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-300px)]">
                    {!selectedPR ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">
                          Select a pull request to view analysis
                        </p>
                      </div>
                    ) : !selectedPR.aiReview ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-2">
                          <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p className="text-muted-foreground">
                            No analysis available for this pull request
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          {" "}
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            <h3 className="font-medium">AI Review</h3>
                          </div>
                          <div className="min-h-[400px] rounded-md border bg-muted/50 p-4">
                            <div className="prose max-w-none prose-pink prose-invert">
                              <ReactMarkdown
                                rehypePlugins={[rehypeRaw]}
                                components={{
                                  img: ({ node, ...props }) => {
                                    let src = props.src || "";
                                    if (!src) return <img {...props} />;
                                    // If src is already absolute, return as is
                                    if (
                                      typeof src === "string" &&
                                      /^(https?:)?\/\//.test(src)
                                    ) {
                                      return <img {...props} />;
                                    }
                                    return <img {...props} />;
                                  },
                                }}
                              >
                                {selectedPR.aiReview}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export const Route = createFileRoute('/dashboard/$id/pr-analyzer/')({ component: PRAnalyzerPage });
