const https = require("https");
exports.handler = async function (event) {
  console.log("Function called, method:", event.httpMethod);

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log("API key present:", !!apiKey);

  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Missing API key" }) };
  }
  console.log("Request body length:", event.body?.length);
  return new Promise((resolve) => {
    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        console.log("Anthropic response status:", res.statusCode);
        console.log("Anthropic response:", data.slice(0, 200));
        resolve({
          statusCode: res.statusCode,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "POST, OPTIONS"
          },
          body: data,
        });
      });
    });
    req.on("error", (e) => {
      console.log("Request error:", e.message);
      resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) });
    });
    req.write(event.body);
    req.end();
  });
};
