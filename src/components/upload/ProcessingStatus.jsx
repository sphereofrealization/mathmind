
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, FileText, Brain } from "lucide-react";
import { motion } from "framer-motion";

export default function ProcessingStatus({ progress, isProcessing, fileName }) {
  const getStatusText = () => {
    if (progress < 30) return "Uploading file...";
    if (progress < 60) return fileName?.endsWith('.txt') ? "Processing text content..." : "Extracting text content...";
    if (progress < 90) return "Preparing for AI training...";
    return "Finalizing...";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <Card className="shadow-lg border-0">
        <CardContent className="p-8">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 mx-auto mb-6 rounded-xl flex items-center justify-center"
              style={{backgroundColor: 'var(--light-gold)'}}
            >
              <Brain className="w-10 h-10" style={{color: 'var(--accent-gold)'}} />
            </motion.div>

            <h2 className="text-2xl font-bold mb-3" style={{color: 'var(--primary-navy)'}}>
              Processing Mathematics Content
            </h2>
            
            <p className="text-lg mb-2" style={{color: 'var(--text-secondary)'}}>
              {fileName}
            </p>

            <p className="text-sm mb-8" style={{color: 'var(--text-secondary)'}}>
              {getStatusText()}
            </p>

            <div className="space-y-4">
              <Progress value={progress} className="h-3" />
              <p className="text-sm font-medium" style={{color: 'var(--primary-navy)'}}>
                {progress}% Complete
              </p>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 text-sm">
              <div className="flex flex-col items-center p-3 rounded-lg" 
                   style={{backgroundColor: progress > 20 ? 'var(--light-gold)' : 'transparent'}}>
                <FileText className="w-5 h-5 mb-1" 
                         style={{color: progress > 20 ? 'var(--accent-gold)' : 'var(--text-secondary)'}} />
                <span>Upload</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg"
                   style={{backgroundColor: progress > 60 ? 'var(--light-gold)' : 'transparent'}}>
                <Loader2 className={`w-5 h-5 mb-1 ${progress > 30 && progress < 90 ? 'animate-spin' : ''}`}
                         style={{color: progress > 30 ? 'var(--accent-gold)' : 'var(--text-secondary)'}} />
                <span>{fileName?.endsWith('.txt') ? 'Process' : 'Extract'}</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg"
                   style={{backgroundColor: progress >= 100 ? 'var(--light-gold)' : 'transparent'}}>
                <Brain className="w-5 h-5 mb-1"
                       style={{color: progress > 80 ? 'var(--accent-gold)' : 'var(--text-secondary)'}} />
                <span>AI Ready</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
