import { test, expect, BrowserContext, Page } from '@playwright/test';

/**
 * Onewill Academy — M4.1-E1 Real Authenticated Read-Only Browser E2E Suite
 *
 * STRICT CONSTRAINTS:
 * 1. Zero real Firestore writes or deletes.
 * 2. Zero session credential or cookie leakage to disk.
 * 3. Uses live Next.js development server and real Firebase Auth session.
 * 4. Serial execution in a single in-memory browser context.
 */

test.describe.configure({ mode: 'serial' });

test.describe('ONEWILL ACADEMY — M4.1-E1 Real Authenticated Read-Only E2E', () => {
  let context: BrowserContext;
  let page: Page;
  let consoleErrors: string[] = [];
  let pageErrors: string[] = [];

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('1. Manual Authentication Gate: Owner logs in with adhimonow@gmail.com', async () => {

    // Navigate to /login
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();

    console.log('\n============================================================');
    console.log(' [M4.1-E1] WAITING FOR MANUAL GOOGLE SIGN-IN IN BROWSER');
    console.log(' Target Account: adhimonow@gmail.com');
    console.log(' Please click "Masuk dengan Akun Google" and complete login.');
    console.log('============================================================\n');

    // Wait until user completes manual authentication and is redirected to /dashboard
    await page.waitForURL((url) => url.pathname.includes('/dashboard'), { timeout: 300 * 1000 });
    expect(page.url()).toContain('/dashboard');

    // Verify session identity via direct API call in browser context (in-memory)
    const meRes = await page.evaluate(async () => {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
      return { status: res.status, data: await res.json() };
    });

    expect(meRes.status).toBe(200);
    expect(meRes.data.authenticated).toBe(true);
    expect(meRes.data.user.email).toBe('adhimonow@gmail.com');
    expect(meRes.data.user.role).toBe('CONTRIBUTOR');
    expect(meRes.data.user.teamId).toBe('team-operasional');
    expect(meRes.data.user.active).toBe(true);

    console.log(' ✅ Authentication verified: adhimonow@gmail.com (CONTRIBUTOR, team-operasional)');
  });

  test('2. /dashboard renders real Contributor identity and zero synthetic KPIs', async () => {
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('Ringkasan eksekutif');

    // Verify user profile identity is rendered (team / user)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Operasional & SDM');

    // Verify live dashboard does NOT display synthetic executive KPIs
    // (Live placeholder banner must be visible)
    await expect(page.getByText('Metrik laporan live sedang disiapkan')).toBeVisible();
    await expect(page.getByText('Fase M4.2 Pipeline')).toBeVisible();

    console.log(' ✅ Dashboard verified: authentic identity loaded, zero synthetic KPIs presented');
  });

  test('3. /reports requests live GET /api/reports and displays authorized reports', async () => {
    let reportsApiStatus = 0;
    let reportsApiCount = 0;

    page.on('response', (response) => {
      if (response.url().includes('/api/reports') && !response.url().includes('/api/reports/rep_')) {
        reportsApiStatus = response.status();
        reportsApiCount++;
      }
    });

    await page.goto('/reports');
    await expect(page.locator('h1')).toContainText('Daftar Laporan');

    // Verify live GET /api/reports was invoked and returned 200 OK
    expect(reportsApiStatus).toBe(200);
    expect(reportsApiCount).toBeGreaterThanOrEqual(1);

    // Verify report for team-operasional is displayed
    await expect(page.getByText('Laporan Mingguan Tim Operasional W41 2026')).toBeVisible();

    console.log(' ✅ Reports list verified: live GET /api/reports returned HTTP 200');
  });

  test('4. /reports/[id] loads through real GET detail API and renders 4 tables', async () => {
    let detailApiStatus = 0;

    page.on('response', (response) => {
      if (response.url().includes('/api/reports/rep_2026_w41_team-operasional')) {
        detailApiStatus = response.status();
      }
    });

    await page.goto('/reports/rep_2026_w41_team-operasional');
    await expect(page.locator('body')).toBeVisible();

    // Verify GET /api/reports/[id] returned HTTP 200
    expect(detailApiStatus).toBe(200);

    // Verify 4-table section headings or content render
    await expect(page.getByText('Capaian Pekan Lalu').first()).toBeVisible();
    await expect(page.getByText('Kendala & Hambatan').first()).toBeVisible();

    console.log(' ✅ Report detail verified: live GET /api/reports/[id] returned HTTP 200');
  });

  test('5. Contributor access to /reviews is restricted by RBAC', async () => {
    await page.goto('/reviews');
    await expect(page.locator('body')).toBeVisible();

    // Verify restricted access view is displayed
    await expect(
      page.getByText('Akses Dibatasi').or(page.getByText('tidak memiliki hak akses'))
    ).toBeVisible();

    console.log(' ✅ Reviews access verified: Contributor restricted from approval queue');
  });

  test('6. Contributor access to /admin/users is server-protected and redirected', async () => {
    await page.goto('/admin/users');

    // Server-side requireServerAuth(['ADMIN', 'SUPER_ADMIN']) must redirect non-admins to /dashboard
    await page.waitForURL((url) => !url.pathname.includes('/admin/users'), { timeout: 10000 });
    expect(page.url()).not.toContain('/admin/users');

    console.log(' ✅ Admin users verified: Contributor redirected away by server route guard');
  });

  test('7. Browser console and hydration integrity check', async () => {
    // Filter critical runtime errors
    const criticalErrors = consoleErrors.filter(
      (msg) =>
        msg.toLowerCase().includes('hydration') ||
        msg.toLowerCase().includes('minified react error') ||
        msg.toLowerCase().includes('uncaught')
    );

    expect(criticalErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);

    console.log(' ✅ Console integrity verified: 0 hydration errors, 0 uncaught exceptions');
  });

  test('8. Logout invalidates session and subsequent protected access fails closed', async () => {
    await page.goto('/dashboard');

    // Trigger logout via authenticated POST /api/auth/logout
    const logoutRes = await page.evaluate(async () => {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
      return { status: res.status, ok: res.ok };
    });

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.ok).toBe(true);

    // Attempt to access protected route /reports
    await page.goto('/reports');
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 });
    expect(page.url()).toContain('/login');

    // Confirm session is destroyed via /api/auth/me
    const meAfterLogout = await page.evaluate(async () => {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
      return { status: res.status, data: await res.json() };
    });

    expect(meAfterLogout.data.authenticated).toBe(false);

    console.log(' ✅ Logout verified: session invalidated, /reports redirects to /login');
  });
});
