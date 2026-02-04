
import React, { useEffect, useState } from "react";
import { ReferralCampaign } from "@/entities/ReferralCampaign";
import { ReferralEvent } from "@/entities/ReferralEvent";
import { User } from "@/entities/User";
import { UploadFile, ExtractDataFromUploadedFile, InvokeLLM, SendEmail } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Copy, Megaphone, Share2, Mail, Play, Pause, Link as LinkIcon, Users, Settings, Clock, Upload, RefreshCw, Globe, Search } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Lead } from "@/entities/Lead";
import { AutomationRun } from "@/entities/AutomationRun";

export default function GrowthAgent() {
  const [me, setMe] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [code, setCode] = useState("");
  const [desc, setDesc] = useState("");
  const [signupReward, setSignupReward] = useState(50);
  const [purchaseReward, setPurchaseReward] = useState(20);
  const [suggestions, setSuggestions] = useState([]);
  const [autoRun, setAutoRun] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [promptNotes, setPromptNotes] = useState("");

  const [agentActive, setAgentActive] = useState(false);
  const [cadenceMin, setCadenceMin] = useState(10);
  const [batchSize, setBatchSize] = useState(3);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [leads, setLeads] = useState([]);
  const [newLead, setNewLead] = useState({ name: "", email: "", consent: true });
  const [running, setRunning] = useState(false);
  const nextRunRef = React.useRef(0);
  const fileInputRef = React.useRef(null);

  // Prospector state
  const [prospectTopic, setProspectTopic] = useState("");
  const [prospectRegion, setProspectRegion] = useState("");
  const [prospectMax, setProspectMax] = useState(20);
  const [prospects, setProspects] = useState([]);
  const [crawling, setCrawling] = useState(false);
  const [autoImport, setAutoImport] = useState(true);
  const [autoEmail, setAutoEmail] = useState(false);
  const [maxImmediateEmails, setMaxImmediateEmails] = useState(5);
  const [consentAffirm, setConsentAffirm] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await User.me();
        setMe(user);
        const mine = await ReferralCampaign.filter({ owner_email: user.email }, "-created_date", 100);
        setCampaigns(mine);
        setSelectedCampaign(mine[0] || null);
        const myLeads = await Lead.list("-updated_date", 500);
        setLeads(myLeads);
      } catch (e) {
        // not logged in
      }
    };
    init();
  }, []);

  useEffect(() => {
    let timer = null;
    if (autoRun) {
      const tick = async () => {
        await generateSuggestion();
        timer = setTimeout(tick, 60 * 1000); // every 60s while page open
      };
      tick();
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [autoRun]);  

  const createCampaign = async () => {
    if (!me) { alert("Please log in first."); return; }
    const clean = (code || "").trim();
    if (!clean) { alert("Enter a referral code."); return; }
    const exists = await ReferralCampaign.filter({ code: clean }, "-created_date", 1);
    if (exists && exists[0]) { alert("Code already exists. Choose another."); return; }
    const rec = await ReferralCampaign.create({
      code: clean,
      owner_email: me.email,
      description: desc || "",
      reward_on_signup: 100, // Fixed to 100 fruitles
      reward_on_purchase: Number(purchaseReward) || 0,
      active: true
    });
    setCampaigns(prev => [rec, ...prev]);
    setSelectedCampaign(rec); // Automatically select the new campaign
    setCode("");
    setDesc("");
  };

  const inviteLink = (c) => {
    return window.location.origin + createPageUrl(`Invite?ref=${encodeURIComponent(c.code)}`);
  };

  const copyToClipboard = async (text) => {
    try { await navigator.clipboard.writeText(text); alert("Copied!"); } catch { alert("Copy failed. Select and copy manually."); }
  };

  const generateSuggestion = async () => {
    // Compose Limbertwig + neural architecture flavored prompt
    // FIX: show fixed signup reward of 100 fruitles in examples
    const refExamples = campaigns.slice(0, 1).map(c => `Code: ${c.code}, Rewards: signup=100 fruitles, purchase=${c.reward_on_purchase} fruitles.`).join("\n");
    const base = `Within the Limbertwig meta-language and neural architecture motifs (daisy trees, phase-state, exotic loops, curvature anomalies, operadic/sheaf terms), craft concise outreach content to invite mathematicians to train and trade AIs on our marketplace (fruitles economy).`;
    const guard = `Rules:
- Be rigorous but friendly; 2-4 sentences max per message.
- Include a concrete benefit (earn fruitles via royalties/referrals).
- Include a lightweight call-to-action with an INSERT_LINK placeholder.
- Avoid spammy tone; no exaggerated claims.`;
    const notes = promptNotes ? `Additional context from operator:\n${promptNotes}\n` : "";
    const prompt = `${base}\n${guard}\n${notes}\nSample campaign(s):\n${refExamples || "(no campaigns yet)"}\nReturn JSON with keys: email_subject, email_body, tweet, short_post. Use INSERT_LINK where the link should appear.`;

    const schema = {
      type: "object",
      properties: {
        email_subject: { type: "string" },
        email_body: { type: "string" },
        tweet: { type: "string" },
        short_post: { type: "string" }
      }
    };
    const res = await InvokeLLM({ prompt, response_json_schema: schema });
    setSuggestions(prev => [{ ts: new Date().toISOString(), ...res }, ...prev].slice(0, 10));
  };

  const sendTestEmail = async (campaign) => {
    if (!sendTo) { alert("Enter recipient email."); return; }
    if (!suggestions[0]) { alert("Generate content first."); return; }
    const msg = suggestions[0];
    const body = msg.email_body.replace("INSERT_LINK", inviteLink(campaign));
    await SendEmail({
      to: sendTo,
      subject: msg.email_subject || "Join our Math AI Marketplace",
      body
    });
    alert("Email sent (demo).");
  };

  const reloadLeads = async () => {
    const myLeads = await Lead.list("-updated_date", 500);
    setLeads(myLeads);
  };

  const addLead = async () => {
    const email = (newLead.email || "").trim();
    if (!email) { alert("Enter an email."); return; }
    await Lead.create({
      email,
      name: newLead.name || "",
      source: "manual",
      consent: !!newLead.consent,
      status: "new"
    });
    setNewLead({ name: "", email: "", consent: true });
    await reloadLeads();
  };

  const importCsv = async (file) => {
    if (!file) return;
    const { file_url } = await UploadFile({ file });
    const schema = {
      type: "object",
      properties: {
        rows: {
          type: "array",
          items: {
            type: "object",
            properties: {
              email: { type: "string" },
              name: { type: "string" }
            }
          }
        }
      }
    };
    const res = await ExtractDataFromUploadedFile({ file_url, json_schema: schema });
    const rows = Array.isArray(res.output?.rows) ? res.output.rows : (Array.isArray(res.output) ? res.output : []);
    const cleaned = rows
      .map(r => ({ email: (r.email || "").trim(), name: (r.name || "").trim() }))
      .filter(r => r.email);
    if (cleaned.length === 0) { alert("No rows with 'email' found."); return; }
    // bulk create with consent=true by default
    const payload = cleaned.map(r => ({ email: r.email, name: r.name, source: "csv_import", consent: true, status: "new" }));
    if (payload.length > 0) {
      if (Lead.bulkCreate) {
        await Lead.bulkCreate(payload.slice(0, 500));
      } else {
        // fallback create one by one
        for (const p of payload.slice(0, 200)) { await Lead.create(p); }
      }
      await reloadLeads();
      alert(`Imported ${Math.min(payload.length, Lead.bulkCreate ? 500 : 200)} leads.`);
    }
  };

  const pickTargets = (nowIso) => {
    const now = new Date(nowIso);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000); // 7 days in milliseconds
    const eligible = leads.filter(l => {
      if (!l.consent) return false;
      if (l.status === "opted_out" || l.status === "signed_up" || l.status === "purchased") return false;
      if (l.status === "new") return true;
      if (l.status === "invited") {
        const last = l.last_invited_date ? new Date(l.last_invited_date) : null;
        return !last || last < sevenDaysAgo; // Only reinvite if not invited or invited more than 7 days ago
      }
      return false;
    });
    // small batch to avoid rate limits
    return eligible.slice(0, Math.max(1, Math.min(batchSize, 5))); // Max 5 leads per batch
  };

  const runAutomationTick = async () => {
    const now = Date.now();
    if (running) return;
    if (!agentActive) return;
    // cadence gate
    if (now < nextRunRef.current) return;
    nextRunRef.current = now + cadenceMin * 60 * 1000; // Schedule next run based on cadence

    if (!me) { console.warn("User not logged in for automation."); return; }
    const campaign = selectedCampaign || campaigns[0];
    if (!campaign) { console.warn("No campaign selected or available for automation."); return; }

    setRunning(true);
    try {
      const targets = pickTargets(new Date().toISOString());
      if (targets.length === 0) {
        console.log("No eligible leads found for automation run.");
        return;
      }

      for (const lead of targets) {
        // Generate concise personalized outreach in Limbertwig register
        const schema = {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" }
          }
        };
        const personalization = `Lead: ${lead.name || lead.email}.
Context: Invite to train/trade AIs (fruitles economy). Signup reward: 100 fruitles for referrer.
Tone: rigorous-friendly; 2-4 sentences; Limbertwig motifs allowed but readable.`;
        const prompt = `Compose a short invite email.
Constraints:
- Mention building/trading math AIs, royalties, marketplace.
- Clear CTA with INSERT_LINK placeholder.
- No hype; precise; optional Limbertwig hint if appropriate.
${personalization}`;
        const msg = await InvokeLLM({ prompt, response_json_schema: schema });
        const body = (msg.body || "Join us: INSERT_LINK").replaceAll("INSERT_LINK", inviteLink(campaign));

        await SendEmail({
          to: lead.email,
          subject: msg.subject || "Join our Mathematics AI marketplace",
          body
        });

        await AutomationRun.create({
          campaign_code: campaign.code,
          lead_id: lead.id,
          lead_email: lead.email,
          channel: "email",
          outcome: "sent",
          message_subject: msg.subject || "Join our Mathematics AI marketplace",
          message_body: body
        });

        await Lead.update(lead.id, { status: "invited", last_invited_date: new Date().toISOString() });
      }
      // refresh local state
      await reloadLeads();
    } catch (e) {
      console.error("Automation run error:", e);
    } finally {
      setRunning(false);
    }
  };

  // Periodic automation loop (active while page is open)
  useEffect(() => {
    if (!agentActive) {
      nextRunRef.current = 0; // Reset next run time if agent becomes inactive
      return;
    }
    const tick = setInterval(runAutomationTick, 15000); // check every 15s; cadence gate ensures spacing
    return () => clearInterval(tick);
  }, [agentActive, cadenceMin, batchSize, selectedCampaign, leads, campaigns, me]);  

  const syncReferralOutcomes = async () => {
    if (!me) return;
    // fetch recent signups for my campaigns
    const myCodes = campaigns.map(c => c.code);
    if (myCodes.length === 0) { alert("No campaigns to sync outcomes for."); return; }
    // pull last 500 events and apply signups
    const events = await ReferralEvent.filter({ event_type: "signup" }, "-created_date", 500);
    const mine = events.filter(e => myCodes.includes(e.code));
    let updated = 0;
    for (const ev of mine) {
      if (!ev.referred_email) continue;
      const match = leads.find(l => (l.email || "").toLowerCase() === ev.referred_email.toLowerCase());
      if (match && match.status !== "signed_up") {
        await Lead.update(match.id, { status: "signed_up" });
        updated += 1;
      }
    }
    if (updated > 0) await reloadLeads();
    alert(`Synced ${updated} signups to leads.`);
  };

  // Prospect web for potential users (uses LLM with internet context)
  const prospectWeb = async () => {
    if (!prospectTopic.trim()) { alert("Enter a topic or query (e.g., 'university math clubs')."); return; }
    setCrawling(true);
    try {
      const schema = {
        type: "object",
        properties: {
          leads: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                website: { type: "string" },
                org: { type: "string" },
                notes: { type: "string" }
              }
            }
          }
        }
      };

      const prompt = `Identify real people likely interested in ${prospectTopic}${prospectRegion ? ` in ${prospectRegion}` : ""}.
Return public, professional emails from official pages (faculty profiles, organization sites, conference pages). 
Exclude generic addresses (info@, contact@, support@) and duplicates. 
For each person include: name, email, website (their page), org, notes.
Cap results at ${Math.max(1, Math.min(prospectMax || 20, 50))}.`;

      const res = await InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: schema
      });

      const found = Array.isArray(res?.leads) ? res.leads : [];
      const seen = new Set((leads || []).map(l => (l.email || "").toLowerCase()));
      const cleaned = found
        .map(p => ({
          name: (p.name || "").trim(),
          email: (p.email || "").trim(),
          website: (p.website || "").trim(),
          org: (p.org || "").trim(),
          notes: (p.notes || "").trim()
        }))
        .filter(p => p.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) // Basic email validation
        .filter(p => !seen.has(p.email.toLowerCase())) // Filter out existing leads
        .slice(0, Math.max(1, Math.min(prospectMax || 20, 50)));

      setProspects(cleaned);

      if (autoImport && cleaned.length) {
        await importProspects(cleaned);
      }
    } catch (e) {
      console.error("Prospecting failed:", e);
      alert("Prospecting failed. Please try refining the query.");
    } finally {
      setCrawling(false);
    }
  };

  // Send invites to a given list of leads (personalized)
  const sendInvitesToLeads = async (targets) => {
    const campaign = selectedCampaign || campaigns[0];
    if (!campaign) { alert("Create/select a referral campaign first."); return; }
    if (!targets || targets.length === 0) return;

    for (let idx = 0; idx < Math.min(targets.length, Math.max(1, maxImmediateEmails)); idx++) {
      const lead = targets[idx];
      // Compose personalized message
      const schema = {
        type: "object",
        properties: { subject: { type: "string" }, body: { type: "string" } }
      };
      const personalization = `Lead: ${lead.name || lead.email}.
Context: Invite to train/trade AIs (fruitles economy). Referrer earns 100 fruitles for signups.
Tone: precise, friendly, 2-4 sentences; Limbertwig register optional but readable.`;
      const prompt = `Compose a short invite email.
Constraints:
- Mention building/trading math AIs, royalties, marketplace.
- Include a single clear CTA with INSERT_LINK placeholder.
- Avoid hype and spammy phrasing.
${personalization}`;

      const msg = await InvokeLLM({ prompt, response_json_schema: schema });
      const body = (msg.body || "Join us: INSERT_LINK").replaceAll("INSERT_LINK", inviteLink(campaign));

      await SendEmail({
        to: lead.email,
        subject: msg.subject || "Join our Mathematics AI marketplace",
        body
      });

      await AutomationRun.create({
        campaign_code: campaign.code,
        lead_id: lead.id || "", // Lead might not have an ID yet if just imported
        lead_email: lead.email,
        channel: "email",
        outcome: "sent",
        message_subject: msg.subject || "Join our Mathematics AI marketplace",
        message_body: body
      });

      if (lead.id) { // Only update if lead has an ID
        await Lead.update(lead.id, { status: "invited", last_invited_date: new Date().toISOString() });
      }
      // small delay to reduce rate pressure
      await new Promise(res => setTimeout(res, 400));
    }
    await reloadLeads(); // Reload to get updated statuses and IDs for newly imported leads
  };

  // Import prospected leads into database (optional immediate emailing)
  const importProspects = async (list) => {
    if (!consentAffirm) {
      alert("Please confirm you have consent or a legitimate interest before importing.");
      return;
    }
    const payload = list.map(p => ({
      email: p.email,
      name: p.name || "",
      source: "web_prospect",
      consent: !!consentAffirm,
      status: "new",
      notes: [p.org, p.website, p.notes].filter(Boolean).join(" | ")
    }));
    if (payload.length === 0) { alert("No new leads to import."); return; }

    if (Lead.bulkCreate) {
      await Lead.bulkCreate(payload.slice(0, 200));
    } else {
      for (const rec of payload.slice(0, 100)) { await Lead.create(rec); }
    }

    // Refresh leads and fetch the imported ones by email
    const all = await Lead.list("-updated_date", 500);
    setLeads(all);
    const imported = all.filter(l => payload.some(p => (p.email || "").toLowerCase() === (l.email || "").toLowerCase()));

    if (autoEmail && imported.length) {
      await sendInvitesToLeads(imported);
    } else {
      alert(`Imported ${payload.length} lead(s).`);
    }
    setProspects([]); // Clear the temporary prospects list after import
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--soft-gray)' }}>
      <div className="max-w-5xl mx-auto space-y-8">
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              Growth Agent (Limbertwig)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 space-y-1">
                <Label>New referral code</Label>
                <Input placeholder="e.g., LIMBERTWIG" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} />
              </div>
              <div className="space-y-1">
                <Label>Signup reward (fixed 100)</Label>
                <Input type="number" min="0" step="1" value={100} readOnly disabled />
              </div>
              <div className="space-y-1">
                <Label>Purchase reward</Label>
                <Input type="number" min="0" step="1" value={purchaseReward} onChange={(e) => setPurchaseReward(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Campaign description (optional)</Label>
              <Input placeholder="Who is this for? What's the angle?" value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <Button className="text-white" style={{ backgroundColor: 'var(--accent-gold)' }} onClick={createCampaign}>
                Create Campaign
              </Button>
              <Button variant={autoRun ? "destructive" : "outline"} onClick={() => setAutoRun(v => !v)} className="gap-2">
                {autoRun ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {autoRun ? "Stop Auto-Run" : "Auto-Run Suggestions"}
              </Button>
            </div>
            <div className="space-y-1">
              <Label>Optional guidance to agent</Label>
              <Textarea placeholder="Add themes, audiences, channels..." value={promptNotes} onChange={(e) => setPromptNotes(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Your Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaigns.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No campaigns yet. Create one above.</p>
            ) : campaigns.map(c => (
              <div key={c.id} className="border rounded-lg p-3 space-y-2 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{c.code}</Badge>
                    {c.active ? <Badge className="bg-green-100 text-green-800">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Signup: 100 • Purchase: {c.reward_on_purchase} fruitles
                  </div>
                </div>
                {c.description && <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{c.description}</div>}
                <div className="flex flex-wrap items-center gap-2">
                  <Input readOnly value={inviteLink(c)} className="flex-1" />
                  <Button variant="outline" className="gap-2" onClick={() => copyToClipboard(inviteLink(c))}>
                    <Copy className="w-4 h-4" /> Copy
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => copyToClipboard(c.code)}>
                    <LinkIcon className="w-4 h-4" /> Code
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="md:col-span-2">
                    <Label>Send test email to</Label>
                    <Input placeholder="recipient@example.com" value={sendTo} onChange={(e) => setSendTo(e.target.value)} />
                  </div>
                  <Button className="w-full text-white" style={{ backgroundColor: 'var(--accent-gold)' }} onClick={() => sendTestEmail(c)}>
                    <Mail className="w-4 h-4 mr-1" /> Send Email
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              Latest Outreach Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button variant="outline" onClick={generateSuggestion}>Generate Now</Button>
            </div>
            {suggestions.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No suggestions yet.</p>
            ) : suggestions.map(s => (
              <div key={s.ts} className="border rounded-lg p-3 bg-white">
                <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{new Date(s.ts).toLocaleString()}</div>
                <div className="space-y-2">
                  {s.email_subject && <p><b>Email subject:</b> {s.email_subject}</p>}
                  {s.email_body && <p><b>Email body:</b> {s.email_body.replaceAll("INSERT_LINK", "[your invite link]")}</p>}
                  {s.tweet && <p><b>Tweet:</b> {s.tweet.replaceAll("INSERT_LINK", "[your invite link]")}</p>}
                  {s.short_post && <p><b>Post:</b> {s.short_post.replaceAll("INSERT_LINK", "[your invite link]")}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Web Prospector */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Web Prospector
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <Label>Topic / Query</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input className="pl-9" placeholder="e.g., university math clubs, math educators" value={prospectTopic} onChange={(e) => setProspectTopic(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Region (optional)</Label>
                <Input placeholder="e.g., US, EU, India" value={prospectRegion} onChange={(e) => setProspectRegion(e.target.value)} />
              </div>
              <div>
                <Label>Max results</Label>
                <Input type="number" min="1" max="50" value={prospectMax} onChange={(e) => setProspectMax(parseInt(e.target.value || "20", 10))} />
              </div>
              <div className="flex items-end">
                <Button className="w-full text-white" style={{ backgroundColor: 'var(--accent-gold)' }} onClick={prospectWeb} disabled={crawling}>
                  {crawling ? 'Searching...' : 'Prospect'}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 border rounded-lg p-3">
                <span>Auto-import to Leads</span>
                <Switch checked={autoImport} onCheckedChange={setAutoImport} />
              </div>
              <div className="flex items-center gap-3 border rounded-lg p-3">
                <span>Auto-email immediately</span>
                <Switch checked={autoEmail} onCheckedChange={setAutoEmail} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Max immediate emails</Label>
                <Input type="number" min="1" max="25" className="w-24" value={maxImmediateEmails} onChange={(e) => setMaxImmediateEmails(parseInt(e.target.value || "5", 10))} />
              </div>
              <div className="flex items-center gap-3 border rounded-lg p-3">
                <span>Consent/legitimate interest confirmed</span>
                <Switch checked={consentAffirm} onCheckedChange={setConsentAffirm} />
              </div>
            </div>

            {prospects.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Found {prospects.length} new contact(s) not in your leads.
                  </p>
                  {!autoImport && (
                    <Button variant="outline" onClick={() => importProspects(prospects)}>
                      Import these leads
                    </Button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Organization</th>
                        <th className="py-2 pr-4">Website</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prospects.map((p, i) => (
                        <tr key={`${p.email}-${i}`} className="border-t">
                          <td className="py-2 pr-4">{p.name || '—'}</td>
                          <td className="py-2 pr-4">{p.email}</td>
                          <td className="py-2 pr-4">{p.org || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {p.website ? <a className="text-amber-700 underline" href={p.website} target="_blank" rel="noreferrer">Open</a> : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Only import and contact people whose addresses are publicly listed and where you have consent or a legitimate interest. Use small batches to avoid rate limits.
            </p>
          </CardContent>
        </Card>

        {/* Limbertwig Automation Agent */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Limbertwig Automation Agent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 border rounded-lg p-3">
                <span>Active</span>
                <Switch checked={agentActive} onCheckedChange={setAgentActive} />
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <label className="text-sm">Cadence (min)</label>
                <Input type="number" min="1" step="1" value={cadenceMin} onChange={(e) => setCadenceMin(parseInt(e.target.value || "10", 10))} className="w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <label className="text-sm">Batch</label>
                <Input type="number" min="1" step="1" value={batchSize} onChange={(e) => setBatchSize(parseInt(e.target.value || "3", 10))} className="w-20" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm">Campaign</label>
                <Select value={selectedCampaign?.id || ""} onValueChange={(id) => setSelectedCampaign(campaigns.find(c => c.id === id) || null)}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Select campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="gap-2" onClick={runAutomationTick} disabled={!agentActive || running}>
                <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
                Run now
              </Button>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              While active (and this page is open), the agent periodically personalizes Limbertwig outreach, emails a small batch, logs runs, and updates lead statuses.
            </p>
          </CardContent>
        </Card>

        {/* Leads Manager */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Name" value={newLead.name} onChange={(e) => setNewLead(prev => ({ ...prev, name: e.target.value }))} />
              <Input placeholder="Email" value={newLead.email} onChange={(e) => setNewLead(prev => ({ ...prev, email: e.target.value }))} />
              <div className="flex items-center gap-2">
                <Switch checked={newLead.consent} onCheckedChange={(v) => setNewLead(prev => ({ ...prev, consent: v }))} />
                <span className="text-sm">Consent</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="text-white" style={{ backgroundColor: 'var(--accent-gold)' }} onClick={addLead}>Add Lead</Button>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} />
              <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4" /> Import CSV
              </Button>
              <Button variant="outline" onClick={syncReferralOutcomes}>Sync signups</Button>
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Total: {leads.length} • New: {leads.filter(l => l.status === "new").length} • Invited: {leads.filter(l => l.status === "invited").length} • Signed up: {leads.filter(l => l.status === "signed_up").length}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Inv.</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consent</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leads.map(lead => (
                    <tr key={lead.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lead.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Badge variant="outline" className={
                          lead.status === "signed_up" ? "bg-green-100 text-green-800" :
                          lead.status === "invited" ? "bg-blue-100 text-blue-800" :
                          lead.status === "opted_out" ? "bg-red-100 text-red-800" :
                          "bg-gray-100 text-gray-800"
                        }>{lead.status}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.last_invited_date ? new Date(lead.last_invited_date).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.consent ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
