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

export type ReviewDecision = { decision: 'APPROVE'; accuracyConfirmed: true } | { decision: 'REQUEST_CHANGES'; comment: string };

/** After a decision: published right away, or approved and waiting for the doctor's registration check. */
export interface ReviewResult {
  outcome: 'PUBLISHED' | 'APPROVED_AWAITING_VERIFICATION' | 'SENT_BACK';
}

export const MIN_CHANGE_COMMENT = 10;

// ---- topics: what a doctor suggests for the team to commission

export type TopicStatus = 'SUBMITTED' | 'NEEDS_DETAIL' | 'ACCEPTED' | 'DECLINED' | 'ARTICLE_STARTED';

export const TOPIC_STATUS_LABEL: Record<TopicStatus, string> = {
  SUBMITTED: 'Sent to the team',
  NEEDS_DETAIL: 'Needs more detail',
  ACCEPTED: 'Accepted',
  DECLINED: 'Not taken up',
  ARTICLE_STARTED: 'Article started',
};

export interface TopicRequest {
  id: string;
  title: string;
  type: ArticleType;
  outline: string;
  whyItMatters: string;
  conditionSlug: string | null;
  references: string | null;
  status: TopicStatus;
  /** Why it was declined, or the detail the team asked for. */
  decisionNote: string | null;
  articleSlug: string | null;
  /** The doctor asked for someone else to write it and will review it. */
  requestWriter: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TopicInput {
  title: string;
  type: ArticleType;
  outline: string;
  whyItMatters: string;
  references: string | null;
  requestWriter: boolean;
}

export const OPEN_TOPIC_LIMIT = 5;
