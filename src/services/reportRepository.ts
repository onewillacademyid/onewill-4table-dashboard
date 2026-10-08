/**
 * Onewill Academy | The 4 Table Weekly Progress Dashboard
 * Report Repository Service (Demo Adapter with Local Storage persistence)
 * Designed for clean substitution with Firestore in production.
 */

import {
  WeeklyReport,
  ReportFilterCriteria,
  DashboardMetrics,
  User,
  Team,
  IssueSeverity
} from '../types';

export const DEMO_TEAMS: Team[] = [
  {
    id: 'team-akademik',
    name: 'Akademik & Kurikulum',
    code: 'AKD',
    department: 'Divisi Pembelajaran',
    leadId: 'user-siti',
    leadName: 'Siti Nurhaliza',
    memberCount: 8,
  },
  {
    id: 'team-pemasaran',
    name: 'Pemasaran & Pertumbuhan',
    code: 'MKT',
    department: 'Divisi Komersial',
    leadId: 'user-dian',
    leadName: 'Dian Permata',
    memberCount: 6,
  },
  {
    id: 'team-teknologi',
    name: 'Teknologi & Produk',
    code: 'TECH',
    department: 'Divisi Digital',
    leadId: 'user-hendra',
    leadName: 'Hendra Wijaya',
    memberCount: 7,
  },
  {
    id: 'team-operasional',
    name: 'Operasional & SDM',
    code: 'OPS',
    department: 'Divisi Manajemen & Legal',
    leadId: 'user-budi',
    leadName: 'Budi Santoso',
    memberCount: 5,
  },
];

export const DEMO_USERS: User[] = [
  {
    id: 'user-rian',
    name: 'Rian Pratama',
    email: 'rian.pratama@onewill-demo.id',
    role: 'CONTRIBUTOR',
    teamId: 'team-pemasaran',
    teamName: 'Pemasaran & Pertumbuhan',
    avatarColor: '#6C2AA6',
    avatarInitials: 'RP',
    active: true,
    lastActive: '2026-10-08 09:30 WIB',
  },
  {
    id: 'user-siti',
    name: 'Siti Nurhaliza',
    email: 'siti.nurhaliza@onewill-demo.id',
    role: 'TEAM_LEAD',
    teamId: 'team-akademik',
    teamName: 'Akademik & Kurikulum',
    avatarColor: '#35115A',
    avatarInitials: 'SN',
    active: true,
    lastActive: '2026-10-08 10:15 WIB',
  },
  {
    id: 'user-hendra',
    name: 'Hendra Wijaya',
    email: 'hendra.wijaya@onewill-demo.id',
    role: 'TEAM_LEAD',
    teamId: 'team-teknologi',
    teamName: 'Teknologi & Produk',
    avatarColor: '#4e1b7e',
    avatarInitials: 'HW',
    active: true,
    lastActive: '2026-10-08 08:45 WIB',
  },
  {
    id: 'user-budi',
    name: 'Budi Santoso',
    email: 'budi.santoso@onewill-demo.id',
    role: 'MANAGEMENT',
    teamId: 'team-operasional',
    teamName: 'Operasional & SDM',
    avatarColor: '#1d0733',
    avatarInitials: 'BS',
    active: true,
    lastActive: '2026-10-08 11:20 WIB',
  },
  {
    id: 'user-diana',
    name: 'Diana Kusuma',
    email: 'diana.kusuma@onewill-demo.id',
    role: 'ADMIN',
    teamId: 'team-operasional',
    teamName: 'Operasional & SDM',
    avatarColor: '#8b3ecf',
    avatarInitials: 'DK',
    active: true,
    lastActive: '2026-10-08 11:50 WIB',
  },
  {
    id: 'user-agung',
    name: 'Agung Wicaksono',
    email: 'agung.w@onewill-demo.id',
    role: 'SUPER_ADMIN',
    teamId: 'team-akademik',
    teamName: 'Akademik & Kurikulum',
    avatarColor: '#35115A',
    avatarInitials: 'AW',
    active: true,
    lastActive: '2026-10-08 12:00 WIB',
  },
];

