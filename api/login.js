function safeCompare(a = "", b = "") {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const expectedUsername = process.env.LOGIN_USERNAME;
  const expectedPassword = process.env.LOGIN_PASSWORD;
  const sessionToken = process.env.LOGIN_SESSION_TOKEN;

  if (!expectedUsername || !expectedPassword || !sessionToken) {
    return res.status(500).json({ ok: false, message: "Login is not configured on the server." });
  }

  const { username = "", password = "" } = req.body || {};

  const usernameMatches = safeCompare(String(username).trim(), expectedUsername);
  const passwordMatches = safeCompare(String(password), expectedPassword);

  if (!usernameMatches || !passwordMatches) {
    return res.status(401).json({ ok: false, message: "Incorrect username or password." });
  }

  return res.status(200).json({ ok: true, token: sessionToken });
}
