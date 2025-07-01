"use client"

import { SignIn } from "@clerk/nextjs"
import { Lock } from "lucide-react"
// import Image from "next/image"

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-2 ">
      {/* <div>
        <Image src="/chat-bot.png" alt="Chatbot" width={600} height={600} className="mb-6" />
      </div> */}

      <div className="w-full max-w-md mx-auto flex flex-col justify-center items-center">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-2xl mb-4 border border-cyan-500/20">
            <Lock className="text-cyan-400 w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 text-center">Welcome Back</h1>
          <p className="text-gray-400 text-center mb-2 text-sm sm:text-base">
            Sign in to access your personalized dashboard
          </p>
        </div>

        <div className="bg-white border border-zinc-200 shadow-2xl rounded-2xl p-6 w-full backdrop-blur-sm">
          <SignIn
            signUpUrl="/sign-up"
            appearance={{
              elements: {
                card: "bg-transparent border-none shadow-none p-0 w-full",
                headerTitle: "text-black text-xl sm:text-2xl font-bold text-center mb-4",
                headerSubtitle: "text-gray-700 text-center mb-6 text-sm sm:text-base",
                socialButtonsBlockButton:
                  "bg-zinc-100 border border-zinc-300 text-black hover:bg-zinc-200 hover:border-zinc-400 transition-all duration-300 rounded-xl py-3 font-medium text-sm sm:text-base shadow-lg hover:shadow-xl",
                socialButtonsBlockButtonText: "text-black font-medium text-sm sm:text-base",
                dividerLine: "bg-zinc-300/70",
                dividerText: "text-gray-700 text-xs sm:text-sm font-medium",
                formFieldLabel: "text-gray-700 font-semibold mb-2 text-xs sm:text-sm tracking-wide",
                formFieldInput:
                  "bg-zinc-100 border border-zinc-300 text-black placeholder:text-gray-500 rounded-xl py-3 px-4 focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-400/20 focus:bg-zinc-200 transition-all duration-300 text-sm sm:text-base shadow-inner",
                formButtonPrimary:
                  "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold rounded-xl py-3 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 text-sm sm:text-base transform hover:scale-[1.02]",
                footerActionLink:
                  "text-cyan-600 hover:text-cyan-500 font-semibold transition-colors duration-300 text-sm sm:text-base underline-offset-4 hover:underline",
                identityPreviewText: "text-black font-medium",
                identityPreviewEditButton: "text-cyan-600 hover:text-cyan-500 font-semibold",
                formFieldAction: "text-cyan-600 hover:text-cyan-500 font-semibold",
                formFieldSuccessText: "text-emerald-600 font-medium",
                formFieldErrorText: "text-red-600 font-medium",
                formFieldWarningText: "text-amber-600 font-medium",
                otpCodeFieldInput:
                  "bg-zinc-100 border border-zinc-300 text-black rounded-xl text-sm sm:text-base shadow-inner",
                formResendCodeLink: "text-cyan-600 hover:text-cyan-500 font-semibold",
                alertText: "text-black font-medium",
                formFieldInputShowPasswordButton: "text-gray-500 hover:text-cyan-600 transition-colors duration-300",
              },
              layout: {
                socialButtonsPlacement: "top",
                socialButtonsVariant: "blockButton",
              },
              variables: {
                colorPrimary: "#22d3ee",
                colorBackground: "#fff",
                colorInputBackground: "#f4f4f5",
                colorInputText: "#000",
                colorText: "#000",
                colorTextSecondary: "#334155",
                borderRadius: "12px",
                spacingUnit: "1rem",
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