const INITIAL_REPORTS: WeeklyReport[] = [
  {
    id: 'rep-2026-w41-akd',
    title: 'Laporan Mingguan Akademik — Pekan 41',
    authorId: 'user-siti',
    authorName: 'Siti Nurhaliza',
    authorEmail: 'siti.nurhaliza@onewill-demo.id',
    teamId: 'team-akademik',
    teamName: 'Akademik & Kurikulum',
    weekNumber: 41,
    year: 2026,
    weekStartDate: '2026-10-05',
    weekEndDate: '2026-10-11',
    status: 'SUBMITTED',
    revision: 1,
    revisionsHistory: [
      {
        revisionNumber: 1,
        updatedAt: '2026-10-07T16:30:00+07:00',
        updatedBy: 'user-siti',
        updatedByName: 'Siti Nurhaliza',
        action: 'SUBMITTED',
        notes: 'Laporan mingguan pekan 41 diajukan untuk tinjauan manajemen.',
      },
    ],
    sections: {
      achievements: {
        items: [
          {
            id: 'ach-1',
            description: 'Finalisasi kurikulum modul "Executive Leadership Sprint" untuk program pelatihan B2B Q4.',
            project: 'Pengembangan Silabus B2B',
            result: 'Silabus 100% selesai dan ditelaah oleh tim pakar industri.',
            targetValue: 1,
            actualValue: 1,
            unit: 'modul',
            evidenceUrl: 'https://docs.google.com/demo/syllabus-lead-sprint',
          },
          {
            id: 'ach-2',
            description: 'Pelaksanaan evaluasi formatif kohort Data Analytics Batch 7.',
            project: 'Program Akselerasi Talenta',
            result: 'Kelulusan evaluasi formatif mencapai 94.2% dari 45 peserta aktif.',
            targetValue: 90,
            actualValue: 94.2,
            unit: '%',
          },
        ],
        noUpdates: false,
      },
      issues: {
        items: [
          {
            id: 'iss-1',
            title: 'Keterlambatan konfirmasi fasilitator tamu untuk masterclass negosiasi bisnis',
            businessImpact: 'Jadwal sesi 14 Oktober berisiko tertunda 3 hari kerja dan mempengaruhi kepuasan peserta korporat.',
            severity: 'high',
            owner: 'Siti Nurhaliza',
            mitigation: 'Menghubungi 2 fasilitator cadangan dari jaringan alumni senior per 8 Oktober.',
            targetResolutionDate: '2026-10-09',
            state: 'mitigating',
          },
        ],
        noUpdates: false,
      },
      objectives: {
        items: [
          {
            id: 'obj-1',
            objective: 'Merilis instrumen evaluasi kepuasan peserta terstandardisasi (NPS kurikulum).',
            measurableOutcome: 'Tingkat pengisian kuesioner minimal 85% di 3 kohort berjalan.',
            assignee: 'Siti Nurhaliza',
            dueDate: '2026-10-12',
            priority: 'high',
          },
          {
            id: 'obj-2',
            objective: 'Briefing materi dan standarisasi rubrik penilaian kepada 6 asisten pengajar.',
            measurableOutcome: '100% asisten pengajar tersertifikasi standar penilaian Onewill.',
            assignee: 'Bambang Irawan',
            dueDate: '2026-10-14',
            priority: 'medium',
          },
        ],
        noUpdates: false,
      },
      support: {
        items: [
          {
            id: 'sup-1',
            request: 'Persetujuan penambahan honorarium fasilitator tamu masterclass internasional.',
            type: 'budget',
            requestedFrom: 'Budi Santoso (Manajemen)',
            neededBy: '2026-10-09',
            amount: 7500000,
            businessConsequence: 'Jika tidak disetujui, kelas dialihkan ke fasilitator lokal dengan penyesuaian materi.',
            status: 'pending',
          },
        ],
        noUpdates: false,
      },
    },
    createdAt: '2026-10-06T09:00:00+07:00',
    updatedAt: '2026-10-07T16:30:00+07:00',
    submittedAt: '2026-10-07T16:30:00+07:00',
    archiveStatus: 'NOT_ARCHIVED',
  },
  {
    id: 'rep-2026-w41-mkt',
    title: 'Laporan Mingguan Pemasaran — Pekan 41',
    authorId: 'user-rian',
    authorName: 'Rian Pratama',
    authorEmail: 'rian.pratama@onewill-demo.id',
    teamId: 'team-pemasaran',
    teamName: 'Pemasaran & Pertumbuhan',
    weekNumber: 41,
    year: 2026,
    weekStartDate: '2026-10-05',
    weekEndDate: '2026-10-11',
    status: 'NEEDS_REVISION',
    revision: 1,
    revisionsHistory: [
      {
        revisionNumber: 1,
        updatedAt: '2026-10-06T18:00:00+07:00',
        updatedBy: 'user-rian',
        updatedByName: 'Rian Pratama',
        action: 'SUBMITTED',
        notes: 'Laporan pendaftaran kursus terbuka.',
      },
      {
        revisionNumber: 1,
        updatedAt: '2026-10-07T14:20:00+07:00',
        updatedBy: 'user-budi',
        updatedByName: 'Budi Santoso',
        action: 'REVISION_REQUESTED',
        notes: 'Mohon pisahkan metriks CPL (Cost per Lead) antara kanal berbayar Meta Ads vs LinkedIn Ads, serta cantumkan mitigasi penurunan konversi.',
      },
    ],
    sections: {
      achievements: {
        items: [
          {
            id: 'ach-mkt-1',
            description: 'Penyelenggaraan webinar umum bertajuk "Masa Depan Karir Digital 2027".',
            project: 'Top of Funnel Awareness',
            result: 'Diikuti oleh 412 peserta terverifikasi, melampaui target registrasi awal 350.',
            targetValue: 350,
            actualValue: 412,
            unit: 'peserta',
            evidenceUrl: 'https://youtube.com/demo/webinar-onewill-rekaman',
          },
        ],
        noUpdates: false,
      },
      issues: {
        items: [
          {
            id: 'iss-mkt-1',
            title: 'Kenaikan Cost Per Acquisition (CPA) kampanye kursus intensif pekan lalu',
            businessImpact: 'Efisiensi anggaran pemasaran turun 18% dari target benchmark.',
            severity: 'critical',
            owner: 'Rian Pratama',
            mitigation: 'Menghentikan kreatif dengan performa rendah dan melakukan A/B test hook video baru.',
            targetResolutionDate: '2026-10-10',
            state: 'open',
          },
        ],
        noUpdates: false,
      },
      objectives: {
        items: [
          {
            id: 'obj-mkt-1',
            objective: 'Distribusi newsletter mingguan edisi khusus peluang beasiswa talenta.',
            measurableOutcome: 'Open rate di atas 28% dan CTR minimal 4.5%.',
            assignee: 'Rian Pratama',
            dueDate: '2026-10-09',
            priority: 'medium',
          },
        ],
        noUpdates: false,
      },
      support: {
        items: [
          {
            id: 'sup-mkt-1',
            request: 'Akses kredensial Meta Business Manager untuk tim agensi periklanan baru.',
            type: 'access',
            requestedFrom: 'Hendra Wijaya (Divisi Digital)',
            neededBy: '2026-10-08',
            businessConsequence: 'Kampanye iklan retargeting tertunda 2 hari bila akses belum didelegasikan.',
            status: 'pending',
          },
        ],
        noUpdates: false,
      },
    },
    createdAt: '2026-10-06T10:00:00+07:00',
    updatedAt: '2026-10-07T14:20:00+07:00',
    submittedAt: '2026-10-06T18:00:00+07:00',
    reviewedAt: '2026-10-07T14:20:00+07:00',
    reviewedBy: 'user-budi',
    reviewerName: 'Budi Santoso',
    reviewNotes: 'Mohon pisahkan metriks CPL (Cost per Lead) antara kanal berbayar Meta Ads vs LinkedIn Ads, serta cantumkan mitigasi penurunan konversi.',
    archiveStatus: 'NOT_ARCHIVED',
  },
  {
    id: 'rep-2026-w40-tech',
    title: 'Laporan Mingguan Teknologi — Pekan 40',
    authorId: 'user-hendra',
    authorName: 'Hendra Wijaya',
    authorEmail: 'hendra.wijaya@onewill-demo.id',
    teamId: 'team-teknologi',
    teamName: 'Teknologi & Produk',
    weekNumber: 40,
    year: 2026,
    weekStartDate: '2026-09-28',
    weekEndDate: '2026-10-04',
    status: 'APPROVED',
    revision: 1,
    revisionsHistory: [
      {
        revisionNumber: 1,
        updatedAt: '2026-10-02T17:00:00+07:00',
        updatedBy: 'user-hendra',
        updatedByName: 'Hendra Wijaya',
        action: 'SUBMITTED',
        notes: 'Penyampaian capaian rilis portal LMS v2.1',
      },
      {
        revisionNumber: 1,
        updatedAt: '2026-10-03T11:00:00+07:00',
        updatedBy: 'user-budi',
        updatedByName: 'Budi Santoso',
        action: 'APPROVED',
        notes: 'Capaian memuaskan, perbaikan SLA sistem berhasil ditepati.',
      },
    ],
    sections: {
      achievements: {
        items: [
          {
            id: 'ach-tech-1',
            description: 'Deployment fitur kuis otomatis dan auto-grading pada platform LMS siswa.',
            project: 'Sistem Pembelajaran Siswa v2.1',
            result: 'Waktu penerbitan sertifikat selesai berkurang dari 48 jam menjadi instan.',
            targetValue: 48,
            actualValue: 0.1,
            unit: 'jam',
            evidenceUrl: 'https://github.com/demo/release-v2.1',
          },
          {
            id: 'ach-tech-2',
            description: 'Optimasi query database daftar kehadiran dan analitik siswa.',
            project: 'Infrastruktur Data',
            result: 'P95 latency turun dari 850ms ke 140ms di bawah beban serentak 500 pengguna.',
            targetValue: 200,
            actualValue: 140,
            unit: 'ms',
          },
        ],
        noUpdates: false,
      },
      issues: {
        items: [
          {
            id: 'iss-tech-1',
            title: 'Peningkatan kuota webhook gateway pembayaran sesekali time out di jam sibuk',
            businessImpact: '5 transaksi kursus memerlukan rekonsiliasi manual oleh tim finance.',
            severity: 'medium',
            owner: 'Hendra Wijaya',
            mitigation: 'Implementasi retry queue dengan exponential backoff dan notifikasi otomatis.',
            targetResolutionDate: '2026-10-05',
            state: 'resolved',
          },
        ],
        noUpdates: false,
      },
      objectives: {
        items: [
          {
            id: 'obj-tech-1',
            objective: 'Implementasi Single Sign-On (SSO) Google Workspace untuk portal tutor.',
            measurableOutcome: 'Akses aman tanpa perlu kelola password manual untuk 40 staf & pengajar.',
            assignee: 'Hendra Wijaya',
            dueDate: '2026-10-08',
            priority: 'high',
          },
        ],
        noUpdates: false,
      },
      support: {
        items: [],
        noUpdates: true,
        noUpdatesReason: 'Tidak ada kebutuhan eskalasi atau dukungan tambahan untuk divisi teknologi pekan ini.',
      },
    },
    createdAt: '2026-09-30T10:00:00+07:00',
    updatedAt: '2026-10-03T11:00:00+07:00',
    submittedAt: '2026-10-02T17:00:00+07:00',
    reviewedAt: '2026-10-03T11:00:00+07:00',
    reviewedBy: 'user-budi',
    reviewerName: 'Budi Santoso',
    reviewNotes: 'Capaian memuaskan, perbaikan SLA sistem berhasil ditepati.',
    archiveStatus: 'NOT_ARCHIVED',
  },
  {
    id: 'rep-2026-w41-ops',
    title: 'Laporan Mingguan Operasional — Pekan 41',
    authorId: 'user-budi',
    authorName: 'Budi Santoso',
    authorEmail: 'budi.santoso@onewill-demo.id',
    teamId: 'team-operasional',
    teamName: 'Operasional & SDM',
    weekNumber: 41,
    year: 2026,
    weekStartDate: '2026-10-05',
    weekEndDate: '2026-10-11',
    status: 'DRAFT',
    revision: 1,
    revisionsHistory: [
      {
        revisionNumber: 1,
        updatedAt: '2026-10-07T11:00:00+07:00',
        updatedBy: 'user-budi',
        updatedByName: 'Budi Santoso',
        action: 'SAVED_DRAFT',
        notes: 'Penyusunan draf awal operasional kantor dan perpanjangan sewa kelas.',
      },
    ],
    sections: {
      achievements: {
        items: [
          {
            id: 'ach-ops-1',
            description: 'Penyelesaian audit fasilitas ruang kelas offline untuk program tatap muka November.',
            project: 'Fasilitas Kampus Onewill',
            result: 'Seluruh standar keselamatan, sanitasi, dan koneksi internet bandwidth 300 Mbps terpenuhi.',
            evidenceUrl: 'https://drive.google.com/demo/audit-fasilitas-onewill',
          },
        ],
        noUpdates: false,
      },
      issues: {
        items: [],
        noUpdates: true,
        noUpdatesReason: 'Seluruh operasional berjalan normal tanpa kendala yang menghambat kelangsungan belajar mengajar.',
      },
      objectives: {
        items: [
          {
            id: 'obj-ops-1',
            objective: 'Pembaruan kontrak kerjasama penyedia konsumsi untuk workshop offline.',
            measurableOutcome: 'Kontrak diteken dengan efisiensi biaya 12% dibandingkan semester lalu.',
            assignee: 'Budi Santoso',
            dueDate: '2026-10-15',
            priority: 'medium',
          },
        ],
        noUpdates: false,
      },
      support: {
        items: [
          {
            id: 'sup-ops-1',
            request: 'Otorisasi legal untuk penandatanganan NDA perusahaan mitra pelatihan korporasi.',
            type: 'decision',
            requestedFrom: 'Agung Wicaksono (Super Admin / Direksi)',
            neededBy: '2026-10-11',
            businessConsequence: 'Pelatihan korporat senilai Rp 85 juta tertunda jika draf legal belum disahkan.',
            status: 'pending',
          },
        ],
        noUpdates: false,
      },
    },
    createdAt: '2026-10-07T11:00:00+07:00',
    updatedAt: '2026-10-07T11:00:00+07:00',
    archiveStatus: 'NOT_ARCHIVED',
  },
  {
    id: 'rep-2026-w39-akd',
    title: 'Laporan Mingguan Akademik — Pekan 39',
    authorId: 'user-siti',
    authorName: 'Siti Nurhaliza',
    authorEmail: 'siti.nurhaliza@onewill-demo.id',
    teamId: 'team-akademik',
    teamName: 'Akademik & Kurikulum',
    weekNumber: 39,
    year: 2026,
    weekStartDate: '2026-09-21',
    weekEndDate: '2026-09-27',
    status: 'ARCHIVED',
    revision: 1,
    revisionsHistory: [
      {
        revisionNumber: 1,
        updatedAt: '2026-09-25T16:00:00+07:00',
        updatedBy: 'user-siti',
        updatedByName: 'Siti Nurhaliza',
        action: 'SUBMITTED',
      },
      {
        revisionNumber: 1,
        updatedAt: '2026-09-26T10:00:00+07:00',
        updatedBy: 'user-budi',
        updatedByName: 'Budi Santoso',
        action: 'APPROVED',
      },
      {
        revisionNumber: 1,
        updatedAt: '2026-09-26T10:30:00+07:00',
        updatedBy: 'user-diana',
        updatedByName: 'Diana Kusuma',
        action: 'ARCHIVED',
        notes: 'Arsip tersimpan di Google Drive korporat (Simulasi).',
      },
    ],
    sections: {
      achievements: {
        items: [
          {
            id: 'ach-39-1',
            description: 'Penyusunan modul fondasi "Problem Solving & Critical Thinking".',
            project: 'Kurikulum Inti',
            result: 'Lengkap dengan studi kasus nyata dan rubrik penilaian terpadu.',
          },
        ],
        noUpdates: false,
      },
      issues: {
        items: [],
        noUpdates: true,
        noUpdatesReason: 'Tidak ada kendala pada periode pelaporan ini.',
      },
      objectives: {
        items: [
          {
            id: 'obj-39-1',
            objective: 'Riset kebutuhan kurikulum B2B perbankan dan industri finansial.',
            measurableOutcome: 'Dokumen riset 12 halaman dipresentasikan ke divisi produk.',
            assignee: 'Siti Nurhaliza',
            dueDate: '2026-09-30',
            priority: 'medium',
          },
        ],
        noUpdates: false,
      },
      support: {
        items: [],
        noUpdates: true,
        noUpdatesReason: 'Tidak ada dukungan luar biasa yang diminta.',
      },
    },
    createdAt: '2026-09-24T09:00:00+07:00',
    updatedAt: '2026-09-26T10:30:00+07:00',
    submittedAt: '2026-09-25T16:00:00+07:00',
    reviewedAt: '2026-09-26T10:00:00+07:00',
    reviewedBy: 'user-budi',
    reviewerName: 'Budi Santoso',
    archivedAt: '2026-09-26T10:30:00+07:00',
    archiveStatus: 'ARCHIVED',
    archiveDriveFileId: 'drive-file-sim-39-akd-pdf',
  },
];

