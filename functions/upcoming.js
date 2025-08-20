const jwt = require("jsonwebtoken");

export async function handler() {
  const apiUrl = "https://lfapurpose.ghost.io/ghost/api/admin/posts/";
  
  try {
    const adminApiKey = process.env.GHOST_ADMIN_API_KEY;
    
    if (!adminApiKey) {
      throw new Error("GHOST_ADMIN_API_KEY is not set");
    }

    const [id, secret] = adminApiKey.split(":");
    
    if (!id || !secret) {
      throw new Error("Invalid GHOST_ADMIN_API_KEY format");
    }

    // Create JWT token
    const token = jwt.sign(
      {
        kid: id,
        exp: Math.floor(Date.now() / 1000) + 5 * 60
      },
      Buffer.from(secret, "hex"),
      { algorithm: "HS256" }
    );

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
    console.error("Function error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
