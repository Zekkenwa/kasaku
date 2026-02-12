"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="p-6 border rounded-lg">
        <h1 className="text-xl font-semibold mb-4">Login</h1>
        <button
          onClick={() => signIn("google")}
          className="px-4 py-2 bg-black text-white rounded"
        >
          Login with Google
        </button>
      </div>
    </main>
  );
}
