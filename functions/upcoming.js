import crypto from "crypto";

function base64URLEncode(str) {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function createJWT(payload, secret, keyId) {
  const header = {
    alg: "HS256",
    typ: "JWT",
    kid: keyId  // Ghost expects the key ID in the header
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

    const token = createJWT(payload, secret, id);

    // Call Ghost Admin API
    console.log("Making request to:", `${apiUrl}?filter=status:scheduled`);
    console.log("Authorization header:", `Ghost ${token.substring(0, 50)}...`);
    
    const res = await fetch(`${apiUrl}?filter=status:scheduled`, {
      headers: {
        Authorization: `Ghost ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Response status:", res.status);
    console.log("Response headers:", Object.fromEntries(res.headers.entries()));
    
    if (!res.ok) {
      // Get the response body for more details
      let errorBody;
      try {
        errorBody = await res.text();
        console.log("Error response body:", errorBody);
      } catch (e) {
        console.log("Could not read error response body");
      }
      
      throw new Error(`Ghost API error: ${res.status} ${res.statusText}. Body: ${errorBody || 'No body'}`);
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
