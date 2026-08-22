export const vectorIdentity = {
	black: '#070A0F',
	graphite: '#111720',
	blue: '#1677FF',
	cyan: '#35D9FF',
	mint: '#32E6A1',
	white: '#F4F7FA',
	steel: '#8995A5',
	amber: '#F4B860',
	red: '#FF6B6B'
} as const;

export const controlTheme = {
	name: 'vector-control',
	theme: 'vector-dark',
	brand: 'vector',
	description:
		'Operational Control Plane identity. Do not import MGE marketing tokens or apply this palette to Delivery client sites.',
	identity: vectorIdentity
} as const;
