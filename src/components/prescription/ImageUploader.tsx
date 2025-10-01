import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaUploadApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  value?: string;
  onChange: (image: string | undefined) => void;
  placeholder?: string;
  className?: string;
  useApi?: boolean; // If true, will upload to server instead of base64
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  placeholder = 'Drop image here or click to upload',
  className = '',
  useApi = true, // Default to using API
}) => {
  const { toast } = useToast();
  const user = useAuthStore((state) => state.user);
  const doctorId = user?.doctorId;
  const [isUploading, setIsUploading] = useState(false);
  
  const uploadMutation = useMediaUploadApi.uploadPrescriptionAsset();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast({
          title: 'File too large',
          description: 'Please select an image smaller than 5MB',
          variant: 'destructive',
        });
        return;
      }

      // If useApi is true and doctorId exists, upload to server
      if (useApi && doctorId) {
        setIsUploading(true);
        try {
          const response = await uploadMutation.mutateAsync({
            doctorId,
            file,
          });

          if (response.success && response.imageUrl) {
            onChange(response.imageUrl);
            toast({
              title: 'Success',
              description: 'Image uploaded successfully',
            });
          } else {
            throw new Error('Upload failed');
          }
        } catch (error: any) {
          console.error('Upload error:', error);
          toast({
            title: 'Upload failed',
            description: error.message || 'Failed to upload image. Please try again.',
            variant: 'destructive',
          });
        } finally {
          setIsUploading(false);
        }
      } else {
        // Fallback to base64 conversion
        const reader = new FileReader();
        reader.onload = () => {
          onChange(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
    [onChange, useApi, doctorId, uploadMutation, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    multiple: false,
  });

  const handleRemove = () => {
    onChange(undefined);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {value ? (
        <div className="relative">
          <img
            src={value}
            alt="Uploaded"
            className="w-full h-24 object-cover rounded-lg border border-gray-200"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-1 right-1 h-6 w-6 p-0"
            onClick={handleRemove}
            disabled={isUploading}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
            ${isDragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} disabled={isUploading} />
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 mx-auto mb-2 text-blue-500 animate-spin" />
              <p className="text-sm text-blue-600">Uploading...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">{placeholder}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};
