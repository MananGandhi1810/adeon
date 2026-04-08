import { createFileRoute } from '@tanstack/react-router';

import type React from "react";

import { DevToolsSidebar } from "@/components/dev-tools-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { MessageSquare, Send, Bot, User, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Project {
  id: string;
  repoUrl: string;
  // Add other project properties as needed
}

function ChatWithCodePage() {
  const params = Route.useParams();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your AI code assistant. I can help you understand your codebase, explain functions, suggest improvements, and answer questions about your project. What would you like to know?",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [projectData, setProjectData] = useState<Project | null>(null);

  const fetchProjectData = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await axios.get(
        `${import.meta.env.VITE_SERVER_URL}/project/${params.id}`,
        {
          headers: { authorization: `Bearer ${accessToken}` },
        }
      );
      setProjectData(response.data.data.project);
    } catch (error) {
      console.error("Error fetching project data:", error);
      toast.error("Failed to fetch project data");
    }
  }, [params.id]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  useEffect(() => {
    if (!params.id) return;

    const savedMessages = localStorage.getItem(`chat_messages_${params.id}`);
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (err) {
        console.error("Error parsing saved messages from localStorage:", err);
      }
    } else {
      setMessages([
        {
          role: "assistant",
          content:
            "Hello! I'm your AI code assistant. I can help you understand your codebase, explain functions, suggest improvements, and answer questions about your project. What would you like to know?",
        },
      ]);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      localStorage.setItem(
        `chat_messages_${params.id}`,
        JSON.stringify(messages)
      );
    }
  }, [messages, params.id]);

  const extractRepoInfo = (repoUrl: string) => {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ""), // Remove .git suffix if present
      };
    }
    return null;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !projectData) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputMessage.trim(),
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const accessToken = localStorage.getItem("accessToken");
      const repoInfo = extractRepoInfo(projectData.repoUrl);

      if (!repoInfo) {
        throw new Error("Invalid repository URL");
      }

      // Prepare messages for API (include conversation history)
      const apiMessages = [...messages, userMessage];

      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/project/${params.id}/chat`,
        {
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          token:
            import.meta.env.VITE_GITHUB_TOKEN || "your_github_token_here",
          messages: apiMessages,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // Add assistant response to chat
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content:
          response.data.data.reply ||
          response.data.message ||
          "I received your message but couldn't generate a response.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: unknown) {
      console.error("Error sending message:", error);

      // Add error message to chat
      const errorResponse: ChatMessage = {
        role: "assistant",
        content:
          "Sorry, I encountered an error while processing your message. Please try again.",
      };

      setMessages((prev) => [...prev, errorResponse]);
      const errorText =
        error instanceof Error ? error.message : "Failed to send message";
      toast.error(errorText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
                  <BreadcrumbPage>Chat with Code</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>{" "}
        <div className="flex flex-1 flex-col h-screen bg-grain overflow-hidden">
          <div className="flex flex-1 flex-col p-6 gap-6 h-full">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Chat with Code
                </h1>
                <p className="text-muted-foreground mt-1.5">
                  Interactive AI assistant for your codebase
                  {projectData && (
                    <span className="ml-2 text-sm">
                      • {extractRepoInfo(projectData.repoUrl)?.owner}/
                      {extractRepoInfo(projectData.repoUrl)?.repo}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <Card className="flex flex-col shadow-sm h-[calc(100vh-200px)] overflow-hidden">
              {" "}
              <CardHeader className="border-b pb-4 flex-shrink-0">
                <CardTitle>Code Assistant</CardTitle>
                <CardDescription>
                  Ask questions about your code, get explanations, and receive
                  suggestions
                </CardDescription>
              </CardHeader>{" "}
              <CardContent className="flex flex-col flex-1 overflow-hidden relative">
                <div className="flex-1 overflow-y-auto p-6 pb-20">
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex gap-4 ${message.role === "user"
                            ? "justify-end"
                            : "justify-start"
                          }`}
                      >
                        <div
                          className={`flex gap-4 max-w-[85%] ${message.role === "user"
                              ? "flex-row-reverse"
                              : "flex-row"
                            }`}
                        >
                          {" "}
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${message.role === "user"
                                ? "bg-blue-500 text-white border-blue-400"
                                : "bg-neutral-700 text-neutral-300 border-neutral-600"
                              }`}
                          >
                            {message.role === "user" ? (
                              <User className="h-5 w-5" />
                            ) : (
                              <Bot className="h-5 w-5" />
                            )}
                          </div>{" "}
                          <div
                            className={`rounded-xl px-6 py-4 text-sm leading-relaxed shadow-sm ${message.role === "user"
                                ? "bg-neutral-900 text-white"
                                : "text-white"
                              }`}
                          >
                            <div className="prose prose-sm max-w-none prose-invert">
                              <ReactMarkdown
                                components={{
                                  code: ({ className, children, ...props }) => {
                                    const match = /language-(\w+)/.exec(
                                      className || ""
                                    );
                                    return !match ? (
                                      <code className="bg-transparent text-neutral-200 px-2 py-1 rounded text-xs font-mono border ">
                                        {children}
                                      </code>
                                    ) : (
                                      <code
                                        className={`language-${match[1]} bg-transparent text-neutral-200 px-2 py-1 rounded text-xs font-mono  block p-4 my-2`}
                                        {...props}
                                      >
                                        {children}
                                      </code>
                                    );
                                  },
                                  p: ({ children }) => (
                                    <p className="mb-2 last:mb-0 text-current">
                                      {children}
                                    </p>
                                  ),
                                  ul: ({ children }) => (
                                    <ul className="mb-2 last:mb-0 pl-4 text-current">
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({ children }) => (
                                    <ol className="mb-2 last:mb-0 pl-4 text-current">
                                      {children}
                                    </ol>
                                  ),
                                }}
                              >
                                {message.content || "No response from AI."}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-4 justify-start">
                        <div className="flex gap-4 max-w-[85%]">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-neutral-700 text-neutral-300 border-neutral-600">
                            <Bot className="h-5 w-5" />
                          </div>
                          <div className="rounded-xl px-6 py-4 text-sm text-white flex items-center gap-3 shadow-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Analyzing your code...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-transparent">
                  <div className="flex gap-3 max-w-3xl mx-auto">
                    <Input
                      placeholder="Ask a question about your code..."
                      className="flex-1 h-12 text-sm shadow-sm border-black focus:border-blue-400 bg-neutral-900 text-neutral-100 placeholder:text-neutral-400"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isLoading}
                    />
                    <Button
                      size="icon"
                      className="h-12 w-12 shadow-sm bg-blue-500 hover:bg-blue-600 text-white"
                      onClick={sendMessage}
                      disabled={isLoading || !inputMessage.trim()}
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export const Route = createFileRoute('/dashboard/$id/chat-with-code/')({ component: ChatWithCodePage });
