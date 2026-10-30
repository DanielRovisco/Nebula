/** Normalises a phone number to E.164. 9-digit Portuguese numbers get +351. Returns null when it cannot be a valid number. */
export function toE164(input: string): string | null {
  let s = input.replace(/[\s().-]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (/^[239]\d{8}$/.test(s)) s = "+351" + s;
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}
