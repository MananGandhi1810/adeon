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
import { Button } from "@/components/ui/button";
import rehypeRaw from "rehype-raw";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { FileText, Download, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

function ReadmeGeneratorPage() {
  const [projectData, setProjectData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const params = Route.useParams();
  const repoSlug = params.id;

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/project/${repoSlug}/readme`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );
        console.log("Project data response:", response.data);
        setProjectData(response.data.data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(true);
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [params.id]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Readme copied to clipboard!", {
      description: "You can now paste the readme anywhere you want.",
    });
  };

  const handleDownload = (text: string, chatName: string) => {
    const element = document.createElement("a");
    const file = new Blob([text], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${chatName.replace(/\s+/g, "-")}_readme.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Markdown downloaded!", {
      description: "Your markdown have been saved to your device.",
    });
  };

  return (
    <SidebarProvider>
      <DevToolsSidebar id={params.id} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 bg-grain">
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
                  <BreadcrumbPage>README Generator</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 bg-grain">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  README Generator
                </h1>
                <p className="text-muted-foreground">
                  Generate comprehensive README files for your projects
                </p>
              </div>
            </div>{" "}
            <div className="w-full">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle>Generated README</CardTitle>
                  <CardDescription>
                    Your generated README will appear here
                  </CardDescription>
                </CardHeader>
                <CardContent className="w-full">
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

                            // Convert GitHub repo URL to raw.githubusercontent.com URL
                            const repoUrl = projectData?.project?.repoUrl || "";
                            // Example: https://github.com/user/repo
                            const match = repoUrl.match(
                              /^https:\/\/github\.com\/([^/]+)\/([^/]+)/
                            );
                            if (!match) return <img {...props} />;

                            const user = match[1];
                            const repo = match[2];

                            // Try to get branch name from projectData, fallback to 'main'
                            const branch =
                              projectData?.project?.defaultBranch || "main";

                            // Remove leading './' or '/' from src
                            const cleanSrc =
                              typeof src === "string"
                                ? src.replace(/^\.?\//, "")
                                : "";

                            // Compose raw URL
                            const rawUrl = `https://raw.githubusercontent.com/${user}/${repo}/refs/heads/${branch}/${cleanSrc}`;

                            return <img {...props} src={rawUrl} />;
                          },
                        }}
                      >
                        {projectData?.readme?.slice(12) ||
                          "Your README content will be generated here."}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleCopy(projectData?.readme?.slice(12) || "")
                      }
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleDownload(
                          projectData?.readme?.slice(12) || "",
                          "README"
                        )
                      }
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>{" "}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export const Route = createFileRoute('/dashboard/$id/readme-generator/')({ component: ReadmeGeneratorPage });
