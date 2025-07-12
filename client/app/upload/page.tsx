"use client"

import { useState } from "react"
import { Upload, FileText, CheckCircle, AlertCircle, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import Navbar from "../components/navbar"

const FileUploadComponent = () => {
    const [isUploading, setIsUploading] = useState(false)
    const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
    const [fileName, setFileName] = useState<string>("")
    const [isStartingChat, setIsStartingChat] = useState(false)
    const router = useRouter()
    const { user } = useUser()

    const userId = user?.id;

    const handleFileUploadButtonClick = () => {
        const el = document.createElement("input")
        el.setAttribute("type", "file")
        el.setAttribute("accept", "application/pdf")

        el.addEventListener("change", async () => {
            if (el.files && el.files.length > 0) {
                const file = el.files.item(0)
                if (file) {
                    setIsUploading(true)
                    setFileName(file.name)
                    setUploadStatus("idle")

                    try {
                        const formData = new FormData()
                        formData.append("pdf", file)
                        formData.append("userId", userId ?? "")

                        const response = await fetch("https://askmypdfapi.up.railway.app/upload/pdf", {
                            method: "POST",
                            body: formData,
                        })
                        // const response = await fetch("http://localhost:8000/upload/pdf", {
                        //     method: "POST",
                        //     body: formData,
                        // })
                        const data = await response.json();

                        if (!response.ok || data?.message !== "uploaded") {
                            setUploadStatus("error")
                            console.error("Upload failed:", data?.error || data?.message)
                        } else {
                            setUploadStatus("success")
                            console.log("file uploaded")
                        }
                    } catch (error) {
                        console.error("Upload failed:", error)
                        setUploadStatus("error")
                    } finally {
                        setIsUploading(false)
                    }
                }
            }
        })

        el.click()
    }

    const handleStartChatting = async () => {
        setIsStartingChat(true)

        await new Promise((resolve) => setTimeout(resolve, 1000))
        router.push("/chat")

        setIsStartingChat(false)
    }

    return (
        <div className="min-h-screen bg-black flex flex-col overflow-hidden">
            <Navbar />
            <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-0">
                <div className="flex flex-col justify-center items-center z-10 w-full max-w-md mx-auto">
                    <Card className="relative w-full bg-zinc-900/80 border-zinc-800/60 shadow-2xl backdrop-blur-sm overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-cyan-400/10 to-cyan-500/10 rounded-full blur-2xl animate-pulse delay-1000" />

                        <div className="relative z-10 p-8">
                            <div className="flex flex-col items-center text-center mb-6">
                                <div
                                    className={`relative p-4 rounded-2xl mb-4 transition-all duration-500 ${isUploading
                                        ? "bg-cyan-500/20 border-2 border-cyan-400/40 animate-pulse"
                                        : uploadStatus === "success"
                                            ? "bg-emerald-500/20 border-2 border-emerald-400/40"
                                            : uploadStatus === "error"
                                                ? "bg-red-500/20 border-2 border-red-400/40"
                                                : "bg-zinc-800/60 border-2 border-zinc-700/60 hover:border-cyan-400/40 hover:bg-cyan-500/10"
                                        }`}
                                >
                                    {isUploading ? (
                                        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                    ) : uploadStatus === "success" ? (
                                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                                    ) : uploadStatus === "error" ? (
                                        <AlertCircle className="w-8 h-8 text-red-400" />
                                    ) : (
                                        <Upload className="w-8 h-8 text-cyan-400" />
                                    )}
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2">
                                    {isUploading
                                        ? "Uploading..."
                                        : uploadStatus === "success"
                                            ? "Upload Complete!"
                                            : uploadStatus === "error"
                                                ? "Upload Failed"
                                                : "Upload PDF Document"}
                                </h3>

                                <p className="text-gray-400 text-sm">
                                    {isUploading
                                        ? `Uploading ${fileName}...`
                                        : uploadStatus === "success"
                                            ? `${fileName} uploaded successfully`
                                            : uploadStatus === "error"
                                                ? "Please try again"
                                                : "Select a PDF file to upload to your workspace"}
                                </p>
                            </div>

                            {uploadStatus !== "success" && (
                                <Button
                                    onClick={handleFileUploadButtonClick}
                                    disabled={isUploading}
                                    className={`w-full py-6 text-base font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${isUploading
                                        ? "bg-zinc-700 text-gray-400 cursor-not-allowed"
                                        : "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-black shadow-lg hover:shadow-cyan-500/25"
                                        }`}
                                >
                                    <div className="flex items-center justify-center gap-3">
                                        {isUploading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                                <span>Uploading...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-5 h-5" />
                                                <span>Choose PDF File</span>
                                            </>
                                        )}
                                    </div>
                                </Button>
                            )}


                            {uploadStatus === "success" && (
                                <div className="space-y-4">
                                    <Button
                                        onClick={handleStartChatting}
                                        disabled={isStartingChat}
                                        className={`w-full py-6 text-base font-semibold rounded-xl transition-all duration-500 transform hover:scale-[1.02] ${isStartingChat
                                            ? "bg-gradient-to-r from-cyan-600/80 to-cyan-700/80 text-white/80 cursor-not-allowed"
                                            : "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-black shadow-lg hover:shadow-cyan-500/25"
                                            } animate-in slide-in-from-bottom-4 fade-in duration-500`}
                                    >
                                        <div className="flex items-center justify-center gap-3">
                                            {isStartingChat ? (
                                                <>
                                                    <div className="relative">
                                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        <div className="absolute inset-0 w-5 h-5 border-2 border-transparent border-t-cyan-300 rounded-full animate-spin animate-reverse" />
                                                    </div>
                                                    <span className="animate-pulse">Initializing Chat...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <MessageCircle className="w-5 h-5 animate-bounce" />
                                                    <span>Start Chatting</span>
                                                </>
                                            )}
                                        </div>
                                    </Button>

                                    <Button
                                        onClick={() => {
                                            setUploadStatus("idle")
                                            setFileName("")
                                        }}
                                        variant="outline"
                                        className="w-full py-3 text-sm font-medium rounded-xl bg-transparent border-zinc-700/60 text-gray-400 hover:bg-zinc-800/40 hover:text-white hover:border-zinc-600/60 transition-all duration-300"
                                    >
                                        Upload Another File
                                    </Button>
                                </div>
                            )}

                            {fileName && (
                                <div
                                    className={`mt-4 p-3 rounded-lg border transition-all duration-300 ${uploadStatus === "success"
                                        ? "bg-emerald-500/10 border-emerald-400/30"
                                        : uploadStatus === "error"
                                            ? "bg-red-500/10 border-red-400/30"
                                            : "bg-zinc-800/40 border-zinc-700/40"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText
                                            className={`w-4 h-4 ${uploadStatus === "success"
                                                ? "text-emerald-400"
                                                : uploadStatus === "error"
                                                    ? "text-red-400"
                                                    : "text-cyan-400"
                                                }`}
                                        />
                                        <span className="text-white text-sm font-medium truncate">{fileName}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    <div className="text-center mt-6">
                        <p className="text-gray-500 text-xs">Supported format: PDF • Max size: 10MB</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default FileUploadComponent
