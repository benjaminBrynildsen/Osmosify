import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AppHeader } from "@/components/AppHeader";
import { ImageUploader } from "@/components/ImageUploader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, FileText, Wand2, Check, AlertCircle, Eye, EyeOff } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Child } from "@shared/schema";
import { cleanOcrText, getCleaningStats } from "@shared/ocrCleaning";

// Convert file to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function UploadSession() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const childId = params.id;
  const { toast } = useToast();

  const [images, setImages] = useState<File[]>([]);
  const [bookTitle, setBookTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [cleanedText, setCleanedText] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [cleaningStats, setCleaningStats] = useState<{ rawWordCount: number; cleanedWordCount: number; percentageKept: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrComplete, setOcrComplete] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");

  const { data: child } = useQuery<Child>({
    queryKey: ["/api/children", childId],
  });

  const processSessionMutation = useMutation({
    mutationFn: async (data: { bookTitle: string; extractedText: string }) => {
      const response = await apiRequest("POST", `/api/children/${childId}/sessions`, data);
      return response.json();
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["/api/children", childId, "sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/children", childId, "words"] });
      queryClient.invalidateQueries({ queryKey: ["/api/children/word-counts"] });
      toast({
        title: "Session saved!",
        description: `Found ${session.newWordsCount} new words.`,
      });
      setLocation(`/session/${session.id}`);
    },
    onError: () => {
      toast({
        title: "Failed to save session",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleOCR = async () => {
    if (images.length === 0) {
      toast({
        title: "No images",
        description: "Please upload at least one page.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Convert images to base64 for server-side processing
      const imageData = await Promise.all(
        images.map(async (file) => ({
          base64: await fileToBase64(file),
          mimeType: file.type || "image/jpeg",
        }))
      );

      // Send to server for Gemini-powered OCR
      const response = await apiRequest("POST", "/api/ocr", { images: imageData });
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "OCR failed");
      }

      const extractedText = result.text || "";
      setRawText(extractedText);
      
      // The Gemini OCR is much cleaner, but still apply light cleaning
      const cleaned = cleanOcrText(extractedText);
      setCleanedText(cleaned || extractedText); // Use raw if cleaning removes everything
      
      // Calculate stats for user feedback
      const stats = getCleaningStats(extractedText, cleaned || extractedText);
      setCleaningStats(stats);
      
      setOcrComplete(true);
      setActiveTab("review");
      toast({
        title: "Text extracted!",
        description: `Found ${(cleaned || extractedText).split(/\s+/).filter((w: string) => w.length > 0).length} words.`,
      });
    } catch (error) {
      console.error("OCR error:", error);
      toast({
        title: "OCR failed",
        description: "Could not extract text from images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    const textToSave = showRaw ? rawText : cleanedText;
    if (!textToSave.trim()) {
      toast({
        title: "No text",
        description: "Please extract or enter some text first.",
        variant: "destructive",
      });
      return;
    }
    processSessionMutation.mutate({
      bookTitle: bookTitle || "Reading Session",
      extractedText: textToSave.trim(),
    });
  };
  
  const displayText = showRaw ? rawText : cleanedText;
  const setDisplayText = (text: string) => {
    if (showRaw) {
      setRawText(text);
    } else {
      setCleanedText(text);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader
        title="New Session"
        showBack
        backPath={`/child/${childId}`}
      />

      <main className="container mx-auto max-w-2xl p-4 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <Label htmlFor="bookTitle">Book Title (optional)</Label>
            <Input
              id="bookTitle"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              placeholder="Enter the book name..."
              className="mt-2"
              data-testid="input-book-title"
            />
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-2" data-testid="tab-upload">
              <Camera className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="review" className="gap-2" data-testid="tab-review">
              <FileText className="h-4 w-4" />
              Review
              {ocrComplete && <Check className="h-3 w-3 text-emerald-500" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4 space-y-4">
            <ImageUploader
              images={images}
              onImagesChange={setImages}
              maxImages={20}
            />

            <Button
              className="w-full h-12"
              onClick={handleOCR}
              disabled={images.length === 0 || isProcessing}
              data-testid="button-process-ocr"
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Processing pages...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Extract Text ({images.length} {images.length === 1 ? "page" : "pages"})
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="review" className="mt-4 space-y-4">
            {!cleanedText && !ocrComplete ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Upload and process images first to see extracted text here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {cleaningStats && (
                  <Card className="bg-muted/50">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Cleaned: {cleaningStats.cleanedWordCount} words kept ({cleaningStats.percentageKept}%)
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowRaw(!showRaw)}
                          data-testid="button-toggle-raw"
                        >
                          {showRaw ? (
                            <>
                              <Eye className="h-4 w-4 mr-1" />
                              Show Clean
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-4 w-4 mr-1" />
                              Show Raw
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>{showRaw ? "Raw OCR Text" : "Cleaned Text"}</Label>
                    <span className="text-xs text-muted-foreground">
                      {showRaw ? "Unprocessed OCR output" : "Edit to add or remove words"}
                    </span>
                  </div>
                  <Textarea
                    value={displayText}
                    onChange={(e) => setDisplayText(e.target.value)}
                    placeholder="Extracted text will appear here..."
                    className="min-h-64 font-mono text-sm"
                    data-testid="textarea-extracted-text"
                  />
                </div>

                <Button
                  className="w-full h-12"
                  onClick={handleSave}
                  disabled={!displayText.trim() || processSessionMutation.isPending}
                  data-testid="button-save-session"
                >
                  {processSessionMutation.isPending ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Processing words...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save Session
                    </>
                  )}
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
