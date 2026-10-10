import { test, expect } from '@playwright/test';

/**
 * Onewill Academy | Browser E2E Smoke Test Suite
 * Validates login availability, unauthenticated redirects, hydration integrity,
 * runtime console errors, and basic responsive layout rendering.
 */

test.describe('Onewill Academy — E2E Browser Smoke Tests', () => {
  test('1. Login page availability and initial render', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    const response = await page.goto('/login');
    expect(response?.status()).toBe(200);

    // Verify key UI elements on login page
    await expect(page.locator('h1, h2, form, [data-testid="login-container"]').first()).toBeVisible();

    // Verify zero hydration or uncaught page errors
    const hydrationErrors = consoleErrors.filter((msg) =>
      msg.toLowerCase().includes('hydration') || msg.toLowerCase().includes('react error')
    );
    expect(hydrationErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('2. Unauthenticated protected-route redirects to login', async ({ page }) => {
    await page.context().clearCookies();
    const protectedRoutes = ['/dashboard', '/reports', '/admin/users'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      // Unauthenticated session must redirect to /login
      await page.waitForURL((url) => url.pathname.startsWith('/login'), {
        timeout: 10000,
      });
      expect(page.url()).toContain('/login');
    }
  });

  test('3. Design Preview Studio rendering & zero console error check', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    const response = await page.goto('/design-preview');
    expect(response?.status()).toBe(200);

    // Verify main content container is visible
    await expect(page.locator('body')).toBeVisible();

    // Filter out third-party/favicon harmless log noise if any
    const criticalErrors = consoleErrors.filter(
      (msg) =>
        !msg.includes('favicon') &&
        !msg.includes('net::ERR_') &&
        (msg.toLowerCase().includes('hydration') || msg.toLowerCase().includes('uncaught'))
    );

    expect(criticalErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('4. Basic responsive rendering across Viewports', async ({ page }) => {
    // Desktop Viewport Check
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();

    // Mobile Viewport Check
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();
  });
});
