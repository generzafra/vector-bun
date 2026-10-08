export const CRM_CONFLICT_RULE = 'vector_sales_outcome_wins' as const;

export type CrmConflict = {
	rule: typeof CRM_CONFLICT_RULE;
	authority: 'vector' | 'unrecorded';
	applyCrmStage: false;
	applyCrmAmount: false;
	detail: string;
};

export function resolveCrmConflict(vectorRecorded: boolean): CrmConflict {
	if (vectorRecorded) {
		return {
			rule: CRM_CONFLICT_RULE,
			authority: 'vector',
			applyCrmStage: false,
			applyCrmAmount: false,
			detail: 'A recorded sale stays as entered. The CRM snapshot does not replace it.'
		};
	}
	return {
		rule: CRM_CONFLICT_RULE,
		authority: 'unrecorded',
		applyCrmStage: false,
		applyCrmAmount: false,
		detail: 'A CRM stage stays a preview. Vector does not change the lead from a CRM pull.'
	};
}
