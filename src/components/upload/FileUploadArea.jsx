
import React, { useCallback, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X } from "lucide-react";
import { motion } from "framer-motion";

export default function FileUploadArea({ onFileSelect, selectedFile }) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const clearFile = () => {
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileTypeDisplay = (file) => {
    if (!file) return '';
    if (file.type === 'application/pdf') return 'PDF';
    if (file.type === 'text/plain') return 'TXT';
    // Fallback if type isn't standard, try by extension
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.pdf')) return 'PDF';
    if (fileName.endsWith('.txt')) return 'TXT';
    return 'Document';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="shadow-lg border-0">
        <CardContent className="p-0">
          <div
            className={`relative border-2 border-dashed rounded-lg p-12 transition-all duration-300 ${
              dragActive
                ? "border-amber-400 bg-amber-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileInput}
              className="hidden"
            />

            {selectedFile ? (
              <div className="text-center">
                <div className="w-16 h-20 mx-auto mb-4 rounded-lg flex items-center justify-center shadow-lg"
                     style={{backgroundColor: 'var(--light-gold)'}}>
                  <FileText className="w-8 h-8" style={{color: 'var(--accent-gold)'}} />
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{color: 'var(--primary-navy)'}}>
                  {selectedFile.name}
                </h3>
                <p className="text-sm mb-4" style={{color: 'var(--text-secondary)'}}>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {getFileTypeDisplay(selectedFile)}
                </p>
                <Button
                  onClick={clearFile}
                  variant="outline"
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Remove File
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-xl flex items-center justify-center"
                     style={{backgroundColor: 'var(--light-gold)'}}>
                  <Upload className="w-10 h-10" style={{color: 'var(--accent-gold)'}} />
                </div>
                <h3 className="text-2xl font-bold mb-3" style={{color: 'var(--primary-navy)'}}>
                  Upload Mathematics Content
                </h3>
                <p className="text-lg mb-6" style={{color: 'var(--text-secondary)'}}>
                  Drag and drop your PDF or TXT file here, or click to browse
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-white font-medium px-6 py-3"
                  style={{backgroundColor: 'var(--accent-gold)'}}
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Choose File
                </Button>
                <div className="mt-6 space-y-2 text-sm" style={{color: 'var(--text-secondary)'}}>
                  <p className="font-medium">Supported formats:</p>
                  <div className="flex justify-center gap-6">
                    <span>📄 PDF - Books & Documents</span>
                    <span>📝 TXT - Raw Training Data</span>
                  </div>
                  <p>Files up to 50MB</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
