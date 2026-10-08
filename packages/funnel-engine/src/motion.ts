import type { MotionPreset } from './schema';
import type { SectionRhythm } from './width';

const MOTION: Record<SectionRhythm, MotionPreset> = {
	place: 'm2',
	product: 'm1',
	reading: 'm1',
	system: 'm0',
	counsel: 'm0'
};

export function motionFor(rhythm: SectionRhythm): MotionPreset {
	return MOTION[rhythm];
}

export function motionClass(preset: MotionPreset | undefined) {
	if (preset === 'm1' || preset === 'm2') return `motion-${preset}`;
	return 'motion-m0';
}
