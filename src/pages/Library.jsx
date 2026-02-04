import React, { useState, useEffect, useMemo } from 'react';
import { MathBook } from '@/entities/MathBook';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { BookOpen, Search, Filter, Tag, User, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from "date-fns";
import _ from 'lodash';

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

const CATEGORIES = Object.keys(categoryColors);

export default function LibraryPage() {
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    const loadBooks = async () => {
      setIsLoading(true);
      const fetchedBooks = await MathBook.list('-created_date');
      setBooks(fetchedBooks);
      setIsLoading(false);
    };
    loadBooks();
  }, []);

  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const searchMatch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase()));
      const categoryMatch = categoryFilter === 'all' || book.category === categoryFilter;
      return searchMatch && categoryMatch;
    });
  }, [books, searchTerm, categoryFilter]);

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: 'var(--soft-gray)'}}>
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2" style={{color: 'var(--primary-navy)'}}>
            Content Library
          </h1>
          <p className="text-lg" style={{color: 'var(--text-secondary)'}}>
            Browse, search, and manage your mathematics content.
          </p>
        </motion.div>

        <Card className="mb-8 shadow-md border-0">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{color: 'var(--text-secondary)'}}/>
              <Input 
                placeholder="Search by title or author..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative w-full md:w-56">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{color: 'var(--text-secondary)'}}/>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="pl-10">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {_.startCase(cat.replace(/_/g, ' '))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="p-4"><Skeleton className="h-32 w-full" /></Card>
            ))}
          </div>
        ) : (
          <AnimatePresence>
            {filteredBooks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBooks.map((book, index) => (
                  <motion.div
                    key={book.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Link to={createPageUrl(`ContentViewer?id=${book.id}`)}>
                      <Card className="h-full hover:shadow-xl transition-shadow duration-300 border-0">
                        <CardContent className="p-6 flex flex-col h-full">
                           <div className="flex-shrink-0 mb-4">
                             <div className="w-16 h-20 rounded-lg flex items-center justify-center shadow-sm"
                                  style={{backgroundColor: 'var(--light-gold)'}}>
                               <BookOpen className="w-8 h-8" style={{color: 'var(--accent-gold)'}} />
                             </div>
                           </div>
                           <h3 className="text-xl font-semibold mb-2 flex-grow" style={{color: '#000'}}>{book.title}</h3>
                           {book.author && (
                             <p className="flex items-center gap-2 text-sm mb-3" style={{color: '#000'}}>
                                                             <User className="w-4 h-4" /> {book.author}
                                                           </p>
                           )}
                           <div className="flex items-center justify-between text-sm mb-4">
                             <Badge variant="outline" className={`${categoryColors[book.category]} border`}>
                               <Tag className="w-3 h-3 mr-1" />
                               {_.startCase(book.category?.replace(/_/g, ' '))}
                             </Badge>
                             <span className="flex items-center gap-1" style={{color: '#000'}}>
                                                             <Calendar className="w-4 h-4" />
                                                             {format(new Date(book.created_date), "MMM d, yyyy")}
                                                           </span>
                           </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Search className="w-16 h-16 mx-auto mb-4" style={{color: 'var(--text-secondary)'}}/>
                <h3 className="text-xl font-semibold mb-2" style={{color: 'var(--primary-navy)'}}>No Matching Content Found</h3>
                <p style={{color: 'var(--text-secondary)'}}>Try adjusting your search or filters.</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}