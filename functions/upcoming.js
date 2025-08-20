import crypto from "crypto";

function base64URLEncode(str) {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function createJWT(payload, secret) {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };

  const encodedHeader = base64URLEncode(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64URLEncode(Buffer.from(JSON.stringify(payload)));

  const signature = crypto
    .createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();

  const encodedSignature = base64URLEncode(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

export async function handler() {
  const apiUrl = "https://lfapurpose.ghost.io/ghost/api/admin/posts/";
  
  try {
    const adminApiKey = process.env.GHOST_API_KEY;
    
    if (!adminApiKey) {
      throw new Error("GHOST_API_KEY is not set");
    }

    const [id, secret] = adminApiKey.split(":");
    
    if (!id || !secret) {
      throw new Error("Invalid GHOST_ADMIN_API_KEY format. Expected format: 'id:secret'");
    }

    // Create JWT token manually
    const payload = {
      kid: id,
      exp: Math.floor(Date.now() / 1000) + 5 * 60 // 5 minutes from now
    };

    const token = createJWT(payload, secret);

    // Call Ghost Admin API
    const res = await fetch(`${apiUrl}?filter=status:scheduled`, {
      headers: {
        Authorization: `Ghost ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Ghost API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: true,
        scheduledPosts: data.posts?.length || 0,
        data: data
      }, null, 2),
    };
  } catch (error) {
    console.error("Function error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      }),
    };
  }
}
