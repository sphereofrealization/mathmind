import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { MathBook } from '@/entities/MathBook';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { createPageUrl } from '@/utils';
import { ArrowLeft, BookOpen, User, Tag, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
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

export default function ContentViewerPage() {
  const location = useLocation();
  const [book, setBook] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBook = async () => {
      const params = new URLSearchParams(location.search);
      const bookId = params.get('id');

      if (!bookId) {
        setError('No book ID provided.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Note: There is no `get` method in the provided SDK. 
        // We simulate it by filtering the list. In a real scenario, a `get(id)` would be more efficient.
        const books = await MathBook.filter({ id: bookId });
        if (books && books.length > 0) {
          setBook(books[0]);
        } else {
          setError('Book not found.');
        }
      } catch (e) {
        setError('Failed to fetch book data.');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBook();
  }, [location.search]);

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-10 w-1/3 mb-8" />
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
        <p>{error}</p>
        <Link to={createPageUrl('Library')}>
          <Button variant="outline" className="mt-4">Back to Library</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: 'var(--soft-gray)'}}>
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to={createPageUrl('Library')} className="inline-block mb-6">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Library
            </Button>
          </Link>
          <Card className="shadow-lg border-0">
            <CardHeader className="border-b">
              <div className="flex items-start gap-4">
                 <div className="flex-shrink-0 pt-1">
                   <BookOpen className="w-8 h-8" style={{color: 'var(--primary-navy)'}} />
                 </div>
                 <div>
                  <CardTitle className="text-3xl font-bold mb-2" style={{color: 'var(--primary-navy)'}}>{book.title}</CardTitle>
                   <div className="flex flex-wrap items-center gap-4 text-sm" style={{color: 'var(--text-secondary)'}}>
                    {book.author && (
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4" /> {book.author}
                      </span>
                    )}
                     <span className="flex items-center gap-2">
                       <Tag className="w-4 h-4" /> 
                       <Badge variant="outline" className={`${categoryColors[book.category]} border`}>
                         {_.startCase(book.category?.replace(/_/g, ' '))}
                       </Badge>
                     </span>
                     <span className="flex items-center gap-2">
                       <Calendar className="w-4 h-4" /> 
                       Uploaded on {format(new Date(book.created_date), "MMMM d, yyyy")}
                     </span>
                   </div>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4" style={{color: 'var(--primary-navy)'}}>Extracted Content</h3>
              <div className="bg-white p-4 rounded-lg border max-h-[60vh] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm" style={{color: 'var(--text-primary)', fontFamily: 'sans-serif'}}>
                  {book.extracted_content || "No content extracted."}
                </pre>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}