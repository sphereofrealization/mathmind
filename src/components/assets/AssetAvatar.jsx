import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Box, BookOpen, Sword, Sparkles } from "lucide-react";

function hash32(input) {
  const str = String(input || "");
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return (h >>> 0);
}

const typeStyles = {
  ai: { bg: "bg-blue-100", ring: "ring-blue-300", text: "text-blue-700" },
  book: { bg: "bg-amber-100", ring: "ring-amber-300", text: "text-amber-700" },
  agent: { bg: "bg-rose-100", ring: "ring-rose-300", text: "text-rose-700" },
};

const typeIcon = {
  ai: Box,
  book: BookOpen,
  agent: Sword,
};

export default function AssetAvatar({
  type = "ai",
  iconUrl,
  entityType = "AIAsset", // AIAsset | BookAsset | AgentAsset
  entityId,
  seed,
  size = 40,
}) {
  const [url, setUrl] = useState(iconUrl || "");
  const [loading, setLoading] = useState(false);
  const style = typeStyles[type] || typeStyles.ai;
  const Icon = typeIcon[type] || Cog;

  const px = useMemo(() => ({ width: size, height: size }), [size]);
  const seed32 = useMemo(() => hash32(seed || entityId || type), [seed, entityId, type]);

  const generate = async () => {
    if (!entityId || !entityType) return;
    setLoading(true);

    const s = seed32;
    const palettes = ['crimson', 'emerald', 'sapphire', 'amethyst', 'ivory', 'cobalt', 'vermilion', 'onyx'];
    const metals = ['gold', 'brass', 'copper', 'iron', 'silver', 'steel', 'bronze', 'obsidian'];
    const runes = ['arcane runes', 'geometric sigils', 'celestial glyphs', 'eldritch marks', 'alchemical symbols'];
    const bindings = ['clasp', 'chain', 'belt', 'strap', 'latch', 'lock'];

    const palette = palettes[s % palettes.length];
    const metal = metals[(s >> 3) % metals.length];
    const rune = runes[(s >> 6) % runes.length];
    const binding = bindings[(s >> 9) % bindings.length];

    let subject;
    if (type === 'book') {
      subject = `videogame tome of lore, ${palette} leather cover, ${metal} corners and ${binding}, ${rune}`;
    } else if (type === 'ai') {
      subject = 'mystic artifact relic, faceted core gem, radiating energy';
    } else {
      subject = 'forged weapon sigil, crossed blades, stylized';
    }

    const prompt = `16/32-bit pixel art icon (SNES/PSX era), crisp pixels, subtle dithering, transparent background, centered, no text. Subject: ${subject}. Variant ${(s % 97) + 1}.`;

    try {
      const res = await base44.integrations.Core.GenerateImage({ prompt });
      const newUrl = res.url;
      if (newUrl) {
        await base44.entities[entityType].update(entityId, { icon_url: newUrl });
        setUrl(newUrl);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative inline-flex items-center justify-center rounded-md border ring-1 ${style.bg} ${style.ring}`} style={px}>
      {url ? (
        <img src={url} alt={`${type} icon`} className="h-full w-full object-cover rounded" />
      ) : (
        <Icon className={`h-5 w-5 ${style.text}`} />
      )}
      {!url && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={generate}
          disabled={loading}
          className="absolute -bottom-2 -right-2 h-6 w-6 rounded-full border bg-white"
          title="Generate icon"
        >
          <Sparkles className={`h-3 w-3 ${loading ? "animate-pulse" : ""}`} />
        </Button>
      )}
    </div>
  );
}