import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const statusConfig = {
  uploaded: { 
    icon: Clock, 
    color: 'text-blue-500', 
    bg: 'bg-blue-100', 
    progress: 10,
    label: 'Queued'
  },
  extracting: { 
    icon: Loader2, 
    color: 'text-yellow-500', 
    bg: 'bg-yellow-100', 
    progress: 35,
    label: 'Extracting Text',
    animate: true
  },
  processing: { 
    icon: Loader2, 
    color: 'text-orange-500', 
    bg: 'bg-orange-100', 
    progress: 70,
    label: 'Processing Content',
    animate: true
  },
  completed: { 
    icon: CheckCircle, 
    color: 'text-green-500', 
    bg: 'bg-green-100', 
    progress: 100,
    label: 'Ready for AI'
  },
  error: { 
    icon: AlertCircle, 
    color: 'text-red-500', 
    bg: 'bg-red-100', 
    progress: 0,
    label: 'Error'
  }
};

export default function ProcessingQueue({ books, isLoading }) {
  const processingBooks = books.filter(book => 
    ['uploaded', 'extracting', 'processing'].includes(book.processing_status)
  );

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="border-b bg-white">
        <CardTitle className="flex items-center gap-2 text-xl font-bold" 
                   style={{color: 'var(--primary-navy)'}}>
          <Clock className="w-5 h-5" />
          Processing Queue
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array(2).fill(0).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        ) : processingBooks.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{color: 'var(--accent-gold)'}} />
            <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--primary-navy)'}}>
              All books processed
            </h3>
            <p style={{color: 'var(--text-secondary)'}}>
              Your mathematics library is ready for AI training
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <AnimatePresence>
              {processingBooks.map((book, index) => {
                const config = statusConfig[book.processing_status];
                const Icon = config.icon;
                
                return (
                  <motion.div
                    key={book.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.bg}`}>
                          <Icon 
                            className={`w-4 h-4 ${config.color} ${config.animate ? 'animate-spin' : ''}`} 
                          />
                        </div>
                        <div>
                          <p className="font-medium" style={{color: 'var(--primary-navy)'}}>
                            {book.title}
                          </p>
                          <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                            {config.label}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${config.color.replace('text-', 'bg-').replace('-500', '-100')} ${config.color.replace('-500', '-800')}`}>
                        {config.progress}%
                      </Badge>
                    </div>
                    <Progress 
                      value={config.progress} 
                      className="h-2"
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}