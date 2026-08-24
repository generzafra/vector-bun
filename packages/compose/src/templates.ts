import {
	COMPOSITION_TEMPLATES,
	clipCompositionText,
	type CompositionCopy,
	type CompositionKind,
	type CompositionTokens
} from '@vector/contracts';
import { escapeXml } from './xml';

export const MAX_EMBEDDED_LOGO_BYTES = 256 * 1024;

const LOGO_MIMES: Record<string, string> = {
	'image/png': 'image/png',
	'image/jpeg': 'image/jpeg',
	'image/webp': 'image/webp'
};

export type ComposeLogo = {
	mimeType: string;
	bytes: Uint8Array;
};

export type ComposeShellInput = {
	kind: CompositionKind;
	copy: CompositionCopy;
	tokens: CompositionTokens;
	logo?: ComposeLogo | null;
};

export type ComposeShellResult = {
	kind: CompositionKind;
	templateKey: string;
	width: number;
	height: number;
	svg: string;
	hasLogo: boolean;
};

export function logoDataUri(logo: ComposeLogo | null | undefined): string | null {
	if (!logo) return null;
	if (logo.bytes.byteLength === 0 || logo.bytes.byteLength > MAX_EMBEDDED_LOGO_BYTES) return null;
	const mime = LOGO_MIMES[logo.mimeType];
	if (!mime) return null;
	return `data:${mime};base64,${Buffer.from(logo.bytes).toString('base64')}`;
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
	const clipped = clipCompositionText(text, maxChars * maxLines);
	const words = clipped.split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let current = '';
	for (const word of words) {
		const candidate = current ? `${current} ${word}` : word;
		if (candidate.length <= maxChars) {
			current = candidate;
			continue;
		}
		if (current) lines.push(current);
		current = word.length > maxChars ? clipCompositionText(word, maxChars) : word;
		if (lines.length >= maxLines - 1) {
			lines.push(clipCompositionText(current, maxChars));
			return lines.slice(0, maxLines);
		}
	}
	if (current) lines.push(current);
	return lines.slice(0, maxLines);
}

function textNodes(input: {
	lines: string[];
	x: number;
	y: number;
	lineHeight: number;
	size: number;
	fill: string;
	font: string;
	weight?: number;
	anchor?: 'start' | 'middle';
}) {
	const anchor = input.anchor ?? 'start';
	const weight = input.weight ?? 600;
	return input.lines
		.map(
			(line, index) =>
				`<text x="${input.x}" y="${input.y + index * input.lineHeight}" fill="${input.fill}" font-size="${input.size}" font-family="${escapeXml(input.font)}" font-weight="${weight}" text-anchor="${anchor}">${escapeXml(line)}</text>`
		)
		.join('');
}

