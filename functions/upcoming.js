import fetch from "node-fetch";
import jwt from "jsonwebtoken";

const GHOST_ADMIN_API_URL = "https://lfapurpose.ghost.io";
const ADMIN_API_KEY = "68a54ec45129820001de13e4:2192b2e288064077b034a01406efed2cccf87310f321cd558984c711658f1dc2"; // format: key:secret

export default async function handler(req, res) {
  try {
    const [id, secret] = ADMIN_API_KEY.split(":");
    const token = jwt.sign({}, Buffer.from(secret, "hex"), {
      keyid: id,
      algorithm: "HS256",
      expiresIn: "5m",
      audience: `/admin/`
    });

    const response = await fetch(
      `${GHOST_ADMIN_API_URL}/posts/?filter=status:scheduled&limit=5&fields=title,slug,published_at`,
      {
        headers: {
          "Authorization": `Ghost ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch scheduled posts" });
  }
}
