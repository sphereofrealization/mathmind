import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";

const COLORS = [
  '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6',
  '#f97316', '#ec4899', '#06b6d4', '#84cc16', '#6366f1'
];

export default function CategoryChart({ books, isLoading }) {
  const getCategoryData = () => {
    const categoryCount = {};
    books.forEach(book => {
      const category = book.category || 'other';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    return Object.entries(categoryCount).map(([category, count], index) => ({
      name: category.replace(/_/g, ' '),
      value: count,
      color: COLORS[index % COLORS.length]
    }));
  };

  const data = getCategoryData();

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="border-b bg-white">
        <CardTitle className="flex items-center gap-2 text-xl font-bold" 
                   style={{color: 'var(--primary-navy)'}}>
          <TrendingUp className="w-5 h-5" />
          Subject Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded" />
            <div className="space-y-2">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 mx-auto mb-4" style={{color: 'var(--text-secondary)'}} />
            <p style={{color: 'var(--text-secondary)'}}>
              Upload books to see distribution
            </p>
          </div>
        ) : (
          <>
            <div className="h-48 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {data.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{backgroundColor: entry.color}}
                    />
                    <span className="capitalize" style={{color: 'var(--primary-navy)'}}>
                      {entry.name}
                    </span>
                  </div>
                  <span className="font-medium" style={{color: 'var(--accent-gold)'}}>
                    {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}