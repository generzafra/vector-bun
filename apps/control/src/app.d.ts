import type { SessionRecord } from '@vector/auth';

declare global {
	namespace App {
		interface Locals {
			session: SessionRecord | null;
			requestId: string;
		}
	}
}

export {};
