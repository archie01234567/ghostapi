import jwt from "jsonwebtoken";

export async function handler() {
  const apiUrl = "https://lfapurpose.ghost.io/ghost/api/admin/posts/";

  try {
    // Split your Admin API key into ID + SECRET
    const [id, secret] = process.env.GHOST_ADMIN_API_KEY.split(":");

    // Create a JWT
    const token = jwt.sign(
      {
        kid: id, // key id
        exp: Math.floor(Date.now() / 1000) + 5 * 60 // 5 min expiry
      },
      Buffer.from(secret, "hex"),
      { algorithm: "HS256" }
    );

    // Call Ghost Admin API
    const res = await fetch(`${apiUrl}?filter=status:scheduled`, {
      headers: {
        Authorization: `Ghost ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data, null, 2),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
