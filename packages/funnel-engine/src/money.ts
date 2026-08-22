export function formatMoneyLabel(
	minor: number | null | undefined,
	currency: string
): string | undefined {
	if (minor == null) return undefined;
	const sign = minor < 0 ? '-' : '';
	const abs = Math.abs(minor);
	const whole = Math.trunc(abs / 100);
	const cents = String(abs % 100).padStart(2, '0');
	return `From ${sign}${currency} ${whole}.${cents}`;
}
