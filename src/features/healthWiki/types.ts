// Health Wiki as a hospital doctor sees it: articles waiting for their medical review, and the
// ones they approved with how many people read them. Wire shapes follow the /health-wiki endpoints
// in the Health Wiki developer note.

export type ArticleType = 'MEDICAL' | 'SECTOR_UPDATE';

export const ARTICLE_TYPE_LABEL: Record<ArticleType, string> = {
  MEDICAL: 'Medical',
  SECTOR_UPDATE: 'Sector update',
};

export type InboxTab = 'pending' | 'published';

export interface InboxArticle {
  slug: string;
  type: ArticleType;
  title: string;
  description: string;
  coverImageUrl: string | null;
  authorName: string;
  /** Whole days an article in review has been waiting. Null once it is published. */
  waitingDays: number | null;
  views: number | null;
  likes: number | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface InboxResponse {
  pending: InboxArticle[];
  published: InboxArticle[];
}

export interface ReviewerBadge {
  name: string;
  qualification: string | null;
  speciality: string | null;
  registrationNumber: string | null;
  registrationCouncil: string | null;
}

export interface ArticleDetail extends InboxArticle {
  /** Markdown. */
  content: string;
  coverImageAlt: string | null;
  relatedConditionSlug: string | null;
  disclosure: string | null;
  /** One source per line. */
  references: string | null;
  /** The signed-in doctor, as the badge will show them. */
  reviewer: ReviewerBadge;
  status: 'IN_REVIEW' | 'PUBLISHED';
  /** The signed-in doctor is the assigned reviewer and the article is still waiting. */
  canDecide: boolean;
  /** Views for each of the last 14 days, oldest first. Empty while the article is in review. */
  dailyViews: number[];
}

export type ReviewDecision = { decision: 'APPROVE' } | { decision: 'REQUEST_CHANGES'; comment: string };

/** After a decision: published right away, or approved and waiting for the doctor's registration check. */
export interface ReviewResult {
  outcome: 'PUBLISHED' | 'APPROVED_AWAITING_VERIFICATION' | 'SENT_BACK';
}

export const MIN_CHANGE_COMMENT = 10;
