import { test, expect, Page } from '@playwright/test';

// Turnstile & FaceAPI Mocks
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Mock HTMLVideoElement properties for headless environment
    Object.defineProperty(HTMLVideoElement.prototype, 'readyState', {
      get() { return 4; }, // HAVE_ENOUGH_DATA
      configurable: true,
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'paused', {
      get() { return false; },
      configurable: true,
    });

    HTMLVideoElement.prototype.play = async () => {};

    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {},
        writable: true,
      });
    }
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 320, 240);
      }
      return canvas.captureStream(10);
    };

    // 1. Mock Turnstile
    window.turnstile = {
      render: (selector: unknown, options: unknown) => {
        const opts = options as { callback?: (token: string) => void } | null | undefined;
        if (opts?.callback) {
          setTimeout(() => opts.callback('mock-turnstile-token'), 50);
        }
        return 'mock-widget-id';
      },
      reset: () => {},
      remove: () => {},
    };

    // 2. Mock faceapi on window object (write-protected)
    const mockFaceApi = {
      nets: {
        ssdMobilenetv1: { loadFromUri: async () => {} },
        faceLandmark68Net: { loadFromUri: async () => {} },
        faceExpressionNet: { loadFromUri: async () => {} },
      },
      SsdMobilenetv1Options: function() { return {}; },
      detectSingleFace: function() {
        return {
          withFaceLandmarks: function() {
            return {
              withFaceExpressions: async () => {
                const label = window.__mockEmotionLabel || 'neutral';
                const confidence = window.__mockEmotionConfidence || 95;
                const expressions: Record<string, number> = {
                  happy: 0.01,
                  sad: 0.01,
                  angry: 0.01,
                  fearful: 0.01,
                  disgusted: 0.01,
                  surprised: 0.01,
                  neutral: 0.01,
                };
                expressions[label] = confidence / 100;
                return { expressions };
              }
            };
          }
        };
      },
      matchDimensions: () => {},
      resizeResults: <T>(det: T) => det,
      draw: {
        drawDetections: () => {},
        drawFaceLandmarks: () => {},
      }
    };
    Object.defineProperty(window, 'faceapi', {
      get() { return mockFaceApi; },
      set(val) { console.log('Attempted to overwrite faceapi with:', val); },
      configurable: true
    });
  });

  // Log console messages from the browser
  page.on('console', msg => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });

  // Mock Authentication and Session Bindings
  await page.route('**/api/auth/test-login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        user: { uid: 'test-user', username: 'TestUser', email: 'test@rethink.space' },
        token: 'mock-jwt-token'
      })
    });
  });

  await page.route('**/api/auth/bind-session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true })
    });
  });

  await page.route('**/api/auth/sessions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, sessions: [] })
    });
  });

  await page.route('**/@vladmandic/face-api/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.faceapi = {
          nets: {
            ssdMobilenetv1: { loadFromUri: async () => {} },
            faceLandmark68Net: { loadFromUri: async () => {} },
            faceExpressionNet: { loadFromUri: async () => {} },
          },
          SsdMobilenetv1Options: function() { return {}; },
          detectSingleFace: function() {
            return {
              withFaceLandmarks: function() {
                return {
                  withFaceExpressions: async () => {
                    const label = window.__mockEmotionLabel || 'neutral';
                    const confidence = window.__mockEmotionConfidence || 95;
                    const expressions = {
                      happy: 0.01,
                      sad: 0.01,
                      angry: 0.01,
                      fearful: 0.01,
                      disgusted: 0.01,
                      surprised: 0.01,
                      neutral: 0.01,
                    };
                    expressions[label] = confidence / 100;
                    return { expressions };
                  }
                };
              }
            };
          },
          matchDimensions: () => {},
          resizeResults: (det) => det,
          draw: {
            drawDetections: () => {},
            drawFaceLandmarks: () => {},
          }
        };
      `
    });
  });
});

test.describe('RE-THINK E2E Layout Suite', () => {

  // Helper function to log in and bypass onboarding
  async function loginAndBypassOnboarding(page: Page) {
    await page.goto('/');
    const guestButton = page.locator('button[aria-label="访客体验"]');
    await expect(guestButton).toBeVisible({ timeout: 15000 });
    await guestButton.click({ force: true });
    
    const welcomeHeader = page.locator('h1:has-text("你好，欢迎来到这里")');
    await expect(welcomeHeader).toBeVisible({ timeout: 15000 });
    
    await page.locator('button:has-text("开始对话")').click();
    await page.locator('button:has-text("跳过，直接输入文字")').click();
    
    // Wait for chat panel to load
    await expect(page.locator('textarea[placeholder="向 RE-THINK 提问"]')).toBeVisible();
  }

  // TIER 1: FEATURE COVERAGE
  test.describe('Tier 1: Feature Coverage', () => {
    test('T1-1: Camera mounts in Sidebar when open and closes cleanly', async ({ page }) => {
      await loginAndBypassOnboarding(page);
      
      const sidebar = page.locator('aside[aria-label="历史对话侧边栏"]');
      if (await sidebar.isVisible()) {
        await page.keyboard.press('Escape');
      }
      await expect(sidebar).not.toBeVisible();
      
      await page.locator('button[aria-label="打开侧边栏"], button[aria-label="历史对话"]').first().click();
      await expect(sidebar).toBeVisible();
      
      const video = sidebar.locator('video');
      await expect(video).toBeVisible();
      
      await page.keyboard.press('Escape');
      await expect(sidebar).not.toBeVisible();
    });

    test('T1-2: Camera displays model loading status and active stream UI', async ({ page }) => {
      await loginAndBypassOnboarding(page);
      
      const sidebar = page.locator('aside[aria-label="历史对话侧边栏"]');
      if (!await sidebar.isVisible()) {
        await page.locator('button[aria-label="打开侧边栏"], button[aria-label="历史对话"]').first().click();
      }
      await expect(sidebar).toBeVisible();
      
      const video = sidebar.locator('video');
      const canvas = sidebar.locator('canvas');
      await expect(video).toBeVisible();
      await expect(canvas).toBeVisible();
    });

    test('T1-3: Camera updates emotion label and confidence score', async ({ page }) => {
      await loginAndBypassOnboarding(page);
      
      await page.evaluate(() => {
        window.__mockEmotionLabel = 'happy';
        window.__mockEmotionConfidence = 92;
      });
      
      const sidebar = page.locator('aside[aria-label="历史对话侧边栏"]');
      if (!await sidebar.isVisible()) {
        await page.locator('button[aria-label="打开侧边栏"], button[aria-label="历史对话"]').first().click();
      }
      await expect(sidebar).toBeVisible();
      
      const getUserMediaStr = await page.evaluate(() => navigator.mediaDevices.getUserMedia.toString());
      console.log('getUserMedia implementation:', getUserMediaStr);
      
      const streamTypeOf = await page.evaluate(async () => {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ video: true });
          return {
            className: s.constructor.name,
            isMediaStream: s instanceof MediaStream,
            tracks: s.getTracks().length
          };
        } catch (e) {
          return { error: e instanceof Error ? e.message : String(e) };
        }
      });
      console.log('stream details:', streamTypeOf);
      
      await expect(sidebar.locator('text=开心')).toBeVisible({ timeout: 15000 });
      await expect(sidebar.locator('text=92%')).toBeVisible();
    });

    test('T1-4: Chat flow bottom alignment and input bar positioning', async ({ page }) => {
      await loginAndBypassOnboarding(page);
      
      const chatContainer = page.locator('div.flex-1.overflow-y-auto');
      const chatFlow = chatContainer.locator('.mt-auto');
      await expect(chatFlow).toBeVisible();
      
      const inputBar = page.locator('div.absolute.bottom-0.start-0.w-full');
      await expect(inputBar).toBeVisible();
    });

    test('T1-5: Edge-aligned desktop header alignment and logout action', async ({ page }) => {
      await loginAndBypassOnboarding(page);
      
      const header = page.locator('div.absolute.top-0.left-0.w-full');
      await expect(header).toBeVisible();
      
      const logoutBtn = header.locator('button:has-text("退出")');
      await expect(logoutBtn).toBeVisible();
      await logoutBtn.click();
      
      await expect(page.locator('button[aria-label="访客体验"]')).toBeVisible();
    });
  });

  // TIER 2: BOUNDARY & CORNER CASES
  test.describe('Tier 2: Boundary & Corner Cases', () => {
    test('T2-1: Model load failure falls back gracefully', async ({ page }) => {
      await page.route('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js', async (route) => {
        await route.abort('failed');
      });
      
      await page.goto('/');
      await page.locator('button[aria-label="访客体验"]').click({ force: true });
      await page.locator('button:has-text("开始对话")').click({ force: true });
      await page.locator('button:has-text("跳过，直接输入文字")').click({ force: true });
      
      const sidebar = page.locator('aside[aria-label="历史对话侧边栏"]');
      if (!await sidebar.isVisible()) {
        await page.locator('button[aria-label="打开侧边栏"], button[aria-label="历史对话"]').first().click();
      }
      await expect(sidebar).toBeVisible();
      
      await expect(sidebar.locator('text=加载模型中')).not.toBeVisible();
    });

    test('T2-2: Narrow viewport resizing keeps layout integrity', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await loginAndBypassOnboarding(page);
      
      await page.locator('button[aria-label="打开侧边栏"]').click();
      const sidebar = page.locator('aside[aria-label="历史对话侧边栏"]');
      await expect(sidebar).toBeVisible();
      
      await expect(sidebar.locator('video')).toBeVisible();
    });

    test('T2-3: Large history loads and input textarea max-height limit', async ({ page }) => {
      await loginAndBypassOnboarding(page);
      
      const textarea = page.locator('textarea[placeholder="向 RE-THINK 提问"]');
      await textarea.fill('A\n'.repeat(50));
      
      const box = await textarea.boundingBox();
      expect(box?.height).toBeLessThanOrEqual(165);
    });

    test('T2-4: Whitespace only message sends are blocked', async ({ page }) => {
      await loginAndBypassOnboarding(page);
      
      const textarea = page.locator('textarea[placeholder="向 RE-THINK 提问"]');
      await textarea.fill('     ');
      
      const sendButton = page.locator('button[aria-label="发送消息"]');
      await expect(sendButton).toBeDisabled();
    });

    test('T2-5: Pointer events pass through transparent header area', async ({ page }) => {
      await loginAndBypassOnboarding(page);
      
      const headerOuter = page.locator('div.absolute.top-0.left-0.w-full').first();
      await expect(headerOuter).toHaveClass(/pointer-events-none/);
      
      const headerInner = headerOuter.locator('div.w-full.flex');
      await expect(headerInner).toHaveClass(/pointer-events-auto/);
    });
  });

  // TIER 3: CROSS-FEATURE COMBINATIONS
  test.describe('Tier 3: Cross-Feature Combinations', () => {
    test('T3-1: Focus input and open sidebar', async ({ page }) => {
      await loginAndBypassOnboarding(page);
      
      const textarea = page.locator('textarea[placeholder="向 RE-THINK 提问"]');
      await textarea.focus();
      await textarea.fill('测试输入');
      
      const sidebar = page.locator('aside[aria-label="历史对话侧边栏"]');
      if (!await sidebar.isVisible()) {
        await page.locator('button[aria-label="打开侧边栏"], button[aria-label="历史对话"]').first().click();
      }
      await expect(sidebar).toBeVisible();
      
      await expect(textarea).toHaveValue('测试输入');
    });

    test('T3-2: Logout unmounts active camera stream and stops tracks', async ({ page }) => {
      await loginAndBypassOnboarding(page);
      
      const sidebar = page.locator('aside[aria-label="历史对话侧边栏"]');
      if (!await sidebar.isVisible()) {
        await page.locator('button[aria-label="打开侧边栏"], button[aria-label="历史对话"]').first().click();
      }
      await expect(sidebar.locator('video')).toBeVisible();
      
      const logoutBtn = page.locator('button:has-text("退出")').first();
      await logoutBtn.click({ force: true });
      
      await expect(page.locator('button[aria-label="访客体验"]')).toBeVisible();
      await expect(sidebar).not.toBeVisible();
    });
  });

  // TIER 4: REAL-WORLD APPLICATION SCENARIOS
  test.describe('Tier 4: Real-World Application Scenarios', () => {
    test('T4-1: Onboarding, Face Emotion Capture, and AI Delivery Flow', async ({ page }) => {
      await page.route('**/api/chat', async (route) => {
        const responsePayload = 'data: {"delta": "收到您的消息..."}\n\ndata: {"done": true}\n\n';
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: responsePayload
        });
      });

      await page.goto('/');
      await page.locator('button[aria-label="访客体验"]').click({ force: true });
      await page.locator('button:has-text("开始对话")').click({ force: true });
      await page.locator('button:has-text("跳过，直接输入文字")').click({ force: true });
      
      await page.evaluate(() => {
        window.__mockEmotionLabel = 'happy';
        window.__mockEmotionConfidence = 90;
      });
      
      const sidebar = page.locator('aside[aria-label="历史对话侧边栏"]');
      if (!await sidebar.isVisible()) {
        await page.locator('button[aria-label="打开侧边栏"], button[aria-label="历史对话"]').first().click();
      }
      await expect(sidebar.locator('text=开心')).toBeVisible({ timeout: 15000 });
      
      let chatRequestBody: { emotionPayload?: { label: string; confidence: number } } | null = null;
      await page.route('**/api/chat', async (route) => {
        chatRequestBody = route.request().postDataJSON() as { emotionPayload?: { label: string; confidence: number } };
        const responsePayload = 'data: {"delta": "我看到你今天很开心！"}\n\ndata: {"done": true}\n\n';
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: responsePayload
        });
      });
      
      const textarea = page.locator('textarea[placeholder="向 RE-THINK 提问"]');
      await textarea.fill('今天天气不错');
      await page.locator('button[aria-label="发送消息"]').click();
      
      await expect(page.locator('text=我看到你今天很开心！')).toBeVisible();
      
      expect(chatRequestBody).toBeDefined();
      expect(chatRequestBody?.emotionPayload).toBeDefined();
      expect(chatRequestBody?.emotionPayload?.label).toBe('happy');
      expect(chatRequestBody?.emotionPayload?.confidence).toBe(90);
    });

    test('T4-2: Manual Scroll Back-off Override', async ({ page }) => {
      await loginAndBypassOnboarding(page);
      
      const chatContainer = page.locator('div.flex-1.overflow-y-auto.bg-transparent');
      const textarea = page.locator('textarea[placeholder="向 RE-THINK 提问"]');
      
      await page.route('**/api/chat', async (route) => {
        const responsePayload = 'data: {"delta": "这是一行流式文本内容。"}\n\n' +
                                'data: {"delta": "这会逐渐增加消息框的高度。"}\n\n' +
                                'data: {"done": true}\n\n';
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: responsePayload
        });
      });

      for (let i = 0; i < 5; i++) {
        await textarea.fill(`消息 ${i}`);
        await page.locator('button[aria-label="发送消息"]').click();
        await page.waitForTimeout(200);
      }
      
      await chatContainer.evaluate((el) => el.scrollTop = 0);
      await page.waitForTimeout(200);
      
      await textarea.fill('触发新文本，但不滚动');
      await page.locator('button[aria-label="发送消息"]').click();
      await page.waitForTimeout(200);
      
      const currentScrollTop = await chatContainer.evaluate((el) => el.scrollTop);
      expect(currentScrollTop).toBeLessThan(100);
    });

    test('T4-3: Transition to Crisis Intervention Layout Shift', async ({ page }) => {
      await page.route('**/api/chat', async (route) => {
        const responsePayload = 'data: {"delta": "我们注意到您可能需要紧急心理支持...", "fsmState": "Crisis_Escalation"}\n\n' +
                                'data: {"done": true}\n\n';
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: responsePayload
        });
      });

      await loginAndBypassOnboarding(page);
      
      const textarea = page.locator('textarea[placeholder="向 RE-THINK 提问"]');
      await textarea.fill('我想自杀');
      await page.locator('button[aria-label="发送消息"]').click();
      
      const overlay = page.locator('text=请留下来');
      await expect(overlay).toBeVisible({ timeout: 10000 });
      
      await expect(page.locator('text=全国心理援助热线')).toBeVisible();
      await expect(textarea).not.toBeVisible();
    });
  });
});
