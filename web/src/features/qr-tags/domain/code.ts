/** Printed QR labels are identifiers, never executable links or state changes. */
export function parseWorkCode(
  code: string,
): { orderKey: string; pieceId?: string } | null {
  const text = code.trim();
  if (!text || text.length > 300) return null;
  if (text.startsWith("swapna:")) {
    const parts = text.split(":");
    if (
      parts.length !== 3 ||
      !parts[1] ||
      !parts[2] ||
      parts.some((p) => /[\s/?#]/.test(p))
    )
      return null;
    return { orderKey: parts[1], pieceId: parts[2] };
  }
  return /^[a-z0-9_-]+$/i.test(text) ? { orderKey: text } : null;
}
