import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createLegalEntity } from '../apps/control/src/lib/legal/entity';
import {
	parseLegalMarkdown,
	type BlockNode,
	type InlineNode
} from '../apps/control/src/lib/legal/parse';
import { isControlPublicPath } from '../apps/control/src/lib/public-paths';

const root = join(import.meta.dir, '..');
const entity = createLegalEntity('https://vector.example');

function loadMarkdown(name: 'VECTOR_PRIVACY_POLICY.md' | 'VECTOR_TERMS_OF_USE.md') {
	return readFileSync(join(root, name), 'utf8');
}

function flattenInline(nodes: InlineNode[]) {
	return nodes.map((node) => (node.type === 'link' ? node.href : node.value)).join('');
}

function flattenDocument(blocks: BlockNode[]) {
	return blocks
		.map((block) => {
			if (block.type === 'h2' || block.type === 'h3') return block.text;
			if (block.type === 'p') return flattenInline(block.children);
			return block.items.map((item) => flattenInline(item)).join('\n');
		})
		.join('\n');
}

test('Control public paths allow login and Vector legal pages only', () => {
	expect(isControlPublicPath('/login')).toBe(true);
	expect(isControlPublicPath('/privacy')).toBe(true);
	expect(isControlPublicPath('/terms')).toBe(true);
	expect(isControlPublicPath('/privacy/')).toBe(true);
	expect(isControlPublicPath('/clients')).toBe(false);
	expect(isControlPublicPath('/privacy/export')).toBe(false);
	expect(isControlPublicPath('/login/next')).toBe(false);
});

test('Control public legal GET pages stay available if session lookup fails', () => {
	const hooks = readFileSync(join(root, 'apps/control/src/hooks.server.ts'), 'utf8');
	expect(hooks).toContain('isControlPublicPath');
	expect(hooks).toContain('catch (error)');
	expect(hooks).toContain('if (!publicPath) throw error');
});

test('published Privacy Policy is parsed from the repository draft and omits authoring notes', () => {
	const source = loadMarkdown('VECTOR_PRIVACY_POLICY.md');
	const document = parseLegalMarkdown(source, entity, {
		kind: 'privacy',
		title: 'Privacy Policy'
	});
	const text = flattenDocument(document.blocks);

	expect(document.draft).toBe(true);
	expect(document.businessLocation).toBe('Florida, United States');
	expect(document.toc[0]).toEqual({ id: '1-introduction', label: '1. Introduction' });
	expect(text).toContain('Maximum Global Exposure');
	expect(text).toContain('Florida Digital Bill of Rights');
	expect(text).toContain('children under thirteen');
	expect(text).not.toContain('[LEGAL COMPANY NAME]');
	expect(text).toContain('[PRIVACY EMAIL]');
	expect(text).not.toContain('Implementation Notes Before Publication');
	expect(text).not.toContain('Whether a separate Cookie Policy should be published');
	expect(source).toContain('Implementation Notes Before Publication');
});

test('published Terms of Use link to the Privacy Policy and keep unpaid-result disclaimers', () => {
	const document = parseLegalMarkdown(loadMarkdown('VECTOR_TERMS_OF_USE.md'), entity, {
		kind: 'terms',
		title: 'Terms of Use'
	});
	const text = flattenDocument(document.blocks);
	const links = document.blocks.flatMap((block) => {
		const groups = block.type === 'p' ? [block.children] : block.type === 'ol' ? block.items : [];
		return groups.flat().filter((node) => node.type === 'link');
	});

	expect(document.draft).toBe(true);
	expect(text).toContain('No Guarantee of Marketing or Business Results');
	expect(text).toContain('does not guarantee');
	expect(text).toContain('[COUNTY]');
	expect(text).not.toContain('Whether you want mandatory arbitration');
	expect(
		links.some((node) => node.type === 'link' && node.href === 'https://vector.example/privacy')
	).toBe(true);
});

test('Vector legal pages are Control product routes, not Delivery tenant pages', () => {
	expect(existsSync(join(root, 'apps/control/src/routes/privacy/+page.svelte'))).toBe(true);
	expect(existsSync(join(root, 'apps/control/src/routes/terms/+page.svelte'))).toBe(true);
	expect(existsSync(join(root, 'apps/delivery/src/routes/privacy/+page.svelte'))).toBe(false);
	expect(existsSync(join(root, 'apps/delivery/src/routes/terms/+page.svelte'))).toBe(false);
	const sources = readFileSync(join(root, 'apps/control/src/lib/legal/sources.ts'), 'utf8');
	expect(sources).toContain('VECTOR_PRIVACY_POLICY.md?raw');
	expect(sources).toContain('VECTOR_TERMS_OF_USE.md?raw');
});
