import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X, Image as ImageIcon, Upload } from "lucide-react";

interface ImageUploaderProps {
  images: File[];
  onImagesChange: (images: File[]) => void;
  maxImages?: number;
}

export function ImageUploader({ images, onImagesChange, maxImages = 20 }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files).filter(
      (file) => file.type.startsWith("image/")
    );
    
    const combined = [...images, ...newFiles].slice(0, maxImages);
    onImagesChange(combined);
  }, [images, onImagesChange, maxImages]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeImage = useCallback((index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  }, [images, onImagesChange]);

  return (
    <div className="space-y-4">
      <div
        className={`relative min-h-48 border-2 border-dashed rounded-lg transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-testid="dropzone-images"
      >
        <input
          type="file"
          accept="image/*"
          multiple
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => handleFileSelect(e.target.files)}
          data-testid="input-file-upload"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Camera className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-foreground text-center">
            Tap to upload pages
          </p>
          <p className="text-sm text-muted-foreground text-center mt-1">
            or drag and drop images here
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Up to {maxImages} images
          </p>
        </div>
      </div>

      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {images.length} {images.length === 1 ? "page" : "pages"} uploaded
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onImagesChange([])}
              data-testid="button-clear-images"
            >
              Clear all
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {images.map((file, index) => (
              <Card key={index} className="relative aspect-square overflow-hidden group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Page ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                  data-testid={`button-remove-image-${index}`}
                >
                  <X className="h-3 w-3" />
                </Button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1">
                  Page {index + 1}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
