/**
 * Onewill Academy | The 4 Table Weekly Progress Dashboard
 * Zod Reporting Validation Schemas & Field Boundary Definitions
 * PRD v1.1 Section 4 & Section 10 Compliant.
 */

import { z } from 'zod';

// ==========================================
// Section 1: Capaian Pekan Lalu (Achievements)
// ==========================================
export const AchievementItemSchema = z.object({
  id: z.string().min(1, 'ID capaian wajib ada.'),
  description: z.string().min(1, 'Deskripsi capaian wajib diisi.').max(2000, 'Deskripsi maksimal 2000 karakter.'),
  project: z.string().min(1, 'Nama proyek/kegiatan wajib diisi.').max(200, 'Nama proyek maksimal 200 karakter.'),
  result: z.string().min(1, 'Hasil/dampak pencapaian wajib diisi.').max(2000, 'Hasil maksimal 2000 karakter.'),
  targetValue: z.number().optional(),
  actualValue: z.number().optional(),
  unit: z.string().max(50, 'Satuan unit maksimal 50 karakter.').optional(),
  evidenceUrl: z
    .string()
    .url('Tautan bukti harus berupa URL yang valid (https://...).')
    .or(z.literal(''))
    .optional(),
  linkedObjectiveId: z.string().optional(),
});

export type AchievementItemInput = z.infer<typeof AchievementItemSchema>;

// ==========================================
// Section 2: Kendala & Hambatan (Issues)
// ==========================================
export const IssueSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const IssueStateSchema = z.enum(['open', 'mitigating', 'resolved']);

export const IssueItemSchema = z.object({
  id: z.string().min(1, 'ID kendala wajib ada.'),
  title: z.string().min(1, 'Judul kendala wajib diisi.').max(300, 'Judul kendala maksimal 300 karakter.'),
  businessImpact: z.string().min(1, 'Dampak bisnis wajib diisi.').max(2000, 'Dampak bisnis maksimal 2000 karakter.'),
  severity: IssueSeveritySchema,
  owner: z.string().min(1, 'Penanggung jawab (owner) wajib diisi.').max(200, 'Nama owner maksimal 200 karakter.'),
  mitigation: z.string().min(1, 'Langkah mitigasi wajib diisi.').max(2000, 'Mitigasi maksimal 2000 karakter.'),
  targetResolutionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal target harus YYYY-MM-DD.'),
  state: IssueStateSchema,
});

export type IssueItemInput = z.infer<typeof IssueItemSchema>;

// ==========================================
// Section 3: Sasaran Pekan Depan (Next Objectives)
// ==========================================
export const ObjectivePrioritySchema = z.enum(['low', 'medium', 'high']);

export const ObjectiveItemSchema = z.object({
  id: z.string().min(1, 'ID sasaran wajib ada.'),
  objective: z.string().min(1, 'Pernyataan sasaran wajib diisi.').max(1000, 'Sasaran maksimal 1000 karakter.'),
  measurableOutcome: z.string().min(1, 'Hasil terukur (outcome) wajib diisi.').max(1000, 'Hasil terukur maksimal 1000 karakter.'),
  assignee: z.string().min(1, 'Penanggung jawab (assignee) wajib diisi.').max(200, 'Assignee maksimal 200 karakter.'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tenggat waktu harus YYYY-MM-DD.'),
  priority: ObjectivePrioritySchema,
  linkedIssueId: z.string().optional(),
});

export type ObjectiveItemInput = z.infer<typeof ObjectiveItemSchema>;

// ==========================================
// Section 4: Dukungan yang Dibutuhkan (Support Needed)
// ==========================================
export const SupportTypeSchema = z.enum(['decision', 'budget', 'people', 'access', 'material', 'other']);
export const SupportStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export const SupportItemSchema = z.object({
  id: z.string().min(1, 'ID dukungan wajib ada.'),
  request: z.string().min(1, 'Rincian permintaan dukungan wajib diisi.').max(1000, 'Permintaan dukungan maksimal 1000 karakter.'),
  type: SupportTypeSchema,
  requestedFrom: z.string().min(1, 'Pihak yang dimintai dukungan wajib diisi.').max(200, 'Nama pihak maksimal 200 karakter.'),
  neededBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal dibutuhkan harus YYYY-MM-DD.'),
  amount: z.number().min(0, 'Jumlah anggaran tidak boleh negatif.').optional(),
  businessConsequence: z.string().min(1, 'Konsekuensi bisnis wajib diisi.').max(2000, 'Konsekuensi bisnis maksimal 2000 karakter.'),
  status: SupportStatusSchema,
});

export type SupportItemInput = z.infer<typeof SupportItemSchema>;

// ==========================================
// Generic Section Container Schema
// ==========================================
export function createSectionContainerSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z
    .object({
      items: z.array(itemSchema),
      noUpdates: z.boolean(),
      noUpdatesReason: z.string().max(1000, 'Alasan maksimal 1000 karakter.').optional(),
    })
    .refine(
      (data) => {
        if (data.noUpdates && (!data.noUpdatesReason || data.noUpdatesReason.trim().length === 0)) {
          return false;
        }
        return true;
      },
      {
        message: 'Apabila memilih opsi "Tidak Ada Pembaruan", alasan wajib diisi.',
        path: ['noUpdatesReason'],
      }
    );
}

