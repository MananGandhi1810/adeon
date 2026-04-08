import type * as React from "react";
import {
    FileText,
    GitPullRequest,
    Shield,
    MessageSquare,
    Rocket,
    Network,
    TestTube,
    Server,
    Home,
    Settings,
    User,
} from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar";
import { Link } from "@tanstack/react-router";
import { RepositorySelector } from "@/components/repository-selector";
import { UserNav } from "@/components/user-nav";

interface DevToolsSidebarProps extends React.ComponentProps<typeof Sidebar> {
    id: string; // Receive the param
}

export function DevToolsSidebar({ id, ...props }: DevToolsSidebarProps) {
    const devTools = [
        {
            title: "Dashboard",
            url: `/dashboard/${id}`,
            icon: Home,
        },
        {
            title: "README Generator",
            url: `/dashboard/${id}/readme-generator`,
            icon: FileText,
        },
        {
            title: "Pull Request Analyzer",
            url: `/dashboard/${id}/pr-analyzer`,
            icon: GitPullRequest,
        },
        {
            title: "Vulnerability Scanner",
            url: `/dashboard/${id}/vulnerability-scanner`,
            icon: Shield,
        },
        {
            title: "Chat with Code",
            url: `/dashboard/${id}/chat-with-code`,
            icon: MessageSquare,
        },

        {
            title: "Code Structure Visualization",
            url: `/dashboard/${id}/code-structure`,
            icon: Network,
        },
        {
            title: "Test Case Generation",
            url: `/dashboard/${id}/automated-testing`,
            icon: TestTube,
        },
        {
            title: "Environment Provisioning",
            url: `/dashboard/${id}/environment-provisioning`,
            icon: Server,
        },
    ];

    const settingsItems = [
        {
            title: "Settings",
            url: `/dashboard/${id}/settings`,
            icon: Settings,
        },
        {
            title: "Profile",
            url: `/dashboard/${id}/profile`,
            icon: User,
        },
    ];

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader className="bg-grain">
                <RepositorySelector />
            </SidebarHeader>
            <SidebarContent className="bg-grain">
                <SidebarGroup>
                    <SidebarGroupLabel>Developer Tools</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {devTools.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={item.title}
                                    >
                                        <Link to={item.url as any}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarGroupLabel>Account</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {settingsItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={item.title}
                                    >
                                        <Link to={item.url as any}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="bg-grain">
                <UserNav />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
