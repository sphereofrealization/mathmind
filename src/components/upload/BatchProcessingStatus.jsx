import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function BatchProcessingStatus({ total, processed, currentName }) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
      <Card className="shadow-lg border-0">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-xl flex items-center justify-center"
                 style={{backgroundColor: 'var(--light-gold)'}}>
              <Brain className="w-10 h-10" style={{color: 'var(--accent-gold)'}} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--primary-navy)'}}>Processing TXT Files</h2>
            <p className="text-sm mb-6" style={{color: 'var(--text-secondary)'}}>
              {processed}/{total} completed{currentName ? ` — working on ${currentName}` : ''}
            </p>
            <Progress value={pct} className="h-3" />
            <p className="text-sm font-medium mt-2" style={{color: 'var(--primary-navy)'}}>{pct}% Complete</p>
            <div className="mt-6 text-sm flex items-center justify-center gap-2" style={{color: 'var(--text-secondary)'}}>
              <FileText className="w-4 h-4" />
              <span>We read text directly from each uploaded .txt file.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}