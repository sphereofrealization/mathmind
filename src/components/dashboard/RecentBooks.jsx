import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { BookOpen, User, Calendar, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const categoryColors = {
  algebra: "bg-red-100 text-red-800 border-red-200",
  calculus: "bg-blue-100 text-blue-800 border-blue-200",
  geometry: "bg-green-100 text-green-800 border-green-200",
  topology: "bg-purple-100 text-purple-800 border-purple-200",
  analysis: "bg-indigo-100 text-indigo-800 border-indigo-200",
  number_theory: "bg-yellow-100 text-yellow-800 border-yellow-200",
  statistics: "bg-pink-100 text-pink-800 border-pink-200",
  probability: "bg-orange-100 text-orange-800 border-orange-200",
  discrete_math: "bg-cyan-100 text-cyan-800 border-cyan-200",
  linear_algebra: "bg-lime-100 text-lime-800 border-lime-200",
  differential_equations: "bg-violet-100 text-violet-800 border-violet-200",
  abstract_algebra: "bg-rose-100 text-rose-800 border-rose-200",
  mathematical_logic: "bg-emerald-100 text-emerald-800 border-emerald-200",
  other: "bg-gray-100 text-gray-800 border-gray-200"
};

const statusColors = {
  uploaded: "bg-blue-100 text-blue-800",
  extracting: "bg-yellow-100 text-yellow-800",
  processing: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800"
};

export default function RecentBooks({ books, isLoading }) {
  const [icons, setIcons] = useState({});
  const recentBooks = books.slice(0, 5);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map = {};
      for (const b of recentBooks) {
        try {
          const arr = await base44.entities.BookAsset.filter({ book_id: b.id }, '-updated_date', 1);
          if (arr && arr[0]?.icon_url) map[b.id] = arr[0].icon_url;
        } catch {}
      }
      if (!cancelled) setIcons(map);
    })();
    return () => { cancelled = true; };
  }, [books]);

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="border-b bg-white">
        <CardTitle className="flex items-center gap-2 text-xl font-bold" 
                   style={{color: 'var(--primary-navy)'}}>
          <BookOpen className="w-5 h-5" />
          Recent Books
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-16 w-12 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : recentBooks.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4" style={{color: 'var(--text-secondary)'}} />
            <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--primary-navy)'}}>
              No books uploaded yet
            </h3>
            <p style={{color: 'var(--text-secondary)'}}>
              Upload your first mathematics book to get started
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            <AnimatePresence>
              {recentBooks.map((book, index) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-16 rounded-lg flex items-center justify-center shadow-sm" style={{backgroundColor: 'var(--light-gold)'}}>
                        {icons[book.id] ? (
                          <img src={icons[book.id]} alt="Book icon" className="w-8 h-8 object-cover rounded" />
                        ) : (
                          <BookOpen className="w-6 h-6" style={{color: 'var(--accent-gold)'}} />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-1" style={{color: 'var(--primary-navy)'}}>
                            {book.title}
                          </h4>
                          {book.author && (
                            <p className="flex items-center gap-1 text-sm mb-2" 
                               style={{color: 'var(--text-secondary)'}}>
                              <User className="w-4 h-4" />
                              {book.author}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-sm">
                            <span className="flex items-center gap-1" style={{color: 'var(--text-secondary)'}}>
                              <Calendar className="w-4 h-4" />
                              {format(new Date(book.created_date), "MMM d, yyyy")}
                            </span>
                            {book.word_count && (
                              <span style={{color: 'var(--text-secondary)'}}>
                                {book.word_count.toLocaleString()} words
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <Badge className={statusColors[book.processing_status]}>
                            {book.processing_status}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`${categoryColors[book.category]} border`}
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {book.category?.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}