const STORAGE_KEY = 'onewill_weekly_reports_v1';

export class ReportRepository {
  private getStorage(): WeeklyReport[] {
    if (typeof window === 'undefined') {
      return INITIAL_REPORTS;
    }
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback to initial
    }
    this.saveStorage(INITIAL_REPORTS);
    return INITIAL_REPORTS;
  }

  private saveStorage(reports: WeeklyReport[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch {
      // ignore in environments without localStorage
    }
  }

  public async listReports(filters?: ReportFilterCriteria): Promise<WeeklyReport[]> {
    let reports = this.getStorage();

    if (!filters) return reports;

    if (filters.teamId && filters.teamId !== 'ALL') {
      reports = reports.filter((r) => r.teamId === filters.teamId);
    }

    if (filters.status && filters.status !== 'ALL') {
      reports = reports.filter((r) => r.status === filters.status);
    }

    if (filters.weekNumber) {
      reports = reports.filter((r) => r.weekNumber === filters.weekNumber);
    }

    if (filters.year) {
      reports = reports.filter((r) => r.year === filters.year);
    }

    if (filters.authorId) {
      reports = reports.filter((r) => r.authorId === filters.authorId);
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      reports = reports.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.authorName.toLowerCase().includes(q) ||
          r.teamName.toLowerCase().includes(q)
      );
    }

    return reports.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public async getReportById(id: string): Promise<WeeklyReport | null> {
    const reports = this.getStorage();
    return reports.find((r) => r.id === id) || null;
  }

  public async createReport(
    payload: Omit<WeeklyReport, 'id' | 'createdAt' | 'updatedAt' | 'revisionsHistory'>
  ): Promise<WeeklyReport> {
    const reports = this.getStorage();
    const now = new Date().toISOString();
    const newId = `rep-${payload.year}-w${payload.weekNumber}-${payload.teamId.replace('team-', '')}-${Date.now().toString().slice(-4)}`;

    const newReport: WeeklyReport = {
      ...payload,
      id: newId,
      createdAt: now,
      updatedAt: now,
      revisionsHistory: [
        {
          revisionNumber: 1,
          updatedAt: now,
          updatedBy: payload.authorId,
          updatedByName: payload.authorName,
          action: payload.status === 'SUBMITTED' ? 'SUBMITTED' : 'CREATED',
          notes: payload.status === 'SUBMITTED' ? 'Laporan diajukan pertama kali.' : 'Draf laporan dibuat.',
        },
      ],
    };

    reports.unshift(newReport);
    this.saveStorage(reports);
    return newReport;
  }

  public async updateReport(id: string, updates: Partial<WeeklyReport>): Promise<WeeklyReport> {
    const reports = this.getStorage();
    const index = reports.findIndex((r) => r.id === id);
    if (index === -1) throw new Error(`Laporan dengan ID ${id} tidak ditemukan.`);

    const current = reports[index];
    if (current.status === 'APPROVED' && updates.status !== 'APPROVED' && !updates.revision) {
      throw new Error('Laporan yang sudah disetujui bersifat permanen (read-only). Buat amendemen / revisi baru untuk mengubah.');
    }

    const now = new Date().toISOString();
    const updated: WeeklyReport = {
      ...current,
      ...updates,
      updatedAt: now,
    };

    reports[index] = updated;
    this.saveStorage(reports);
    return updated;
  }

  public async submitReport(id: string): Promise<WeeklyReport> {
    const reports = this.getStorage();
    const index = reports.findIndex((r) => r.id === id);
    if (index === -1) throw new Error(`Laporan tidak ditemukan.`);

    const report = reports[index];
    const now = new Date().toISOString();
    const previousStatus = report.status;

    if (previousStatus === 'NEEDS_REVISION') {
      report.revision += 1;
    }

    report.status = 'SUBMITTED';
    report.submittedAt = now;
    report.updatedAt = now;
    report.revisionsHistory.push({
      revisionNumber: report.revision,
      updatedAt: now,
      updatedBy: report.authorId,
      updatedByName: report.authorName,
      action: 'SUBMITTED',
      notes: previousStatus === 'NEEDS_REVISION'
        ? `Diajukan kembali setelah perbaikan (Revisi #${report.revision})`
        : `Diajukan untuk peninjauan (Revisi #${report.revision})`,
    });

    reports[index] = report;
    this.saveStorage(reports);
    return report;
  }

  public async approveReport(
    id: string,
    reviewerId: string,
    reviewerName: string,
    notes?: string
  ): Promise<WeeklyReport> {
    const reports = this.getStorage();
    const index = reports.findIndex((r) => r.id === id);
    if (index === -1) throw new Error(`Laporan tidak ditemukan.`);

    const report = reports[index];

    // Enforce NO SELF-APPROVAL rule
    if (report.authorId === reviewerId) {
      throw new Error('Prinsip Segregasi Tugas: Anda tidak dapat menyetujui laporan yang Anda tulis sendiri.');
    }

    const now = new Date().toISOString();
    report.status = 'APPROVED';
    report.reviewedAt = now;
    report.reviewedBy = reviewerId;
    report.reviewerName = reviewerName;
    report.reviewNotes = notes || 'Disetujui tanpa catatan khusus.';
    report.updatedAt = now;

    report.revisionsHistory.push({
      revisionNumber: report.revision,
      updatedAt: now,
      updatedBy: reviewerId,
      updatedByName: reviewerName,
      action: 'APPROVED',
      notes: report.reviewNotes,
    });

    reports[index] = report;
    this.saveStorage(reports);
    return report;
  }

  public async requestRevision(
    id: string,
    reviewerId: string,
    reviewerName: string,
    notes: string
  ): Promise<WeeklyReport> {
    if (!notes || notes.trim().length === 0) {
      throw new Error('Alasan permintaan revisi wajib diisi agar penulis memahami bagian yang perlu diperbaiki.');
    }

    const reports = this.getStorage();
    const index = reports.findIndex((r) => r.id === id);
    if (index === -1) throw new Error(`Laporan tidak ditemukan.`);

    const report = reports[index];

    if (report.authorId === reviewerId) {
      throw new Error('Anda tidak dapat meminta revisi atas laporan diri sendiri melalui alur peninjauan.');
    }

    const now = new Date().toISOString();
    report.status = 'NEEDS_REVISION';
    report.reviewedAt = now;
    report.reviewedBy = reviewerId;
    report.reviewerName = reviewerName;
    report.reviewNotes = notes;
    report.updatedAt = now;

    report.revisionsHistory.push({
      revisionNumber: report.revision,
      updatedAt: now,
      updatedBy: reviewerId,
      updatedByName: reviewerName,
      action: 'REVISION_REQUESTED',
      notes,
    });

    reports[index] = report;
    this.saveStorage(reports);
    return report;
  }

  public async archiveReport(id: string, simulateFailure = false): Promise<WeeklyReport> {
    const reports = this.getStorage();
    const index = reports.findIndex((r) => r.id === id);
    if (index === -1) throw new Error(`Laporan tidak ditemukan.`);

    const report = reports[index];
    const now = new Date().toISOString();

    if (simulateFailure) {
      report.archiveStatus = 'FAILED';
      report.archiveError = 'Simulasi Gagal: Kuota penyimpanan Google Drive penuh atau izin folder tujuan ditolak.';
      reports[index] = report;
      this.saveStorage(reports);
      return report;
    }

    report.status = 'ARCHIVED';
    report.archiveStatus = 'ARCHIVED';
    report.archivedAt = now;
    report.archiveDriveFileId = `drive-snapshot-${report.id}-${Date.now()}`;
    report.archiveError = undefined;

    report.revisionsHistory.push({
      revisionNumber: report.revision,
      updatedAt: now,
      updatedBy: 'system-archive',
      updatedByName: 'Drive Archive Service (Simulasi)',
      action: 'ARCHIVED',
      notes: 'Laporan disalin dan diarsipkan ke Google Drive Onewill Academy.',
    });

    reports[index] = report;
    this.saveStorage(reports);
    return report;
  }

  public async createAmendment(id: string, userId: string, userName: string): Promise<WeeklyReport> {
    const reports = this.getStorage();
    const current = reports.find((r) => r.id === id);
    if (!current) throw new Error(`Laporan tidak ditemukan.`);

    const now = new Date().toISOString();
    const newRevisionNumber = current.revision + 1;

    // Amendment unlocks the report as DRAFT with incremented revision number
    current.status = 'DRAFT';
    current.revision = newRevisionNumber;
    current.updatedAt = now;
    current.revisionsHistory.push({
      revisionNumber: newRevisionNumber,
      updatedAt: now,
      updatedBy: userId,
      updatedByName: userName,
      action: 'AMENDED',
      notes: `Amendemen dimulai. Revisi bertambah menjadi ke-${newRevisionNumber}. Versi sebelumnya tetap tersimpan di riwayat.`,
    });

    this.saveStorage(reports);
    return current;
  }

  public async getMetrics(weekNumber: number, year: number, teamId?: string): Promise<DashboardMetrics> {
    const allReports = this.getStorage();
    
    // Filter by week, year, and optional team
    let periodReports = allReports.filter((r) => r.weekNumber === weekNumber && r.year === year);
    if (teamId && teamId !== 'ALL') {
      periodReports = periodReports.filter((r) => r.teamId === teamId);
    }

    // Calculation with defensive denominators
    const expectedTeams = teamId && teamId !== 'ALL' ? 1 : DEMO_TEAMS.length;
    const submittedOrApproved = periodReports.filter(
      (r) => r.status === 'SUBMITTED' || r.status === 'APPROVED' || r.status === 'ARCHIVED'
    ).length;

    const submissionRate = expectedTeams > 0 ? Math.round((submittedOrApproved / expectedTeams) * 100) : 0;

    const pendingReviews = periodReports.filter((r) => r.status === 'SUBMITTED').length;

    let criticalIssues = 0;
    let totalIssues = 0;
    let outstandingSupport = 0;
    let overdueObjectives = 0;

    const todayStr = '2026-10-08'; // Grounded simulated reference date

    for (const report of periodReports) {
      if (!report.sections.issues.noUpdates) {
        for (const item of report.sections.issues.items) {
          totalIssues++;
          if (item.severity === 'critical' && item.state !== 'resolved') {
            criticalIssues++;
          }
        }
      }

      if (!report.sections.support.noUpdates) {
        for (const item of report.sections.support.items) {
          if (item.status === 'pending') {
            outstandingSupport++;
          }
        }
      }

      if (!report.sections.objectives.noUpdates) {
        for (const item of report.sections.objectives.items) {
          if (item.dueDate < todayStr) {
            overdueObjectives++;
          }
        }
      }
    }

    return {
      totalExpectedReports: expectedTeams,
      totalReceivedReports: submittedOrApproved,
      submissionRatePercent: Math.min(100, submissionRate),
      pendingReviewsCount: pendingReviews,
      criticalIssuesCount: criticalIssues,
      totalIssuesCount: totalIssues,
      outstandingSupportCount: outstandingSupport,
      overdueObjectivesCount: overdueObjectives,
    };
  }

  public resetDemoData(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_REPORTS));
    } catch {
      // ignore
    }
  }
}

export const reportRepository = new ReportRepository();
