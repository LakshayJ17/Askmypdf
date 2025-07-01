"use client"

import { SignUp } from "@clerk/nextjs"
import { LockIcon } from "lucide-react"


export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-black">
      <div className="w-full max-w-md mx-auto flex flex-col justify-center items-center">
        <div className="flex flex-col items-center justify-center mb-6 gap-3">
          <LockIcon className="text-cyan-400 size-16" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 text-center">Welcome to AskMyPDF</h1>
          <p className="text-gray-400 text-center mb-2 text-sm sm:text-base">
            Create your account to start chatting with your document
          </p>
        </div>
        <SignUp
        
          signInUrl="/sign-in"
          appearance={{
            elements: {
              card: "bg-white border border-zinc-200 shadow-2xl rounded-2xl p-6 w-full backdrop-blur-sm",
              socialButtonsBlockButton: "bg-zinc-100 border border-zinc-300 text-black hover:bg-zinc-200 hover:border-zinc-400 transition-all duration-300 rounded-xl py-3 font-medium text-sm sm:text-base shadow-lg hover:shadow-xl",
              socialButtonsBlockButtonText: "text-black font-medium text-sm sm:text-base",
            },
            layout: {
              socialButtonsPlacement: "top",
              socialButtonsVariant: "blockButton",
            },
          }}
        />
      </div>
    </div>
  )
}
