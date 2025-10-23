import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaUploadApi } from '@/hooks/useApi';
import { useToast } from '@/hooks/use-toast';

interface PrescriptionAssetUploaderProps {
  value?: string;
  onChange: (image: string | undefined) => void;
  placeholder?: string;
  className?: string;
  assetType: 'header_image' | 'footer_image' | 'signature_image';
  doctorId: string;
  prescriptionSettingId: string;
  onUploadSuccess?: () => void;
  assetId?: string;
  blobAssetId?: string;
}

export const PrescriptionAssetUploader: React.FC<PrescriptionAssetUploaderProps> = ({
  value,
  onChange,
  placeholder = 'Drop image here or click to upload',
  className = '',
  assetType,
  doctorId,
  prescriptionSettingId,
  onUploadSuccess,
  assetId,
  blobAssetId,
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const uploadMutation = useMediaUploadApi.uploadPrescriptionAsset();
  const deleteMutation = useMediaUploadApi.deletePrescriptionAsset();

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

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please select a valid image file (JPEG, PNG, GIF, WebP)',
          variant: 'destructive',
        });
        return;
      }

      setIsUploading(true);
      try {
        const processedFile = file;


        const response = await uploadMutation.mutateAsync({
          doctorId,
          file: processedFile,
          assetType,
          prescriptionSettingId,
        });

        if (response.success && response.assestUrl) {
          onChange(response.assestUrl);
          toast({
            title: 'Success',
            description: `${assetType.replace('_', ' ')} uploaded successfully`,
          });
          // Call the success callback to refresh assets
          onUploadSuccess?.();
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
    },
    [onChange, doctorId, assetType, prescriptionSettingId, uploadMutation, toast, onUploadSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    multiple: false,
  });

  const handleRemove = async () => {
    // If we have asset IDs, call the delete API
    if (assetId && blobAssetId) {
      setIsDeleting(true);
      try {
        const response = await deleteMutation.mutateAsync({
          prescriptionAssestId: assetId,
          blobAssetId: blobAssetId,
        });

        if (response.success) {
          onChange(undefined);
          toast({
            title: 'Success',
            description: `${assetType.replace('_', ' ')} removed successfully`,
          });
          // Call the success callback to refresh assets
          onUploadSuccess?.();
        } else {
          throw new Error('Delete failed');
        }
      } catch (error: any) {
        console.error('Delete error:', error);
        toast({
          title: 'Delete failed',
          description: error.message || 'Failed to delete image. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsDeleting(false);
      }
    } else {
      // Fallback to just clearing the local state
      onChange(undefined);
    }
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
            disabled={isUploading || isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <X className="h-3 w-3" />
            )}
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
            ${isUploading || isDeleting ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} disabled={isUploading || isDeleting} />
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 mx-auto mb-2 text-blue-500 animate-spin" />
              <p className="text-sm text-blue-600">
                Uploading...
              </p>
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
