"use client"

import { useState } from "react"
import { Upload, FileText, CheckCircle, AlertCircle, MessageCircle, Link } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import Navbar from "../components/navbar"
import { BACKEND_URL } from "@/config"

// --- PDF Upload Component ---
const PdfUploadSection = ({
    userId,
    router,
    fileName,
    setFileName,
    uploadStatus,
    setUploadStatus,
    isUploading,
    setIsUploading,
    isStartingChat,
    setIsStartingChat,
}: {
    userId: string | undefined;
    router: ReturnType<typeof useRouter>;
    fileName: string;
    setFileName: (v: string) => void;
    uploadStatus: "idle" | "success" | "error";
    setUploadStatus: (v: "idle" | "success" | "error") => void;
    isUploading: boolean;
    setIsUploading: (v: boolean) => void;
    isStartingChat: boolean;
    setIsStartingChat: (v: boolean) => void;
}) => {

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

                        const response = await fetch(`${BACKEND_URL}/upload/pdf`, {
                            method: "POST",
                            body: formData,
                        })
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
        <Card className="w-full max-w-lg mx-auto bg-zinc-900 border border-zinc-800 shadow-lg">
            <div className="p-8">
                <div className="flex flex-col items-center text-center mb-6">
                    <div
                        className={`p-4 rounded-2xl mb-4 transition-all duration-500 ${
                            isUploading
                                ? "bg-cyan-500/20 border-2 border-cyan-400/40 animate-pulse"
                                : uploadStatus === "success"
                                ? "bg-emerald-500/20 border-2 border-emerald-400/40"
                                : uploadStatus === "error"
                                ? "bg-red-500/20 border-2 border-red-400/40"
                                : "bg-zinc-800 border-2 border-zinc-700 hover:border-cyan-400/40 hover:bg-cyan-500/10"
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
                        className={`w-full py-6 text-base font-semibold rounded-xl transition-all duration-300 ${
                            isUploading
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
                            className={`w-full py-6 text-base font-semibold rounded-xl transition-all duration-500 ${
                                isStartingChat
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
                            className="w-full py-3 text-sm font-medium rounded-xl bg-transparent border-zinc-700 text-gray-400 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 transition-all duration-300"
                        >
                            Upload Another File
                        </Button>
                    </div>
                )}
                {fileName && (
                    <div
                        className={`mt-4 p-3 rounded-lg border transition-all duration-300 ${
                            uploadStatus === "success"
                                ? "bg-emerald-500/10 border-emerald-400/30"
                                : uploadStatus === "error"
                                ? "bg-red-500/10 border-red-400/30"
                                : "bg-zinc-800/40 border-zinc-700/40"
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <FileText
                                className={`w-4 h-4 ${
                                    uploadStatus === "success"
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
    )
}

// --- URL Upload Component ---
const UrlUploadSection = ({
    userId,
    router,
    inputUrl,
    setInputUrl,
    status,
    setStatus,
}: {
    userId: string | undefined;
    router: ReturnType<typeof useRouter>;
    inputUrl: string;
    setInputUrl: (v: string) => void;
    status: string;
    setStatus: (v: string) => void;
}) => {

    async function handleUrlUpload() {
        setStatus("Uploading...");
        try {
            const response = await fetch(`${BACKEND_URL}/upload/url`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ inputUrl, userId }),
            });
            const data = await response.json();
            setStatus("success");
        } catch (error) {
            setStatus("Upload failed");
        }
    }

    return (
        <Card className="w-full max-w-lg mx-auto bg-zinc-900 border border-zinc-800 shadow-lg">
            <div className="p-8">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="p-4 rounded-2xl mb-4 bg-zinc-800 border-2 border-zinc-700">
                        <Link className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Upload by URL</h3>
                    <p className="text-gray-400 text-sm mb-2">Paste a public URL to extract and chat with its content.</p>
                </div>
                <input
                    type="text"
                    placeholder="Enter url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="w-full p-2 rounded mb-4 bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <Button onClick={handleUrlUpload} disabled={inputUrl === "" || status === "Uploading..."} className="w-full mb-2 bg-cyan-400 text-black font-semibold">
                    Send
                </Button>
                <p className="text-gray-400">{status}</p>
                {status === "success" && (
                    <Button onClick={() => router.push('/chat')} className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold">
                        Chat
                    </Button>
                )}
            </div>
        </Card>
    );
};

const FileUploadComponent = () => {
    const router = useRouter();
    const { user } = useUser();
    const userId = user?.id;

    // Tab state: "pdf" or "url"
    const [activeTab, setActiveTab] = useState<"pdf" | "url">("pdf");

    // PDF state
    const [fileName, setFileName] = useState<string>("");
    const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
    const [isUploading, setIsUploading] = useState(false);
    const [isStartingChat, setIsStartingChat] = useState(false);

    // URL state
    const [inputUrl, setInputUrl] = useState("");
    const [status, setStatus] = useState("");

    return (
        <div className="min-h-screen bg-black flex flex-col items-center overflow-hidden">
            <Navbar />
            <div className="flex-1 flex flex-col items-center justify-center w-full px-4 sm:px-0">
                <div className="flex flex-col justify-center items-center z-10 w-full max-w-lg mx-auto">
                    {/* Tab selector */}
                    <div className="flex justify-center gap-4 mb-8 w-full max-w-lg">
                        <Button
                            variant={activeTab === "pdf" ? "default" : "outline"}
                            className={`flex-1 flex items-center gap-2 px-6 py-2 rounded-xl font-semibold justify-center transition-all duration-200 ${
                                activeTab === "pdf" ? "bg-cyan-600 text-white shadow" : "bg-zinc-900 text-cyan-400 border border-zinc-700"
                            }`}
                            onClick={() => setActiveTab("pdf")}
                        >
                            <Upload className="w-5 h-5" />
                            PDF
                        </Button>
                        <Button
                            variant={activeTab === "url" ? "default" : "outline"}
                            className={`flex-1 flex items-center gap-2 px-6 py-2 rounded-xl font-semibold justify-center transition-all duration-200 ${
                                activeTab === "url" ? "bg-cyan-600 text-white shadow" : "bg-zinc-900 text-cyan-400 border border-zinc-700"
                            }`}
                            onClick={() => setActiveTab("url")}
                        >
                            <Link className="w-5 h-5" />
                            URL
                        </Button>
                    </div>
                    {/* Tab content: both components always mounted */}
                    <div className="w-full relative">
                        <div style={{ display: activeTab === "pdf" ? "block" : "none" }}>
                            <PdfUploadSection
                                userId={userId}
                                router={router}
                                fileName={fileName}
                                setFileName={setFileName}
                                uploadStatus={uploadStatus}
                                setUploadStatus={setUploadStatus}
                                isUploading={isUploading}
                                setIsUploading={setIsUploading}
                                isStartingChat={isStartingChat}
                                setIsStartingChat={setIsStartingChat}
                            />
                        </div>
                        <div style={{ display: activeTab === "url" ? "block" : "none" }}>
                            <UrlUploadSection
                                userId={userId}
                                router={router}
                                inputUrl={inputUrl}
                                setInputUrl={setInputUrl}
                                status={status}
                                setStatus={setStatus}
                            />
                        </div>
                    </div>
                    <div className="text-center mt-6">
                        <p className="text-gray-500 text-xs">Supported format: PDF • Max size: 10MB</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default FileUploadComponent
