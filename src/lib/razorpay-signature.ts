// Verifies Razorpay's checkout signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret).
// Uses Web Crypto so it runs on the edge runtime.
export async function hmacSha256Hex(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const expected = await hmacSha256Hex(secret, `${orderId}|${paymentId}`);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
