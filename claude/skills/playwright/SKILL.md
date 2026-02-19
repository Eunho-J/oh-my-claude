---
name: playwright
description: Browser automation and E2E testing
argument-hint: "[test|automate|screenshot] [options]"
mcp:
  playwright:
    command: npx
    args:
      - "@anthropic-ai/claude-code-mcp-server-playwright@latest"
---

# Playwright Skill

Skill for browser automation and E2E testing.

## MCP Server

This skill uses the Playwright MCP server:
```bash
npx @anthropic-ai/claude-code-mcp-server-playwright@latest
```

## Modes

### TEST Mode

Write and run E2E tests

**Usage:**
```
/playwright test "user can login"
/playwright test --file auth.spec.ts
```

**Test Structure:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('user can login with valid credentials', async ({ page }) => {
    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="welcome"]')).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.fill('[data-testid="email"]', 'wrong@example.com');
    await page.fill('[data-testid="password"]', 'wrong');
    await page.click('[data-testid="submit"]');

    await expect(page.locator('[data-testid="error"]')).toHaveText(
      'Invalid credentials'
    );
  });
});
```

### AUTOMATE Mode

Perform browser automation tasks

**Usage:**
```
/playwright automate "fill out contact form"
/playwright automate --url https://example.com "extract data"
```

**Automation Patterns:**
```typescript
// Fill forms
await page.fill('input[name="email"]', 'test@example.com');
await page.selectOption('select#country', 'Korea');
await page.check('input[type="checkbox"]');

// File upload
await page.setInputFiles('input[type="file"]', '/path/to/file.pdf');

// Handle downloads
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.click('a#download-link'),
]);
await download.saveAs('/path/to/save/file.pdf');

// Handle dialogs
page.on('dialog', dialog => dialog.accept());
```

### SCREENSHOT Mode

Capture and analyze screenshots

**Usage:**
```
/playwright screenshot https://example.com
/playwright screenshot --full-page --format png
```

**Screenshot Options:**
```typescript
// Full page
await page.screenshot({ path: 'full.png', fullPage: true });

// Specific element
await page.locator('#header').screenshot({ path: 'header.png' });

// Save as PDF
await page.pdf({ path: 'page.pdf', format: 'A4' });

// Clip area
await page.screenshot({
  path: 'clip.png',
  clip: { x: 0, y: 0, width: 800, height: 600 },
});
```

## Selector Guide

### Recommended Priority

1. **data-testid** (Most stable)
   ```typescript
   page.locator('[data-testid="submit-button"]')
   ```

2. **Role + Name** (Accessibility-based)
   ```typescript
   page.getByRole('button', { name: 'Submit' })
   page.getByRole('textbox', { name: 'Email' })
   ```

3. **Label Text** (Form elements)
   ```typescript
   page.getByLabel('Email address')
   ```

4. **Placeholder** (Input fields)
   ```typescript
   page.getByPlaceholder('Enter your email')
   ```

5. **Text Content** (Buttons, links)
   ```typescript
   page.getByText('Sign up')
   ```

### Selectors to Avoid

- Auto-generated classes (e.g., `css-1a2b3c`)
- Deep CSS paths (e.g., `div > div > ul > li:nth-child(3)`)
- XPath (Hard to maintain)

## Wait Strategies

```typescript
// Auto-wait (Recommended)
await page.click('button');  // Auto-waits until clickable

// Explicit wait
await page.waitForSelector('.loaded');
await page.waitForLoadState('networkidle');
await page.waitForURL('**/dashboard');
await page.waitForResponse('**/api/data');

// Conditional wait
await expect(page.locator('.spinner')).toBeHidden();
await expect(page.locator('.content')).toBeVisible();
```

## Debugging

### Headed Mode
```bash
npx playwright test --headed
```

### Slow Execution
```bash
npx playwright test --slow-mo=1000
```

### Debug Mode
```bash
npx playwright test --debug
```

### Trace Viewer
```typescript
// playwright.config.ts
export default {
  use: {
    trace: 'on-first-retry',
  },
};
```

```bash
npx playwright show-trace trace.zip
```

## Parallel Execution

```typescript
// playwright.config.ts
export default {
  workers: process.env.CI ? 2 : undefined,
  fullyParallel: true,
};
```

## Best Practices

### Test Isolation
```typescript
// Each test runs independently
test.beforeEach(async ({ page }) => {
  // Start from clean state
});
```

### Network Mocking
```typescript
await page.route('**/api/users', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify([{ id: 1, name: 'Test' }]),
  });
});
```

### Reuse Authentication State
```typescript
// global-setup.ts
const storageState = 'auth.json';
await page.context().storageState({ path: storageState });

// playwright.config.ts
export default {
  use: {
    storageState: 'auth.json',
  },
};
```
