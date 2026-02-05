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
          --background: 24 16% 7%;
          --foreground: 40 90% 92%;
          --muted: 24 18% 12%;
          --muted-foreground: 40 35% 78%;
          --card: 40 30% 88%;
          --card-foreground: 30 30% 18%;
          --popover: 24 16% 7%;
          --popover-foreground: 40 90% 92%;
          --border: 30 22% 32%;
          --input: 30 22% 32%;
          --ring: 38 78% 46%;
          --primary: 38 65% 45%;
          --primary-foreground: 24 100% 10%;
          --secondary: 30 20% 16%;
          --secondary-foreground: 40 95% 96%;

          /* Sidebar tokens used by the sidebar component */
          --sidebar: 24 18% 10%;
          --sidebar-foreground: 40 85% 92%;
          --sidebar-accent: 38 60% 42%;
          --sidebar-accent-foreground: 24 100% 10%;
          --sidebar-border: 24 22% 26%;
          --sidebar-ring: 38 78% 46%;
        }

        /* Starfield background (CSS-only) */
        .k-starfield {
          position: fixed;
          inset: 0;
          z-index: -2;
          background:
            radial-gradient(120% 80% at 50% -20%, rgba(245,158,11,0.06), transparent 60%),
            repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 8px),
            repeating-linear-gradient(90deg, rgba(0,0,0,0.35) 0, rgba(0,0,0,0.35) 1px, transparent 1px, transparent 24px),
            linear-gradient(180deg, #0e0d0c, #1a1714);
          opacity: 0.85;
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
            radial-gradient(60% 40% at 10% 10%, rgba(245,158,11,0.08), transparent 60%),
            radial-gradient(60% 40% at 90% 15%, rgba(245,158,11,0.06), transparent 60%),
            radial-gradient(100% 60% at 50% 120%, rgba(0,0,0,0.75), rgba(0,0,0,0.92));
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
            linear-gradient(0deg, rgba(176,111,43,0.10), rgba(176,111,43,0));
          border: 1px solid hsl(var(--border));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 0 0 1px rgba(0,0,0,0.5),
            0 10px 30px rgba(0,0,0,0.35);
          backdrop-filter: saturate(1.1) contrast(1.05);
        }

        /* Subtle pIqaD-like runic watermark */
        .k-runes {
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          opacity: .05;
          mix-blend-mode: overlay;
          background:
            conic-gradient(from 45deg at 10% 20%, rgba(255,255,255,0.06) 2deg, transparent 6deg) 0 0/120px 120px,
            conic-gradient(from -15deg at 60% 70%, rgba(255,255,255,0.04) 2deg, transparent 6deg) 0 0/160px 160px;
        }

        /* Top bar styling (leather strap with brass trim) */
        .k-topbar {
          background:
            linear-gradient(180deg, rgba(120,77,28,0.25), rgba(30,24,18,0.8)),
            hsl(var(--secondary));
          border-bottom: 1px solid hsl(var(--border));
          box-shadow: 0 0 0 1px rgba(120,77,28,0.35), 0 8px 24px rgba(0,0,0,0.55);
          color: hsl(var(--foreground));
          position: relative;
        }
        .k-topbar::after {
          content: "";
          position: absolute;
          left: 0; right: 0; top: 0;
          height: 3px;
          background: linear-gradient(90deg, rgba(212,163,21,0.95), rgba(139,26,26,0.85));
          box-shadow: 0 0 12px rgba(212,163,21,0.45);
        }

        /* Sidebar — Klingon armor plates */
        [data-theme=klingon] [data-sidebar=sidebar] { background-color: hsl(var(--sidebar)); color: hsl(var(--sidebar-foreground)); position: relative; }
        [data-theme=klingon] [data-sidebar=menu] { padding: 4px 8px; }
        [data-theme=klingon] [data-sidebar=menu-item] { position: relative; margin: 10px 0; }
        [data-theme=klingon] [data-sidebar=menu-item]:not(:last-child)::after { content:""; position:absolute; left:8px; right:8px; bottom:-8px; height:6px; background:#2d2a28; border-radius:2px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.06); }
        [data-theme=klingon] [data-sidebar=menu-button] {
          position: relative;
          height: 58px;
          padding: 0 18px 0 16px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .14em;
          color: hsl(var(--sidebar-foreground));
          background:
            linear-gradient(135deg, rgba(255,255,255,0.05), rgba(0,0,0,0.2)) padding-box,
            linear-gradient(0deg, rgba(176,111,43,0.18), rgba(176,111,43,0)) padding-box;
          border: 1px solid hsl(var(--sidebar-border));
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.06),
            0 0 0 1px rgba(0,0,0,0.5),
            0 8px 26px rgba(0,0,0,0.35);
          border-radius: 0;
          clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%, 12px 50%);
        }
        [data-theme=klingon] [data-sidebar=menu-button]::after {
          content:"";
          position:absolute; inset:3px;
          background: linear-gradient(180deg,#2d2a28,#231f1d);
          border: 1px solid rgba(0,0,0,0.6);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
          clip-path: inherit;
          z-index: -1;
        }
        [data-theme=klingon] [data-sidebar=menu-button]:hover {
          background:
            linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.15)) padding-box,
            linear-gradient(0deg, rgba(176,111,43,0.28), rgba(176,111,43,0.08)) padding-box;
          color: #ffe6c2;
          box-shadow: inset 0 0 0 1px rgba(245,158,11,0.5), 0 0 18px rgba(176,111,43,0.2);
        }
        [data-theme=klingon] [data-sidebar=menu-button] svg { color: currentColor; }
        [data-theme=klingon] [data-sidebar=menu-button][data-active=true] {
          color: #ffe0d6;
          background:
            linear-gradient(135deg, rgba(255,255,255,0.08), rgba(0,0,0,0.25)) padding-box,
            linear-gradient(90deg, rgba(139,26,26,0.4), rgba(176,111,43,0.22)) padding-box;
          border-color: rgba(139,26,26,0.55);
          box-shadow: inset 0 0 0 1px rgba(239,68,68,0.55), 0 0 28px rgba(139,26,26,0.28);
        }
        [data-theme=klingon] [data-sidebar=menu-button][data-active=true]::before {
          content:"";
          position:absolute; left:0; top:0; bottom:0; width:8px;
          background: linear-gradient(180deg,#a31b1b,#f59e0b);
          box-shadow: 0 0 14px rgba(163,27,27,0.5);
        }

        /* General typography improvements */
        [data-theme=klingon] h1, [data-theme=klingon] h2, [data-theme=klingon] h3 {
          color: hsl(var(--foreground));
          letter-spacing: .02em;
        }
        [data-theme=klingon] p, [data-theme=klingon] .text-muted-foreground {
          color: hsl(var(--muted-foreground));
        }
        /* Force common light backgrounds to dark in this theme for contrast */
        [data-theme=klingon] .bg-white { 
          background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,245,220,0.96)) !important;
          color: #0b0b0b !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
          --text-secondary: #111111;
        }
        [data-theme=klingon] .bg-card {
          color: #0b0b0b !important;
          --text-secondary: #111111;
        }
        /* Improve contrast: avoid gold text on light panels */
        [data-theme=klingon] .bg-white .text-amber-400,
        [data-theme=klingon] .bg-white .text-amber-500,
        [data-theme=klingon] .bg-white .text-yellow-400,
        [data-theme=klingon] .bg-white .text-yellow-500,
        [data-theme=klingon] .bg-card .text-amber-400,
        [data-theme=klingon] .bg-card .text-amber-500,
        [data-theme=klingon] .bg-card .text-yellow-400,
        [data-theme=klingon] .bg-card .text-yellow-500 {
          color: #0b0b0b !important;
        }
        /* Force black text on light surfaces for now */
        [data-theme=klingon] .bg-white *,
        [data-theme=klingon] .bg-card * {
          color: #0b0b0b !important;
        }
        [data-theme=klingon] .border { border-color: hsl(var(--border)) !important; }
        /* contrast fix: remove gray-600 override */
        /* contrast fix: remove gray-500 override */
        /* Grid overlay */
        .k-grid {
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background:
            repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 24px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 24px);
          opacity: .06;
        }
        /* Grid overlay */
        .k-grid {
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background:
            repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 24px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 24px);
          opacity: .06;
        }
        /* Angular stone/metal buttons (global) */
        [data-theme=klingon] button:not([data-sidebar=menu-button]) {
          position: relative;
          border: 1px solid hsl(var(--border));
          background:
            linear-gradient(135deg, rgba(255,255,255,0.06), rgba(0,0,0,0.18)) padding-box,
            linear-gradient(0deg, rgba(176,111,43,0.16), rgba(176,111,43,0)) padding-box;
          clip-path: polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05), 0 0 0 1px rgba(0,0,0,0.6);
        }
        [data-theme=klingon] button:not([data-sidebar=menu-button])::after {
          content: "";
          position: absolute; inset: 3px;
          background: linear-gradient(180deg, #2d2a28, #1f1c1a);
          border: 1px solid rgba(0,0,0,0.6);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
          clip-path: inherit;
          z-index: -1;
        }
        [data-theme=klingon] button:not([data-sidebar=menu-button]):hover {
          color: #ffedd5;
          box-shadow: inset 0 0 0 1px rgba(176,111,43,0.5), 0 0 14px rgba(176,111,43,0.2);
        }

        /* Crest emblem */
        .k-crest {
          background: linear-gradient(145deg, #b06f2b, #5a2b10);
          border: 1px solid rgba(0,0,0,0.7);
          clip-path: polygon(2px 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 2px 100%, 0 50%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(0,0,0,0.5);
        }
      `}</style>

      <div className="k-starfield" aria-hidden="true" />
      <div className="k-vignette" aria-hidden="true" />
      <div className="k-scanlines" aria-hidden="true" />
      <div className="k-runes" aria-hidden="true" />
      <div className="k-grid" aria-hidden="true" />
      <div className="k-grid" aria-hidden="true" />
      <div className="k-scanlines" aria-hidden="true" />

      <SidebarProvider defaultOpen={true}>
        <Sidebar collapsible="icon" variant="none" className="bg-[#0b0c10] text-[#f7f4e8]">
          <SidebarHeader className="px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 k-crest shadow-[0_0_18px_rgba(245,158,11,0.35)]" />
              <span className="text-sm font-semibold tracking-wide">Math in Space</span>
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
                  <SidebarMenuButton asChild isActive={currentPageName === "AgentProfile"}>
                    <Link to={createPageUrl("AgentProfile?id=")}> 
                      <Cpu />
                      <span>Agent Profile</span>
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
                <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={currentPageName === "AutoDev"}>
                  <Link to={createPageUrl("AutoDev")}>
                    <Box />
                    <span>AutoDev</span>
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