function ogShell(copy: CompositionCopy, tokens: CompositionTokens, logoUri: string | null) {
	const { width, height } = COMPOSITION_TEMPLATES.og;
	const headlines = wrapText(copy.headline, 28, 2);
	const ledes = wrapText(copy.lede, 48, 2);
	const logo = logoUri
		? `<image href="${escapeXml(logoUri)}" x="72" y="64" height="72" width="72" preserveAspectRatio="xMinYMid meet" />`
		: '';
	const textX = logoUri ? 168 : 72;
	const ctaWidth = Math.min(420, Math.max(200, copy.cta.length * 16 + 48));
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
<title>${escapeXml(copy.headline)}</title>
<rect width="${width}" height="${height}" fill="${tokens.background}"/>
<rect width="18" height="${height}" fill="${tokens.accent}"/>
${logo}
${textNodes({ lines: headlines, x: textX, y: 280, lineHeight: 68, size: 56, fill: tokens.text, font: tokens.fontFamily, weight: 700 })}
${textNodes({ lines: ledes, x: 72, y: 440, lineHeight: 36, size: 26, fill: tokens.text, font: tokens.fontFamily, weight: 400 })}
<rect x="72" y="530" width="${ctaWidth}" height="52" rx="4" fill="${tokens.accent}"/>
<text x="${72 + ctaWidth / 2}" y="564" fill="${tokens.background}" font-size="22" font-family="${escapeXml(tokens.fontFamily)}" font-weight="600" text-anchor="middle">${escapeXml(copy.cta)}</text>
</svg>`;
}

function socialShell(copy: CompositionCopy, tokens: CompositionTokens, logoUri: string | null) {
	const { width, height } = COMPOSITION_TEMPLATES.social;
	const headlines = wrapText(copy.headline, 18, 3);
	const ledes = wrapText(copy.lede, 28, 3);
	const logo = logoUri
		? `<image href="${escapeXml(logoUri)}" x="454" y="160" height="172" width="172" preserveAspectRatio="xMidYMid meet" />`
		: '';
	const headlineY = logoUri ? 420 : 360;
	const ctaWidth = Math.min(480, Math.max(220, copy.cta.length * 18 + 56));
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
<title>${escapeXml(copy.headline)}</title>
<rect width="${width}" height="${height}" fill="${tokens.background}"/>
<rect y="${height - 18}" width="${width}" height="18" fill="${tokens.accent}"/>
${logo}
${textNodes({ lines: headlines, x: 540, y: headlineY, lineHeight: 72, size: 58, fill: tokens.text, font: tokens.fontFamily, weight: 700, anchor: 'middle' })}
${textNodes({ lines: ledes, x: 540, y: headlineY + headlines.length * 72 + 24, lineHeight: 40, size: 28, fill: tokens.text, font: tokens.fontFamily, weight: 400, anchor: 'middle' })}
<rect x="${(width - ctaWidth) / 2}" y="900" width="${ctaWidth}" height="56" rx="4" fill="${tokens.accent}"/>
<text x="${width / 2}" y="936" fill="${tokens.background}" font-size="24" font-family="${escapeXml(tokens.fontFamily)}" font-weight="600" text-anchor="middle">${escapeXml(copy.cta)}</text>
</svg>`;
}

function emailShell(copy: CompositionCopy, tokens: CompositionTokens, logoUri: string | null) {
	const { width, height } = COMPOSITION_TEMPLATES.email;
	const headlines = wrapText(copy.headline, 28, 1);
	const ledes = wrapText(copy.lede, 42, 1);
	const logo = logoUri
		? `<image href="${escapeXml(logoUri)}" x="24" y="58" height="84" width="84" preserveAspectRatio="xMinYMid meet" />`
		: '';
	const textX = logoUri ? 128 : 28;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
<title>${escapeXml(copy.headline)}</title>
<rect width="${width}" height="${height}" fill="${tokens.background}"/>
<rect width="12" height="${height}" fill="${tokens.accent}"/>
${logo}
${textNodes({ lines: headlines, x: textX, y: 88, lineHeight: 32, size: 28, fill: tokens.text, font: tokens.fontFamily, weight: 700 })}
${textNodes({ lines: ledes, x: textX, y: 128, lineHeight: 24, size: 16, fill: tokens.text, font: tokens.fontFamily, weight: 400 })}
<text x="${width - 24}" y="168" fill="${tokens.accent}" font-size="14" font-family="${escapeXml(tokens.fontFamily)}" font-weight="600" text-anchor="end">${escapeXml(copy.cta)}</text>
</svg>`;
}

export function composeShell(input: ComposeShellInput): ComposeShellResult {
	const spec = COMPOSITION_TEMPLATES[input.kind];
	const logoUri = logoDataUri(input.logo);
	const svg =
		input.kind === 'og'
			? ogShell(input.copy, input.tokens, logoUri)
			: input.kind === 'social'
				? socialShell(input.copy, input.tokens, logoUri)
				: emailShell(input.copy, input.tokens, logoUri);
	return {
		kind: input.kind,
		templateKey: spec.key,
		width: spec.width,
		height: spec.height,
		svg: svg.trim(),
		hasLogo: Boolean(logoUri)
	};
}
