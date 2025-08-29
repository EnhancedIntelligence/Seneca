"use client";

import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  X,
  Video,
  FileImage,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface MediaUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  onProgress: (progress: number) => void;
  maxFiles?: number;
  accept?: string;
  className?: string;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  url?: string;
  error?: string;
}

export function MediaUpload({
  value = [],
  onChange,
  onProgress,
  maxFiles = 10,
  accept = "image/*,video/*",
  className,
}: MediaUploadProps) {
  const { toast } = useToast();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      // Validation: Check file count
      if (value.length + fileArray.length > maxFiles) {
        toast({
          title: "Too many files",
          description: `Maximum ${maxFiles} files allowed. You can upload ${maxFiles - value.length} more.`,
          variant: "destructive",
        });
        return;
      }

      // Validation: Check file types and sizes
      const validFiles: File[] = [];
      const errors: string[] = [];

      for (const file of fileArray) {
        // Check file type
        if (
          !accept.split(",").some((type) => {
            const cleanType = type.trim();
            if (cleanType === "image/*") return file.type.startsWith("image/");
            if (cleanType === "video/*") return file.type.startsWith("video/");
            return file.type === cleanType;
          })
        ) {
          errors.push(`${file.name}: Invalid file type`);
          continue;
        }

        // Check file size (50MB max for videos, 10MB for images)
        const maxSize = file.type.startsWith("video/")
          ? 50 * 1024 * 1024
          : 10 * 1024 * 1024;
        if (file.size > maxSize) {
          const maxSizeMB = maxSize / 1024 / 1024;
          errors.push(`${file.name}: File too large (max ${maxSizeMB}MB)`);
          continue;
        }

        validFiles.push(file);
      }

      if (errors.length > 0) {
        toast({
          title: "Some files couldn't be uploaded",
          description: errors.join("\n"),
          variant: "destructive",
        });
      }

      if (validFiles.length === 0) return;

      // Create upload entries
      const newUploads: UploadingFile[] = validFiles.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        progress: 0,
        status: "uploading",
      }));

      setUploadingFiles((prev) => [...prev, ...newUploads]);

      // Upload files
      const uploadPromises = newUploads.map((uploadItem) =>
        uploadFile(uploadItem),
      );

      try {
        await Promise.all(uploadPromises);
      } catch (error) {
        console.error("Upload error:", error);
      }
    },
    [value.length, maxFiles, accept, toast],
  );

  const uploadFile = async (uploadItem: UploadingFile): Promise<void> => {
    try {
      const { file } = uploadItem;

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const extension = file.name.split(".").pop();
      const filename = `memories/${timestamp}-${randomId}.${extension}`;

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from("media")
        .upload(filename, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("media")
        .getPublicUrl(filename);

      const publicUrl = publicUrlData.publicUrl;

      // Update upload status
      setUploadingFiles((prev) =>
        prev.map((item) =>
          item.id === uploadItem.id
            ? { ...item, status: "completed", progress: 100, url: publicUrl }
            : item,
        ),
      );

      // Add to form values
      onChange([...value, publicUrl]);

      // Update overall progress
      const completedCount =
        uploadingFiles.filter((f) => f.status === "completed").length + 1;
      const totalProgress = (completedCount / uploadingFiles.length) * 100;
      onProgress(totalProgress);
    } catch (error) {
      console.error("File upload error:", error);

      setUploadingFiles((prev) =>
        prev.map((item) =>
          item.id === uploadItem.id
            ? {
                ...item,
                status: "error",
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : item,
        ),
      );

      toast({
        title: "Upload failed",
        description: `Failed to upload ${uploadItem.file.name}`,
        variant: "destructive",
      });
    }
  };

  const removeFile = (url: string) => {
    onChange(value.filter((u) => u !== url));

    // Also remove from uploading files if it's there
    setUploadingFiles((prev) => prev.filter((f) => f.url !== url));
  };

  const removeUploadingFile = (id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files);
      }
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("video/")) {
      return <Video className="h-4 w-4" />;
    }
    return <FileImage className="h-4 w-4" />;
  };

  const getMediaPreview = (url: string) => {
    const isVideo =
      url.includes("video") || url.includes(".mp4") || url.includes(".mov");

    if (isVideo) {
      return (
        <video
          src={url}
          className="w-full h-24 object-cover rounded"
          controls={false}
          muted
        />
      );
    }

    return (
      <img
        src={url}
        alt="Uploaded media"
        className="w-full h-24 object-cover rounded"
      />
    );
  };

  return (
    <div className={className}>
      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload Photos & Videos</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop your files here, or click to select
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Choose Files
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Support images and videos up to {maxFiles} files
          </p>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium">Uploading Files</h4>
          {uploadingFiles.map((item) => (
            <Card key={item.id} className="p-3">
              <div className="flex items-center gap-3">
                {getFileIcon(item.file)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(item.file.size)}
                  </p>
                  {item.status === "uploading" && (
                    <Progress value={item.progress} className="h-1 mt-1" />
                  )}
                  {item.status === "error" && (
                    <p className="text-xs text-destructive mt-1">
                      {item.error}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {item.status === "uploading" && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {item.status === "completed" && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {item.status === "error" && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUploadingFile(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Uploaded Files */}
      {value.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium">
            Uploaded Files ({value.length}/{maxFiles})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {value.map((url, index) => (
              <Card key={url} className="relative group overflow-hidden">
                <CardContent className="p-0">
                  {getMediaPreview(url)}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(url)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <Badge
                    variant="secondary"
                    className="absolute bottom-1 left-1 text-xs"
                  >
                    {index + 1}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
