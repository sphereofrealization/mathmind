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
      data-theme="klingon"
      className="relative min-h-screen overflow-hidden antialiased selection:bg-amber-500/20 selection:text-amber-200"
      style={{
        // Custom app vars used by some pages
        ["--primary-navy"]: "#0b0e13",
        ["--accent-gold"]: "#f59e0b",
        ["--soft-gray"]: "transparent",
        ["--text-secondary"]: "#9ca3af",
      }}
    >
      {/* Global Klingon theme + starfield */}
      <style>{`
        /* shadcn/ui theme tokens (HSL triplets) */
        [data-theme=klingon] {
          --background: 218 16% 8%;
          --foreground: 35 20% 88%;
          --muted: 218 14% 14%;
          --muted-foreground: 35 12% 70%;
          --card: 218 14% 10%;
          --card-foreground: 35 20% 88%;
          --popover: 218 16% 8%;
          --popover-foreground: 35 20% 88%;
          --border: 218 16% 22%;
          --input: 218 16% 22%;
          --ring: 38 92% 50%; /* amber glow */
          --primary: 38 92% 45%;
          --primary-foreground: 24 100% 12%;
          --secondary: 218 16% 14%;
          --secondary-foreground: 35 20% 88%;

          /* Sidebar tokens used by the sidebar component */
          --sidebar: 218 14% 10%;
          --sidebar-foreground: 35 20% 88%;
          --sidebar-accent: 38 92% 45%;
          --sidebar-accent-foreground: 24 100% 12%;
          --sidebar-border: 218 16% 22%;
          --sidebar-ring: 38 92% 50%;
        }

        /* Starfield background (CSS-only) */
        .k-starfield {
          position: fixed;
          inset: 0;
          z-index: -2;
          background: radial-gradient(#ffffff10 1px, transparent 1px) 0 0/3px 3px,
                      radial-gradient(#ffffff08 1px, transparent 1px) 1.5px 1.5px/4px 4px,
                      radial-gradient(#ffffff06 1px, transparent 1px) 0 0/6px 6px,
                      #07090d;
          animation: k-stars-move 120s linear infinite;
          opacity: 0.7;
        }
        @keyframes k-stars-move {
          from { background-position: 0 0, 0 0, 0 0; }
          to   { background-position: -2000px 1000px, -1000px 500px, -500px 250px; }
        }

        /* Vignette + subtle amber glow wash */
        .k-vignette {
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background:
            radial-gradient(120% 80% at 50% -20%, rgba(245,158,11,0.08), transparent 60%),
            radial-gradient(100% 60% at 50% 120%, rgba(0,0,0,0.65), rgba(0,0,0,0.9));
        }

        /* Metallic panels */
        .k-metal {
          background:
            linear-gradient(135deg, rgba(255,255,255,0.06), rgba(0,0,0,0.12)) padding-box,
            repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px),
            linear-gradient(0deg, rgba(255,180,0,0.05), rgba(255,180,0,0));
          border: 1px solid hsl(var(--border));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 0 0 1px rgba(0,0,0,0.35),
            0 10px 30px rgba(0,0,0,0.35);
          backdrop-filter: saturate(1.1) contrast(1.05);
        }

        /* Top bar styling */
        .k-topbar {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.25)),
            radial-gradient(120% 80% at 50% -20%, rgba(245,158,11,0.10), transparent 60%),
            hsl(var(--card));
          border-bottom: 1px solid hsl(var(--border));
          box-shadow: 0 0 0 1px rgba(245,158,11,0.10), 0 8px 24px rgba(0,0,0,0.45);
        }

        /* Sidebar hover amber glow */
        [data-theme=klingon] [data-sidebar=menu-button]:hover {
          box-shadow: 0 0 0 1px hsl(var(--sidebar-accent)), 0 0 14px rgba(245,158,11,0.25) inset;
        }
        [data-theme=klingon] [data-sidebar=group-label] { color: hsl(var(--sidebar-foreground) / 0.7); }
      `}</style>

      <div className="k-starfield" aria-hidden="true" />
      <div className="k-vignette" aria-hidden="true" />

      <SidebarProvider defaultOpen={true}>
        <Sidebar collapsible="icon" variant="inset" className="k-metal" >
          <SidebarHeader className="px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-amber-500 shadow-[0_0_18px_rgba(245,158,11,0.35)]" />
              <span className="text-sm font-semibold tracking-wide">Battle Console</span>
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
          <div className="k-topbar sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background/60 px-3 backdrop-blur-sm">
            <SidebarTrigger />
            <div className="text-sm text-muted-foreground">{currentPageName}</div>
          </div>
          <div className="p-3 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}