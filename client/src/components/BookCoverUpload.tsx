import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useUpload } from "@/hooks/use-upload";
import { ImagePlus, Loader2, Check } from "lucide-react";
import type { Book } from "@shared/schema";

interface BookCoverUploadProps {
  book: Book;
  childId: string;
  onSuccess?: () => void;
}

export function BookCoverUpload({ book, childId, onSuccess }: BookCoverUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useUpload();

  const updateCoverMutation = useMutation({
    mutationFn: async (coverUrl: string) => {
      return apiRequest("PATCH", `/api/books/${book.id}/cover`, { coverUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children", childId, "book-readiness"] });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/preset-books"] });
      toast({
        title: "Cover Updated",
        description: "Book cover has been updated successfully",
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update book cover",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    const uploadResponse = await uploadFile(file);
    if (uploadResponse) {
      updateCoverMutation.mutate(uploadResponse.objectPath);
    } else {
      toast({
        title: "Upload Failed",
        description: "Could not upload the image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isPending = isUploading || updateCoverMutation.isPending;

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        data-testid="input-cover-upload"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isPending}
        className="w-full gap-2"
        data-testid="button-upload-cover"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {isUploading ? `Uploading ${progress}%` : "Saving..."}
          </>
        ) : (
          <>
            <ImagePlus className="h-4 w-4" />
            Upload Custom Cover
          </>
        )}
      </Button>
    </div>
  );
}
