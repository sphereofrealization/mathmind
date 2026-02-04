import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, FileText, Clock, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const StatCard = ({ title, value, icon: Icon, bgGradient, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, delay }}
  >
    <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className={`absolute inset-0 ${bgGradient} opacity-5`} />
      <CardContent className="p-6 relative">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>
              {title}
            </p>
            <p className="text-3xl font-bold" style={{color: 'var(--primary-navy)'}}>
              {value}
            </p>
          </div>
          <div className={`p-3 rounded-xl ${bgGradient} bg-opacity-15`}>
            <Icon className="w-6 h-6" style={{color: 'var(--accent-gold)'}} />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function StatsGrid({ stats, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array(4).fill(0).map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Total Books"
        value={stats.totalBooks}
        icon={BookOpen}
        bgGradient="bg-gradient-to-br from-blue-500 to-blue-600"
        delay={0}
      />
      <StatCard
        title="Processed"
        value={stats.processedBooks}
        icon={FileText}
        bgGradient="bg-gradient-to-br from-green-500 to-green-600"
        delay={0.1}
      />
      <StatCard
        title="In Progress"
        value={stats.inProgress}
        icon={Clock}
        bgGradient="bg-gradient-to-br from-amber-500 to-amber-600"
        delay={0.2}
      />
      <StatCard
        title="Total Words"
        value={stats.totalWords.toLocaleString()}
        icon={Target}
        bgGradient="bg-gradient-to-br from-purple-500 to-purple-600"
        delay={0.3}
      />
    </div>
  );
}