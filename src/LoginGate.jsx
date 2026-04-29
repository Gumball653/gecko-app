import React, { useEffect, useState } from "react";
import { auth } from "./firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";

export default function LoginGate({ children }) {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login");

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSignup() {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReset() {
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent");
    } catch (err) {
      setError(err.message);
    }
  }

  if (user) {
    return (
      <>
        <div className="fixed top-3 right-3">
          <button onClick={() => signOut(auth)}>Logout</button>
        </div>
        {children}
      </>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleLogin} className="bg-white p-6 rounded shadow space-y-3">
        <h2>{mode === "login" ? "Login" : "Sign Up"}</h2>

        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />

        {error && <p className="text-red-500">{error}</p>}

        {mode === "login" ? (
          <button type="submit">Login</button>
        ) : (
          <button type="button" onClick={handleSignup}>Create Account</button>
        )}

        <button type="button" onClick={handleReset}>Forgot Password</button>

        <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Create account" : "Back to login"}
        </button>
      </form>
    </div>
  );
}
