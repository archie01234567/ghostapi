import crypto from "crypto";

function base64URLEncode(buf) {
  // Buffer -> base64url (no padding)
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/,''); // remove all padding
}

function createJWT(payload, secretHex, keyId) {
  const header = {
    alg: "HS256",
    typ: "JWT",
    kid: keyId
  };

  const encodedHeader = base64URLEncode(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64URLEncode(Buffer.from(JSON.stringify(payload)));

  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Use hex buffer for the secret (Ghost provides hex)
  const signature = crypto
    .createHmac('sha256', Buffer.from(secretHex, 'hex'))
    .update(signingInput)
    .digest(); // Buffer

  const encodedSignature = base64URLEncode(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

export async function handler() {
  try {
    const adminApiKey = process.env.GHOST_ADMIN_API_KEY || process.env.GHOST_API_KEY;
    if (!adminApiKey) throw new Error("GHOST_ADMIN_API_KEY (or GHOST_API_KEY) is not set");

    const [id, secret] = adminApiKey.split(":");
    if (!id || !secret) throw new Error("Invalid GHOST_ADMIN_API_KEY format. Expected format: 'id:secret'");

    const iat = Math.floor(Date.now() / 1000);
    const payload = {
      iat,
      exp: iat + 5 * 60 // 5 minutes
    };

    const token = createJWT(payload, secret, id);

    const apiUrl = "https://lfapurpose.ghost.io/ghost/api/admin/posts/";
    const res = await fetch(`${apiUrl}?filter=status:scheduled`, {
      headers: {
        Authorization: `Ghost ${token}`,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Ghost API error: ${res.status} ${res.statusText}. Body: ${text}`);
    }

    const data = JSON.parse(text);
    return {
      statusCode: 200,
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ success: true, scheduledPosts: data.posts?.length || 0, data }, null, 2),
    };
  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
}
