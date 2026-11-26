import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = process.env.TNOTES_BASE ?? 'http://127.0.0.1:8787';
const TOKEN = process.env.TNOTES_SETUP_TOKEN ?? '';
const PASSWORD = process.env.TNOTES_TEST_PASSWORD ?? 'tnotes-test-password';
const SHOT_DIR = fileURLToPath(new URL('../e2e-shots', import.meta.url));
mkdirSync(SHOT_DIR, { recursive: true });

let failures = 0;
function check(name, ok, detail) {
  if (ok) {
    console.log('PASS  ' + name);
  } else {
    failures += 1;
    console.log('FAIL  ' + name + (detail ? ' -> ' + detail : ''));
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push('pageerror: ' + error.message));

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#setup-password, #login-password', { timeout: 30000 });

if (await page.locator('#setup-password').count()) {
  check('打开后进入初始化向导', true);
  await page.fill('#display-name', 'E2E');
  await page.fill('#setup-password', PASSWORD);
  await page.fill('#setup-confirm', PASSWORD);
  if (!TOKEN) {
    console.log('需要初始化令牌：请设置环境变量 TNOTES_SETUP_TOKEN 后重试');
    await browser.close();
    process.exit(1);
  }
  await page.fill('#setup-token', TOKEN);
  await page.getByRole('button', { name: '创建我的笔记库' }).click();
} else {
  check('打开后进入解锁页', true);
  await page.fill('#login-password', PASSWORD);
  await page.getByRole('button', { name: '解锁' }).click();
}

await page.waitForSelector('text=全部笔记', { timeout: 40000 });
check('初始化/解锁后进入工作区', true);
await page.screenshot({ path: SHOT_DIR + '/01-workspace-empty.png' });

await page.getByLabel('新建笔记', { exact: true }).click();
await page.waitForSelector('input[placeholder="无标题"]', { timeout: 15000 });
check('新建笔记进入编辑器', true);

await page.fill('input[placeholder="无标题"]', 'E2E 测试笔记');
const editor = page.locator('.tiptap');
await editor.click();
await page.keyboard.type('# 大标题');
await page.keyboard.press('Enter');
await page.keyboard.type('这是一段正文内容，用于验证端到端加密与自动保存。');
await page.keyboard.press('Enter');
await page.keyboard.type('- 列表项一');
await page.keyboard.press('Enter');
await page.keyboard.type('列表项二');
await page.keyboard.press('Enter');
await page.keyboard.press('Enter');
await page.keyboard.press('Enter');
await page.keyboard.type('[] 待办事项');
await page.keyboard.press(' ');
await page.waitForTimeout(1800);

const headingCount = await page.locator('.tiptap h1').count();
check('Markdown 快捷输入生成标题', headingCount === 1, 'h1 count=' + headingCount);
const listCount = await page.locator('.tiptap ul li').count();
check('Markdown 快捷输入生成列表', listCount >= 2, 'li count=' + listCount);
const taskCount = await page.locator('.tiptap ul[data-type="taskList"] li').count();
check('待办清单已生成', taskCount === 1, 'task count=' + taskCount);

const savedText = await page.locator('text=/已保存|正在加密保存/').first().textContent();
check('显示保存状态', Boolean(savedText && savedText.includes('已保存')), savedText ?? '');
await page.screenshot({ path: SHOT_DIR + '/02-editor.png' });
const listTitle = await page.locator('.note-prose, button', { hasText: 'E2E 测试笔记' }).count();
check('列表中出现新笔记标题', listTitle > 0);

await page.getByRole('button', { name: 'Markdown' }).click();
await page.waitForSelector('textarea', { timeout: 10000 });
const markdown = await page.locator('textarea').inputValue();
check('Markdown 源码包含标题', markdown.includes('# 大标题'), markdown.slice(0, 80));
check('Markdown 源码包含列表', markdown.includes('列表项一'));
await page.screenshot({ path: SHOT_DIR + '/03-markdown.png' });
await page.getByLabel('关闭', { exact: true }).click();

await page.getByLabel('收藏', { exact: true }).click();
await page.waitForTimeout(600);
const favoriteCount = await page.locator('text=收藏').count();
check('收藏按钮可点击', favoriteCount > 0);

const searchBox = page.getByPlaceholder('搜索标题、正文与标签…');
await searchBox.fill('待办');
await page.waitForTimeout(1200);
const searchHit = await page.locator('text=E2E 测试笔记').count();
check('搜索能命中笔记', searchHit > 0, 'hits=' + searchHit);
await page.screenshot({ path: SHOT_DIR + '/04-search.png' });
await searchBox.fill('');

await page.getByRole('button', { name: '统计', exact: true }).first().click();
await page.waitForSelector('text=笔记总数', { timeout: 10000 });
check('统计页可打开', true);
await page.screenshot({ path: SHOT_DIR + '/05-stats.png' });

await page.getByRole('button', { name: '设置', exact: true }).first().click();
await page.waitForSelector('text=数据备份', { timeout: 10000 });
check('设置页可打开', true);
await page.screenshot({ path: SHOT_DIR + '/06-settings.png' });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.screenshot({ path: SHOT_DIR + '/07-mobile.png' });
check('移动端视口可渲染', true);

const serviceWorker = await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return 'unsupported';
  const registrations = await navigator.serviceWorker.getRegistrations();
  return String(registrations.length);
});
check('Service Worker 已注册', serviceWorker !== '0', 'registrations=' + serviceWorker);

const manifest = await page.evaluate(async () => {
  const link = document.querySelector('link[rel="manifest"]');
  if (!link) return null;
  const res = await fetch(link.getAttribute('href'));
  return res.ok ? res.json() : null;
});
check('PWA manifest 可用', Boolean(manifest && manifest.name), JSON.stringify(manifest && manifest.name));

check('无控制台错误', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

await browser.close();
console.log(failures === 0 ? 'ALL E2E CHECKS PASSED' : failures + ' E2E CHECKS FAILED');
process.exit(failures === 0 ? 0 : 1);
