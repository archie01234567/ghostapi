export async function handler(event, context) {
  try {
    const res = await fetch("https://lfapurpose.ghost.io/ghost/api/content/posts/?key=YOUR_CONTENT_API_KEY&filter=visibility:public+status:scheduled&limit=3&order=published_at%20asc");
    const data = await res.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