export const WeeklyReportSectionsSchema = z.object({
  achievements: createSectionContainerSchema(AchievementItemSchema),
  issues: createSectionContainerSchema(IssueItemSchema),
  objectives: createSectionContainerSchema(ObjectiveItemSchema),
  support: createSectionContainerSchema(SupportItemSchema),
});

export type WeeklyReportSectionsInput = z.infer<typeof WeeklyReportSectionsSchema>;

// ==========================================
// Status & Archive Enum Validation Schemas
// ==========================================
export const ReportStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'NEEDS_REVISION', 'APPROVED', 'ARCHIVED']);
export const ArchiveStatusSchema = z.enum(['NOT_ARCHIVED', 'QUEUED', 'ARCHIVED', 'FAILED']);

// ==========================================
// Client-Writable Input Schema (Draft Creation & Edit)
// STRICT SECURITY BOUNDARY: Does NOT permit client to specify authorId, teamId, role, status, or timestamps!
// ==========================================
export const CreateReportInputSchema = z
  .object({
    weekNumber: z.number().int().min(1, 'Nomor pekan minimal 1.').max(53, 'Nomor pekan maksimal 53.'),
    year: z.number().int().min(2026, 'Tahun minimal 2026.').max(2030, 'Tahun maksimal 2030.'),
    weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal awal pekan harus YYYY-MM-DD.'),
    weekEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal akhir pekan harus YYYY-MM-DD.'),
    title: z.string().max(300, 'Judul laporan maksimal 300 karakter.').optional(),
    sections: WeeklyReportSectionsSchema,
  })
  .strict()
  .refine(
    (data) => {
      return validateReportWeekBounds(data.year, data.weekNumber, data.weekStartDate, data.weekEndDate);
    },
    {
      message: 'Tanggal batas pekan (weekStartDate dan weekEndDate) tidak konsisten dengan nomor pekan dan tahun ISO.',
      path: ['weekStartDate'],
    }
  );

export type CreateReportInput = z.infer<typeof CreateReportInputSchema>;

// ==========================================
// GET /api/reports Query Validation Schema
// ==========================================
export const ListReportsQuerySchema = z.object({
  teamId: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'NEEDS_REVISION', 'APPROVED', 'ARCHIVED', 'ALL']).optional(),
  weekNumber: z.coerce.number().int().min(1).max(53).optional(),
  year: z.coerce.number().int().min(2026).max(2030).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export type ListReportsQuery = z.infer<typeof ListReportsQuerySchema>;

// ==========================================
// ISO Week Date & Boundary Validation Helpers
// ==========================================

/**
 * Calculates total ISO 8601 weeks in a given year.
 * Most years have 52 weeks, but years starting on Thursday or leap years starting on Wednesday have 53 weeks.
 */
export function getIsoWeeksInYear(year: number): number {
  const p = (y: number) =>
    (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)) % 7;
  if (p(year) === 4 || p(year - 1) === 3) {
    return 53;
  }
  return 52;
}

/**
 * Validates ISO week number against year maximums, and checks start/end date consistency.
 */
export function validateReportWeekBounds(
  year: number,
  weekNumber: number,
  weekStartDate: string,
  weekEndDate: string
): boolean {
  const maxWeeks = getIsoWeeksInYear(year);
  if (weekNumber < 1 || weekNumber > maxWeeks) {
    return false;
  }

  const start = new Date(`${weekStartDate}T00:00:00Z`);
  const end = new Date(`${weekEndDate}T00:00:00Z`);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return false;
  }

  // Monday to Sunday span check: diff between start and end must be exactly 6 days (518400000 ms)
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
  if (diffDays !== 6) {
    return false;
  }

  // Ensure start date is indeed Monday (getDay() === 1)
  if (start.getUTCDay() !== 1) {
    return false;
  }

  return true;
}

/**
 * Generates the canonical deterministic Firestore document ID for a weekly report.
 * Guaranteed uniqueness rule: Exactly ONE report per team per ISO week-year.
 * Format: rep_{year}_w{weekNumber}_{normalizedTeamId}
 * Example: rep_2026_w41_team-operasional
 */
export function deriveReportDocId(teamId: string, year: number, weekNumber: number): string {
  const normalizedTeamId = (teamId || '').trim().toLowerCase();
  if (!normalizedTeamId) {
    throw new Error('ID Tim tidak valid untuk pembuatan ID dokumen laporan.');
  }
  return `rep_${year}_w${weekNumber}_${normalizedTeamId}`;
}
