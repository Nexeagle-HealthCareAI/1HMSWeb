import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, ImagePlus, Plus, Minus, RotateCcw, Trash2, Upload } from 'lucide-react';
import Cropper from 'react-easy-crop';
import imageCompression from 'browser-image-compression';

type ProfilePhotoUploaderProps = {
  initialUrl?: string;
  disabled?: boolean;
  buttonVariant?: 'icon' | 'text' | 'link';
  onChange: (previewUrl: string) => void; // optimistic preview
  onUploaded?: (urls: { thumb: string; medium: string; full: string; objectKey?: string }) => void;
  onRemoved?: () => void;
};

const FRAME_SIZE = 320;
const OUTPUT_SIZE = 512; // square avatar
const MAX_FILE_MB = 10;

export const ProfilePhotoUploader: React.FC<ProfilePhotoUploaderProps> = ({ initialUrl, disabled, buttonVariant = 'icon', onChange, onUploaded, onRemoved }) => {
  const [open, setOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | undefined>(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Cropper state
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const onCropComplete = useCallback((_: any, areaPixels: { x: number; y: number; width: number; height: number }) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const validateFile = async (file: File): Promise<string | null> => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return null;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File is too large. Max ${MAX_FILE_MB}MB.`);
      return null;
    }
    // Quick dimensions check
    const objUrl = URL.createObjectURL(file);
    const ok = await new Promise<boolean>((resolve) => {
      const im = new Image();
      im.onload = () => resolve(im.width >= 256 && im.height >= 256);
      im.onerror = () => resolve(false);
      im.src = objUrl;
    });
    URL.revokeObjectURL(objUrl);
    if (!ok) {
      setError('Image is too small. Minimum 256x256.');
      return null;
    }
    // Orientation fix + light compression for preview
    try {
      const processed = await imageCompression(file, { useWebWorker: true, maxSizeMB: 5, maxWidthOrHeight: 4096, initialQuality: 0.92 });
      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.readAsDataURL(processed);
      });
      return dataUrl;
    } catch {
      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.readAsDataURL(file);
      });
      return dataUrl;
    }
  };

  const onFileSelected = async (file?: File) => {
    if (!file) return;
    const dataUrl = await validateFile(file);
    if (!dataUrl) return;
    setImageSrc(dataUrl);
    setOpen(true);
  };

  const createImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (e) => reject(e));
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = url;
  });

  const getCroppedCanvasBlob = async (): Promise<Blob | null> => {
    if (!imageSrc || !croppedAreaPixels) return null;
    const img = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // draw square crop
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      img,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );

    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92));
  };

  const performCropAndUpload = async () => {
    try {
      const blob = await getCroppedCanvasBlob();
      if (!blob) return;

      // optimistic preview for UI immediacy
      const preview = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.readAsDataURL(blob);
      });
      onChange(preview);

      // compress for network
      const compressed = await imageCompression(blob, { useWebWorker: true, maxSizeMB: 0.3, maxWidthOrHeight: OUTPUT_SIZE, initialQuality: 0.9 });

      setIsUploading(true);
      setError(null);
      const controller = new AbortController();
      abortRef.current = controller;

      const { profilePhotoService } = await import('../services/profilePhotoService');
      const init = await profilePhotoService.upload(compressed, controller.signal, (p) => setUploadProgress(p));
      const finalized = await profilePhotoService.finalize(init.objectKey);
      onUploaded?.({ ...finalized.urls, objectKey: init.objectKey });
      setOpen(false);
      setUploadProgress(0);
    } catch (e: any) {
      setError(e?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      abortRef.current = null;
    }
  };

  const resetView = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const onPaste: React.ClipboardEventHandler<HTMLDivElement> = async (e) => {
    if (disabled) return;
    const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (file) onFileSelected(file);
  };

  const Trigger = (
    <Button
      type="button"
      variant={buttonVariant === 'icon' ? 'outline' : buttonVariant === 'link' ? 'link' : 'default'}
      size={buttonVariant === 'icon' ? 'sm' : 'default'}
      disabled={disabled}
      className={buttonVariant === 'icon' ? 'rounded-full p-2' : buttonVariant === 'link' ? 'p-0 h-auto' : ''}
      onClick={() => setOpen(true)}
      aria-label="Change profile photo"
    >
      {buttonVariant === 'icon' ? (
        <Camera className="h-4 w-4" />
      ) : (
        <span className="inline-flex items-center gap-2">
          <ImagePlus className="h-4 w-4" /> Change photo
        </span>
      )}
    </Button>
  );

  return (
    <div>
      <Input ref={inputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => onFileSelected(e.target.files?.[0])} />
      {Trigger}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl" onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFileSelected(f); }} onDragOver={(e) => e.preventDefault()} onPaste={onPaste}>
          <DialogHeader>
            <DialogTitle>Adjust profile photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative h-[360px] w-full bg-muted rounded">
              {imageSrc ? (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  restrictPosition
                  minZoom={1}
                  maxZoom={4}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  Drag & drop, paste, or click Choose to add a photo
                </div>
              )}
            </div>

            {error && <p className="text-xs text-red-600" role="alert" aria-live="polite">{error}</p>}

            {isUploading && (
              <div className="space-y-1" aria-live="polite">
                <div className="h-2 bg-muted rounded">
                  <div className="h-2 bg-primary rounded" style={{ width: `${uploadProgress}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(4, +(z + 0.1).toFixed(2)))} aria-label="Zoom in">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))} aria-label="Zoom out">
                  <Minus className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={resetView} aria-label="Reset view">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {isUploading ? (
                  <Button type="button" variant="outline" onClick={() => { abortRef.current?.abort(); setIsUploading(false); }}>Cancel upload</Button>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                )}
                <Button type="button" onClick={performCropAndUpload} disabled={!imageSrc || isUploading}>Apply</Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Input id="file" type="file" accept="image/*" capture="user" onChange={(e) => onFileSelected(e.target.files?.[0])} />
                <Button type="button" variant="secondary" onClick={() => document.getElementById('file')?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Choose
                </Button>
              </div>
              {onRemoved && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={async () => {
                    try {
                      const { profilePhotoService } = await import('../services/profilePhotoService');
                      const res = await profilePhotoService.remove();
                      if (res.success) {
                        onRemoved();
                        setImageSrc(undefined);
                        setOpen(false);
                      }
                    } catch (e: any) {
                      setError(e?.message || 'Failed to remove');
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Remove photo
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePhotoUploader;


