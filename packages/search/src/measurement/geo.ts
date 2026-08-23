import type { GenerativeVisibilityResult } from '../types';

export function unsupportedGenerativeVisibility(): GenerativeVisibilityResult {
	return {
		supported: false,
		status: 'unsupported',
		detail: 'Generative visibility measurement requires a later compliant method'
	};
}
