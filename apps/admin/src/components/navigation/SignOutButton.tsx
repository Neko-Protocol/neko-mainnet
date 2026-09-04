"use client";

import { useRouter } from "next/navigation";
import { signOut } from "./sign-out-action";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
    >
      Sign out
    </button>
  );
}
