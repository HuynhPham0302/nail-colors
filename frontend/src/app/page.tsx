"use client";

import { useEffect } from "react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  const checkLogin = async () => {
    try {
      const res = await fetch("http://localhost:8000/me", {
        credentials: "include",
      });

      const data = await res.json();

      if (!data.user) return;

      const role = data.user.role;

      if (role === "admin") {
        router.push("/admin");
      } else if (role === "staff") {
        router.push("/staff");
      }
    } catch (error) {
      console.error("Check login failed:", error);
    }
  };

  checkLogin();
}, [router]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await res.json();

      if (data.message !== "Login successful") {
        setMessage(data.message || "Login failed");
        return;
      }

      const role = data.user.role;

      if (role === "admin") {
        router.push("/admin");
      } else if (role === "staff") {
        router.push("/staff");
      } else {
        setMessage("Unknown role");
      }
    } catch (error) {
      console.error("Login failed:", error);
      setMessage("Cannot connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 flex items-center justify-center px-4">
      <div className="bg-white shadow-xl rounded-2xl p-10 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Welcome to Nail Color App 💅
        </h1>

        <p className="text-gray-500 text-center mb-8">
          Please log in to continue
        </p>

        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-500 text-white py-3 rounded-xl font-semibold hover:bg-pink-600 transition disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          {message && (
            <p className="text-sm text-red-600 text-center">{message}</p>
          )}
        </form>
      </div>
    </main>
  );
}