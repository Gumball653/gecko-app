import React, { useState } from "react";

const LOGIN_STORAGE_KEY = "reptile-notes-session-token";

export default function LoginGate({ children }) {
  const [token, setToken] = useState(() => window.localStorage.getItem(LOGIN_STORAGE_KEY));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Login failed");
      }

      window.localStorage.setItem(LOGIN_STORAGE_KEY, data.token);
      setToken(data.token);
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    window.localStorage.removeItem(LOGIN_STORAGE_KEY);
    setToken(null);
    setUsername("");
    setPassword("");
  }

  if (token) {
    return (
      <>
        <div className="fixed right-3 top-3 z-50">
          <button onClick={handleLogout} className="rounded-xl border px-3 py-2">Log out</button>
        </div>
        {children}
      </>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleLogin} className="space-y-4 bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-bold">Login</h2>

        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required className="border p-2 w-full" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="border p-2 w-full" />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={loading} className="bg-black text-white px-4 py-2 w-full">
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </main>
  );
}
