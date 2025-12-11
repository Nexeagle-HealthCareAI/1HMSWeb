import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useMediaUploadApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { Upload, X, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfilePictureUploaderProps {
  currentImageUrl?: string;
  onImageChange?: (imageUrl: string) => void;
  onFileSelect?: (file: File | null) => void;
  onRemove?: () => Promise<void> | void; // Callback for remove action
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  autoUpload?: boolean; // If false, will only preview and not upload immediately
}

export const ProfilePictureUploader: React.FC<ProfilePictureUploaderProps> = ({
  currentImageUrl,
  onImageChange,
  onFileSelect,
  onRemove,
  size = 'md',
  disabled = false,
  className,
  autoUpload = true,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { userId } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const uploadMutation = useMediaUploadApi.uploadProfilePicture();
  const removeMutation = useMediaUploadApi.removeProfilePicture();

  // Size configurations
  const sizeConfig = {
    sm: { avatar: 'h-16 w-16', button: 'h-8 px-3 text-xs', icon: 'h-3 w-3' },
    md: { avatar: 'h-20 w-20', button: 'h-9 px-4 text-sm', icon: 'h-4 w-4' },
    lg: { avatar: 'h-24 w-24', button: 'h-10 px-4 text-sm', icon: 'h-4 w-4' },
  };

  const config = sizeConfig[size];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('profilePictureUploader.errors.invalidTypeTitle'),
        description: t('profilePictureUploader.errors.invalidTypeDescription'),
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: t('profilePictureUploader.errors.fileTooLargeTitle'),
        description: t('profilePictureUploader.errors.fileTooLargeDescription'),
        variant: 'destructive',
      });
      return;
    }

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedFile(file);

    // Notify parent component of file selection
    if (onFileSelect) {
      onFileSelect(file);
    }

    // Upload immediately if autoUpload is enabled
    if (autoUpload) {
      uploadImage(file);
    }
  };

  const uploadImage = async (file: File) => {
    if (!userId) {
      toast({
        title: t('profilePictureUploader.errors.authTitle'),
        description: t('profilePictureUploader.errors.authDescription'),
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const response = await uploadMutation.mutateAsync({
        userId,
        file,
      });

      if (response.success) {
        toast({
          title: t('profilePictureUploader.success.uploadTitle'),
          description: t('profilePictureUploader.success.uploadDescription'),
        });
        
        // Call the callback with the new image URL
        if (onImageChange && response.profilePictureUrl) {
          onImageChange(response.profilePictureUrl);
        }
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: t('profilePictureUploader.errors.uploadFailedTitle'),
        description: error.message || t('profilePictureUploader.errors.uploadFailedDescription'),
        variant: 'destructive',
      });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    // If there's a custom onRemove handler, use it
    if (onRemove) {
      setIsRemoving(true);
      try {
        await onRemove();
      } finally {
        setIsRemoving(false);
      }
      return;
    }

    // If autoUpload is disabled, just clear the preview
    if (!autoUpload) {
      setPreviewUrl(null);
      setSelectedFile(null);
      if (onFileSelect) {
        onFileSelect(null);
      }
      if (onImageChange) {
        onImageChange('');
      }
      return;
    }

    // Otherwise, call the API to remove from server (legacy behavior)
    if (!userId) {
      toast({
        title: t('profilePictureUploader.errors.authTitle'),
        description: t('profilePictureUploader.errors.authDescription'),
        variant: 'destructive',
      });
      return;
    }

    setIsRemoving(true);

    try {
      const response = await removeMutation.mutateAsync(userId);

      if (response.success) {
        toast({
          title: t('profilePictureUploader.success.removeTitle'),
          description: t('profilePictureUploader.success.removeDescription'),
        });
        
        // Clear the preview and notify parent component
        setPreviewUrl(null);
        setSelectedFile(null);
        if (onFileSelect) {
          onFileSelect(null);
        }
        if (onImageChange) {
          onImageChange('');
        }
      } else {
        throw new Error(response.message || 'Remove failed');
      }
    } catch (error: any) {
      console.error('Remove error:', error);
      toast({
        title: t('profilePictureUploader.errors.removeFailedTitle'),
        description: error.message || t('profilePictureUploader.errors.removeFailedDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsRemoving(false);
    }
  };

  // Cleanup preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const displayImageUrl = previewUrl || currentImageUrl;

  return (
    <div className={cn('flex flex-col items-center space-y-3', className)}>
      {/* Avatar */}
      <div className="relative">
        <Avatar className={config.avatar}>
          <AvatarImage src={displayImageUrl} alt={t('profilePictureUploader.alt')} />
          <AvatarFallback>
            <Camera className="h-6 w-6 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        
        {/* Upload overlay */}
        {!disabled && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* Helper text */}
      {!disabled && !displayImageUrl && (
        <p className="text-xs text-muted-foreground text-center">
          {t('profilePictureUploader.helperText')}
        </p>
      )}

      {/* Action buttons */}
      {!disabled && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={cn(config.button, 'gap-2')}
          >
            <Upload className={config.icon} />
            {isUploading ? t('profilePictureUploader.buttons.uploading') : t('profilePictureUploader.buttons.upload')}
          </Button>

          {displayImageUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemoveImage}
              disabled={isUploading || isRemoving}
              className={cn(config.button, 'gap-2')}
            >
              <X className={config.icon} />
              {isRemoving ? t('profilePictureUploader.buttons.removing') : t('profilePictureUploader.buttons.remove')}
            </Button>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Upload/Remove progress indicator */}
      {(isUploading || isRemoving) && (
        <div className="text-xs text-muted-foreground">
          {isUploading ? t('profilePictureUploader.status.uploading') : t('profilePictureUploader.status.removing')}
        </div>
      )}
    </div>
  );
};

