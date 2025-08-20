export async function handler(event, context) {
  try {
const res = await fetch(`https://lfapurpose.ghost.io/ghost/api/content/posts/?key=68a54ec45129820001de13e4:2192b2e288064077b034a01406efed2cccf87310f321cd558984c711658f1dc2&filter=tag:'upcoming'&limit=3`);

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




