import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SignatureUploaderProps {
  dataUrl?: string;
  onUpload: (dataUrl: string) => void;
  onRemove: () => void;
}

export const SignatureUploader: React.FC<SignatureUploaderProps> = ({
  dataUrl,
  onUpload,
  onRemove
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      alert('Please select a PNG or JPEG image');
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onUpload(result);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {dataUrl ? (
        <div className="space-y-2">
          <div className="relative inline-block">
            <img
              src={dataUrl}
              alt="Signature preview"
              className="max-w-full h-20 object-contain border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 p-0"
              onClick={onRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Signature uploaded successfully
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleUploadClick}
            className="w-full"
          >
            Upload Signature
          </Button>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            PNG or JPEG, max 2MB
          </p>
        </div>
      )}
    </div>
  );
};
