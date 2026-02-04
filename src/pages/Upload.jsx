
import React, { useState } from "react";
import { MathBook } from "@/entities/MathBook";
import { UploadFile, ExtractDataFromUploadedFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Brain, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

import FileUploadArea from "../components/upload/FileUploadArea";
import BookMetadataForm from "../components/upload/BookMetadataForm";
import ProcessingStatus from "../components/upload/ProcessingStatus";
import BatchTxtUploadArea from "../components/upload/BatchTxtUploadArea";
import BatchProcessingStatus from "../components/upload/BatchProcessingStatus";
import BatchMetadataForm from "../components/upload/BatchMetadataForm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function UploadPage() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractedContent, setExtractedContent] = useState(null);
  const [bookMetadata, setBookMetadata] = useState({
    title: '',
    author: '',
    category: '',
    subcategory: '',
    publisher: '',
    year: '',
    isbn: '',
    difficulty_level: ''
  });
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState('upload'); // upload, processing, metadata, completed

  const [batchFiles, setBatchFiles] = useState([]);
  const [batchStep, setBatchStep] = useState('select'); // select, processing, metadata, completed
  const [batchProcessed, setBatchProcessed] = useState([]); // [{title, file_url, content, word_count, page_count}]
  const [batchProgress, setBatchProgress] = useState({ total: 0, processed: 0, currentName: "" });
  const [batchMetadata, setBatchMetadata] = useState({
    author: '',
    category: '',
    subcategory: '',
    difficulty_level: ''
  });

  const handleFileSelect = (file) => {
    const validTypes = ['application/pdf', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a PDF or TXT file');
      return;
    }
    setSelectedFile(file);
    setError(null);
  };

  const processFile = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setCurrentStep('processing');
    setUploadProgress(0);
    setError(null); // Clear previous errors

    try {
      // Upload file
      setUploadProgress(20);
      const { file_url } = await UploadFile({ file: selectedFile });
      
      setUploadProgress(40);

      // Handle TXT files differently - they don't need extraction
      if (selectedFile.type === 'text/plain') {
        setUploadProgress(60);
        
        // For TXT files, we can read the content directly from the URL
        const response = await fetch(file_url);
        const textContent = await response.text();
        
        setUploadProgress(80);

        // Estimate word count for TXT files
        const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;

        setExtractedContent({
          content: textContent,
          file_url,
          word_count: wordCount,
          page_count: Math.ceil(wordCount / 250) // Estimate pages based on ~250 words per page
        });

        // Set book title from filename
        setBookMetadata(prev => ({
          ...prev,
          title: selectedFile.name.replace(/\.txt$/i, '')
        }));

        setUploadProgress(100);
        setCurrentStep('metadata');
      } else {
        // PDF processing (existing logic)
        setIsProcessing(true);

        // Extract content
        const extractionResult = await ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              author: { type: "string" },
              content: { type: "string" },
              page_count: { type: "number" },
              word_count: { type: "number" }
            }
          }
        });

        setUploadProgress(80);

        if (extractionResult.status === "success") {
          setExtractedContent({
            ...extractionResult.output,
            file_url
          });
          
          // Auto-fill metadata if extracted
          if (extractionResult.output.title) {
            setBookMetadata(prev => ({
              ...prev,
              title: extractionResult.output.title
            }));
          }
          if (extractionResult.output.author) {
            setBookMetadata(prev => ({
              ...prev,
              author: extractionResult.output.author
            }));
          }

          setUploadProgress(100);
          setCurrentStep('metadata');
        } else {
          throw new Error("Failed to extract content from PDF");
        }
      }
    } catch (error) {
      setError("Error processing file. Please try again.");
      console.error("Upload error:", error);
      setCurrentStep('upload');
    }

    setIsUploading(false);
    setIsProcessing(false);
  };

  const saveMathBook = async () => {
    try {
      if (!bookMetadata.title || !bookMetadata.category || !extractedContent) {
        setError("Please ensure title, category, and content are present.");
        return;
      }
      await MathBook.create({
        ...bookMetadata,
        file_url: extractedContent.file_url,
        extracted_content: extractedContent.content,
        processing_status: 'completed',
        page_count: extractedContent.page_count,
        word_count: extractedContent.word_count
      });

      setCurrentStep('completed');
      
      // Redirect after a delay
      setTimeout(() => {
        navigate(createPageUrl("Dashboard"));
      }, 2000);
    } catch (error) {
      setError("Error saving book. Please try again.");
      console.error("Save book error:", error);
    }
  };

  const processBatchTxt = async () => {
    const valid = batchFiles.filter(f => f && (f.type === 'text/plain' || (f.name || '').toLowerCase().endsWith('.txt')));
    if (valid.length === 0) {
      setError("No valid TXT files selected for batch processing.");
      return;
    }
    setError(null); // Clear previous errors
    setBatchStep('processing');
    setBatchProgress({ total: valid.length, processed: 0, currentName: "" });
    const results = [];

    try {
      for (let i = 0; i < valid.length; i++) {
        const file = valid[i];
        setBatchProgress(prev => ({ ...prev, currentName: file.name }));
        
        // Upload file
        const { file_url } = await UploadFile({ file });
        
        // Read content
        const resp = await fetch(file_url);
        const text = await resp.text();
        
        // Calculate metrics
        const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
        const pageCount = Math.ceil(wordCount / 250); // Estimate pages based on ~250 words per page
        const title = (file.name || 'Document').replace(/\.txt$/i, '');

        results.push({ title, file_url, content: text, word_count: wordCount, page_count: pageCount });
        setBatchProgress(prev => ({ ...prev, processed: prev.processed + 1 }));
      }

      setBatchProcessed(results);
      setBatchStep('metadata');
    } catch (error) {
      setError("Error processing batch files. Please try again.");
      console.error("Batch processing error:", error);
      setBatchStep('select');
      setBatchProcessed([]); // Clear processed files on error
    }
  };

  const saveBatchBooks = async () => {
    if (!batchMetadata.category) {
      setError("Please select a category for all books.");
      return;
    }
    setError(null); // Clear previous errors
    try {
      const payload = batchProcessed.map(item => ({
        title: item.title,
        author: batchMetadata.author || '',
        category: batchMetadata.category,
        subcategory: batchMetadata.subcategory || '',
        file_url: item.file_url,
        extracted_content: item.content,
        processing_status: 'completed',
        page_count: item.page_count,
        word_count: item.word_count,
        difficulty_level: batchMetadata.difficulty_level || ''
      }));

      if (MathBook.bulkCreate) {
        await MathBook.bulkCreate(payload);
      } else {
        // Fallback for when bulkCreate is not available
        for (const p of payload) {
          await MathBook.create(p);
        }
      }
      setBatchStep('completed');
      setTimeout(() => {
        navigate(createPageUrl("Dashboard"));
      }, 2000);
    } catch (error) {
      setError("Error saving batch books. Please try again.");
      console.error("Batch save error:", error);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: 'var(--soft-gray)'}}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="hover:shadow-md transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold" style={{color: 'var(--primary-navy)'}}>
              Upload Mathematics Content
            </h1>
            <p className="text-lg mt-1" style={{color: 'var(--text-secondary)'}}>
              Add books and training data to your AI library
            </p>
          </div>
        </motion.div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabs for Single vs Batch */}
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="single">Single Upload</TabsTrigger>
            <TabsTrigger value="batch">Batch TXT Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            {/* Upload Steps */}
            {currentStep === 'upload' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <FileUploadArea 
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                />
                {selectedFile && (
                  <div className="mt-6 text-center">
                    <Button 
                      onClick={processFile}
                      className="text-white font-medium px-8 py-3 text-lg"
                      style={{backgroundColor: 'var(--accent-gold)'}}
                      disabled={isUploading}
                    >
                      <Brain className="w-5 h-5 mr-2" />
                      {selectedFile.type === 'text/plain' ? 'Process Text for AI Training' : 'Process Book for AI Training'}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {currentStep === 'processing' && (
              <ProcessingStatus 
                progress={uploadProgress}
                isProcessing={isProcessing}
                fileName={selectedFile?.name}
              />
            )}

            {currentStep === 'metadata' && (
              <BookMetadataForm 
                metadata={bookMetadata}
                onChange={setBookMetadata}
                onSave={saveMathBook}
                extractedContent={extractedContent}
              />
            )}

            {currentStep === 'completed' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <Card className="max-w-md mx-auto shadow-lg">
                  <CardContent className="pt-8 pb-8">
                    <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                         style={{backgroundColor: 'var(--light-gold)'}}>
                      <BookOpen className="w-8 h-8" style={{color: 'var(--accent-gold)'}} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--primary-navy)'}}>
                      Content Added Successfully!
                    </h2>
                    <p style={{color: 'var(--text-secondary)'}}>
                      Your mathematics content is now ready for AI training
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="batch">
            {/* Batch flow */}
            {batchStep === 'select' && (
              <>
                <BatchTxtUploadArea files={batchFiles} onFilesChange={setBatchFiles} />
                {batchFiles.length > 0 && (
                  <div className="mt-6 text-center">
                    <Button
                      onClick={processBatchTxt}
                      className="text-white font-medium px-8 py-3 text-lg"
                      style={{backgroundColor: 'var(--accent-gold)'}}
                    >
                      <Brain className="w-5 h-5 mr-2" />
                      Process {batchFiles.length} TXT file{batchFiles.length > 1 ? 's' : ''}
                    </Button>
                  </div>
                )}
              </>
            )}

            {batchStep === 'processing' && (
              <BatchProcessingStatus
                total={batchProgress.total}
                processed={batchProgress.processed}
                currentName={batchProgress.currentName}
              />
            )}

            {batchStep === 'metadata' && (
              <BatchMetadataForm
                metadata={batchMetadata}
                onChange={setBatchMetadata}
                onSave={saveBatchBooks}
                filesCount={batchProcessed.length}
              />
            )}

            {batchStep === 'completed' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                <Card className="max-w-md mx-auto shadow-lg">
                  <CardContent className="pt-8 pb-8">
                    <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                         style={{backgroundColor: 'var(--light-gold)'}}>
                      <BookOpen className="w-8 h-8" style={{color: 'var(--accent-gold)'}} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--primary-navy)'}}>
                      Uploaded {batchProcessed.length} TXT file{batchProcessed.length > 1 ? 's' : ''}!
                    </h2>
                    <p style={{color: 'var(--text-secondary)'}}>All items are saved and ready for AI training.</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
