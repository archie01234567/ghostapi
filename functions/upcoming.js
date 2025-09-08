import crypto from 'crypto';

function base64URLEncode(buf) {
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function createGhostJWT(keyId, secret) {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
    kid: keyId
  };

  const payload = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 5 * 60,
    aud: '/admin/'
  };

  const encodedHeader = base64URLEncode(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64URLEncode(Buffer.from(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', Buffer.from(secret, 'hex'))
    .update(signingInput)
    .digest();

  const encodedSignature = base64URLEncode(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

async function updatePostToFeatured(post, token) {
  const updateUrl = `https://lfapurpose.ghost.io/ghost/api/admin/posts/${post.id}/`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Ghost ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      posts: [{
        ...post,
        featured: true,
        updated_at: new Date().toISOString()
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to update post ${post.id}: ${response.status}`);
  }

  return response.json();
}

export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const adminApiKey = process.env.GHOST_ADMIN_API_KEY || process.env.GHOST_API_KEY;
    if (!adminApiKey) throw new Error("GHOST_ADMIN_API_KEY (or GHOST_API_KEY) is not set");

    const [id, secret] = adminApiKey.split(':');
    if (!id || !secret) throw new Error("Invalid API key format. Expected 'id:secret'");

    const token = createGhostJWT(id, secret);
    const apiUrl = 'https://lfapurpose.ghost.io/ghost/api/admin/posts/';
    const url = `${apiUrl}?filter=status:scheduled&limit=all`;

    // Fetch scheduled posts
    const response = await fetch(url, {
      headers: {
        'Authorization': `Ghost ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Ghost API error: ${response.status}`);
    }

    const data = await response.json();
    const scheduledPosts = data.posts || [];

    // Update each scheduled post to featured
    const updateResults = [];
    for (const post of scheduledPosts) {
      try {
        if (!post.featured) {
          const result = await updatePostToFeatured(post, token);
          updateResults.push({
            id: post.id,
            title: post.title,
            status: 'success',
            featured: result.posts[0].featured
          });
        } else {
          updateResults.push({
            id: post.id,
            title: post.title,
            status: 'skipped',
            message: 'Already featured'
          });
        }
      } catch (error) {
        updateResults.push({
          id: post.id,
          title: post.title,
          status: 'error',
          error: error.message
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        updatedPosts: updateResults,
        totalScheduled: scheduledPosts.length,
        meta: data.meta || {}
      }, null, 2)
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }, null, 2)
    };
  }
}
