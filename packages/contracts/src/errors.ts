export class AppError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code: string
	) {
		super(message);
		this.name = 'AppError';
	}
}

export class TenantContextError extends AppError {
	constructor(message = 'Tenant context is required') {
		super(message, 500, 'TENANT_CONTEXT_MISSING');
		this.name = 'TenantContextError';
	}
}

export class ForbiddenError extends AppError {
	constructor(message = 'Forbidden') {
		super(message, 403, 'FORBIDDEN');
		this.name = 'ForbiddenError';
	}
}

export class UnauthorizedError extends AppError {
	constructor(message = 'Unauthorized') {
		super(message, 401, 'UNAUTHORIZED');
		this.name = 'UnauthorizedError';
	}
}

export class NotFoundError extends AppError {
	constructor(message = 'Not found') {
		super(message, 404, 'NOT_FOUND');
		this.name = 'NotFoundError';
	}
}

export class ValidationError extends AppError {
	constructor(
		message = 'Validation failed',
		readonly fields?: Record<string, string[]>
	) {
		super(message, 422, 'VALIDATION');
		this.name = 'ValidationError';
	}
}

export class RateLimitError extends AppError {
	constructor(message = 'Too many attempts') {
		super(message, 429, 'RATE_LIMITED');
		this.name = 'RateLimitError';
	}
}

export class ProviderError extends AppError {
	constructor(message = 'Provider failed', code = 'PROVIDER_TEMPORARY_FAILURE') {
		super(message, 502, code);
		this.name = 'ProviderError';
	}
}
