import React, { useEffect, useState } from "react";
import { AIAsset } from "@/entities/AIAsset";
import { AITransfer } from "@/entities/AITransfer";
import { TrainedAI } from "@/entities/TrainedAI";
import { MarketplaceListing } from "@/entities/MarketplaceListing";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AssetAvatar from "../components/assets/AssetAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Tag, User, Repeat } from "lucide-react";
import { format } from "date-fns";

export default function AssetFinder() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);

  const [loadingDetails, setLoadingDetails] = useState(false);
  const [details, setDetails] = useState({ ai: null, transfers: [], listing: null });

  const handleSearch = async () => {
    const q = (query || "").trim().toLowerCase();
    if (!q) {
      setResults([]);
      setSelected(null);
      return;
    }
    setSearching(true);
    try {
      // Pull a reasonable set and filter client-side for partial matches
      const all = await AIAsset.list("-updated_date", 500);
      const filtered = (all || []).filter(a => {
        const name = (a.name || "").toLowerCase();
        const symbol = (a.symbol || "").toLowerCase();
        const owner = (a.owner_email || "").toLowerCase();
        const aiId = (a.ai_id || "").toLowerCase();
        return (
          name.includes(q) ||
          symbol.includes(q) ||
          owner.includes(q) ||
          aiId === q
        );
      });
      setResults(filtered);
      setSelected(null);
    } finally {
      setSearching(false);
    }
  };

  const loadDetails = async (asset) => {
    if (!asset) return;
    setLoadingDetails(true);
    try {
      const aiArr = await TrainedAI.filter({ id: asset.ai_id }, "-created_date", 1);
      const ai = aiArr && aiArr[0] ? aiArr[0] : null;
      const transfers = await AITransfer.filter({ asset_id: asset.id }, "-created_date", 200);
      const listingArr = await MarketplaceListing.filter({ asset_id: asset.id, status: "active" }, "-created_date", 1);
      const listing = listingArr && listingArr[0] ? listingArr[0] : null;
      setDetails({ ai, transfers, listing });
    } finally {
      setLoadingDetails(false);
    }
  };

  const selectAsset = (a) => {
    setSelected(a);
    setDetails({ ai: null, transfers: [], listing: null });
    loadDetails(a);
  };

  useEffect(() => {
    // Optional: run a search if query is prefilled via URL in future
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--soft-gray)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--primary-navy)' }}>Asset Finder</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Search by model name, token symbol, owner email, or AI id. Select a result to view current owner and transfer history.
          </p>
        </div>

        <div className="bg-white rounded-xl border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Try: Limbertwig, LMB5, user@email.com, or AI id"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button onClick={handleSearch} className="text-white" style={{ backgroundColor: 'var(--accent-gold)' }}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            Tip: Exact email matches are best; partial name/symbol matches also work.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Results list */}
          <Card className="lg:col-span-1 shadow-lg border-0">
            <CardHeader className="border-b bg-white">
              <CardTitle className="text-lg">Results</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {searching ? (
                <div className="p-4 space-y-3">
                  {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : results.length === 0 ? (
                <div className="p-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No results. Enter a query and click Search.
                </div>
              ) : (
                <div className="divide-y">
                  {results.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => selectAsset(a)}
                      className={`w-full text-left p-4 border rounded-lg bg-white mb-2 hover:bg-gray-50 transition ${
                        selected && selected.id === a.id ? "bg-amber-50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AssetAvatar type="ai" iconUrl={a.icon_url} entityType="AIAsset" entityId={a.id} seed={a.symbol || a.id} size={36} />
                          <div>
                            <div className="font-semibold" style={{ color: 'var(--primary-navy)' }}>
                              {a.name}
                            </div>
                            <div className="text-xs mt-1 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                              <User className="w-3 h-3" />
                              {a.owner_email}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="uppercase">
                          <Tag className="w-3 h-3 mr-1" />
                          {a.symbol}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details */}
          <Card className="lg:col-span-2 shadow-lg border-0">
            <CardHeader className="border-b bg-white">
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!selected ? (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Select an asset from the left to view owner and history.
                </p>
              ) : loadingDetails ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <AssetAvatar type="ai" iconUrl={selected.icon_url} entityType="AIAsset" entityId={selected.id} seed={selected.symbol || selected.id} size={44} />
                      <div>
                        <h3 className="text-xl font-semibold" style={{ color: 'var(--primary-navy)' }}>{selected.name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="outline" className="uppercase">{selected.symbol}</Badge>
                          <Badge className="bg-amber-100 text-amber-800" variant="outline">
                            Current owner: {selected.owner_email}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {details.listing ? (
                      <Badge className="bg-green-100 text-green-800">
                        Listed: {details.listing.price} fruitles
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not listed</Badge>
                    )}
                  </div>

                  {details.ai && (
                    <div className="mt-4 text-sm">
                      <p style={{ color: 'var(--text-secondary)' }}>
                        AI: <b style={{ color: 'var(--primary-navy)' }}>{details.ai.name}</b> • Status: {details.ai.training_status.replace(/_/g, " ")} • Specialization: {details.ai.specialization.replace(/_/g, " ")}
                      </p>
                    </div>
                  )}

                  <div className="mt-6">
                    <h4 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--primary-navy)' }}>
                      <Repeat className="w-4 h-4" />
                      Transfer history
                    </h4>
                    {details.transfers.length === 0 ? (
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        No transfers recorded for this asset.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {details.transfers.map((t) => (
                          <div key={t.id} className="p-3 border rounded-lg bg-white">
                            <div className="flex items-center justify-between">
                              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {format(new Date(t.created_date), "PPpp")}
                              </div>
                              {t.listing_id ? (
                                <Badge className="bg-blue-100 text-blue-800" variant="outline">Marketplace</Badge>
                              ) : (
                                <Badge variant="outline">Direct transfer</Badge>
                              )}
                            </div>
                            <div className="mt-1 text-sm">
                              <span className="font-medium" style={{ color: 'var(--primary-navy)' }}>{t.from_email}</span>
                              <span className="mx-2">→</span>
                              <span className="font-medium" style={{ color: 'var(--primary-navy)' }}>{t.to_email}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}