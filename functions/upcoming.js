export async function handler() {
  const apiUrl = "https://lfapurpose.ghost.io/ghost/api/admin/posts/";

  try {
    const res = await fetch(`${apiUrl}?filter=status:scheduled`, {
      headers: {
        "Authorization": `Ghost ${process.env.GHOST_ADMIN_API_KEY}`
      }
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
