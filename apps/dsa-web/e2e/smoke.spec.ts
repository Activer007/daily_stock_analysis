import { expect, test, type Page } from '@playwright/test';

const smokePassword = process.env.DSA_WEB_SMOKE_PASSWORD;

async function openWithLogin(page: Page, targetPath: string) {
  test.skip(!smokePassword, 'Set DSA_WEB_SMOKE_PASSWORD to run authenticated smoke tests.');

  await page.goto(`/login?redirect=${encodeURIComponent(targetPath)}`);
  await page.locator('#password').fill(smokePassword!);
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().includes('/api/v1/auth/login') && response.status() === 200,
    ),
    page.getByRole('button', { name: '登录' }).click(),
  ]);
  await page.waitForURL((url) => {
    const nextPath = `${url.pathname}${url.search}`;
    return nextPath === targetPath || nextPath === '/';
  }, {
    timeout: 15_000,
  });
  await page.goto(targetPath, { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === targetPath);
}

test.describe('web smoke', () => {
  test('login page renders password form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /管理员登录|设置初始密码/ })).toBeVisible();
    await expect(page.getByLabel(/密码/)).toBeVisible();
    await expect(page.getByRole('button', { name: /登录|设置密码/ })).toBeVisible();
  });

  test('home page shows analysis entry and history panel after login', async ({ page }) => {
    await openWithLogin(page, '/');

    const stockInput = page.getByPlaceholder('输入股票代码，如 600519、00700、AAPL');
    await expect(stockInput).toBeVisible();
    await expect(page.getByRole('button', { name: '切换主题' })).toBeVisible();
    await expect(page.getByRole('link', { name: '首页' })).toBeVisible();
    await expect(page.getByRole('link', { name: '问股' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '历史分析' })).toBeVisible();

    await stockInput.fill('600519');
    await expect(page.getByRole('button', { name: '分析', exact: true })).toBeEnabled();
  });

  test('chat page allows entering a question and starts a request', async ({ page }) => {
    await openWithLogin(page, '/chat');

    const input = page.getByPlaceholder('例如：分析 600519 / 茅台现在适合买入吗？ (Enter 发送, Shift+Enter 换行)');
    await expect(input).toBeVisible();
    await expect(page.getByText('策略', { exact: true })).toBeVisible();

    const prompt = '请简要分析 600519';
    await input.fill(prompt);
    await page.getByRole('button', { name: '发送' }).click();

    await expect(page.locator('p').filter({ hasText: prompt }).last()).toBeVisible();
    await expect(page.getByRole('button', { name: /处理中/ })).toBeDisabled();
  });

  test('mobile shell opens navigation drawer after login', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openWithLogin(page, '/');

    await page.getByRole('button', { name: '打开导航菜单' }).click();
    await expect(page.getByRole('dialog', { name: '导航菜单' })).toBeVisible();
    await expect(page.getByRole('link', { name: '回测' })).toBeVisible();
    await expect(page.getByRole('button', { name: '切换主题' })).toBeVisible();
  });
});
