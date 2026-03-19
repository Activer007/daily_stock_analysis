import { expect, test, type Page } from '@playwright/test';

const smokePassword = process.env.DSA_WEB_SMOKE_PASSWORD;

async function login(page: Page) {
  test.skip(!smokePassword, 'Set DSA_WEB_SMOKE_PASSWORD to run report markdown tests.');

  // Navigate to login page
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Wait for password input to be visible
  await expect(page.locator('#password')).toBeVisible({ timeout: 10_000 });

  // Fill password and submit
  await page.locator('#password').fill(smokePassword!);

  // Wait for and click the submit button
  const submitButton = page.getByRole('button', { name: /授权进入工作台|完成设置并登录/ });
  await expect(submitButton).toBeVisible();

  await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes('/api/v1/auth/login') && response.status() === 200,
      { timeout: 15_000 }
    ),
    submitButton.click(),
  ]);

  // Wait for navigation to home page after login
  await page.waitForURL('/', { timeout: 15_000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
}

test.describe('ReportMarkdown component', () => {
  test('copy markdown source code', async ({ page }) => {
    await login(page);

    // Navigate to history page
    await page.getByRole('link', { name: '首页' }).click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Wait for history panel to load
    await expect(page.getByText('历史分析')).toBeVisible({ timeout: 10_000 });

    // Find and click the "查看完整报告" button
    const viewReportButton = page.getByRole('button', { name: '查看完整报告' }).first();
    await expect(viewReportButton).toBeVisible({ timeout: 10_000 });
    await viewReportButton.click();

    // Wait for drawer to open
    await page.waitForTimeout(500);

    // Verify drawer content is visible
    await expect(page.getByText('完整分析报告')).toBeVisible();

    // Click copy markdown button
    const copyMarkdownButton = page.getByRole('button', { name: '复制 Markdown 源码' });
    await expect(copyMarkdownButton).toBeVisible({ timeout: 5000 });
    await copyMarkdownButton.click();

    // Verify clipboard contains markdown content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBeTruthy();
    expect(clipboardText.length).toBeGreaterThan(0);

    // Verify checkmark icon is shown
    const checkmarkIcon = page.locator('button[aria-label="复制 Markdown 源码"] svg.text-success');
    await expect(checkmarkIcon).toBeVisible();

    // Wait for icon to revert
    await page.waitForTimeout(2500);
    await expect(checkmarkIcon).not.toBeVisible();
  });

  test('copy plain text', async ({ page }) => {
    await login(page);

    // Navigate to history page
    await page.getByRole('link', { name: '首页' }).click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Wait for history panel to load
    await expect(page.getByText('历史分析')).toBeVisible({ timeout: 10_000 });

    // Find and click the "查看完整报告" button
    const viewReportButton = page.getByRole('button', { name: '查看完整报告' }).first();
    await expect(viewReportButton).toBeVisible({ timeout: 10_000 });
    await viewReportButton.click();

    // Wait for drawer to open
    await page.waitForTimeout(500);

    // Verify drawer content is visible
    await expect(page.getByText('完整分析报告')).toBeVisible();

    // Click copy plain text button
    const copyPlainTextButton = page.getByRole('button', { name: '复制纯文本' });
    await expect(copyPlainTextButton).toBeVisible({ timeout: 5000 });
    await copyPlainTextButton.click();

    // Verify clipboard contains text without markdown symbols
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBeTruthy();
    expect(clipboardText.length).toBeGreaterThan(0);

    // Verify it's plain text (no markdown symbols like #, **, >, etc.)
    expect(clipboardText).not.toMatch(/^#{1,6}\s+/m); // No headers
    expect(clipboardText).not.toMatch(/\*\*[^*]+\*\*/); // No bold
    // Verify table syntax is removed (no standalone pipe separators)
    const lines = clipboardText.split('\n');
    const hasTableSeparators = lines.some(line =>
      line.match(/^\|[\s|:-]+\|$/) || line.match(/^[\s|:-]+$/)
    );
    expect(hasTableSeparators).toBeFalsy();

    // Verify checkmark icon is shown
    const checkmarkIcon = page.locator('button[aria-label="复制纯文本"] svg.text-success');
    await expect(checkmarkIcon).toBeVisible();

    // Wait for icon to revert
    await page.waitForTimeout(2500);
    await expect(checkmarkIcon).not.toBeVisible();
  });

  test('mobile responsive layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    await login(page);

    // Navigate to history page
    await page.getByRole('link', { name: '首页' }).click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Wait for history panel to load
    await expect(page.getByText('历史分析')).toBeVisible({ timeout: 10_000 });

    // Find and click the "查看完整报告" button
    const viewReportButton = page.getByRole('button', { name: '查看完整报告' }).first();
    await expect(viewReportButton).toBeVisible({ timeout: 10_000 });
    await viewReportButton.click();

    // Wait for drawer to open
    await page.waitForTimeout(500);

    // Verify drawer content is visible
    await expect(page.getByText('完整分析报告')).toBeVisible();

    // Verify toolbar buttons are visible and clickable on mobile
    const copyMarkdownButton = page.getByRole('button', { name: '复制 Markdown 源码' });
    const copyPlainTextButton = page.getByRole('button', { name: '复制纯文本' });

    await expect(copyMarkdownButton).toBeVisible({ timeout: 5000 });
    await expect(copyPlainTextButton).toBeVisible();

    // Verify buttons are clickable
    await copyMarkdownButton.click();
    await expect(page.locator('button[aria-label="复制 Markdown 源码"] svg.text-success')).toBeVisible();

    await page.waitForTimeout(2500);
    await copyPlainTextButton.click();
    await expect(page.locator('button[aria-label="复制纯文本"] svg.text-success')).toBeVisible();
  });

  test('buttons are disabled during loading', async ({ page }) => {
    await login(page);

    // Navigate to history page
    await page.getByRole('link', { name: '首页' }).click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Wait for history panel to load
    await expect(page.getByText('历史分析')).toBeVisible({ timeout: 10_000 });

    // Find and click the "查看完整报告" button
    const viewReportButton = page.getByRole('button', { name: '查看完整报告' }).first();
    await expect(viewReportButton).toBeVisible({ timeout: 10_000 });
    await viewReportButton.click();

    // Immediately check if buttons are disabled (right after drawer opens)
    const copyMarkdownButton = page.getByRole('button', { name: '复制 Markdown 源码' });
    const copyPlainTextButton = page.getByRole('button', { name: '复制纯文本' });

    // Wait for drawer to open but content may still be loading
    await page.waitForTimeout(100);

    // Verify buttons are disabled initially
    await expect(copyMarkdownButton).toBeVisible();
    await expect(copyPlainTextButton).toBeVisible();

    // Check if buttons are disabled (has disabled attribute)
    const isMarkdownDisabled = await copyMarkdownButton.isDisabled();
    const isPlainTextDisabled = await copyPlainTextButton.isDisabled();

    // At least one should be disabled during loading
    expect(isMarkdownDisabled || isPlainTextDisabled).toBeTruthy();

    // Wait for content to load and buttons to become enabled
    await page.waitForTimeout(2000);

    // Now buttons should be enabled
    const isMarkdownEnabledLater = await copyMarkdownButton.isEnabled();
    const isPlainTextEnabledLater = await copyPlainTextButton.isEnabled();

    expect(isMarkdownEnabledLater && isPlainTextEnabledLater).toBeTruthy();
  });
});
