import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X } from "lucide-react";

export default function MultiFileDrop({ files, onFilesChange, accept = ".txt,.tex" }) {
  const [dragActive, setDragActive] = React.useState(false);
  const inputRef = React.useRef(null);

  const isAccepted = (file) => {
    const name = (file.name || "").toLowerCase();
    if (name.endsWith(".txt")) return true;
    if (name.endsWith(".tex")) return true;
    return false;
  };

  const mergeUnique = (current, incoming) => {
    const seen = new Set(current.map((f) => `${f.name}:${f.size}`));
    const out = [...current];
    for (const f of incoming) {
      const key = `${f.name}:${f.size}`;
      if (!seen.has(key) && isAccepted(f)) out.push(f);
    }
    return out;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = Array.from(e.dataTransfer.files || []).filter(isAccepted);
    if (dropped.length) onFilesChange(mergeUnique(files, dropped));
  };

  const handleFileInput = (e) => {
    const selected = Array.from(e.target.files || []).filter(isAccepted);
    if (selected.length) onFilesChange(mergeUnique(files, selected));
  };

  const removeAt = (idx) => {
    const next = files.slice();
    next.splice(idx, 1);
    onFilesChange(next);
  };

  const clearAll = () => onFilesChange([]);

  return (
    <Card className="shadow-lg border-0">
      <CardContent className="p-0">
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 transition-all duration-300 ${
            dragActive ? "border-amber-400 bg-amber-50" : "border-gray-300 hover:border-gray-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
          />
          <div className="text-center">
            <div
              className="w-20 h-20 mx-auto mb-4 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--light-gold)' }}
            >
              <Upload className="w-10 h-10" style={{ color: 'var(--accent-gold)' }} />
            </div>
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--primary-navy)' }}>
              Upload .tex / .txt Files
            </h3>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
              Drag multiple files here, or click to browse
            </p>
            <Button
              onClick={() => inputRef.current?.click()}
              className="text-white font-medium px-6"
              style={{ backgroundColor: 'var(--accent-gold)'}}
            >
              Choose files
            </Button>
            {files.length > 0 && (
              <div className="mt-4">
                <Button variant="outline" onClick={clearAll} className="gap-2">
                  <X className="w-4 h-4" /> Clear all
                </Button>
              </div>
            )}
          </div>

          {files.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <div className="max-h-64 overflow-auto">
                {files.map((f, i) => (
                  <div key={`${f.name}:${i}`} className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-11 rounded-lg flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: 'var(--light-gold)' }}
                      >
                        <FileText className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: 'var(--primary-navy)' }}>{f.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {(f.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeAt(i)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}