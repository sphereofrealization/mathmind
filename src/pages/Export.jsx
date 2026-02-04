import React, { useState } from 'react';
import { MathBook } from '@/entities/MathBook';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ExportPage() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const books = await MathBook.list();
      
      // We only export metadata, not the full content, to keep the file size manageable.
      const exportData = books.map(({ extracted_content, processed_content, ...metadata }) => metadata);
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = `MathBook_export_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: 'var(--soft-gray)'}}>
      <div className="max-w-2xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2" style={{color: 'var(--primary-navy)'}}>
            Export Data
          </h1>
          <p className="text-lg" style={{color: 'var(--text-secondary)'}}>
            Download your content library metadata.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export Library Metadata
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6" style={{color: 'var(--text-secondary)'}}>
                Export all your content metadata as a JSON file. This is useful for backups or for use in other applications. Note that the full text content is not included in this export to maintain a reasonable file size.
              </p>
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full text-white font-medium px-8 py-3 text-lg"
                style={{backgroundColor: 'var(--accent-gold)'}}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Download JSON
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}