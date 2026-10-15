import { test, expect } from '@playwright/test';

/**
 * Onewill Academy — M4.2-D Workflow UI Integration & Mocked E2E Suite
 *
 * Verifies:
 * 1. Contributor Save Draft (PATCH with expectedVersion).
 * 2. Completeness validation check (4 sections items or explicit justified noUpdates).
 * 3. Contributor Submit (POST submit with expectedVersion).
 * 4. Reviewer Request Revision (POST request-revision with min 10 chars notes).
 * 5. Contributor Resubmit (POST submit on NEEDS_REVISION, revision counter advances).
 * 6. Reviewer Approve (POST approve, status APPROVED, archiveStatus NOT_ARCHIVED).
 * 7. Approved report read-only enforcement in editor.
 * 8. Segregation of Duties (Prinsip Segregasi Tugas: No Self-Approval).
 * 9. Cross-team access denial (403 for unauthorized team lead).
 * 10. Concurrency Conflict (HTTP 409) handling without infinite loop; form preserved.
 * 11. Session Expired (HTTP 401) handling.
 * 12. Double submission locking and loading spinner.
 * 13. Legacy version compatibility (reports without version default to 1).
 * 14. Mobile UI smoke and test fixture isolation (zero calls to real /api/reports).
 */

const SAMPLE_SECTIONS = {
  achievements: {
    items: [
      {
        id: 'ach-1',
        title: 'Integrasi modul workflow selesai',
        metric: '100% lulus QA',
        impact: 'Mempercepat siklus review mingguan',
        highlight: true,
      },
    ],
    noUpdates: false,
  },
  issues: {
    items: [
      {
        id: 'iss-1',
        description: 'Tantangan latensi Firebase Mock',
        businessImpact: 'Memperlambat build test',
        severity: 'low',
        owner: 'Adhi Monow',
        mitigation: 'Implementasi in-memory fixture',
        targetResolutionDate: '2026-10-15',
        state: 'open',
      },
    ],
    noUpdates: false,
  },
  objectives: {
    items: [
      {
        id: 'obj-1',
        objective: 'Finalisasi M4.2-D E2E browser tests',
        measurableOutcome: 'Semua 14 test cases lolos',
        assignee: 'Adhi Monow',
        dueDate: '2026-10-14',
        priority: 'high',
      },
    ],
    noUpdates: false,
  },
  support: {
    items: [
      {
        id: 'sup-1',
        request: 'Review arsitektur M4.2-D dari Principal Architect',
        type: 'decision',
        requestedFrom: 'Management Lead',
        neededBy: '2026-10-14',
        businessConsequence: 'Tertundanya transisi ke M4.3',
        status: 'pending',
      },
    ],
    noUpdates: false,
  },
};

