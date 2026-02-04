
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BookOpen, Save } from "lucide-react";
import { motion } from "framer-motion";

const CATEGORIES = [
  { value: "algebra", label: "Algebra" },
  { value: "calculus", label: "Calculus" },
  { value: "geometry", label: "Geometry" },
  { value: "topology", label: "Topology" },
  { value: "analysis", label: "Analysis" },
  { value: "number_theory", label: "Number Theory" },
  { value: "statistics", label: "Statistics" },
  { value: "probability", label: "Probability" },
  { value: "discrete_math", label: "Discrete Mathematics" },
  { value: "linear_algebra", label: "Linear Algebra" },
  { value: "differential_equations", label: "Differential Equations" },
  { value: "abstract_algebra", label: "Abstract Algebra" },
  { value: "mathematical_logic", label: "Mathematical Logic" },
  { value: "other", label: "Other" }
];

const DIFFICULTY_LEVELS = [
  { value: "undergraduate", label: "Undergraduate" },
  { value: "graduate", label: "Graduate" },
  { value: "research", label: "Research" },
  { value: "reference", label: "Reference" }
];

export default function BookMetadataForm({ metadata, onChange, onSave, extractedContent }) {
  const handleChange = (field, value) => {
    onChange(prev => ({ ...prev, [field]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-white border-b">
          <CardTitle className="flex items-center gap-2 text-xl font-bold"
                     style={{color: 'var(--primary-navy)'}}>
            <BookOpen className="w-5 h-5" />
            Content Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Content Title *</Label>
              <Input
                id="title"
                value={metadata.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Enter title or description"
                className="border-gray-200 focus:border-amber-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author(s)</Label>
              <Input
                id="author"
                value={metadata.author}
                onChange={(e) => handleChange('author', e.target.value)}
                placeholder="Enter author names"
                className="border-gray-200 focus:border-amber-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Subject Category *</Label>
              <Select value={metadata.category} onValueChange={(value) => handleChange('category', value)}>
                <SelectTrigger className="border-gray-200 focus:border-amber-500">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory</Label>
              <Input
                id="subcategory"
                value={metadata.subcategory}
                onChange={(e) => handleChange('subcategory', e.target.value)}
                placeholder="Specific topic (e.g., Real Analysis)"
                className="border-gray-200 focus:border-amber-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publisher">Publisher</Label>
              <Input
                id="publisher"
                value={metadata.publisher}
                onChange={(e) => handleChange('publisher', e.target.value)}
                placeholder="Publisher name"
                className="border-gray-200 focus:border-amber-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Publication Year</Label>
              <Input
                id="year"
                type="number"
                value={metadata.year}
                onChange={(e) => handleChange('year', parseInt(e.target.value))}
                placeholder="e.g., 2023"
                className="border-gray-200 focus:border-amber-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="isbn">ISBN</Label>
              <Input
                id="isbn"
                value={metadata.isbn}
                onChange={(e) => handleChange('isbn', e.target.value)}
                placeholder="ISBN number"
                className="border-gray-200 focus:border-amber-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select value={metadata.difficulty_level} onValueChange={(value) => handleChange('difficulty_level', value)}>
                <SelectTrigger className="border-gray-200 focus:border-amber-500">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {extractedContent && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2" style={{color: 'var(--primary-navy)'}}>
                Content Summary
              </h4>
              <div className="text-sm space-y-1" style={{color: 'var(--text-secondary)'}}>
                <p>Estimated Pages: {extractedContent.page_count || 'Unknown'}</p>
                <p>Word Count: {extractedContent.word_count?.toLocaleString() || 'Unknown'}</p>
                <p>Content processed and ready for AI training</p>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <Button 
              onClick={onSave}
              className="text-white font-medium px-8 py-3"
              style={{backgroundColor: 'var(--accent-gold)'}}
              disabled={!metadata.title || !metadata.category}
            >
              <Save className="w-5 h-5 mr-2" />
              Save to AI Library
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
