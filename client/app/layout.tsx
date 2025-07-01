import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import Navbar from "./components/navbar";

export const metadata: Metadata = {
  title: "My App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
