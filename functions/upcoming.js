import crypto from "crypto";

function base64URLEncode(buf) {
  // Buffer -> base64url (no padding)
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/,''); // remove all padding
}

function createJWT(payload, secretHex, keyId) {
// Use the exact JWT creation method that Ghost documentation recommends
function createGhostJWT(id, secret) {
  const header = {
    alg: "HS256",
    typ: "JWT",
    kid: keyId
    alg: 'HS256',
    typ: 'JWT',
    kid: id
  };

  const encodedHeader = base64URLEncode(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64URLEncode(Buffer.from(JSON.stringify(payload)));
  const payload = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 5 * 60,
    aud: '/admin/'
  };

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const headerBase64 = Buffer.from(JSON.stringify(header))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  // Use hex buffer for the secret (Ghost provides hex)
  const signature = crypto
    .createHmac('sha256', Buffer.from(secretHex, 'hex'))
    .update(signingInput)
    .digest(); // Buffer
  const payloadBase64 = Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const encodedSignature = base64URLEncode(signature);
  const unsignedToken = `${headerBase64}.${payloadBase64}`;
  
  const signature = crypto
    .createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(unsignedToken)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  return `${unsignedToken}.${signature}`;
}

export async function handler() {
export async function handler(event, context) {
  // Add CORS headers for browser requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const adminApiKey = process.env.GHOST_ADMIN_API_KEY || process.env.GHOST_API_KEY;
    if (!adminApiKey) throw new Error("GHOST_ADMIN_API_KEY (or GHOST_API_KEY) is not set");
    console.log('Function started');
    
    const adminApiKey = process.env.GHOST_API_KEY;
    
    if (!adminApiKey) {
      throw new Error('GHOST_API_KEY environment variable is not set');
    }

    const [id, secret] = adminApiKey.split(":");
    if (!id || !secret) throw new Error("Invalid GHOST_ADMIN_API_KEY format. Expected format: 'id:secret'");
    console.log('API key found, length:', adminApiKey.length);

    const iat = Math.floor(Date.now() / 1000);
    const payload = {
      iat,
      exp: iat + 5 * 60 // 5 minutes
    };
    const [id, secret] = adminApiKey.split(':');
    
    if (!id || !secret) {
      throw new Error('Invalid GHOST_API_KEY format. Expected: id:secret');
    }

    console.log('Key parsed - ID length:', id.length, 'Secret length:', secret.length);

    // Create the JWT token
    const token = createGhostJWT(id, secret);
    console.log('JWT created, length:', token.length);

    const token = createJWT(payload, secret, id);
    // Make the API request
    const apiUrl = 'https://lfapurpose.ghost.io/ghost/api/admin/posts/';
    const url = `${apiUrl}?filter=status:scheduled&limit=all`;
    
    console.log('Making request to:', url);

    const apiUrl = "https://lfapurpose.ghost.io/ghost/api/admin/posts/";
    const res = await fetch(`${apiUrl}?filter=status:scheduled`, {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Ghost ${token}`,
        "Content-Type": "application/json",
      },
        'Authorization': `Ghost ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Ghost API error: ${res.status} ${res.statusText}. Body: ${text}`);
    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);

    const responseText = await response.text();
    console.log('Raw response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      throw new Error(`Invalid JSON response: ${responseText}`);
    }

    if (!response.ok) {
      console.error('API Error:', data);
      throw new Error(`Ghost API error: ${response.status} - ${JSON.stringify(data)}`);
    }

    const data = JSON.parse(text);
    return {
      statusCode: 200,
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ success: true, scheduledPosts: data.posts?.length || 0, data }, null, 2),
      headers,
      body: JSON.stringify({
        success: true,
        count: data.posts ? data.posts.length : 0,
        posts: data.posts || [],
        meta: data.meta || {}
      }, null, 2)
    };

  } catch (error) {
    console.error("Function error:", error);
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ success: false, error: error.message }),
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }, null, 2)
    };
  }
}
