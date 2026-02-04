import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
    BookOpen, 
    LayoutDashboard, 
    Upload, 
    Library, 
    FileText, 
    Download,
    Brain,
    MessageSquare,
    Eye, // Added Eye icon for Training Monitor
    Store, // Added Store icon for Marketplace
    Coins, // Added Coins icon for My Assets
    DollarSign, // Added DollarSign icon for Earnings
    UserPlus, // Added UserPlus icon for Growth Agent
    Palette, // Added Palette icon for Model Studio
    Cpu, // NEW: Cpu icon for FT Backend
    Settings, // NEW: for Site Management
    Link2, // NEW: for On-Chain Bridge
    Search, // NEW: search icon for Asset Finder
    Bot, // NEW: Agents
    GitBranch // NEW: Collab Rooms
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { MathBook } from "@/entities/MathBook";
import { TrainedAI } from "@/entities/TrainedAI";
import { FruitlesTransaction } from "@/entities/FruitlesTransaction";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { isSameDay } from "date-fns"; // NEW: for daily-claim check

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Library",
    url: createPageUrl("Library"),
    icon: Library,
  },
  {
    title: "Upload Books",
    url: createPageUrl("Upload"),
    icon: Upload,
  },
  {
    title: "Train AI",
    url: createPageUrl("TrainAI"),
    icon: Brain,
  },
  {
    title: "Training Monitor",
    url: createPageUrl("TrainingMonitor"),
    icon: Eye,
  },
  {
    title: "AI Chat",
    url: createPageUrl("AIChat"),
    icon: MessageSquare,
  },
  {
    title: "Model Studio",
    url: createPageUrl("ModelStudio"),
    icon: Palette,
  },
  {
    title: "Agents",
    url: createPageUrl("Agents"),
    icon: Bot,
  },
  {
    title: "Collab Rooms",
    url: createPageUrl("CollabRooms"),
    icon: GitBranch,
  }
  // NEW: FT Backend
  {
    title: "FT Backend",
    url: createPageUrl("FineTuningBackend"),
    icon: Cpu,
  },
  // NEW: Doc to JSONL
  {
    title: "Doc to JSONL",
    url: createPageUrl("DocToJSONL"),
    icon: FileText,
  },
  {
    title: "Marketplace",
    url: createPageUrl("Marketplace"),
    icon: Store,
  },
  {
    title: "Buy Tokens",
    url: createPageUrl("BuyTokens"),
    icon: Coins,
  },
  // NEW: On-Chain Bridge
  {
    title: "On-Chain Bridge",
    url: createPageUrl("FruitlesBridge"),
    icon: Link2
  },
  // NEW: Asset Finder
  {
    title: "Asset Finder",
    url: createPageUrl("AssetFinder"),
    icon: Search
  },
  {
    title: "Site Management",
    url: createPageUrl("SiteManagement"),
    icon: Settings,
  },
  {
    title: "My Assets",
    url: createPageUrl("MyAssets"),
    icon: Coins,
  },
  {
    title: "Earnings",
    url: createPageUrl("Earnings"),
    icon: DollarSign,
  },
  {
    title: "Growth",
    url: createPageUrl("GrowthAgent"),
    icon: UserPlus,
  },
  {
    title: "Export Data",
    url: createPageUrl("Export"),
    icon: Download,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [stats, setStats] = useState({ totalBooks: 0, processed: 0, readyAI: 0 });
  const [fruitles, setFruitles] = useState({ balance: 0, email: null, loading: true });
  const [daily, setDaily] = useState({ available: false, loading: true, lastClaim: null }); // NEW: daily claim state

  useEffect(() => {
    const load = async () => {
      // Books/AI stats
      const books = await MathBook.list("-created_date");
      const ais = await TrainedAI.list("-created_date");
      setStats({
        totalBooks: books.length,
        processed: books.filter(b => b.processing_status === "completed").length,
        readyAI: ais.filter(a => a.training_status === "completed").length
      });

      // Fruitles balance + daily claim status
      let me = null;
      try {
        me = await User.me();
      } catch (e) {
        setFruitles({ balance: 0, email: null, loading: false });
        setDaily({ available: false, loading: false, lastClaim: null }); // NEW
        return;
      }
      const myEmail = (me.email || "").toLowerCase();
      const incoming = await FruitlesTransaction.filter({ to_email: myEmail });
      const outgoing = await FruitlesTransaction.filter({ from_email: myEmail });
      const sum = (arr) => (arr || []).reduce((s, t) => s + (t.amount || 0), 0);
      setFruitles({ balance: sum(incoming) - sum(outgoing), email: myEmail, loading: false });

      // NEW: check if claimed daily bonus today
      const claims = await FruitlesTransaction.filter({ to_email: myEmail, reason: "daily_login_bonus" }, "-created_date", 20);
      const claimedToday = (claims || []).some(t => isSameDay(new Date(t.created_date), new Date()));
      setDaily({ available: !claimedToday, loading: false, lastClaim: claims && claims[0] ? claims[0] : null });
    };
    load();
  }, [location.pathname]);

  // NOTE: keep claimStarter implementation for now, but the UI button is removed below.
  const claimStarter = async () => {
    if (!fruitles.email) return;
    await FruitlesTransaction.create({
      from_email: "system@fruitles",
      to_email: fruitles.email,
      amount: 100,
      reason: "starter_bonus"
    });
    // Refresh balance
    const incoming = await FruitlesTransaction.filter({ to_email: fruitles.email });
    const outgoing = await FruitlesTransaction.filter({ from_email: fruitles.email });
    const sum = (arr) => (arr || []).reduce((s, t) => s + (t.amount || 0), 0);
    setFruitles(prev => ({ ...prev, balance: sum(incoming) - sum(outgoing) }));
  };

  // NEW: daily claim action
  const claimDaily = async () => {
    if (!fruitles.email || daily.loading || !daily.available) return;
    setDaily(prev => ({ ...prev, loading: true }));
    await FruitlesTransaction.create({
      from_email: "system@fruitles",
      to_email: fruitles.email,
      amount: 50,
      reason: "daily_login_bonus"
    });
    // Refresh balance and availability
    const incoming = await FruitlesTransaction.filter({ to_email: fruitles.email });
    const outgoing = await FruitlesTransaction.filter({ from_email: fruitles.email });
    const sum = (arr) => (arr || []).reduce((s, t) => s + (t.amount || 0), 0);
    setFruitles(prev => ({ ...prev, balance: sum(incoming) - sum(outgoing) }));
    setDaily({ available: false, loading: false, lastClaim: { to_email: fruitles.email, amount: 50, created_date: new Date().toISOString() } });
  };

  return (
    <SidebarProvider>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800&family=Rajdhani:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>{`
        :root {
          --primary-navy: #7a0000; /* deep klingon crimson */
          --secondary-navy: #1a0000; /* near-black red */
          --accent-gold: #ff3b00; /* aggressive orange-red */
          --light-gold: #3b0f0f; /* dark accent panel */
          --soft-gray: #0a0a0a; /* hull black */
          --text-primary: #ffe6e6; /* pale warm */
          --text-secondary: #b86a6a; /* desaturated red */
        }

        /* Klingon UI overlays and effects */
        .klingon-scanlines {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(
            to bottom,
            rgba(255, 60, 60, 0.035) 0px,
            rgba(255, 60, 60, 0.035) 1px,
            transparent 2px
          );
          mix-blend-mode: screen;
          opacity: 0.35;
        }
        .klingon-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255, 80, 30, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 80, 30, 0.08) 1px, transparent 1px);
          background-size: 32px 32px, 32px 32px;
          opacity: 0.25;
        }
        .k-glow {
          text-shadow: 0 0 6px rgba(255, 59, 0, 0.6), 0 0 18px rgba(255, 59, 0, 0.35);
        }
        .k-panel {
                        background: linear-gradient(180deg, rgba(58, 8, 8, 0.9), rgba(20, 0, 0, 0.95));
                        border: 3px solid transparent;
                        border-image: linear-gradient(135deg, #d1d5db, #9ca3af, #4b5563, #9ca3af, #d1d5db) 1;
                        box-shadow: inset 0 0 12px rgba(255, 59, 0, 0.12), 0 0 28px rgba(255, 59, 0, 0.12), 0 0 0 2px rgba(40,0,0,0.9);
                      }
        @keyframes klingon-hum {
          0% { filter: hue-rotate(0deg) }
          50% { filter: hue-rotate(2deg) }
          100% { filter: hue-rotate(0deg) }
        }
      .k-angled {
                position: relative;
                border: 1px solid rgba(255, 59, 0, 0.35);
                box-shadow: inset 0 0 14px rgba(255, 59, 0, 0.18), 0 0 22px rgba(255, 59, 0, 0.08);
                clip-path: polygon(6% 0, 100% 0, 100% 86%, 94% 100%, 0 100%, 0 14%);
                backdrop-filter: saturate(120%) brightness(0.9);
              }
              .k-angled::before {
                content: "";
                position: absolute;
                inset: 0;
                clip-path: polygon(6% 0, 100% 0, 100% 10%, 6% 10%);
                background: linear-gradient(90deg, rgba(255,59,0,0.35), rgba(255,59,0,0));
                pointer-events: none;
              }
              .k-navbtn {
                display: block;
                border: 3px solid transparent;
                border-image: linear-gradient(135deg, #e5e7eb, #9ca3af, #6b7280, #9ca3af, #e5e7eb) 1;
                background: linear-gradient(180deg, rgba(80,0,0,0.9), rgba(30,0,0,0.98));
                color: var(--text-primary);
                clip-path: polygon(8% 0, 100% 0, 100% 80%, 92% 100%, 0 100%, 0 20%);
                padding: 0;
                box-shadow: 0 0 0 2px rgba(20,0,0,0.9) inset, 0 6px 0 0 rgba(0,0,0,0.6);
              }
              .k-navbtn:hover {
                box-shadow: 0 0 16px rgba(255,59,0,0.45), 0 0 0 2px rgba(40,0,0,0.9) inset;
                border-image: linear-gradient(135deg, #ffffff, #cbd5e1, #94a3b8, #cbd5e1, #ffffff) 1;
                filter: drop-shadow(0 0 6px rgba(255,59,0,0.45));
              }
              .k-navbtn.k-active {
                background: linear-gradient(180deg, rgba(120,0,0,0.98), rgba(60,0,0,1));
                border-image: linear-gradient(135deg, #ffd7d7, #fca5a5, #ef4444, #fca5a5, #ffd7d7) 1;
              }
            .metal-brut { 
              border: 3px solid transparent; 
              border-image: linear-gradient(135deg, #f5f6f7, #c7cbd1, #8a8f98, #c7cbd1, #f5f6f7) 1; 
              box-shadow: 0 0 0 2px rgba(15,15,15,0.9) inset, 0 8px 0 rgba(0,0,0,0.6);
            }
            .metal-brut-inset {
              outline: 3px solid rgba(0,0,0,0.6);
              outline-offset: -6px;
            }
            .metal-brut, .k-panel, .k-navbtn { border-radius: 0 !important; }
            :root { --font-heading: 'Orbitron', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif; --font-body: 'Rajdhani', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif; }
              html, body { font-family: var(--font-body); letter-spacing: 0.02em; }
              h1, h2, h3, .SidebarGroupLabel, .k-navbtn, .k-glow { font-family: var(--font-heading) !important; letter-spacing: 0.08em; text-transform: uppercase; }
              .k-navbtn span { font-family: var(--font-heading) !important; }
            * { font-family: var(--font-body); }
              button, input, select, textarea { font-family: var(--font-body) !important; }
              .k-navbtn a, .k-navbtn span { color: var(--text-primary) !important; position: relative; z-index: 2; }
              .k-navbtn { overflow: visible; min-height: 44px; }
              .SidebarMenuButton, .SidebarMenuButton a, .SidebarMenuButton span { font-family: var(--font-heading) !important; letter-spacing: 0.08em; text-transform: uppercase; }
            `}</style>
      <div className="min-h-screen flex w-full" style={{backgroundColor: 'var(--soft-gray)', animation: 'klingon-hum 14s infinite linear'}}>
        <div className="klingon-grid"></div>
        <div className="klingon-scanlines"></div>
        <Sidebar className="border-r border-gray-200 k-panel k-angled">
          <SidebarHeader className="border-b border-gray-200 p-6 k-panel k-angled">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" 
                   style={{background: 'linear-gradient(135deg, var(--primary-navy), var(--secondary-navy))'}}>
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg" style={{color: 'var(--primary-navy)'}}>MathAI Prep</h2>
                <p className="text-xs" style={{color: 'var(--text-secondary)'}}>Mathematics Content AI Training</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3 k-panel k-angled">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-3 py-2" 
                                style={{color: 'var(--text-secondary)'}}>
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                                                    asChild 
                                                    className={`k-navbtn metal-brut transition-all duration-300 mb-1 ${location.pathname === item.url ? 'k-active' : ''}`}
                                                                                >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-6">
              <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-3 py-2" 
                                style={{color: 'var(--text-secondary)'}}>
                Collection Stats
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-3 py-2 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
                    <span style={{color: 'var(--text-secondary)'}}>Total Books</span>
                    <span className="ml-auto font-bold" style={{color: 'var(--primary-navy)'}}>{stats.totalBooks}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
                    <span style={{color: 'var(--text-secondary)'}}>Processed</span>
                    <span className="ml-auto font-bold" style={{color: 'var(--accent-gold)'}}>{stats.processed}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Brain className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
                    <span style={{color: 'var(--text-secondary)'}}>Ready for AI</span>
                    <span className="ml-auto font-bold" style={{color: 'var(--accent-gold)'}}>{stats.readyAI}</span>
                  </div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-6">
              <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-3 py-2" 
                                style={{color: 'var(--text-secondary)'}}>
                Wallet
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-3 py-2 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Coins className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
                    <span style={{color: 'var(--text-secondary)'}}>Fruitles</span>
                    <span className="ml-auto font-bold" style={{color: 'var(--primary-navy)'}}>
                      {fruitles.loading ? '—' : fruitles.balance}
                    </span>
                  </div>
                  {/* NEW: Daily claim button */}
                  {fruitles.email && !fruitles.loading && (
                    daily.loading ? (
                      <Button size="sm" className="w-full text-white opacity-90 cursor-wait k-navbtn metal-brut" style={{backgroundColor: 'var(--accent-gold)'}} disabled>
                        Checking daily bonus...
                      </Button>
                    ) : daily.available ? (
                      <Button size="sm" className="w-full text-white k-navbtn metal-brut" style={{backgroundColor: 'var(--accent-gold)'}} onClick={claimDaily}>
                        Claim daily 50
                      </Button>
                    ) : (
                      <div className="text-xs text-green-700">
                        Daily bonus claimed. Come back tomorrow!
                      </div>
                    )
                  )}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 p-4 k-panel k-angled">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center" 
                   style={{backgroundColor: 'var(--light-gold)'}}>
                <span className="font-bold text-sm" style={{color: 'var(--primary-navy)'}}>AI</span>
              </div>
              <p className="font-semibold text-sm" style={{color: 'var(--primary-navy)'}}>Mathematics AI Trainer</p>
              <p className="text-xs" style={{color: 'var(--text-secondary)'}}>Preparing your knowledge base</p>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-4 md:hidden shadow-sm k-panel k-angled">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-bold" style={{color: 'var(--primary-navy)'}}>MathAI Prep</h1>
            </div>
          </header>

          {/* Global top-right Buy link */}
          <div className="hidden md:block">
            <Link to={createPageUrl("BuyTokens")} className="fixed top-4 right-4 z-40">
              <Button className="k-navbtn metal-brut k-glow text-white shadow">
                Buy Fruitles
              </Button>
            </Link>
          </div>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}