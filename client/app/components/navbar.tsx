"use client"

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Navbar() {
  const router = useRouter();

  return (
    <nav className="w-full h-20 flex justify-between items-center bg-zinc-900 text-white px-6 border-b border-zinc-800 shadow-md z-50">
      <div className="text-2xl font-bold tracking-wide">AskMyPDF</div>
      <SignedOut>
        <Button
          variant="secondary"
          className="bg-white text-black hover:bg-zinc-200"
          onClick={() => router.push("/sign-in")}
        >
          Get Started
        </Button>
      </SignedOut>

      <SignedIn>
        <div className="flex items-center gap-4">
          <UserButton />
        </div>
      </SignedIn>
    </nav>
  );
}
