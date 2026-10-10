import { test, expect } from '@playwright/test';

async function visit(page) {
  const response = await page.goto('/');
  expect(response.status()).toBe(200);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#popupCloseBtn')).toBeFocused();
}

async function closePopup(page) {
  await page.locator('#popupCloseBtn').click();
  await expect(page.getByRole('dialog')).toBeHidden();
}

test('creator popup appears on every page load and reload', async ({ page }) => {
  await visit(page);
  await expect(page.getByRole('dialog')).toContainText('ASAD BHUTTA');
  await page.getByRole('button', { name: 'Explore Website' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  for (let reload = 0; reload < 2; reload += 1) {
    await page.reload();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('#popupCloseBtn')).toBeFocused();
    await closePopup(page);
  }
});

test('popup traps keyboard focus, locks background and restores opener focus', async ({ page }) => {
  await visit(page);
  await expect(page.locator('main')).toHaveJSProperty('inert', true);
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  const lastControl = page.getByRole('link', { name: 'Contact ILM' });
  await page.keyboard.press('Shift+Tab');
  await expect(lastControl).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#popupCloseBtn')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('main')).toHaveJSProperty('inert', false);
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await page.locator('#popupOpenBtn').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#popupOpenBtn')).toBeFocused();
});

test('popup closes on its backdrop and stays open when its content is clicked', async ({ page }) => {
  await visit(page);
  await page.locator('#popupTitle').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#creatorPopup').click({ position: { x: 5, y: 5 } });
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('theme persists after reload and exposes its current state', async ({ page }) => {
  await visit(page);
  await closePopup(page);
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#themeToggle')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await closePopup(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');
});

test('blocked browser storage does not break popup, theme, filters or mobile navigation', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() { throw new DOMException('Storage is blocked', 'SecurityError'); }
    });
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await visit(page);
  await closePopup(page);
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Science', exact: true }).click();
  await expect(page.locator('.program-card:visible')).toHaveCount(2);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.locator('#navigation')).toBeVisible();
  expect(errors).toEqual([]);
});

test('program categories and search combine, report no results and recover', async ({ page }) => {
  await visit(page);
  await closePopup(page);
  await page.getByRole('button', { name: 'Science', exact: true }).click();
  await expect(page.locator('.program-card:visible')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Science', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('searchbox', { name: 'Search programs' }).fill('coding');
  await expect(page.locator('.program-card:visible')).toHaveCount(0);
  await expect(page.locator('#programStatus')).toContainText('No programs match');
  await page.getByRole('button', { name: 'All Pathways' }).click();
  await expect(page.locator('.program-card:visible')).toHaveCount(1);
  await expect(page.locator('.program-card:visible h3')).toHaveText('ICS');
  await page.getByRole('searchbox', { name: 'Search programs' }).fill('');
  await expect(page.locator('.program-card:visible')).toHaveCount(4);
  await expect(page.locator('#programStatus')).toHaveText('4 programs found.');
});

test('scholarship estimator updates every boundary and program without promising an award', async ({ page }) => {
  await visit(page);
  await closePopup(page);
  const values = [[50, 'CAMPUS GUIDANCE'], [59, 'CAMPUS GUIDANCE'], [60, 'ADMISSION ENQUIRY'],
    [69, 'ADMISSION ENQUIRY'], [70, '25%'], [79, '25%'], [80, '50%'], [89, '50%'], [90, '100%'], [100, '100%']];
  for (const [marks, bracket] of values) {
    await page.locator('#marksRange').evaluate((slider, value) => {
      slider.value = String(value);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }, marks);
    await expect(page.locator('#marksDisplay')).toHaveText(`${marks}%`);
    await expect(page.locator('#scholarshipTag')).toContainText(bracket);
    await expect(page.locator('#eligibilityDetails')).toContainText('illustrative result only');
  }
  await page.getByLabel('Desired Program').selectOption('ICS');
  await expect(page.locator('#eligibilityHeading')).toContainText('ICS');
  await expect(page.locator('#eligibilityDetails')).toContainText('for ICS');
});

test('FAQ keyboard controls, announcement dismissal and scroll progress work', async ({ page }) => {
  await visit(page);
  await closePopup(page);
  const firstQuestion = page.locator('.faq-question').first();
  await firstQuestion.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.faq-item').first()).not.toHaveAttribute('open', '');
  await page.keyboard.press('Enter');
  await expect(page.locator('.faq-item').first()).toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'Close notification' }).click();
  await expect(page.locator('#announcementBar')).toBeHidden();
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await expect.poll(() => page.locator('#scrollProgress').evaluate(bar => parseFloat(bar.style.width))).toBeGreaterThan(95);
});

for (const [width, height] of [[320, 568], [375, 667], [768, 1024], [1024, 768], [667, 375]]) {
  test(`layout and navigation work at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await visit(page);
    const modal = await page.locator('.creator-modal-card').boundingBox();
    expect(modal.y).toBeGreaterThanOrEqual(19);
    expect(modal.y + modal.height).toBeLessThanOrEqual(height - 19);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await closePopup(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const menu = page.locator('.menu-toggle');
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeFocused();
    await menu.click();
    await page.locator('#navigation').getByRole('link', { name: 'Programs', exact: true }).click();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(page).toHaveURL(/#programs$/);
  });
}

test('navigation resets after resizing to desktop and closes on outside click', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await visit(page);
  await closePopup(page);
  await page.locator('.menu-toggle').click();
  await page.locator('#announcementBar').click();
  await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded', 'false');
  await page.locator('.menu-toggle').click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#navigation')).toBeVisible();
});

test('all local assets load and JavaScript initializes without browser errors', async ({ page }) => {
  const errors = [];
  const failedAssets = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.request().resourceType() !== 'document' && response.status() >= 400) failedAssets.push(response.url());
  });
  page.on('requestfailed', request => failedAssets.push(request.url()));
  await visit(page);
  await closePopup(page);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.locator('.hero-visual img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(page.locator('#year')).toHaveText(String(new Date().getFullYear()));
  expect(errors).toEqual([]);
  expect(failedAssets).toEqual([]);
});
