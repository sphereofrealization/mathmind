
import React, { useState, useEffect } from "react";
import { MathBook } from "@/entities/MathBook";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
    Plus
} from "lucide-react";
import { motion } from "framer-motion";

import StatsGrid from "../components/dashboard/StatsGrid";
import RecentBooks from "../components/dashboard/RecentBooks";
import CategoryChart from "../components/dashboard/CategoryChart";
import ProcessingQueue from "../components/dashboard/ProcessingQueue";
import WalletCard from "../components/dashboard/WalletCard"; // Added import for WalletCard

export default function Dashboard() {
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setIsLoading(true);
    const fetchedBooks = await MathBook.list("-created_date");
    setBooks(fetchedBooks);
    setIsLoading(false);
  };

  const stats = {
    totalBooks: books.length,
    processedBooks: books.filter(book => book.processing_status === 'completed').length,
    inProgress: books.filter(book => ['extracting', 'processing'].includes(book.processing_status)).length,
    totalWords: books.reduce((sum, book) => sum + (book.word_count || 0), 0)
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: 'var(--soft-gray)'}}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{color: 'var(--primary-navy)'}}>
              Mathematics AI Preparation Hub
            </h1>
            <p className="text-lg" style={{color: 'var(--text-secondary)'}}>
              Transform your mathematics content into an intelligent knowledge base
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Link to={createPageUrl("Upload")} className="flex-1 md:flex-none">
              <Button 
                className="w-full font-medium text-white transition-all duration-300 hover:shadow-lg"
                style={{backgroundColor: 'var(--accent-gold)'}}
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Content
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <StatsGrid stats={stats} isLoading={isLoading} />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8 mt-8">
          {/* Recent Books & Processing Queue */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <RecentBooks books={books} isLoading={isLoading} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <ProcessingQueue books={books} isLoading={isLoading} />
            </motion.div>
          </div>

          {/* Side Panel */}
          <div className="space-y-8">
            {/* Insert Wallet above CategoryChart */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <WalletCard />
            </motion.div>

            {/* existing CategoryChart block */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <CategoryChart books={books} isLoading={isLoading} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