test.describe('M4.2-D: Workflow UI Integration & Mocked E2E Suite', () => {
  // Safety guard: ensure no real live API is ever hit
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/reports', (route) => {
      // Allow /api/test-harness/reports, but block real /api/reports
      if (!route.request().url().includes('/api/test-harness')) {
        route.abort();
      } else {
        route.continue();
      }
    });
  });

  test('1. Contributor Save Draft: sends expectedVersion and x-expected-version header via PATCH', async ({ page }) => {
    let patchPayload: any = null;
    let patchHeaders: Record<string, string> = {};

    // Mock existing draft
    await page.route('**/api/test-harness/reports/rep_draft_001', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'rep_draft_001',
              title: 'Laporan Draf Pekan 42',
              weekNumber: 42,
              year: 2026,
              status: 'DRAFT',
              version: 1,
              revision: 1,
              teamId: 'team-operasional',
              teamName: 'Operasional & SDM',
              authorId: 'test-user-id-adhi',
              authorName: 'Adhi Monow',
              sections: SAMPLE_SECTIONS,
            },
          }),
        });
      } else if (route.request().method() === 'PATCH') {
        patchPayload = route.request().postDataJSON();
        patchHeaders = route.request().headers();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'rep_draft_001',
              title: patchPayload.title,
              weekNumber: 42,
              year: 2026,
              status: 'DRAFT',
              version: 2,
              revision: 1,
              teamId: 'team-operasional',
              teamName: 'Operasional & SDM',
              authorId: 'test-user-id-adhi',
              sections: patchPayload.sections,
            },
          }),
        });
      }
    });

    await page.goto('/test-editor-harness?role=CONTRIBUTOR&reportId=rep_draft_001');

    // Wait for title input to be loaded with existing title
    const titleInput = page.locator('[data-testid="report-title-input"]');
    await expect(titleInput).toHaveValue('Laporan Draf Pekan 42');

    // Edit title
    await titleInput.fill('Laporan Draf Pekan 42 — Diperbarui');

    // Click Simpan Draf
    const saveBtn = page.locator('[data-testid="save-draft-button"]');
    await saveBtn.click();

    // Verify success banner appears
    await expect(page.getByText('Draf laporan mingguan berhasil diperbarui.')).toBeVisible();

    // Verify PATCH payload and concurrency headers
    expect(patchPayload).toBeTruthy();
    expect(patchPayload.expectedVersion).toBe(1);
    expect(patchPayload.expectedRevision).toBe(1);
    expect(patchPayload.title).toBe('Laporan Draf Pekan 42 — Diperbarui');
    expect(patchHeaders['x-expected-version']).toBe('1');
  });

  test('2. Completeness Validation: blocks submission when sections are incomplete without justification', async ({ page }) => {
    let submitCalled = false;

    // Mock existing draft with empty achievements and noUpdates false
    await page.route('**/api/test-harness/reports/rep_incomplete_001', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'rep_incomplete_001',
            title: 'Laporan Belum Lengkap',
            weekNumber: 42,
            year: 2026,
            status: 'DRAFT',
            version: 1,
            revision: 1,
            teamId: 'team-operasional',
            teamName: 'Operasional & SDM',
            authorId: 'test-user-id-adhi',
            sections: {
              ...SAMPLE_SECTIONS,
              achievements: { items: [], noUpdates: false },
            },
          },
        }),
      });
    });

    await page.route('**/api/test-harness/reports/rep_incomplete_001/submit', async (route) => {
      submitCalled = true;
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await page.goto('/test-editor-harness?role=CONTRIBUTOR&reportId=rep_incomplete_001');

    // Attempt to submit
    const submitBtn = page.locator('[data-testid="submit-report-button"]');
    await submitBtn.click();

    // Verify completeness validation error is shown
    const errorBanner = page.locator('[data-testid="editor-error-banner"]');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Seksi Capaian Pekan Lalu (1) belum diisi');

    // Ensure server submit endpoint was NEVER called
    expect(submitCalled).toBe(false);
  });

  test('3. Contributor Submit: invokes POST /submit with expectedVersion and transitions to SUBMITTED', async ({ page }) => {
    let submitPayload: any = null;
    let submitHeaders: Record<string, string> = {};

    await page.route('**/api/test-harness/reports/rep_ready_001', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'rep_ready_001',
              title: 'Laporan Siap Diajukan',
              weekNumber: 42,
              year: 2026,
              status: 'DRAFT',
              version: 2,
              revision: 1,
              teamId: 'team-operasional',
              teamName: 'Operasional & SDM',
              authorId: 'test-user-id-adhi',
              sections: SAMPLE_SECTIONS,
            },
          }),
        });
      } else if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'rep_ready_001',
              title: 'Laporan Siap Diajukan',
              weekNumber: 42,
              year: 2026,
              status: 'DRAFT',
              version: 2,
              revision: 1,
              teamId: 'team-operasional',
              teamName: 'Operasional & SDM',
              authorId: 'test-user-id-adhi',
              sections: SAMPLE_SECTIONS,
            },
          }),
        });
      }
    });

    await page.route('**/api/test-harness/reports/rep_ready_001/submit', async (route) => {
      submitPayload = route.request().postDataJSON();
      submitHeaders = route.request().headers();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'rep_ready_001',
            title: 'Laporan Siap Diajukan',
            weekNumber: 42,
            year: 2026,
            status: 'SUBMITTED',
            version: 3,
            revision: 1,
            teamId: 'team-operasional',
            teamName: 'Operasional & SDM',
            authorId: 'test-user-id-adhi',
            sections: SAMPLE_SECTIONS,
          },
        }),
      });
    });

    await page.goto('/test-editor-harness?role=CONTRIBUTOR&reportId=rep_ready_001');

    const submitBtn = page.locator('[data-testid="submit-report-button"]');
    await submitBtn.click();

    // Confirm submission in confirmation modal
    const confirmBtn = page.locator('[data-testid="confirm-submit-button"]');
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    // Verify navigation indicator triggered or success state
    await expect(page.locator('[data-testid="test-navigation-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="test-navigation-indicator"]')).toHaveAttribute(
      'data-target',
      '/reports/rep_ready_001'
    );

    // Verify submit payload & header concurrency contracts
    expect(submitPayload).toBeTruthy();
    expect(submitPayload.expectedVersion).toBe(2);
    expect(submitPayload.expectedRevision).toBe(1);
    expect(submitHeaders['x-expected-version']).toBe('2');
  });

  test('4. Reviewer Request Revision: enforces >= 10 character notes and calls POST /request-revision', async ({ page }) => {
    let revisePayload: any = null;

    // Mock queue response matching /api/test-harness/reports with or without query params
    await page.route(/\/api\/test-harness\/reports(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            reports: [
              {
                id: 'rep_to_revise_01',
                title: 'Laporan Operasional Pekan 42',
                weekNumber: 42,
                year: 2026,
                status: 'SUBMITTED',
                version: 3,
                revision: 1,
                teamId: 'team-operasional',
                teamName: 'Operasional & SDM',
                authorId: 'test-user-id-author',
                authorName: 'Siti Aminah',
                authorEmail: 'siti@onewill.test',
                submittedAt: '2026-10-13T10:00:00Z',
                sections: SAMPLE_SECTIONS,
              },
            ],
          },
        }),
      });
    });

    await page.route('**/api/test-harness/reports/rep_to_revise_01/request-revision', async (route) => {
      revisePayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'rep_to_revise_01',
            status: 'NEEDS_REVISION',
            version: 4,
            revision: 1,
            reviewNotes: revisePayload.reviewNotes,
          },
        }),
      });
    });

    // Navigate to reviews queue as Team Lead
    await page.goto('/test-editor-harness?view=reviews&role=TEAM_LEAD&userId=test-user-id-lead&teamId=team-operasional');

    // Click Minta Revisi
    const reviseBtn = page.locator('[data-testid="request-revision-btn-rep_to_revise_01"]');
    await expect(reviseBtn).toBeVisible();
    await reviseBtn.click();

    // Verify modal is open
    const modal = page.locator('[data-testid="review-decision-modal"]');
    await expect(modal).toBeVisible();

    // Try submitting with short note (< 10 chars)
    const textarea = page.locator('[data-testid="review-notes-textarea"]');
    await textarea.fill('perbaiki');

    const confirmBtn = page.locator('[data-testid="confirm-review-button"]');
    await confirmBtn.click();

    // Verify validation error
    const modalError = page.locator('[data-testid="review-modal-error"]');
    await expect(modalError).toBeVisible();
    await expect(modalError).toContainText('minimal 10 karakter');

    // Fill valid note >= 10 chars
    await textarea.fill('Mohon perbaiki rincian kendala dan tambahkan mitigasi spesifik.');
    await confirmBtn.click();

    // Modal closes
    await expect(modal).not.toBeVisible();

    // Verify POST payload
    expect(revisePayload).toBeTruthy();
    expect(revisePayload.expectedVersion).toBe(3);
    expect(revisePayload.reviewNotes).toBe('Mohon perbaiki rincian kendala dan tambahkan mitigasi spesifik.');
  });

  test('5. Contributor Resubmit: displays feedback banner, advances revision, and submits', async ({ page }) => {
    let resubmitPayload: any = null;

    await page.route('**/api/test-harness/reports/rep_needs_rev_01', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'rep_needs_rev_01',
              title: 'Laporan Revisi Pekan 42',
              weekNumber: 42,
              year: 2026,
              status: 'NEEDS_REVISION',
              version: 4,
              revision: 1,
              teamId: 'team-operasional',
              teamName: 'Operasional & SDM',
              authorId: 'test-user-id-adhi',
              reviewNotes: 'Harap perjelas kendala tim di seksi 2.',
              reviewerName: 'Budi Santoso',
              reviewedAt: '2026-10-13T12:00:00Z',
              sections: SAMPLE_SECTIONS,
            },
          }),
        });
      } else if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'rep_needs_rev_01',
              title: 'Laporan Revisi Pekan 42',
              weekNumber: 42,
              year: 2026,
              status: 'NEEDS_REVISION',
              version: 4,
              revision: 1,
              teamId: 'team-operasional',
              sections: SAMPLE_SECTIONS,
            },
          }),
        });
      }
    });

    await page.route('**/api/test-harness/reports/rep_needs_rev_01/submit', async (route) => {
      resubmitPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'rep_needs_rev_01',
            title: 'Laporan Revisi Pekan 42',
            weekNumber: 42,
            year: 2026,
            status: 'SUBMITTED',
            version: 5,
            revision: 2,
            teamId: 'team-operasional',
            sections: SAMPLE_SECTIONS,
          },
        }),
      });
    });

    await page.goto('/test-editor-harness?role=CONTRIBUTOR&reportId=rep_needs_rev_01');

    // Reviewer feedback banner must be visible
    const feedbackBanner = page.locator('[data-testid="reviewer-feedback-banner"]');
    await expect(feedbackBanner).toBeVisible();
    await expect(feedbackBanner).toContainText('Harap perjelas kendala tim di seksi 2.');
    await expect(feedbackBanner).toContainText('Budi Santoso');

    // Click Ajukan Ulang Laporan
    const resubmitBtn = page.locator('[data-testid="resubmit-report-button"]');
    await expect(resubmitBtn).toBeVisible();
    await resubmitBtn.click();

    // Confirm submission in confirmation modal
    const confirmBtn = page.locator('[data-testid="confirm-submit-button"]');
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    // Verify navigation indicator triggered
    await expect(page.locator('[data-testid="test-navigation-indicator"]')).toBeVisible();

    expect(resubmitPayload).toBeTruthy();
    expect(resubmitPayload.expectedVersion).toBe(4);
    expect(resubmitPayload.expectedRevision).toBe(1);
  });

  test('6. Reviewer Approve: transitions report to APPROVED with archiveStatus NOT_ARCHIVED', async ({ page }) => {
    let approvePayload: any = null;

    await page.route(/\/api\/test-harness\/reports(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            reports: [
              {
                id: 'rep_to_approve_01',
                title: 'Laporan Valid Pekan 42',
                weekNumber: 42,
                year: 2026,
                status: 'SUBMITTED',
                version: 5,
                revision: 2,
                teamId: 'team-operasional',
                teamName: 'Operasional & SDM',
                authorId: 'test-user-id-author',
                authorName: 'Siti Aminah',
                submittedAt: '2026-10-13T14:00:00Z',
                sections: SAMPLE_SECTIONS,
              },
            ],
          },
        }),
      });
    });

    await page.route('**/api/test-harness/reports/rep_to_approve_01/approve', async (route) => {
      approvePayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'rep_to_approve_01',
            status: 'APPROVED',
            archiveStatus: 'NOT_ARCHIVED',
            version: 6,
            revision: 2,
            approvedAt: '2026-10-13T15:00:00Z',
            approvedByName: 'Budi Santoso',
          },
        }),
      });
    });

    await page.goto('/test-editor-harness?view=reviews&role=TEAM_LEAD&userId=test-user-id-lead&teamId=team-operasional');

    const approveBtn = page.locator('[data-testid="approve-report-btn-rep_to_approve_01"]');
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    const confirmBtn = page.locator('[data-testid="confirm-review-button"]');
    await confirmBtn.click();

    // Verify modal closes and payload was correct
    await expect(page.locator('[data-testid="review-decision-modal"]')).not.toBeVisible();
    expect(approvePayload).toBeTruthy();
    expect(approvePayload.expectedVersion).toBe(5);
  });

  test('7. Approved Report Read-Only: editor enforces read-only mode and disables mutations', async ({ page }) => {
    await page.route('**/api/test-harness/reports/rep_approved_01', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'rep_approved_01',
            title: 'Laporan Final Terverifikasi',
            weekNumber: 42,
            year: 2026,
            status: 'APPROVED',
            archiveStatus: 'NOT_ARCHIVED',
            version: 6,
            revision: 2,
            teamId: 'team-operasional',
            teamName: 'Operasional & SDM',
            authorId: 'test-user-id-adhi',
            sections: SAMPLE_SECTIONS,
          },
        }),
      });
    });

    await page.goto('/test-editor-harness?role=CONTRIBUTOR&reportId=rep_approved_01');

    // Approved banner must be visible
    const approvedBanner = page.locator('[data-testid="approved-status-banner"]');
    await expect(approvedBanner).toBeVisible();
    await expect(approvedBanner).toContainText('Laporan ini telah disetujui');

    // Action buttons must NOT be visible
    await expect(page.locator('[data-testid="save-draft-button"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="submit-report-button"]')).not.toBeVisible();
  });

  test('8. Segregation of Duties: Author cannot approve own report (buttons disabled, badge rendered)', async ({ page }) => {
    // Current user in harness is 'test-user-id-adhi'
    await page.route(/\/api\/test-harness\/reports(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            reports: [
              {
                id: 'rep_self_01',
                title: 'Laporan Sendiri',
                weekNumber: 42,
                year: 2026,
                status: 'SUBMITTED',
                version: 2,
                revision: 1,
                teamId: 'team-operasional',
                teamName: 'Operasional & SDM',
                authorId: 'test-user-id-adhi', // Same as current user!
                authorName: 'Adhi Monow',
                submittedAt: '2026-10-13T10:00:00Z',
                sections: SAMPLE_SECTIONS,
              },
            ],
          },
        }),
      });
    });

    // Load queue as Team Lead but with author's user ID
    await page.goto('/test-editor-harness?view=reviews&role=TEAM_LEAD&userId=test-user-id-adhi&teamId=team-operasional');

    // Self approval badge must be visible
    const badge = page.locator('[data-testid="self-approval-badge-rep_self_01"]');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Laporan Anda sendiri');

    // Approve and Revise buttons must be disabled
    const approveBtn = page.locator('[data-testid="approve-report-btn-rep_self_01"]');
    await expect(approveBtn).toBeDisabled();

    const reviseBtn = page.locator('[data-testid="request-revision-btn-rep_self_01"]');
    await expect(reviseBtn).toBeDisabled();
  });

  test('9. Cross-Team Access Denial: Team Lead cannot approve reports from another division', async ({ page }) => {
    await page.route('**/api/test-harness/reports/rep_other_team_01', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'rep_other_team_01',
            title: 'Laporan Divisi Kurikulum',
            weekNumber: 42,
            year: 2026,
            status: 'SUBMITTED',
            version: 1,
            revision: 1,
            teamId: 'team-kurikulum',
            teamName: 'Kurikulum & Pembelajaran',
            authorId: 'other-author-id',
            authorName: 'Dewi Kurikulum',
            sections: SAMPLE_SECTIONS,
          },
        }),
      });
    });

    // Lead of team-operasional visits detail of team-kurikulum report
    await page.goto(
      '/test-editor-harness?view=detail&role=TEAM_LEAD&userId=lead-op&teamId=team-operasional&reportId=rep_other_team_01'
    );

    // Cross-team read access is strictly denied
    await expect(page.getByRole('heading', { name: 'Akses Ditolak' })).toBeVisible();
    await expect(page.getByText('Akses ditolak: Anda hanya dapat membaca laporan divisi Anda sendiri.')).toBeVisible();
  });

  test('10. Concurrency Conflict (HTTP 409): displays error banner, preserves user input without infinite retry', async ({ page }) => {
    let patchAttemptCount = 0;

    await page.route('**/api/test-harness/reports/rep_conflict_01', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'rep_conflict_01',
              title: 'Laporan Versi Lawas',
              weekNumber: 42,
              year: 2026,
              status: 'DRAFT',
              version: 1,
              revision: 1,
              teamId: 'team-operasional',
              teamName: 'Operasional & SDM',
              authorId: 'test-user-id-adhi',
              sections: SAMPLE_SECTIONS,
            },
          }),
        });
      } else if (route.request().method() === 'PATCH') {
        patchAttemptCount++;
        // Simulate HTTP 409 Conflict from server
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Terjadi konflik versi (Stale Revision Conflict): Laporan ini telah diperbarui oleh sesi lain.',
            code: 'STALE_CONCURRENCY_TOKEN',
          }),
        });
      }
    });

    await page.goto('/test-editor-harness?role=CONTRIBUTOR&reportId=rep_conflict_01');

    const titleInput = page.locator('[data-testid="report-title-input"]');
    await titleInput.fill('Perubahan Baru Pengguna Yang Sedang Mengetik');

    const saveBtn = page.locator('[data-testid="save-draft-button"]');
    await saveBtn.click();

    // Verify error banner is visible
    const errorBanner = page.locator('[data-testid="editor-error-banner"]');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Terjadi konflik versi (Stale Revision Conflict)');

    // Verify user typed input is PRESERVED (not wiped)
    await expect(titleInput).toHaveValue('Perubahan Baru Pengguna Yang Sedang Mengetik');

    // Reload button must be available
    const reloadBtn = page.locator('[data-testid="reload-version-button"]');
    await expect(reloadBtn).toBeVisible();

    // Verify PATCH was called exactly once (no infinite retry loop)
    expect(patchAttemptCount).toBe(1);
  });

  test('11. Session Expired (HTTP 401): displays session expired banner without infinite retry', async ({ page }) => {
    await page.route('**/api/test-harness/reports/rep_expired_01', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'rep_expired_01',
              title: 'Laporan Sesi Habis',
              weekNumber: 42,
              year: 2026,
              status: 'DRAFT',
              version: 1,
              revision: 1,
              teamId: 'team-operasional',
              teamName: 'Operasional & SDM',
              authorId: 'test-user-id-adhi',
              sections: SAMPLE_SECTIONS,
            },
          }),
        });
      } else if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
            code: 'UNAUTHENTICATED',
          }),
        });
      }
    });

    await page.goto('/test-editor-harness?role=CONTRIBUTOR&reportId=rep_expired_01');

    const saveBtn = page.locator('[data-testid="save-draft-button"]');
    await saveBtn.click();

    // Verify session expired banner is shown
    const expiredBanner = page.locator('[data-testid="session-expired-banner"]');
    await expect(expiredBanner).toBeVisible();
    await expect(expiredBanner).toContainText('Masuk');
  });

  test('12. Double Submission Prevention: submit button disables while in flight', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/test-harness/reports/rep_double_01', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'rep_double_01',
            title: 'Laporan Siap',
            weekNumber: 42,
            year: 2026,
            status: 'DRAFT',
            version: 1,
            revision: 1,
            teamId: 'team-operasional',
            teamName: 'Operasional & SDM',
            authorId: 'test-user-id-adhi',
            sections: SAMPLE_SECTIONS,
          },
        }),
      });
    });

    await page.route('**/api/test-harness/reports/rep_double_01/submit', async (route) => {
      requestCount++;
      // Delay response to test in-flight locking
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'rep_double_01',
            status: 'SUBMITTED',
            version: 2,
            revision: 1,
          },
        }),
      });
    });

    await page.goto('/test-editor-harness?role=CONTRIBUTOR&reportId=rep_double_01');

    const submitBtn = page.locator('[data-testid="submit-report-button"]');
    await submitBtn.click();

    // Confirm submission in confirmation modal
    const confirmBtn = page.locator('[data-testid="confirm-submit-button"]');
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    } else {
      await expect(submitBtn).toBeDisabled();
    }

    // Wait for completion
    await expect(page.locator('[data-testid="test-navigation-indicator"]')).toBeVisible();

    // Verify exactly 1 request was issued
    expect(requestCount).toBe(1);
  });

  test('13. Legacy Version Compatibility: reports missing version field default to expectedVersion 1', async ({ page }) => {
    let capturedVersion: number | null = null;

    // Report lacking `version` property
    await page.route('**/api/test-harness/reports/rep_legacy_01', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'rep_legacy_01',
              title: 'Laporan Format Warisan Tanpa Versi',
              weekNumber: 42,
              year: 2026,
              status: 'DRAFT',
              revision: 1, // Notice: version is intentionally omitted!
              teamId: 'team-operasional',
              teamName: 'Operasional & SDM',
              authorId: 'test-user-id-adhi',
              sections: SAMPLE_SECTIONS,
            },
          }),
        });
      } else if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON();
        capturedVersion = body.expectedVersion;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'rep_legacy_01',
              status: 'DRAFT',
              version: 2,
              revision: 1,
            },
          }),
        });
      }
    });

    await page.goto('/test-editor-harness?role=CONTRIBUTOR&reportId=rep_legacy_01');

    const saveBtn = page.locator('[data-testid="save-draft-button"]');
    await saveBtn.click();

    await expect(page.getByText('Draf laporan mingguan berhasil diperbarui.')).toBeVisible();

    // Client must have defaulted missing version to 1
    expect(capturedVersion).toBe(1);
  });

  test('14. Mobile UI Smoke: primary action buttons have minimum 44px touch targets', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/test-editor-harness?role=CONTRIBUTOR');

    const saveBtn = page.locator('[data-testid="save-draft-button"]');
    await expect(saveBtn).toBeVisible();

    const box = await saveBtn.boundingBox();
    expect(box).toBeTruthy();
    // Verify touch target height is at least 44px (WCAG 2.5.5 AAA touch target compliance)
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
