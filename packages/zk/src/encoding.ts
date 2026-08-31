const HEX = /^[0-9a-fA-F]+$/;

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string): Uint8Array {
  if (!HEX.test(hex) || hex.length % 2 !== 0) {
    throw new Error("Expected an even-length hexadecimal string");
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function assertBytes32Hex(value: string, name: string): void {
  if (!/^[0-9a-fA-F]{64}$/.test(value)) throw new Error(`${name} must be 32 bytes encoded as hex`);
}

export function normalizeCountry(value: string): string {
  return value.trim().toUpperCase();
}
