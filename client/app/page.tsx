"use client";


import { BackgroundLines } from "@/components/ui/background-lines";
import { FlipWords } from "@/components/ui/flip-words";
import Navbar from "./components/navbar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";


export default function Home() {
  const { isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.push("/upload");
    }
  }, [isSignedIn, router])

  return (
    <section className="relative w-full h-screen bg-black overflow-hidden">
      <Navbar />
      <div className="absolute inset-x-0 top-16 bottom-0 z-0 overflow-hidden">
        <BackgroundLines className="w-full h-full" />
      </div>

      <div className="relative z-10 flex flex-col justify-center items-center h-[calc(100vh-4rem)] text-white px-4 text-center gap-4">
        <h1 className="text-4xl md:text-8xl font-bold leading-tight">
          Chat&nbsp;
          <span>
            <FlipWords
              words={["instantly", "easily", "securely", "anywhere", "anytime"]}
              duration={2000}
              className="text-cyan-400"
            />
          </span>
        </h1>

        <h2 className="text-lg md:text-2xl font-semibold text-zinc-300">
          with your PDF using AskMyPDF
        </h2>
      </div>
    </section>
  );
}