import { test, expect } from '@playwright/test';

test.describe('RE-THINK Guest Journey', () => {
  test('should load landing page, open modal, authenticate as guest, and load sanctuary', async ({ page }) => {
    // Inject mock Turnstile before page load to prevent hangs on offline script loading
    await page.addInitScript(() => {
      window.turnstile = {
        render: (selector: unknown, options: unknown) => {
          console.log('Mocked Turnstile Render');
          const opts = options as { callback?: (token: string) => void } | null | undefined;
          if (opts && opts.callback) {
            setTimeout(() => opts.callback('mock-turnstile-token'), 50);
          }
          return 'mock-widget-id';
        },
        reset: () => {},
        remove: () => {},
      };
    });

    // Intercept API calls to mock auth and bind-session backend endpoints
    await page.route('**/api/auth/test-login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            uid: 'guest-uid-123',
            username: 'GuestUser',
            email: 'guest@rethink.space',
          },
          token: 'mock-jwt-token-xyz',
        }),
      });
    });

    await page.route('**/api/auth/bind-session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Go to landing page
    await page.goto('/');

    // Wait for the "进入" button to be visible (allows time for Vite dev compilation)
    const enterButton = page.locator('button:has-text("进入")');
    await expect(enterButton).toBeVisible({ timeout: 15000 });
    await enterButton.click({ force: true });

    // Verify Guest Access option is visible and click it
    const guestAccessButton = page.locator('button[aria-label="访客体验"]');
    await expect(guestAccessButton).toBeVisible({ timeout: 10000 });
    await guestAccessButton.click();

    // Verify sanctuary / welcome greeting is displayed
    const welcomeHeader = page.locator('h1:has-text("你好，欢迎来到这里")');
    await expect(welcomeHeader).toBeVisible({ timeout: 15000 });

    // Verify start conversation button is present
    const startButton = page.locator('button:has-text("开始对话")');
    await expect(startButton).toBeVisible();
  });
});
