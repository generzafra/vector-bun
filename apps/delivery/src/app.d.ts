import type { DeliveryResolution } from '@vector/domain';

declare global {
	namespace App {
		interface Locals {
			requestId: string;
			delivery: DeliveryResolution;
		}
	}
}

export {};
