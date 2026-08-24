import { applyLegalPlaceholders, type LegalEntity } from './entity';

export type InlineNode =
	| { type: 'text'; value: string }
	| { type: 'strong'; value: string }
	| { type: 'link'; href: string; value: string };

export type BlockNode =
	| { type: 'p'; children: InlineNode[] }
	| { type: 'h2'; id: string; text: string }
	| { type: 'h3'; id: string; text: string }
	| { type: 'ol'; items: InlineNode[][] };

export type LegalDocumentKind = 'privacy' | 'terms';

export type LegalDocumentView = {
	kind: LegalDocumentKind;
	title: string;
	status: string | null;
	businessLocation: string | null;
	effectiveDate: string | null;
	lastUpdated: string | null;
	draft: boolean;
	toc: { id: string; label: string }[];
	blocks: BlockNode[];
};

export type ParseLegalMarkdownOptions = {
	kind: LegalDocumentKind;
	title: string;
};

const AUTHORING_CUTOFF = /^## Implementation Notes/m;
const META_LINE = /^\*\*([^:*]+):\*\*\s*(.+)\s*$/;
const ATX_HEADING = /^(#{1,3})\s+(.+?)\s*$/;
const ORDERED_ITEM = /^\d+\.\s+(.+)$/;
const THEMATIC_BREAK = /^---+$/;
const BLOCKQUOTE = /^>\s?/;

export function parseLegalMarkdown(
	source: string,
	entity: LegalEntity,
	options: ParseLegalMarkdownOptions
): LegalDocumentView {
	const normalized = applyLegalPlaceholders(source.replaceAll('\r\n', '\n'), entity);
	const published = stripAuthoringNotes(normalized);
	const lines = published.split('\n');
	const meta = readMeta(lines);
	const blocks = readBlocks(lines);
	const toc: { id: string; label: string }[] = [];
	const usedIds = new Set<string>();
	const resolved = blocks.map((block) => {
		if (block.type !== 'h2' && block.type !== 'h3') return block;
		const id = uniqueId(slugify(block.text), usedIds);
		if (block.type === 'h2') toc.push({ id, label: block.text });
		return { ...block, id };
	});

	return {
		kind: options.kind,
		title: options.title,
		status: meta.status,
		businessLocation: meta.businessLocation,
		effectiveDate: meta.effectiveDate,
		lastUpdated: meta.lastUpdated,
		draft: Boolean(meta.status?.toLowerCase().includes('draft')),
		toc,
		blocks: resolved
	};
}

function stripAuthoringNotes(source: string) {
	const cutoff = source.search(AUTHORING_CUTOFF);
	return cutoff === -1 ? source.trimEnd() : source.slice(0, cutoff).trimEnd();
}

function readMeta(lines: string[]) {
	const meta: Record<string, string> = {};
	for (const line of lines) {
		if (line.startsWith('# ')) continue;
		if (!line.trim()) {
			if (Object.keys(meta).length > 0) break;
			continue;
		}
		const match = META_LINE.exec(line);
		if (!match) {
			if (Object.keys(meta).length > 0) break;
			continue;
		}
		meta[match[1]!.trim()] = match[2]!.trim();
	}
	return {
		status: meta.Status ?? null,
		businessLocation: meta['Business Location'] ?? null,
		effectiveDate: meta['Effective Date'] ?? null,
		lastUpdated: meta['Last Updated'] ?? null
	};
}

function readBlocks(lines: string[]): BlockNode[] {
	const blocks: BlockNode[] = [];
	let i = 0;
	while (i < lines.length && !(lines[i] ?? '').trim().startsWith('## ')) {
		i += 1;
	}
	let paragraph: string[] = [];

	const flushParagraph = () => {
		if (paragraph.length === 0) return;
		blocks.push({ type: 'p', children: parseInline(paragraph.join(' ')) });
		paragraph = [];
	};

	while (i < lines.length) {
		const line = lines[i] ?? '';
		const trimmed = line.trim();

		if (!trimmed) {
			flushParagraph();
			i += 1;
			continue;
		}

		if (THEMATIC_BREAK.test(trimmed)) {
			flushParagraph();
			i += 1;
			continue;
		}

		if (BLOCKQUOTE.test(line)) {
			flushParagraph();
			while (i < lines.length && BLOCKQUOTE.test(lines[i] ?? '')) {
				i += 1;
			}
			continue;
		}

		const heading = ATX_HEADING.exec(trimmed);
		if (heading && heading[1] !== '#') {
			flushParagraph();
			const text = heading[2]!.replace(/\*\*/g, '').trim();
			blocks.push({
				type: heading[1] === '##' ? 'h2' : 'h3',
				id: '',
				text
			});
			i += 1;
			continue;
		}

		const ordered = ORDERED_ITEM.exec(trimmed);
		if (ordered) {
			flushParagraph();
			const items: InlineNode[][] = [];
			while (i < lines.length) {
				const item = ORDERED_ITEM.exec((lines[i] ?? '').trim());
				if (!item) break;
				items.push(parseInline(item[1]!));
				i += 1;
			}
			blocks.push({ type: 'ol', items });
			continue;
		}

		paragraph.push(trimmed);
		i += 1;
	}

	flushParagraph();
	return blocks;
}

export function parseInline(text: string): InlineNode[] {
	const nodes: InlineNode[] = [];
	const pattern = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s<]+)/g;
	let cursor = 0;
	for (const match of text.matchAll(pattern)) {
		const index = match.index ?? 0;
		if (index > cursor) nodes.push({ type: 'text', value: text.slice(cursor, index) });
		if (match[1] !== undefined) {
			nodes.push(linkOrStrong(match[1]));
		} else if (match[2] !== undefined && match[3] !== undefined) {
			nodes.push({ type: 'link', href: match[3], value: match[2] });
		} else if (match[4] !== undefined) {
			nodes.push({ type: 'link', href: match[4], value: match[4] });
		}
		cursor = index + match[0].length;
	}
	if (cursor < text.length) nodes.push({ type: 'text', value: text.slice(cursor) });
	return nodes.length > 0 ? nodes : [{ type: 'text', value: text }];
}

function linkOrStrong(value: string): InlineNode {
	if (/^https?:\/\//.test(value) || value === '/privacy' || value === '/terms') {
		return { type: 'link', href: value, value };
	}
	return { type: 'strong', value };
}

function slugify(text: string) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function uniqueId(base: string, used: Set<string>) {
	const fallback = base || 'section';
	let id = fallback;
	let n = 2;
	while (used.has(id)) {
		id = `${fallback}-${n}`;
		n += 1;
	}
	used.add(id);
	return id;
}
