import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium, expect } from '@playwright/test';
import { startOffice } from '../lib/office.ts';
import { emitEvent } from '../lib/events.ts';
import { acquireLock } from '../lib/lock.ts';

test('real Pixel renderer shows events, reloads current state, and fits desktop/mobile', { timeout: 60_000 }, async () => {
  const source = resolve(import.meta.dirname, '../..');
  const temp = mkdtempSync(join(tmpdir(), 'pixel-office-e2e-'));
  let office; let browser; let release;
  try {
    for (const dir of ['office', 'office-dist']) cpSync(join(source, dir), join(temp, dir), { recursive: true });
    const state = join(temp, 'state'); mkdirSync(state);
    release = acquireLock(state);
    const base = { version: 1, timestamp: new Date().toISOString(), run_id: '20260919T120000Z-aabbcc',
      worker: 'codex-1', phase: 'test', event: 'started', activity: 'reviewing', duration_ms: null, available_at: null };
    emitEvent(state, base);
    emitEvent(state, { ...base, worker: 'claude-pro', phase: 'browser_qa', event: 'deferred', activity: 'waiting', available_at: '2026-09-19T16:00:00.000Z' });
    office = await startOffice(temp, 0);
    browser = await chromium.launch(process.env.CI ? {} : { channel: 'chrome' });
    const page = await browser.newPage({ viewport: { width: 1400, height: 1050 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { window.__PIXEL_AGENTS_E2E = true; });
    await page.goto(office.url);
    await expect(page.locator('#connection')).toContainText('Live');
    await expect(page.locator('#workers')).toContainText('Waiting for quota');
    await expect(page.locator('#workers')).toContainText('Reviewing');
    await expect(page.locator('#pixel-office')).toHaveCSS('height', /^(6[6-9][0-9]|[7-9][0-9]{2})px$/);
    const canvas = page.frameLocator('iframe').locator('canvas');
    await expect(canvas).toBeVisible();
    const frame = page.frames()[1];
    await expect.poll(() => frame.evaluate(() => window.__pixelAgentsTestHooks?.messageLog?.some(m => m.type === 'agentToolStart'))).toBe(true);
    await page.waitForTimeout(2_500);
    await expect.poll(() => frame.evaluate(() => window.__pixelAgentsTestHooks?.getCharacters?.().some(c => c.bubbleType === 'waiting'))).toBe(true);
    assert.equal(await page.frameLocator('iframe').locator('button:visible').count(), 0);
    await page.locator('#expand').click();
    await expect(page.locator('body')).toHaveClass(/office-focus/);
    await expect(page.locator('#pixel-office')).toHaveCSS('height', '1050px');
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).not.toHaveClass(/office-focus/);
    emitEvent(state, { ...base, event: 'completed', activity: 'waiting', duration_ms: 1000 });
    await expect(page.locator('#workers')).toContainText('Completed');
    await page.reload();
    await expect(page.locator('#workers')).toContainText('Completed');
    await expect(canvas).toBeVisible();
    await expect.poll(() => page.frames()[1].evaluate(() => window.__pixelAgentsTestHooks?.messageLog?.some(m => m.type === 'existingAgents'))).toBe(true);
    mkdirSync(join(source, 'test-results'), { recursive: true });
    await page.screenshot({ path: join(source, 'test-results/office-e2e.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(canvas).toBeVisible();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: join(source, 'test-results/office-mobile.png'), fullPage: true });
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close(); await office?.close(); release?.(); rmSync(temp, { recursive: true, force: true });
  }
});
