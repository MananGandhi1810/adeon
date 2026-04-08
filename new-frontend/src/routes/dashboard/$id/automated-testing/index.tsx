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
import {
  TestTube,
  Clock,
  AlertCircle,
  Copy as CopyIcon,
  Check,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import axios from "axios";
import { Button } from "@/components/ui/button";

type TestSuiteMap = {
  [file: string]: {
    language: string;
    test_cases: string;
  };
};

interface ApiResponse {
  data: TestSuiteMap;
}

interface TestSuite {
  id: string;
  name: string;
  filePath: string;
  language: string;
  testCode: string;
  testCount: number;
}

function AutomatedTestingPage() {
  const params = Route.useParams();
  const [selectedTest, setSelectedTest] = useState<TestSuite | null>(null);
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchTestData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/project/${params.id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          },
        );

        const data: ApiResponse = response.data.data.aiAnalysis.tests;
        // Convert API response to test suites format
        const suites: TestSuite[] = Object.entries(data || {}).map(
          ([filePath, testData], index) => {
            const testCount = (testData.test_cases.match(/it\(/g) || []).length;
            return {
              id: `suite-${index}`,
              name: filePath.split("/").pop() || filePath,
              filePath,
              language: testData.language,
              testCode: testData.test_cases,
              testCount,
            };
          },
        );

        setTestSuites(suites);
        if (suites.length > 0) {
          setSelectedTest(suites[0]);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching test data:", error);
        setError("Failed to load test data");
        setTestSuites([]);
        setLoading(false);
      }
    };

    fetchTestData();
  }, [params.id]);

  // Copy to clipboard handler
  const handleCopy = async () => {
    if (selectedTest?.testCode) {
      await navigator.clipboard.writeText(selectedTest.testCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

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
                  <BreadcrumbPage>Test Case Generation</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                  <TestTube className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    Test Case Generation
                  </h1>
                  <p className="text-muted-foreground mt-1.5">
                    View generated automated tests for your code
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
              {/* Test List */}
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Test Suites</CardTitle>
                  <CardDescription>
                    Select a test suite to view details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-300px)]">
                    {loading ? (
                      <div className="flex items-center justify-center h-32">
                        <Clock className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Loading tests...</span>
                      </div>
                    ) : error ? (
                      <div className="flex items-center justify-center h-32 text-destructive">
                        <AlertCircle className="h-6 w-6" />
                        <span className="ml-2">{error}</span>
                      </div>
                    ) : testSuites.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-muted-foreground">
                        <TestTube className="h-6 w-6" />
                        <span className="ml-2">No tests found</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {testSuites.map((test) => (
                          <div
                            key={test.id}
                            className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedTest?.id === test.id
                              ? "bg-primary/10 border border-primary/20"
                              : "hover:bg-muted/50"
                              }`}
                            onClick={() => setSelectedTest(test)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-medium">{test.name}</h3>
                              <Badge variant="default">
                                {test.language}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{test.filePath}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {test.testCount} test{test.testCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Test Details */}
              <Card className="col-span-8">
                <CardHeader>
                  <CardTitle>Test Details</CardTitle>
                  <CardDescription>
                    {selectedTest
                      ? "View test code and summary"
                      : "Select a test suite to view details"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-300px)]">
                    {selectedTest ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">
                                File Name
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-base font-mono">
                                {selectedTest.name}
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">
                                Language
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-base">
                                {selectedTest.language}
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">
                                File Path
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-xs font-mono">
                                {selectedTest.filePath}
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">
                                Total Tests
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">
                                {selectedTest.testCount}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                              <CardTitle>Test Code</CardTitle>
                              <CardDescription>
                                View the complete test code for this suite
                              </CardDescription>
                            </div>
                            <Button
                              size="icon"
                              className="ml-2"
                              onClick={handleCopy}
                              aria-label="Copy test code"
                              disabled={copied}
                            >
                              {copied ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <CopyIcon className="h-4 w-4" />
                              )}
                            </Button>
                          </CardHeader>
                          <CardContent>
                            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
                              <code>{selectedTest.testCode}</code>
                            </pre>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-2">
                          <TestTube className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p className="text-muted-foreground">
                            Select a test suite to view details
                          </p>
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
  );
}
export const Route = createFileRoute('/dashboard/$id/automated-testing/')({ component: AutomatedTestingPage });
