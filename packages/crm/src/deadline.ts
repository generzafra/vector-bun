import { ProviderError } from '@vector/contracts';
import type { CrmDeadline } from './types';

export function assertCrmDeadline(input: CrmDeadline) {
	if (input.signal?.aborted || input.timeoutMs === 0) {
		throw new ProviderError('CRM timed out', 'CRM_TIMEOUT');
	}
}
