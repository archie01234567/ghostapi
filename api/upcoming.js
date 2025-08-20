import fetch from "node-fetch";

export default async function handler(req, res) {
  const apiUrl = "https://lfapurpose.com/ghost/api/admin/posts/";
  const adminKey = process.env.GHOST_ADMIN_KEY;

  // Build JWT token for Ghost Admin API
  const [id, secret] = adminKey.split(':');
  const jwt = require('jsonwebtoken').sign({}, Buffer.from(secret, 'hex'), {
    keyid: id,
    algorithm: 'HS256',
    expiresIn: '5m',
    audience: `/v5/admin/`
  });

  const response = await fetch(`${apiUrl}?filter=status:scheduled&limit=5`, {
    headers: { Authorization: `Ghost ${jwt}` }
  });
  const data = await response.json();

  res.status(200).json(data.posts);
}

