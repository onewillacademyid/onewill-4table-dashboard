/**
 * Onewill Academy | The 4 Table Weekly Progress Dashboard
 * Domain Types and Contracts
 */

export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'ADMIN' 
  | 'MANAGEMENT' 
  | 'TEAM_LEAD' 
  | 'CONTRIBUTOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teamId: string;
  teamName: string;
  avatarColor: string;
  avatarInitials: string;
  active: boolean;
  lastActive: string;
}

export interface Team {
  id: string;
  name: string;
  code: string;
  department: string;
  leadId: string;
  leadName: string;
  memberCount: number;
}

export type ReportStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'NEEDS_REVISION' 
  | 'APPROVED' 
  | 'ARCHIVED';

export type ArchiveStatus = 
  | 'NOT_ARCHIVED' 
  | 'QUEUED' 
  | 'ARCHIVED' 
  | 'FAILED';

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueState = 'open' | 'mitigating' | 'resolved';

export type ObjectivePriority = 'low' | 'medium' | 'high';

export type SupportType = 
  | 'decision' 
  | 'budget' 
  | 'people' 
  | 'access' 
  | 'material' 
  | 'other';

export type SupportStatus = 'pending' | 'approved' | 'rejected';

// Section 1: Capaian Pekan Lalu (Achievements)
export interface AchievementItem {
  id: string;
  description: string;
  project: string;
  result: string;
  targetValue?: number;
  actualValue?: number;
  unit?: string;
  evidenceUrl?: string;
  linkedObjectiveId?: string;
}

// Section 2: Kendala & Hambatan (Issues)
export interface IssueItem {
  id: string;
  title: string;
  businessImpact: string;
  severity: IssueSeverity;
  owner: string;
  mitigation: string;
  targetResolutionDate: string; // YYYY-MM-DD
  state: IssueState;
}

// Section 3: Sasaran Pekan Depan (Next Objectives)
export interface ObjectiveItem {
  id: string;
  objective: string;
  measurableOutcome: string;
  assignee: string;
  dueDate: string; // YYYY-MM-DD
  priority: ObjectivePriority;
  linkedIssueId?: string;
}

// Section 4: Dukungan yang Dibutuhkan (Support Needed)
export interface SupportItem {
  id: string;
  request: string;
  type: SupportType;
  requestedFrom: string; // Approver / Stakeholder
  neededBy: string; // YYYY-MM-DD
  amount?: number; // Optional IDR amount for budget requests
  businessConsequence: string;
  status: SupportStatus;
}

export interface SectionContainer<T> {
  items: T[];
  noUpdates: boolean;
  noUpdatesReason?: string;
}

export interface WeeklyReportSections {
  achievements: SectionContainer<AchievementItem>;
  issues: SectionContainer<IssueItem>;
  objectives: SectionContainer<ObjectiveItem>;
  support: SectionContainer<SupportItem>;
}

export interface ReportRevisionHistory {
  revisionNumber: number;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
  action: 'CREATED' | 'SAVED_DRAFT' | 'SUBMITTED' | 'REVISION_REQUESTED' | 'APPROVED' | 'ARCHIVED' | 'AMENDED';
  notes?: string;
}

export interface WeeklyReport {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  teamId: string;
  teamName: string;
  weekNumber: number;
  year: number;
  weekStartDate: string; // YYYY-MM-DD (Senin)
  weekEndDate: string; // YYYY-MM-DD (Minggu)
  status: ReportStatus;
  revision: number;
  revisionsHistory: ReportRevisionHistory[];
  sections: WeeklyReportSections;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerName?: string;
  reviewNotes?: string;
  archivedAt?: string;
  archiveStatus: ArchiveStatus;
  archiveError?: string;
  archiveDriveFileId?: string;
}

export interface ReportFilterCriteria {
  teamId?: string;
  status?: ReportStatus | 'ALL';
  weekNumber?: number;
  year?: number;
  searchQuery?: string;
  authorId?: string;
}

export interface DashboardMetrics {
  totalExpectedReports: number;
  totalReceivedReports: number;
  submissionRatePercent: number;
  pendingReviewsCount: number;
  criticalIssuesCount: number;
  totalIssuesCount: number;
  outstandingSupportCount: number;
  overdueObjectivesCount: number;
}
