import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function JsonlPreview({ jsonlText, linesToShow = 5, fileName = "dataset.jsonl" }) {
  const preview = React.useMemo(() => {
    const lines = (jsonlText || "").split("\n").filter(Boolean);
    return lines.slice(0, linesToShow).join("\n");
  }, [jsonlText, linesToShow]);

  const handleDownload = () => {
    const blob = new Blob([jsonlText || ""], { type: "application/jsonl;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle>JSONL Preview</CardTitle>
      </CardHeader>
      <CardContent>
        {preview ? (
          <>
            <pre className="text-xs bg-black/5 p-3 rounded max-h-64 overflow-auto whitespace-pre-wrap">{preview}</pre>
            <div className="mt-3 flex justify-end">
              <Button onClick={handleDownload} className="text-white" style={{ backgroundColor: 'var(--accent-gold)' }}>
                <Download className="w-4 h-4 mr-2" /> Download JSONL
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Process files to see a preview.</p>
        )}
      </CardContent>
    </Card>
  );
}