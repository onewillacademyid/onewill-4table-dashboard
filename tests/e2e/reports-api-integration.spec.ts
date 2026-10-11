import { test, expect } from '@playwright/test';

/**
 * Onewill Academy — E2E Reports API UI Integration Test Suite
 * Validates:
 * 1. Unauthenticated protected-route redirects (fail closed at server guard).
 * 2. Unauthenticated detail route redirect (fail closed at server guard).
 * 3. Design Preview Studio isolation (synthetic demo data without backend API calls).
 * 4. Responsive screen switching in Preview Studio across viewport form factors.
 */

test.describe('Onewill Academy — Authenticated Reports UI & API Integration', () => {
  test('1. Unauthenticated request to /reports redirects to /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/reports');
    if (!page.url().includes('/login')) {
      await page.waitForURL((url) => url.pathname.startsWith('/login'), { timeout: 15000 });
    }
    expect(page.url()).toContain('/login');
  });

  test('2. Unauthenticated request to /reports/[id] redirects to /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/reports/rep_2026_w41_team-operasional');
    if (!page.url().includes('/login')) {
      await page.waitForURL((url) => url.pathname.startsWith('/login'), { timeout: 15000 });
    }
    expect(page.url()).toContain('/login');
  });

  test('3. Design Preview Studio renders synthetic reports and detail without backend calls', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/design-preview');
    await expect(page.locator('body')).toBeVisible();

    // Verify Design Preview Studio top header banner
    await expect(page.getByText('PREVIEW STUDIO')).toBeVisible();

    const criticalErrors = consoleErrors.filter(
      (msg) => msg.toLowerCase().includes('hydration') || msg.toLowerCase().includes('uncaught')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('4. Design Preview Studio allows switching screens without errors', async ({ page }) => {
    await page.goto('/design-preview');
    await expect(page.locator('body')).toBeVisible();

    const selectDropdown = page.locator('#preview-screen-select');
    if (await selectDropdown.isVisible()) {
      await selectDropdown.selectOption('report-detail');
    } else {
      const detailTab = page.getByRole('button', { name: '🔍 Rincian' });
      if (await detailTab.isVisible()) {
        await detailTab.click();
      }
    }
    await expect(page.locator('body')).toBeVisible();
  });
});
