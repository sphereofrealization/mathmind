import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  UploadCloud,
  BookOpen,
  MessageSquare,
  Cpu,
  Users,
  ShoppingBag,
  Folder,
  Search,
  Coins,
  Wallet,
  Download,
  FileText,
  Server,
  TrendingUp,
  Link as LinkIcon,
  Activity,
  Box,
} from "lucide-react";

export default function Layout({ children, currentPageName }) {
  return (
    <div
      className="min-h-screen"
      style={{
        ["--primary-navy"]: "#0f172a",
        ["--accent-gold"]: "#f59e0b",
        ["--soft-gray"]: "#f8fafc",
        ["--text-secondary"]: "#64748b",
      }}
    >
      <SidebarProvider defaultOpen={true}>
        <Sidebar collapsible="icon" variant="inset">
          <SidebarHeader className="px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-indigo-600" />
              <span className="text-sm font-semibold">App</span>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Overview</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("Dashboard")}>
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("Upload")}>
                      <UploadCloud />
                      <span>Upload</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("Library")}>
                      <BookOpen />
                      <span>Library</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>AI</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("AIChat")}>
                      <MessageSquare />
                      <span>AI Chat</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("TrainAI")}>
                      <Cpu />
                      <span>Train AI</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("ModelStudio")}>
                      <Box />
                      <span>Model Studio</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("TrainingMonitor")}>
                      <Activity />
                      <span>Training Monitor</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Collab</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("Agents")}>
                      <Cpu />
                      <span>Agents</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("CollabRooms")}>
                      <Users />
                      <span>Collab Rooms</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Marketplace</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("Marketplace")}>
                      <ShoppingBag />
                      <span>Marketplace</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("MyAssets")}>
                      <Folder />
                      <span>My Assets</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("AssetFinder")}>
                      <Search />
                      <span>Asset Finder</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("BuyTokens")}>
                      <Coins />
                      <span>Buy Tokens</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Tools</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("DocToJSONL")}>
                      <FileText />
                      <span>Doc to JSONL</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("Export")}>
                      <Download />
                      <span>Export</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("ContentViewer")}>
                      <FileText />
                      <span>Content Viewer</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("SiteManagement")}>
                      <Server />
                      <span>Site Management</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("Invite")}>
                      <TrendingUp />
                      <span>Invite Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Other</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("Earnings")}>
                      <Wallet />
                      <span>Earnings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to={createPageUrl("FruitlesBridge")}>
                      <LinkIcon />
                      <span>Fruitles Bridge</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          <div className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background px-3">
            <SidebarTrigger />
            <div className="text-sm text-muted-foreground">{currentPageName}</div>
          </div>
          <div className="p-3 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}