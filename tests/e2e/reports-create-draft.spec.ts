import { test, expect } from '@playwright/test';

/**
 * Onewill Academy — M4.1-D2 Create Draft UI & Mocked Test Harness E2E Suite
 *
 * Verifies:
 * 1. Valid four-table form input and POST payload without server-owned fields.
 * 2. Client-side Zod validation preventing invalid/empty submissions.
 * 3. HTTP 201 Created success response and navigation.
 * 4. HTTP 400 Bad Request error display and form state preservation.
 * 5. HTTP 401 Session expired state and login action.
 * 6. HTTP 403 states (MUTATIONS_DISABLED, CSRF_REJECTED, DISABLED).
 * 7. HTTP 409 Conflict duplicate reporting period handling.
 * 8. HTTP 500 Internal error safe retry guidance.
 * 9. Double submission locking and loading spinner.
 * 10. Zero localStorage fallback in authenticated live mode.
 * 11. Design Preview Studio isolation (zero backend API calls).
 * 12. Centralized RBAC permissions (inactive user rejection).
 * 13. Test harness isolation (zero network calls to real /api/reports).
 * 14. Real /api/reports rejects unauthenticated requests (HTTP 401).
 * 15. Real /api/reports rejects untrusted Origin (HTTP 403 CSRF_REJECTED).
 */

