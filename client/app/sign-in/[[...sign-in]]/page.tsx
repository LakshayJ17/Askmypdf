"use client"

import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-black px-2">
            <SignIn
                signUpUrl="/sign-up"
            />
        </div>

    )
}
