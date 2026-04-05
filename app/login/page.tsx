"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await signIn("credentials", { email, password, redirect: false });

    if (res?.ok) {
      router.push("/dashboard");
      return;
    }

    if (res?.code === "service_unavailable") {
      setError("Login is temporarily unavailable. Please try again in a moment.");
      return;
    }

    if (res?.error === "Configuration") {
      setError("Login is not configured correctly. Check the server auth settings.");
      return;
    }

    setError("Invalid email or password.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Login to Evestime</h1>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded mb-3" required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded mb-4" required />
        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Login</button>
        <p className="text-center mt-4 text-sm">Don&apos;t have an account? <Link href="/signup" className="text-blue-600">Sign up</Link></p>
      </form>
    </div>
  );
}
