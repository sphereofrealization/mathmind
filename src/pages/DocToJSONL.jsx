
import React, { useState } from "react";
import { UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import MultiFileDrop from "@/components/dataset/MultiFileDrop";
import ParserOptions from "@/components/dataset/ParserOptions";
import JsonlPreview from "@/components/dataset/JsonlPreview";
import { FruitlesTransaction } from "@/entities/FruitlesTransaction";
import { User } from "@/entities/User";

export default function DocToJSONL() {
  const [files, setFiles] = useState([]);
  const COST_PER_FILE = 5; // 5 fruitles per file
  const [options, setOptions] = useState({
    chunk_size: 4000,
    overlap: 200,
    strip_latex: false,
    keep_math: true,
    include_meta: true,
    no_chunk: true, // default to no chunking
    chunk_strategy: "headings",
    remove_comments: false,
    emit_dual_fields: true,
    use_raw_as_text: true,
    output_format: "chat_messages", // NEW: default to chat-messages for fine-tune compatibility
    // NEW: fine-tune safety
    ft_auto_split: true,
    ft_target_tokens: 2000
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ total: 0, processed: 0, current: "" });
  const [jsonlText, setJsonlText] = useState("");
  const [error, setError] = useState("");

  const chunkText = (text, size, overlap) => {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
      const end = Math.min(i + size, text.length);
      const slice = text.slice(i, end);
      chunks.push({ text: slice.trim(), start: i, end });
      if (end >= text.length) break;
      i = Math.max(0, end - overlap);
    }
    return chunks.filter(chunk => chunk.text.length > 0);
  };

  const stripComments = (t) => {
    // remove % comments (not perfect, but practical)
    return t.split("\n").map(line => {
      // keep \% literal by replacing temporarily
      const safe = line.replace(/\\%/g, "__PERCENT__");
      const cut = safe.replace(/%.*/, "");
      return cut.replace(/__PERCENT__/g, "%");
    }).join("\n");
  };

  const extractMathPlaceholders = (t) => {
    // capture inline $...$ and display \[...\] regions
    const mathRegions = [];
    let out = t;

    // \[ ... \]
    out = out.replace(/\\\[((?:.|\n)*?)\\\]/g, (_, m) => {
      const id = `__MATH_BLOCK_${mathRegions.length}__`;
      mathRegions.push(m);
      return id;
    });

    // $ ... $ (non-greedy, avoid $$)
    out = out.replace(/\$(?!\$)((?:\\\$|[^$])*)\$/g, (_, m) => {
      const id = `__MATH_INLINE_${mathRegions.length}__`;
      mathRegions.push(m);
      return id;
    });

    return { out, mathRegions };
  };

  const restoreMath = (t, mathRegions) => t.replace(/__MATH_(?:BLOCK|INLINE)_(\d+)__/g, (_, idx) => mathRegions[Number(idx)] || "");

  const stripLatexCommands = (t, keepMath) => {
    let text = t;
    let mathRegions = [];
    if (keepMath) {
      const res = extractMathPlaceholders(text);
      text = res.out;
      mathRegions = res.mathRegions;
    }
    text = stripComments(text);
    text = text.replace(/\\begin\{([a-zA-Z*]+)\}((?:.|\n)*?)\\end\{\1\}/g, (_, env, inner) => {
      const visual = new Set(["figure", "table", "tabular", "tikzpicture", "lstlisting"]);
      const mathEnvs = new Set(["equation", "equation*", "align", "align*", "gather", "gather*", "multline", "multline*"]);
      if (visual.has(env)) return "";
      if (mathEnvs.has(env) && !keepMath) return "";
      return inner;
    });
    text = text.replace(/\\(input|include)\{[^}]*\}/g, "");
    text = text.replace(/\\[a-zA-Z@]+(\*?)(\[[^\]]*\])?(\{[^}]*\})?/g, (_, _star, _opt, arg) => {
      if (arg) return arg.replace(/^\{|\}$/g, "");
      return "";
    });
    text = text.replace(/\\[a-zA-Z@]+/g, "");
    text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
    if (keepMath) text = restoreMath(text, mathRegions);
    return text.trim();
  };

  // Minimal plain-text view while preserving as much content as possible
  const latexToPlain = (t) => {
    let text = t;
    // Keep math as-is; drop only the structural command words
    text = text.replace(/\\begin\{([^\}]+)\}/g, "[BEGIN:$1]").replace(/\\end\{([^\}]+)\}/g, "[END:$1]");
    // Capture starred versions of headings too
    text = text.replace(/\\(section|subsection|subsubsection|chapter)\*?\{([^}]*)\}/g, (_, tag, title) => `\n\n# ${title}\n`);
    // Remove comments softly
    text = stripComments(text);
    // Collapse excessive whitespace
    text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
    return text.trim();
  };

  // Parse LaTeX by headings for better section-aware chunks
  const parseLatexSections = (raw) => {
    const lines = raw.split("\n");
    const result = [];
    let path = [];
    let buf = [];
    let currentSectionStartChar = 0; // Tracks the start character index of the current section's content in the raw text

    const pushSection = () => {
      if (buf.length > 0) { // Only push if there's content.
        const content = buf.join("\n");
        result.push({
          path: [...path],
          content: content,
          start_char_in_raw: currentSectionStartChar,
          end_char_in_raw: currentSectionStartChar + content.length
        });
      }
      buf = [];
    };

    const setLevel = (level, title, lineStartCharIndex) => {
      path = path.slice(0, level); // Trim path to the current level
      path[level] = title;          // Set the title for the current level
      currentSectionStartChar = lineStartCharIndex; // New section content starts at this line's char index
    };

    const headingMatch = (line) => {
      let m;
      if ((m = line.match(/^\\chapter\*?\{([^}]*)\}/))) return { level: 0, title: m[1] };
      if ((m = line.match(/^\\section\*?\{([^}]*)\}/))) return { level: 1, title: m[1] };
      if ((m = line.match(/^\\subsection\*?\{([^}]*)\}/))) return { level: 2, title: m[1] };
      if ((m = line.match(/^\\subsubsection\*?\{([^}]*)\}/))) return { level: 3, title: m[1] };
      return null;
    };

    let totalCharsProcessed = 0; // Keeps track of character position in `raw`
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const hm = headingMatch(line);
      if (hm) {
        if (buf.length > 0) {
          pushSection(); // Push current buffer as a section
        }
        setLevel(hm.level, hm.title, totalCharsProcessed); // Set new section start to current totalCharsProcessed
      }
      buf.push(line);
      totalCharsProcessed += line.length + 1; // +1 for the newline character that was split
    }

    if (buf.length) {
      pushSection(); // Push any remaining content as the last section
    }
    return result.filter(sec => sec.content.trim().length > 0);
  };

  const toJsonl = (records) => records.map(r => JSON.stringify(r)).join("\n");

  // NEW: lightweight token estimate and budget-based splitter
  const estimateTokens = (text) => Math.ceil((text || "").length / 4);

  const splitByBudget = (text, isTex, budgetTokens = 2000, strategy = "headings", size = 4000, overlap = 0, sectionParser = null) => {
    if (!text) return [];
    const charBudget = Math.max(200, budgetTokens * 4); // minimal floor for character budget
    const out = [];

    if (isTex && strategy === "headings" && typeof sectionParser === "function") {
      const sections = sectionParser(text);
      let currentBuffer = [];
      let currentBufferLength = 0;

      const flushBuffer = () => {
        if (currentBuffer.length > 0) {
          out.push(currentBuffer.join("\n"));
          currentBuffer = [];
          currentBufferLength = 0;
        }
      };

      for (const sec of sections) {
        const block = sec.content || "";
        // If adding this block exceeds the budget
        if (currentBufferLength + (currentBuffer.length > 0 ? 1 : 0) + block.length > charBudget) {
          flushBuffer(); // Flush current buffer

          // If the block itself is too large, split it into fixed-size pieces
          if (block.length > charBudget) {
            for (let i = 0; i < block.length; i += charBudget) {
              out.push(block.slice(i, Math.min(i + charBudget, block.length)));
            }
          } else {
            // Block fits into an empty buffer, add it
            currentBuffer.push(block);
            currentBufferLength += block.length;
          }
        } else {
          // Block fits, add it to current buffer
          if (currentBuffer.length > 0) currentBuffer.push("\n");
          currentBuffer.push(block);
          currentBufferLength += block.length + (currentBuffer.length > 1 ? 1 : 0); // +1 for the newline if not first
        }
      }
      flushBuffer(); // Flush any remaining content in buffer
      return out.filter(s => s.trim().length > 0);
    }

    // Fixed-window fallback (or if not LaTeX, or not heading strategy)
    for (let i = 0; i < text.length; i += charBudget) {
      out.push(text.slice(i, Math.min(i + charBudget, text.length)).trim());
    }
    return out.filter(s => s.length > 0);
  };

  const getBalance = async (email) => {
    const incoming = await FruitlesTransaction.filter({ to_email: email });
    const outgoing = await FruitlesTransaction.filter({ from_email: email });
    const sum = (arr) => (arr || []).reduce((s, t) => s + (t.amount || 0), 0);
    return sum(incoming) - sum(outgoing);
  };

  const processFiles = async () => {
    if (!files.length) return;

    // NEW: enforce pricing before any processing
    setError("");
    const me = await User.me();
    if (!me || !me.email) {
      setError("User not authenticated. Please log in to process files.");
      return;
    }

    const requiredCost = files.length * COST_PER_FILE;
    const currentBalance = await getBalance(me.email);
    if (currentBalance < requiredCost) {
      setError(`Insufficient balance: need ${requiredCost} fruitles to process ${files.length} file(s), you have ${currentBalance}. Please buy more fruitles.`);
      return;
    }
    // Charge upfront (single transaction covering all files)
    try {
      await FruitlesTransaction.create({
        from_email: me.email,
        to_email: "system@fruitles",
        amount: requiredCost,
        reason: "doc_to_jsonl_processing"
      });
    } catch (chargeError) {
      console.error("Failed to charge fruitles:", chargeError);
      setError("Failed to charge for processing. Please try again.");
      return;
    }


    setIsProcessing(true);
    setJsonlText("");
    setProgress({ total: files.length, processed: 0, current: "" });

    const lines = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgress((p) => ({ ...p, current: f.name }));

        const { file_url } = await UploadFile({ file: f });
        const resp = await fetch(file_url);
        let raw = await resp.text();

        const isTex = (f.name || "").toLowerCase().endsWith(".tex");
        let rawNormalized = raw.replace(/\r\n/g, "\n");

        if (isTex && options.remove_comments) {
          rawNormalized = stripComments(rawNormalized);
        }

        const plainTextCandidate = isTex
          ? (options.strip_latex ? stripLatexCommands(rawNormalized, options.keep_math) : latexToPlain(rawNormalized))
          : rawNormalized;

        const textForTraining = options.use_raw_as_text && isTex ? rawNormalized : plainTextCandidate;

        // Do NOT merge extra fields into chat-messages records.
        const emitRecord = (primaryText, rawContent, plainContent, additionalPayload) => {
          if (options.output_format === "chat_messages") {
            return {
              messages: [
                { role: "system", content: "You are a helpful AI trained on this domain. Incorporate the provided content as knowledge." },
                { role: "user", content: "Learn and internalize the following content." },
                { role: "assistant", content: primaryText }
              ]
            };
          }
          if (options.emit_dual_fields) {
            return {
              text: primaryText,
              raw: rawContent,
              plain_text: plainContent,
              ...additionalPayload
            };
          }
          return {
            text: primaryText,
            ...additionalPayload
          };
        };

        // If user wants a single-record export but provider has a per-example token limit,
        // split only as needed for chat_messages when auto-split is on.
        if (options.no_chunk) {
          if (options.output_format === "chat_messages" && options.ft_auto_split) {
            const slices = splitByBudget(
              textForTraining,
              isTex,
              options.ft_target_tokens,
              options.chunk_strategy,
              options.chunk_size, // Not directly used here but passed for consistency
              options.overlap, // Not directly used here but passed for consistency
              isTex ? parseLatexSections : null
            );
            slices.forEach((slice) => lines.push(emitRecord(slice)));
          } else {
            const meta = options.include_meta && options.output_format !== "chat_messages" ? {
              meta: {
                file: f.name,
                chunk_index: 0,
                char_start: 0,
                char_end: textForTraining.length,
                section_path: [],
                math_density: isTex ? (rawNormalized.match(/\$|\\\[/g) || []).length / Math.max(1, rawNormalized.length) : 0
              }
            } : {};
            lines.push(emitRecord(textForTraining, isTex ? rawNormalized : undefined, plainTextCandidate, meta));
          }
          setProgress((p) => ({ total: p.total, processed: i + 1, current: f.name }));
          continue;
        }

        // Chunking path
        if (isTex && options.chunk_strategy === "headings") {
          const sections = parseLatexSections(rawNormalized);
          for (const sec of sections) {
            const chunksFromRawSection = chunkText(sec.content, options.chunk_size, options.overlap);
            for (let idx = 0; idx < chunksFromRawSection.length; idx++) {
              const { text: rawChunkSlice, start: chunkStartInSection, end: chunkEndInSection } = chunksFromRawSection[idx];
              const primaryText = options.use_raw_as_text ? rawChunkSlice : latexToPlain(rawChunkSlice);
              const plainTextForChunk = latexToPlain(rawChunkSlice);
              const rawForChunk = rawChunkSlice;

              // If chat_messages with auto-split, ensure each example stays within token budget
              if (options.output_format === "chat_messages" && options.ft_auto_split && estimateTokens(primaryText) > options.ft_target_tokens) {
                const subSlices = splitByBudget(
                  primaryText,
                  false, // Treat as non-tex for sub-splitting, always fixed-window
                  options.ft_target_tokens,
                  "fixed" // Force fixed-window for sub-splitting
                );
                subSlices.forEach((s) => lines.push(emitRecord(s)));
                continue; // Skip normal emission for this chunk, sub-slices were emitted
              }

              const meta = options.include_meta && options.output_format !== "chat_messages" ? {
                meta: {
                  file: f.name,
                  chunk_index: idx,
                  char_start: sec.start_char_in_raw + chunkStartInSection,
                  char_end: sec.start_char_in_raw + chunkEndInSection,
                  section_path: (sec.path || []).filter(Boolean),
                  math_density: (rawChunkSlice.match(/\$|\\\[/g) || []).length / Math.max(1, rawChunkSlice.length)
                }
              } : {};
              lines.push(emitRecord(primaryText, rawForChunk, plainTextForChunk, meta));
            }
          }
        } else {
          // Fixed-window chunking for any file (non-LaTeX or not using heading strategy)
          // `contentToChunkForFixedWindow` is the content that chunkText actually operates on.
          const contentToChunkForFixedWindow = options.use_raw_as_text && isTex ? rawNormalized : plainTextCandidate;
          const chunks = chunkText(contentToChunkForFixedWindow, options.chunk_size, options.overlap);

          for (let idx = 0; idx < chunks.length; idx++) {
            const { text: chunkSlice, start, end } = chunks[idx];

            let primaryText, rawForThisChunk, plainTextForThisChunk;
            if (options.use_raw_as_text && isTex) {
              // If we decided to use raw LaTeX as the primary text, then `chunkSlice` is raw LaTeX.
              primaryText = chunkSlice;
              rawForThisChunk = chunkSlice;
              plainTextForThisChunk = latexToPlain(chunkSlice);
            } else {
              // Otherwise, `chunkSlice` is derived from `plainTextCandidate` (either processed LaTeX or plain TXT).
              // So, `chunkSlice` itself is considered plain text for this record.
              primaryText = chunkSlice;
              rawForThisChunk = undefined; // We didn't chunk the raw content directly, so no direct raw chunk mapping.
              plainTextForThisChunk = chunkSlice;
            }

            if (options.output_format === "chat_messages" && options.ft_auto_split && estimateTokens(primaryText) > options.ft_target_tokens) {
              const subSlices = splitByBudget(
                primaryText,
                false, // Treat as non-tex for sub-splitting, always fixed-window
                options.ft_target_tokens,
                "fixed" // Force fixed-window for sub-splitting
              );
              subSlices.forEach((s) => lines.push(emitRecord(s)));
              continue; // Skip normal emission for this chunk, sub-slices were emitted
            }

            const meta = options.include_meta && options.output_format !== "chat_messages" ? {
              meta: {
                file: f.name,
                chunk_index: idx,
                char_start: start, // These offsets are relative to `contentToChunkForFixedWindow`
                char_end: end,
                section_path: [],
                math_density: (rawForThisChunk && isTex) ? (rawForThisChunk.match(/\$|\\\[/g) || []).length / Math.max(1, rawForThisChunk.length) : 0
              }
            } : {};
            lines.push(emitRecord(primaryText, rawForThisChunk, plainTextForThisChunk, meta));
          }
        }

        setProgress((p) => ({ total: p.total, processed: i + 1, current: f.name }));
      }

      setJsonlText(toJsonl(lines));
    } catch (e) {
      console.error("DocToJSONL processing error:", e);
      setError("Failed to process one or more files. Please try again or adjust options.");
    } finally {
      setIsProcessing(false);
    }
  };

  const fileCount = files.length;

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--soft-gray)' }}>
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold mb-1" style={{ color: 'var(--primary-navy)' }}>Doc → JSONL Builder</h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            Upload .tex and .txt documents, auto-parse, chunk, and export a clean JSONL dataset (text lines).
          </p>
        </motion.div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <MultiFileDrop files={files} onFilesChange={setFiles} />

        <ParserOptions options={options} onChange={setOptions} />

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Build Dataset
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {fileCount} file{fileCount === 1 ? "" : "s"} selected
              </div>
              <Button
                onClick={processFiles}
                disabled={isProcessing || fileCount === 0}
                className="text-white"
                style={{ backgroundColor: 'var(--accent-gold)' }}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                {isProcessing ? "Processing..." : "Process to JSONL"}
              </Button>
            </div>
            <p className="text-xs mt-2" style={{color: 'var(--text-secondary)'}}>
              Cost: {COST_PER_FILE} fruitles per file. Selected: {files.length} file(s) = {files.length * COST_PER_FILE} fruitles.
            </p>

            {isProcessing && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <span>Processing {progress.current || "…"}</span>
                  <span>{progress.processed}/{progress.total}</span>
                </div>
                <Progress value={progress.total ? (progress.processed / progress.total) * 100 : 0} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        <JsonlPreview
          jsonlText={jsonlText}
          linesToShow={8}
          fileName={`docs_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.jsonl`}
        />
      </div>
    </div>
  );
}
