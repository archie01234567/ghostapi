import fetch from "node-fetch";
import jwt from "jsonwebtoken";

export async function handler() {
  const apiUrl = "https://lfapurpose.ghost.io/ghost/api/admin/posts/";
  const adminKey = process.env.GHOST_ADMIN_KEY; // stored in Netlify env vars

  const [id, secret] = adminKey.split(':');
  const token = jwt.sign({}, Buffer.from(secret, 'hex'), {
    keyid: id,
    algorithm: 'HS256',
    expiresIn: '5m',
    audience: `/v5/admin/`
  });

  const response = await fetch(`${apiUrl}?filter=status:scheduled&limit=5`, {
    headers: { Authorization: `Ghost ${token}` }
  });

  const data = await response.json();

  return {
    statusCode: 200,
    body: JSON.stringify(data.posts, null, 2)
  };
}
