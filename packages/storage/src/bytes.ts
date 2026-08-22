/** Copy into a definite ArrayBuffer for WebCrypto and fetch BodyInit. */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	const copy = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(copy).set(bytes);
	return copy;
}
