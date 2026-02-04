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
        ["--primary-navy"]: "#F8E7C7", // warm light for headings
        ["--accent-gold"]: "#f59e0b",
        ["--soft-gray"]: "transparent",
        ["--text-secondary"]: "#C8C2B3", // higher contrast on dark bg
      }}
    >
      {/* Global Klingon theme + starfield with higher contrast typography */}
      <style>{`
        /* shadcn/ui theme tokens (HSL triplets) */
        [data-theme=klingon] {
          --background: 220 18% 6%;
          --foreground: 40 100% 96%;
          --muted: 220 16% 12%;
          --muted-foreground: 40 60% 86%;
          --card: 220 17% 11%;
          --card-foreground: 40 100% 96%;
          --popover: 220 18% 6%;
          --popover-foreground: 40 100% 96%;
          --border: 220 18% 28%;
          --input: 220 18% 28%;
          --ring: 38 96% 54%; /* brighter amber outline */
          --primary: 38 96% 54%;
          --primary-foreground: 24 100% 10%;
          --secondary: 220 16% 14%;
          --secondary-foreground: 40 95% 96%;

          /* Sidebar tokens used by the sidebar component */
          --sidebar: 220 17% 11%;
          --sidebar-foreground: 40 100% 96%;
          --sidebar-accent: 38 96% 54%;
          --sidebar-accent-foreground: 24 100% 10%;
          --sidebar-border: 220 18% 28%;
          --sidebar-ring: 38 96% 54%;
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
          opacity: 0.35;
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
            radial-gradient(120% 80% at 50% -20%, rgba(245,158,11,0.06), transparent 60%),
            radial-gradient(100% 60% at 50% 120%, rgba(0,0,0,0.65), rgba(0,0,0,0.9));
        }
        /* Scanlines overlay */
        .k-scanlines {
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background: repeating-linear-gradient(180deg, rgba(255,0,0,0.03) 0, rgba(255,0,0,0.03) 1px, transparent 1px, transparent 3px);
          mix-blend-mode: overlay;
          opacity: .6;
        }
        /* Scanlines overlay */
        .k-scanlines {
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background: repeating-linear-gradient(180deg, rgba(255,0,0,0.03) 0, rgba(255,0,0,0.03) 1px, transparent 1px, transparent 3px);
          mix-blend-mode: overlay;
          opacity: .6;
        }

        /* Metallic panels */
        .k-metal {
          background:
            linear-gradient(135deg, rgba(255,255,255,0.06), rgba(0,0,0,0.12)) padding-box,
            repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px),
            linear-gradient(0deg, rgba(255,180,0,0.04), rgba(255,180,0,0));
          border: 1px solid hsl(var(--border));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 0 0 1px rgba(0,0,0,0.45),
            0 10px 30px rgba(0,0,0,0.35);
          backdrop-filter: saturate(1.1) contrast(1.05);
        }

        /* Top bar styling (higher contrast) */
        .k-topbar {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.2)),
            hsl(var(--card));
          border-bottom: 1px solid hsl(var(--border));
          box-shadow: 0 0 0 1px rgba(245,158,11,0.12), 0 8px 24px rgba(0,0,0,0.45);
          color: hsl(var(--foreground));
          position: relative;
        }
        .k-topbar::after {
          content: "";
          position: absolute;
          left: 0; right: 0; top: 0;
          height: 3px;
          background: linear-gradient(90deg, rgba(239,68,68,0.85), rgba(245,158,11,0.85));
          box-shadow: 0 0 12px rgba(239,68,68,0.5);
        }

        /* Sidebar — Klingon battle console */
        [data-theme=klingon] [data-sidebar=sidebar] { background-color: #0a0b0d !important; color: #f9f5e6 !important; }
        [data-theme=klingon] [data-sidebar=group-label] { color:#f9dd9b; text-transform:uppercase; letter-spacing:.12em; font-weight:800; opacity:.95; }
        [data-theme=klingon] [data-sidebar=menu] { padding: 2px 6px; }
        [data-theme=klingon] [data-sidebar=menu-item] { position:relative; margin:8px 0; }
        [data-theme=klingon] [data-sidebar=menu-item]:not(:last-child)::after { content:""; position:absolute; left:0; right:0; bottom:-8px; height:6px; background:#15161a; border-radius:3px; }
        [data-theme=klingon] [data-sidebar=menu-button] { position:relative; color:#f8f6ea; background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02)); height:52px; padding:0 16px 0 14px; border-radius:0 16px 16px 0; text-transform:uppercase; letter-spacing:.12em; font-weight:800; box-shadow: inset 0 0 0 1px rgba(245,158,11,0.22); clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%); }
        [data-theme=klingon] [data-sidebar=menu-button]:hover { background: linear-gradient(90deg, rgba(245,158,11,0.22), rgba(245,158,11,0.12)); color:#ffe2ad; box-shadow: inset 0 0 0 1px rgba(245,158,11,0.5), 0 0 18px rgba(245,158,11,0.2); }
        [data-theme=klingon] [data-sidebar=menu-button] svg { color: currentColor; }
        [data-theme=klingon] [data-sidebar=menu-button][data-active=true] { color:#ffb3aa; background: linear-gradient(90deg, rgba(239,68,68,0.28), rgba(245,158,11,0.18)); box-shadow: inset 0 0 0 1px rgba(239,68,68,0.55), 0 0 24px rgba(239,68,68,0.24); border-left: 8px solid #ef4444; }
        [data-theme=klingon] [data-sidebar=menu-button][data-active=true]::before { content:""; position:absolute; left:2px; top:50%; width:7px; height:7px; transform: translateY(-50%); background:#ef4444; border-radius:50%; box-shadow: 0 0 10px rgba(239,68,68,0.8); animation: k-pulse 1.6s infinite; }
        @keyframes k-pulse { 0%,100%{opacity:.7; transform: translateY(-50%) scale(1);} 50%{opacity:1; transform: translateY(-50%) scale(1.25);} }

        /* General typography improvements */
        [data-theme=klingon] h1, [data-theme=klingon] h2, [data-theme=klingon] h3 {
          color: hsl(var(--foreground));
          letter-spacing: .02em;
        }
        [data-theme=klingon] p, [data-theme=klingon] .text-muted-foreground {
          color: hsl(var(--muted-foreground));
        }
        /* Force common light backgrounds to dark in this theme for contrast */
        [data-theme=klingon] .bg-white { background-color: hsl(var(--card)) !important; }
        [data-theme=klingon] .border { border-color: hsl(var(--border)) !important; }
        [data-theme=klingon] .text-gray-600 { color: hsl(var(--muted-foreground)) !important; }
        [data-theme=klingon] .text-gray-500 { color: hsl(var(--muted-foreground)) !important; }
      `}</style>

      <div className="k-starfield" aria-hidden="true" />
      <div className="k-vignette" aria-hidden="true" />
      <div className="k-scanlines" aria-hidden="true" />
      <div className="k-scanlines" aria-hidden="true" />

      <SidebarProvider defaultOpen={true}>
        <Sidebar collapsible="icon" variant="none" className="bg-[#0b0c10] text-[#f7f4e8]">
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
                  <SidebarMenuButton asChild isActive={currentPageName === "Dashboard"}>
                    <Link to={createPageUrl("Dashboard")}>
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={currentPageName === "Upload"}>
                    <Link to={createPageUrl("Upload")}>
                      <UploadCloud />
                      <span>Upload</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={currentPageName === "Library"}>
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
                  <SidebarMenuButton asChild isActive={currentPageName === "AIChat"}>
                    <Link to={createPageUrl("AIChat")}>
                      <MessageSquare />
                      <span>AI Chat</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={currentPageName === "TrainAI"}>
                    <Link to={createPageUrl("TrainAI")}>
                      <Cpu />
                      <span>Train AI</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={currentPageName === "ModelStudio"}>
                    <Link to={createPageUrl("ModelStudio")}>
                      <Box />
                      <span>Model Studio</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={currentPageName === "TrainingMonitor"}>
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
                  <SidebarMenuButton asChild isActive={currentPageName === "Agents"}>
                    <Link to={createPageUrl("Agents")}>
                      <Cpu />
                      <span>Agents</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={currentPageName === "CollabRooms"}>
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
                  <SidebarMenuButton asChild isActive={currentPageName === "Marketplace"}>
                    <Link to={createPageUrl("Marketplace")}>
                      <ShoppingBag />
                      <span>Marketplace</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={currentPageName === "MyAssets"}>
                    <Link to={createPageUrl("MyAssets")}>
                      <Folder />
                      <span>My Assets</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={currentPageName === "AssetFinder"}>
                    <Link to={createPageUrl("AssetFinder")}>
                      <Search />
                      <span>Asset Finder</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={currentPageName === "BuyTokens"}>
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
                  <SidebarMenuButton asChild isActive={currentPageName === "DocToJSONL"}>
                    <Link to={createPageUrl("DocToJSONL")}>
                      <FileText />
                      <span>Doc to JSONL</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={currentPageName === "Export"}>
                    <Link to={createPageUrl("Export")}>
                      <Download />
                      <span>Export</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={currentPageName === "ContentViewer"}>
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
                  <SidebarMenuButton asChild isActive={currentPageName === "SiteManagement"}>
                    <Link to={createPageUrl("SiteManagement")}>
                      <Server />
                      <span>Site Management</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={currentPageName === "Invite"}>
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
                  <SidebarMenuButton asChild isActive={currentPageName === "Earnings"}>
                    <Link to={createPageUrl("Earnings")}>
                      <Wallet />
                      <span>Earnings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={currentPageName === "FruitlesBridge"}>
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
            <div className="text-sm text-foreground">{currentPageName}</div>
          </div>
          <div className="p-3 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}