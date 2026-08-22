import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { controlTheme, vectorIdentity } from '@vector/ui';

const root = join(import.meta.dir, '..');

test('Control identity tokens match the approved Vector palette', () => {
	expect(vectorIdentity.black).toBe('#070A0F');
	expect(vectorIdentity.blue).toBe('#1677FF');
	expect(vectorIdentity.cyan).toBe('#35D9FF');
	expect(vectorIdentity.mint).toBe('#32E6A1');
	expect(controlTheme.theme).toBe('vector-dark');
	expect(controlTheme.description).toContain('Delivery');
});

test('token CSS exposes semantic Control variables', () => {
	const css = readFileSync(join(root, 'packages/ui/src/tokens/vector.css'), 'utf8');
	expect(css).toContain('--vector-action-primary:');
	expect(css).toContain('--vector-signal:');
	expect(css).toContain('--vector-outcome-positive:');
	expect(css).toContain('--vector-surface-canvas:');
});

test('Control consumes shared tokens instead of hard-coded brand hex', () => {
	const appCss = readFileSync(join(root, 'apps/control/src/app.css'), 'utf8');
	const html = readFileSync(join(root, 'apps/control/src/app.html'), 'utf8');
	expect(appCss).toContain("@import '@vector/ui/tokens.css'");
	expect(appCss).not.toContain('#1677FF');
	expect(appCss).not.toContain('#3b6fd9');
	expect(html).toContain('data-brand="vector"');
	expect(html).toContain('data-theme="vector-dark"');
	expect(html).toContain('/brand/vector/favicons/favicon-32x32.png');
	expect(html).toContain('/brand/vector/favicons/site.webmanifest');
});

test('official Vector brand files live in the Control registry', () => {
	const brand = join(root, 'apps/control/static/brand/vector');
	expect(existsSync(join(brand, 'logo/vector-mark.png'))).toBe(true);
	expect(existsSync(join(brand, 'logo/vector-wordmark.png'))).toBe(true);
	expect(existsSync(join(brand, 'favicons/favicon.ico'))).toBe(true);
	expect(existsSync(join(root, 'apps/control/static/favicon.ico'))).toBe(true);
	const manifest = readFileSync(join(brand, 'favicons/site.webmanifest'), 'utf8');
	expect(manifest).toContain('Vector Control');
	expect(manifest).toContain('#070A0F');
});

test('Delivery keeps client tokens and does not import Vector identity CSS', () => {
	const deliveryCss = readFileSync(join(root, 'apps/delivery/src/app.css'), 'utf8');
	expect(deliveryCss).toContain('--accent:');
	expect(deliveryCss).not.toContain('@vector/ui/tokens.css');
	expect(deliveryCss).not.toContain('--vector-black');
});

test('docs/28 binds identity to Control and excludes Delivery', () => {
	const charter = readFileSync(
		join(root, 'docs/28_VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE.md'),
		'utf8'
	);
	expect(charter).toContain('Does not apply as identity to');
	expect(charter).toContain('apps/delivery');
	expect(charter).toContain('packages/ui/src/tokens/');
});
