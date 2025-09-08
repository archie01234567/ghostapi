// functions/ghost-featured-merged.js
import crypto from 'crypto';

/**
 * base64url encoding (no padding)
 */
function base64url(input) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return b.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Create Ghost Admin JWT from adminKey "id:secretHex"
 */
function createGhostAdminJWT(adminKey) {
  if (!adminKey) throw new Error('GHOST_ADMIN_API_KEY not provided');
  const [kid, secretHex] = adminKey.split(':');
  if (!kid || !secretHex) throw new Error('GHOST_ADMIN_API_KEY must be in "id:secretHex" format');

  const header = { alg: 'HS256', typ: 'JWT', kid };
  const iat = Math.floor(Date.now() / 1000);
  const payload = { iat, exp: iat + 5 * 60, aud: '/admin/' };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const unsigned = `${headerB64}.${payloadB64}`;

  const signatureBase64 = crypto
    .createHmac('sha256', Buffer.from(secretHex, 'hex'))
    .update(unsigned)
    .digest('base64');

  const signatureB64url = signatureBase64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${unsigned}.${signatureB64url}`;
}

/**
 * Serverless handler
 */
export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  if (event && event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    const adminKey = process.env.GHOST_ADMIN_API_KEY || process.env.GHOST_API_KEY;
    const ghostUrl = (process.env.GHOST_ADMIN_URL || process.env.GHOST_URL || '').replace(/\/$/, '');

    if (!adminKey) throw new Error('GHOST_ADMIN_API_KEY environment variable is not set');
    if (!ghostUrl) throw new Error('GHOST_ADMIN_URL environment variable is not set');

    const token = createGhostAdminJWT(adminKey);

    // 🔑 Combined filter: published featured OR scheduled featured
    const filter = 'featured:true+(status:published,status:scheduled)';

    // limit fields to what we need
    const fields = 'id,title,slug,feature_image,custom_excerpt,excerpt,status,published_at,scheduled_at,visibility,created_at';

    const apiUrl = `${ghostUrl}/ghost/api/admin/posts/?filter=${encodeURIComponent(filter)}&limit=all&fields=${encodeURIComponent(fields)}`;

    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Ghost ${token}`,
        'Accept-Version': 'v5.0',
      },
    });

    const text = await res.text();
    if (!res.ok) {
      return {
        statusCode: res.status || 500,
        headers,
        body: JSON.stringify({ success: false, status: res.status, body: text }),
      };
    }

    const json = JSON.parse(text);
    const rawPosts = json.posts || [];

    // Normalize + pick fields
    const posts = rawPosts.map((p) => {
      const dateRef = p.scheduled_at || p.published_at || p.created_at || null;
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        feature_image: p.feature_image,
        excerpt: p.custom_excerpt || p.excerpt || '',
        status: p.status,
        published_at: p.published_at || null,
        scheduled_at: p.scheduled_at || null,
        visibility: p.visibility || null,
        dateRef,
      };
    });

    // Sort by nearest dateRef ascending
    posts.sort((a, b) => {
      const da = a.dateRef ? new Date(a.dateRef).getTime() : 0;
      const db = b.dateRef ? new Date(b.dateRef).getTime() : 0;
      return da - db;
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, count: posts.length, posts }, null, 2),
    };
  } catch (err) {
    console.error('ghost-featured-merged error', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
}
