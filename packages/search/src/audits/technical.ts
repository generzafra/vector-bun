export type TechnicalPageInput = {
	id: string;
	path: string;
	title: string;
	seoTitle?: string | null;
	seoDescription?: string | null;
};

export type DetectedIssue = {
	pageId: string;
	path: string;
	code: 'missing_title' | 'missing_description' | 'invalid_path';
	severity: 'low' | 'medium' | 'high';
	evidenceClass: 'observed';
	detail: string;
};

export function detectTechnicalIssues(pages: TechnicalPageInput[]): DetectedIssue[] {
	const issues: DetectedIssue[] = [];
	for (const page of pages) {
		const title = page.seoTitle?.trim() || page.title.trim();
		if (!title) {
			issues.push({
				pageId: page.id,
				path: page.path,
				code: 'missing_title',
				severity: 'high',
				evidenceClass: 'observed',
				detail: `${page.path} is missing a title`
			});
		}
		if (!page.seoDescription?.trim()) {
			issues.push({
				pageId: page.id,
				path: page.path,
				code: 'missing_description',
				severity: 'medium',
				evidenceClass: 'observed',
				detail: `${page.path} is missing a meta description`
			});
		}
		if (!page.path.startsWith('/')) {
			issues.push({
				pageId: page.id,
				path: page.path,
				code: 'invalid_path',
				severity: 'high',
				evidenceClass: 'observed',
				detail: `${page.path} is not a public path`
			});
		}
	}
	return issues;
}
