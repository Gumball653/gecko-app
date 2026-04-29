import React, { useState } from "react";

const LOGIN_STORAGE_KEY = "reptile-notes-login-session-v1";
const APP_USERNAME = "admin";
const APP_PASSWORD = "reptilenotes";

export default function LoginGate({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => window.localStorage.getItem(LOGIN_STORAGE_KEY) === "true");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleLogin(event) {
    event.preventDefault();

    if (username.trim() === APP_USERNAME && password === APP_PASSWORD) {
      window.localStorage.setItem(LOGIN_STORAGE_KEY, "true");
      setIsLoggedIn(true);
      setError("");
      setPassword("");
      return;
    }

    setError("Incorrect username or password.");
  }

  function handleLogout() {
    window.localStorage.removeItem(LOGIN_STORAGE_KEY);
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
  }

  if (isLoggedIn) {
    return (
      <>
        <div className="fixed right-3 top-3 z-50">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-slate-300 bg-white/95 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
        {children}
      </>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Private Access</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Reptile Notes</h1>
          <p className="mt-2 text-sm text-slate-600">Log in to view and manage your reptile records.</p>
        </div>

        <form className="space-y-4" onSubmit={handleLogin}>
          <label className="block text-sm font-semibold text-slate-700">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-slate-500"
              autoComplete="username"
              required
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 text-base outline-none focus:border-slate-500"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-950 px-4 py-3 text-base font-bold text-white transition hover:bg-slate-800"
          >
            Log in
          </button>
        </form>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">Default login</p>
          <p className="mt-1">Username: <span className="font-mono">admin</span></p>
          <p>Password: <span className="font-mono">reptilenotes</span></p>
        </div>
      </section>
    </main>
  );
}