test.describe('M4.1-D2: Authenticated Create Draft UI Integration', () => {
  test('1. Valid four-table form input generates clean payload without server-owned fields and navigates', async ({ page }) => {
    let capturedPayload: any = null;
    let realApiCalled = false;

    // Track real API to ensure harness never hits it
    await page.route('**/api/reports', (route) => {
      realApiCalled = true;
      route.abort();
    });

    // Intercept mocked harness endpoint
    await page.route('**/api/test-harness/reports', async (route) => {
      if (route.request().method() === 'POST') {
        capturedPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'rep_2026_w41_team-operasional',
              title: capturedPayload?.title,
              status: 'DRAFT',
              weekNumber: 41,
              year: 2026,
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/test-editor-harness?role=CONTRIBUTOR');
    await expect(page.locator('h1')).toContainText('Buat Laporan Mingguan Baru');

    // Fill title
    const titleInput = page.locator('[data-testid="report-title-input"]');
    await titleInput.fill('Laporan Mingguan Operasional — Pekan 41 QA Integration');

    // Click Simpan Draf
    const saveButton = page.locator('[data-testid="save-draft-button"]');
    await saveButton.click();

    // Verify navigation indicator triggered
    await expect(page.locator('[data-testid="test-navigation-indicator"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="test-navigation-indicator"]')).toHaveAttribute(
      'data-target',
      '/reports/rep_2026_w41_team-operasional'
    );

    // Verify real reporting API was NEVER called
    expect(realApiCalled).toBe(false);

    // Verify captured payload matches canonical schema and strips server-owned fields
    expect(capturedPayload).toBeTruthy();
    expect(capturedPayload.weekNumber).toBe(41);
    expect(capturedPayload.year).toBe(2026);
    expect(capturedPayload.weekStartDate).toBe('2026-10-05');
    expect(capturedPayload.weekEndDate).toBe('2026-10-11');
    expect(capturedPayload.title).toBe('Laporan Mingguan Operasional — Pekan 41 QA Integration');
    expect(capturedPayload.sections).toBeDefined();

    // Critical Server-Owned Fields MUST NEVER be sent by client
    expect(capturedPayload.authorId).toBeUndefined();
    expect(capturedPayload.authorName).toBeUndefined();
    expect(capturedPayload.authorEmail).toBeUndefined();
    expect(capturedPayload.teamId).toBeUndefined();
    expect(capturedPayload.teamName).toBeUndefined();
    expect(capturedPayload.role).toBeUndefined();
    expect(capturedPayload.status).toBeUndefined();
    expect(capturedPayload.revision).toBeUndefined();
    expect(capturedPayload.createdAt).toBeUndefined();
    expect(capturedPayload.updatedAt).toBeUndefined();
    expect(capturedPayload.archiveStatus).toBeUndefined();
  });

  test('2. Client-side validation blocks submission and displays error when title is empty', async ({ page }) => {
    let apiCalled = false;
    await page.route('**/api/test-harness/reports', async (route) => {
      apiCalled = true;
      await route.continue();
    });

    await page.goto('/test-editor-harness?role=CONTRIBUTOR');
    const titleInput = page.locator('[data-testid="report-title-input"]');
    await titleInput.clear();

    const saveButton = page.locator('[data-testid="save-draft-button"]');
    await saveButton.click();

    // Error banner should be visible
    const errorBanner = page.locator('[data-testid="editor-error-banner"]');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Judul laporan tidak boleh kosong');

    // No API request should have been fired
    expect(apiCalled).toBe(false);
  });

  test('3. HTTP 400 Bad Request displays validation error and preserves form state', async ({ page }) => {
    await page.route('**/api/test-harness/reports', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            code: 'VALIDATION_ERROR',
            error: 'Validasi Zod: Format tanggal batas pekan tidak sesuai batas ISO.',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/test-editor-harness?role=CONTRIBUTOR');
    const titleInput = page.locator('[data-testid="report-title-input"]');
    await titleInput.fill('Laporan Form State Test Preserved');

    const saveButton = page.locator('[data-testid="save-draft-button"]');
    await saveButton.click();

    const errorBanner = page.locator('[data-testid="editor-error-banner"]');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Format tanggal batas pekan tidak sesuai batas ISO');

    // Form value must remain intact (preserved state)
    await expect(titleInput).toHaveValue('Laporan Form State Test Preserved');
  });

  test('4. HTTP 401 Session Expired displays clear error and login action', async ({ page }) => {
    await page.route('**/api/test-harness/reports', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            code: 'UNAUTHENTICATED',
            error: 'Akses ditolak: Sesi Anda tidak valid atau telah berakhir.',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/test-editor-harness?role=CONTRIBUTOR');
    const saveButton = page.locator('[data-testid="save-draft-button"]');
    await saveButton.click();

    const errorBanner = page.locator('[data-testid="editor-error-banner"]');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Sesi Anda telah berakhir');
    await expect(errorBanner.getByRole('link', { name: 'Masuk' })).toBeVisible();
  });

  test('5. HTTP 403 distinguishes MUTATIONS_DISABLED and CSRF_REJECTED', async ({ page }) => {
    // 5a: MUTATIONS_DISABLED
    await page.route('**/api/test-harness/reports', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            code: 'MUTATIONS_DISABLED',
            error: 'Feature Gate: Firestore report writes are currently disabled on the server.',
          }),
        });
      }
    });

    await page.goto('/test-editor-harness?role=CONTRIBUTOR');
    await page.locator('[data-testid="save-draft-button"]').click();

    const errorBanner = page.locator('[data-testid="editor-error-banner"]');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Feature Gate');

    // 5b: CSRF_REJECTED
    await page.unroute('**/api/test-harness/reports');
    await page.route('**/api/test-harness/reports', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            code: 'CSRF_REJECTED',
            error: 'Akses ditolak: Permintaan tidak berasal dari origin terpercaya.',
          }),
        });
      }
    });

    await page.locator('[data-testid="save-draft-button"]').click();
    await expect(errorBanner).toContainText('CSRF');
  });

  test('6. HTTP 409 Conflict displays duplicate period warning', async ({ page }) => {
    await page.route('**/api/test-harness/reports', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            code: 'REPORT_ALREADY_EXISTS',
            error: 'Laporan mingguan untuk divisi ini pada periode pekan 41 tahun 2026 sudah ada.',
          }),
        });
      }
    });

    await page.goto('/test-editor-harness?role=CONTRIBUTOR');
    await page.locator('[data-testid="save-draft-button"]').click();

    const errorBanner = page.locator('[data-testid="editor-error-banner"]');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('sudah ada');
  });

  test('7. HTTP 500 displays safe retry guidance and preserves state', async ({ page }) => {
    await page.route('**/api/test-harness/reports', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            code: 'INTERNAL_SERVER_ERROR',
            error: 'Terjadi kesalahan internal pada server.',
          }),
        });
      }
    });

    await page.goto('/test-editor-harness?role=CONTRIBUTOR');
    await page.locator('[data-testid="save-draft-button"]').click();

    const errorBanner = page.locator('[data-testid="editor-error-banner"]');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Terjadi kesalahan internal pada server. Formulir Anda tetap aman');
  });

  test('8. Double submission locking prevents duplicate POST requests', async ({ page }) => {
    let postCount = 0;
    await page.route('**/api/test-harness/reports', async (route) => {
      if (route.request().method() === 'POST') {
        postCount++;
        // Artificially delay response to test concurrency lock
        await new Promise((resolve) => setTimeout(resolve, 600));
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'rep_delayed_w41' },
          }),
        });
      }
    });

    await page.goto('/test-editor-harness?role=CONTRIBUTOR');
    const saveButton = page.locator('[data-testid="save-draft-button"]');

    // Trigger initial click
    await saveButton.click();

    // Verify button is disabled during submission
    await expect(saveButton).toBeDisabled();
    await expect(saveButton).toContainText('Menyimpan...');

    // Attempt second click while disabled
    await saveButton.click({ force: true }).catch(() => {});

    await page.waitForTimeout(700);
    expect(postCount).toBe(1);
  });

  test('9. No localStorage fallback in authenticated live mode', async ({ page }) => {
    await page.goto('/test-editor-harness?role=CONTRIBUTOR');

    // Wait for editor to render
    await expect(page.locator('h1')).toBeVisible();

    // Type into title
    const titleInput = page.locator('[data-testid="report-title-input"]');
    await titleInput.fill('Live Mode Typing Test');

    // Wait 1.5 seconds (past the 1.2s debounce of demo autosave)
    await page.waitForTimeout(1500);

    // Verify localStorage has no stored reports
    const stored = await page.evaluate(() => window.localStorage.getItem('onewill_reports_v1'));
    // In live mode, it must NOT save to onewill_reports_v1!
    expect(stored).toBeNull();
  });

  test('10. Design Preview remains isolated and uses synthetic repository without API calls', async ({ page }) => {
    let reportApiCalled = false;
    await page.route(/(api\/reports|api\/test-harness)/, async (route) => {
      reportApiCalled = true;
      await route.continue();
    });

    await page.goto('/test-editor-harness?preview=true');
    await expect(page.locator('h1')).toBeVisible();

    const saveButton = page.locator('[data-testid="save-draft-button"]');
    await saveButton.click();

    // Verify zero calls made to reporting or test harness APIs
    expect(reportApiCalled).toBe(false);
  });

  test('11. Inactive account is blocked from creating reports by centralized RBAC', async ({ page }) => {
    await page.goto('/test-editor-harness?role=CONTRIBUTOR&active=false');

    // Unauthorized warning banner must be visible
    const rbacBanner = page.locator('[data-testid="rbac-unauthorized-banner"]');
    await expect(rbacBanner).toBeVisible();
    await expect(rbacBanner).toContainText('status tidak aktif');

    // Save button must be disabled
    const saveButton = page.locator('[data-testid="save-draft-button"]');
    await expect(saveButton).toBeDisabled();
  });

  test('12. Harness unmocked requests target non-existent test route and cannot hit real /api/reports', async ({ page }) => {
    let realApiCalled = false;
    await page.route('**/api/reports', (route) => {
      realApiCalled = true;
      route.abort();
    });

    await page.goto('/test-editor-harness?role=CONTRIBUTOR');
    const saveButton = page.locator('[data-testid="save-draft-button"]');
    await saveButton.click();

    // Expect error banner because /api/test-harness/reports returns 404 from Next.js
    const errorBanner = page.locator('[data-testid="editor-error-banner"]');
    await expect(errorBanner).toBeVisible();

    // Real API was completely bypassed
    expect(realApiCalled).toBe(false);
  });

  test('13. Real POST /api/reports rejects unauthenticated requests with HTTP 401', async ({ request }) => {
    // Direct server request to real endpoint without session cookie
    const response = await request.post('/api/reports', {
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json',
      },
      data: {
        weekNumber: 41,
        year: 2026,
        weekStartDate: '2026-10-05',
        weekEndDate: '2026-10-11',
        title: 'Unauthorized Test',
        sections: {
          achievements: { items: [], noUpdates: true, noUpdatesReason: 'Tidak ada pembaruan' },
          issues: { items: [], noUpdates: true, noUpdatesReason: 'Tidak ada kendala' },
          objectives: { items: [], noUpdates: true, noUpdatesReason: 'Tidak ada sasaran' },
          support: { items: [], noUpdates: true, noUpdatesReason: 'Tidak ada dukungan' },
        },
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('UNAUTHENTICATED');
  });

  test('14. Real POST /api/reports rejects untrusted Origin with HTTP 403 CSRF_REJECTED', async ({ request }) => {
    const response = await request.post('/api/reports', {
      headers: {
        'Origin': 'http://malicious-attacker-domain.com',
        'Content-Type': 'application/json',
      },
      data: {},
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('CSRF_REJECTED');
  });
});
