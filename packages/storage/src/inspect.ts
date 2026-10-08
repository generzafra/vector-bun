import { ValidationError } from '@vector/contracts';

export const ASSET_PURPOSES = ['logo', 'mark', 'og', 'favicon', 'other'] as const;
export type AssetPurpose = (typeof ASSET_PURPOSES)[number];

export const MAX_ASSET_BYTES = 2 * 1024 * 1024;

const ALLOWED = {
	'image/png': { ext: ['png'], magic: (b: Uint8Array) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
	'image/jpeg': { ext: ['jpg', 'jpeg'], magic: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
	'image/webp': {
		ext: ['webp'],
		magic: (b: Uint8Array) =>
			b[0] === 0x52 &&
			b[1] === 0x49 &&
			b[2] === 0x46 &&
			b[3] === 0x46 &&
			b[8] === 0x57 &&
			b[9] === 0x45 &&
			b[10] === 0x42 &&
			b[11] === 0x50
	},
	'image/x-icon': { ext: ['ico'], magic: (b: Uint8Array) => b[0] === 0x00 && b[1] === 0x00 && b[2] === 0x01 && b[3] === 0x00 }
} as const;

export type AllowedAssetMime = keyof typeof ALLOWED;

export function inspectUpload(input: {
	filename: string;
	declaredType: string;
	bytes: Uint8Array;
}) {
	if (input.bytes.byteLength === 0) throw new ValidationError('File is empty');
	if (input.bytes.byteLength > MAX_ASSET_BYTES) {
		throw new ValidationError('File exceeds the 2MB brand asset limit');
	}
	const mime = normalizeMime(input.declaredType);
	const rule = ALLOWED[mime];
	if (!rule) throw new ValidationError('Only PNG, JPEG, WEBP, and ICO brand assets are allowed');
	if (!rule.magic(input.bytes)) throw new ValidationError('File contents do not match the declared type');
	const ext = (input.filename.split('.').pop() ?? '').toLowerCase();
	if (ext && !(rule.ext as readonly string[]).includes(ext)) {
		throw new ValidationError('File extension does not match the contents');
	}
	return { mime, sizeBytes: input.bytes.byteLength };
}

export const MAX_CREATIVE_BYTES = 8 * 1024 * 1024;

const CREATIVE_ALLOWED = {
	'image/png': ALLOWED['image/png'],
	'image/jpeg': ALLOWED['image/jpeg'],
	'image/webp': ALLOWED['image/webp'],
	'video/mp4': {
		ext: ['mp4'],
		magic: (b: Uint8Array) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70
	}
} as const;

export type AllowedCreativeMime = keyof typeof CREATIVE_ALLOWED;

export function inspectCreativeUpload(input: {
	filename: string;
	declaredType: string;
	bytes: Uint8Array;
}) {
	if (input.bytes.byteLength === 0) throw new ValidationError('File is empty');
	if (input.bytes.byteLength > MAX_CREATIVE_BYTES) {
		throw new ValidationError('File exceeds the 8MB creative asset limit');
	}
	const mime = normalizeMime(input.declaredType);
	const rule = CREATIVE_ALLOWED[mime as AllowedCreativeMime];
	if (!rule) throw new ValidationError('Only PNG, JPEG, WEBP, and MP4 creative assets are allowed');
	if (!rule.magic(input.bytes)) throw new ValidationError('File contents do not match the declared type');
	const ext = (input.filename.split('.').pop() ?? '').toLowerCase();
	if (ext && !(rule.ext as readonly string[]).includes(ext)) {
		throw new ValidationError('File extension does not match the contents');
	}
	return { mime, sizeBytes: input.bytes.byteLength };
}

export const MAX_COMPOSITION_BYTES = 512 * 1024;

export function inspectComposedSvg(bytes: Uint8Array) {
	if (bytes.byteLength === 0) throw new ValidationError('Composition is empty');
	if (bytes.byteLength > MAX_COMPOSITION_BYTES) {
		throw new ValidationError('Composition exceeds the 512KB SVG limit');
	}
	const text = new TextDecoder().decode(bytes);
	const trimmed = text.trim();
	if (!trimmed.startsWith('<svg') && !trimmed.startsWith('<?xml')) {
		throw new ValidationError('Composed file must be SVG');
	}
	if (!trimmed.includes('<svg')) throw new ValidationError('Composed file must be SVG');
	const lower = trimmed.toLowerCase();
	if (lower.includes('<script') || lower.includes('javascript:') || /\son\w+=/.test(lower)) {
		throw new ValidationError('Composed SVG contains disallowed script');
	}
	return { mime: 'image/svg+xml' as const, sizeBytes: bytes.byteLength };
}

function normalizeMime(value: string): AllowedAssetMime {
	const raw = value.toLowerCase().split(';')[0]?.trim() ?? '';
	if (raw === 'image/jpg') return 'image/jpeg';
	if (raw === 'image/ico' || raw === 'image/vnd.microsoft.icon') return 'image/x-icon';
	return raw as AllowedAssetMime;
}
