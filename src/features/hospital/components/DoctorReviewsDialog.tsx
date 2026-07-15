import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { doctorReviewsApi, type AdminReviewItem } from '../services/doctorReviewsApi';
import type { PublicDirectoryDoctorTile } from '../services/publicDirectoryDoctorsApi';
import { Building2, Loader2, MessageSquare, Send, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DoctorReviewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: PublicDirectoryDoctorTile | null;
  hospitalId: string;
  // Hiding/unhiding a review changes the doctor's rating/count, which now also renders on the
  // tile face itself — lets the parent grid re-fetch so the tile stays in sync.
  onReviewsChanged?: () => void;
}

// Dedicated reviews popup opened from a tile's rating/comment-count area — shows every
// review (patient + hospital-response, the latter visually tagged and never attributed to
// a person), lets the admin hide/unhide any of them, and lets the hospital post its own
// official "Hospital Response" underneath.
export const DoctorReviewsDialog: React.FC<DoctorReviewsDialogProps> = ({
  open,
  onOpenChange,
  doctor,
  hospitalId,
  onReviewsChanged,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const translate = (key: string, fallback: string) => t(key, { defaultValue: fallback });

  const [reviews, setReviews] = useState<(AdminReviewItem & { moderating?: boolean })[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ averageRating: number; reviewCount: number }>({ averageRating: 0, reviewCount: 0 });
  const [responseText, setResponseText] = useState('');
  const [posting, setPosting] = useState(false);

  const load = (doctorId: string) => {
    if (!hospitalId) return;
    setLoading(true);
    doctorReviewsApi
      .list(hospitalId, doctorId)
      .then((res) => {
        setReviews((res?.reviews ?? []).map((r) => ({ ...r })));
        setStats({ averageRating: res?.averageRating ?? 0, reviewCount: res?.reviewCount ?? 0 });
      })
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open && doctor) {
      setResponseText('');
      load(doctor.doctorId);
    } else {
      setReviews([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, doctor?.doctorId, hospitalId]);

  const handleModerate = async (reviewId: string, nextHidden: boolean) => {
    if (!doctor) return;
    setReviews((prev) => prev.map((r) => (r.reviewId === reviewId ? { ...r, moderating: true } : r)));
    try {
      const response = await doctorReviewsApi.moderate(hospitalId, doctor.doctorId, reviewId, nextHidden);
      if (response.success) {
        setReviews((prev) => prev.map((r) => (r.reviewId === reviewId ? { ...r, isHidden: nextHidden } : r)));
        onReviewsChanged?.();
      } else {
        toast({ variant: 'destructive', title: translate('publicDirectory.reviewsDialog.saveFailedTitle', 'Could not save'), description: response.message ?? '' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: translate('publicDirectory.reviewsDialog.saveFailedTitle', 'Could not save'), description: e?.message ?? '' });
    } finally {
      setReviews((prev) => prev.map((r) => (r.reviewId === reviewId ? { ...r, moderating: false } : r)));
    }
  };

  const handlePostResponse = async () => {
    if (!doctor || !responseText.trim()) return;
    setPosting(true);
    try {
      const response = await doctorReviewsApi.submitHospitalResponse(hospitalId, doctor.doctorId, responseText.trim());
      if (response.success) {
        setResponseText('');
        load(doctor.doctorId);
        toast({ title: translate('publicDirectory.reviewsDialog.responsePosted', 'Response posted') });
      } else {
        toast({ variant: 'destructive', title: translate('publicDirectory.reviewsDialog.saveFailedTitle', 'Could not save'), description: response.message ?? '' });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: translate('publicDirectory.reviewsDialog.saveFailedTitle', 'Could not save'), description: e?.message ?? '' });
    } finally {
      setPosting(false);
    }
  };

  if (!doctor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {translate('publicDirectory.reviewsDialog.title', 'Reviews — {{name}}').replace(
              '{{name}}',
              doctor.fullName || translate('publicDirectory.unnamedDoctor', 'Unnamed doctor')
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm font-medium pb-3 border-b border-gray-200 dark:border-gray-800">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          {stats.reviewCount > 0 ? stats.averageRating.toFixed(1) : translate('publicDirectory.reviewsDialog.noRatingYet', 'No rating yet')}
          <span className="text-muted-foreground font-normal">
            ({stats.reviewCount} {translate('publicDirectory.reviewsDialog.reviewsWord', 'reviews')})
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            {translate('publicDirectory.reviewsDialog.noReviews', 'No reviews yet.')}
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {reviews.map((r) => (
              <div
                key={r.reviewId}
                className={cn(
                  'rounded-lg border p-3 text-sm',
                  r.isHospitalResponse
                    ? 'border-brand-200 bg-brand-50/50 dark:border-brand-900 dark:bg-brand-950/20'
                    : 'border-gray-200 dark:border-gray-800',
                  r.isHidden && 'opacity-50'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {r.isHospitalResponse ? (
                      <span className="flex items-center gap-1 font-medium text-brand-700 dark:text-brand-300 shrink-0">
                        <Building2 className="h-3.5 w-3.5" />
                        {translate('publicDirectory.reviewsDialog.hospitalResponse', 'Hospital Response')}
                      </span>
                    ) : (
                      <>
                        <span className="flex items-center gap-0.5 shrink-0">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {r.rating}
                        </span>
                        <span className="font-medium truncate">
                          {r.authorName || translate('publicDirectory.reviewsDialog.anonymous', 'Anonymous')}
                        </span>
                      </>
                    )}
                    {r.isHidden && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                        {translate('publicDirectory.reviewsDialog.hidden', 'Hidden')}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {translate('publicDirectory.reviewsDialog.hide', 'Hide')}
                    </span>
                    <Switch
                      checked={r.isHidden}
                      disabled={r.moderating}
                      onCheckedChange={(checked) => handleModerate(r.reviewId, checked)}
                    />
                  </div>
                </div>
                <p className="text-muted-foreground mt-1">{r.comment}</p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs font-medium flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            {translate('publicDirectory.reviewsDialog.postResponse', 'Post a hospital response')}
          </p>
          <Textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            rows={3}
            placeholder={translate('publicDirectory.reviewsDialog.responsePlaceholder', 'Write an official response as the hospital…')}
          />
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" disabled={posting || !responseText.trim()} onClick={handlePostResponse}>
              {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {translate('publicDirectory.reviewsDialog.post', 'Post response')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
