"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SendHorizontal, Bot, User, FileText, Loader2 } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useUser } from "@clerk/nextjs"

interface Doc {
  pageContent: string
  metadata?: {
    loc?: {
      pageNumber?: number
    }
    source?: string
  }
}

interface IMessage {
  role: "assistant" | "user"
  content?: string
  documents?: Doc[]
}

const ChatComponent = () => {
  const [message, setMessage] = useState<string>("")
  const [messages, setMessages] = useState<IMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useUser()
  const userId = user?.id

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!message.trim()) return

    const userMessage = message
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setMessage("")
    setIsLoading(true)

    try {
      const res = await fetch(`https://askmypdf-lvjn.onrender.com/chat?message=${encodeURIComponent(userMessage)}&userId=${userId}`)
      const data = await res.json()

      console.log({ data })

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data?.message,
          documents: data?.docs,
        },
      ])
    } catch (err) {
      console.error("Fetch error:", err)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="h-screen bg-black flex flex-col relative overflow-hidden">
      <div className="relative z-10 border-b border-zinc-800/60 bg-zinc-900/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-xl border border-cyan-500/20">
              <Bot className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AskMyPDF Assistant</h1>
              <p className="text-sm text-gray-400">Ask me anything about your document</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative z-10 max-w-4xl mx-auto w-full px-4 py-6">
        <ScrollArea className="h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent" ref={scrollAreaRef}>
          <div className="space-y-6 pb-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="p-4 bg-zinc-800/40 rounded-2xl border border-zinc-700/40 inline-block mb-4">
                  <Bot className="w-8 h-8 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Start a conversation</h3>
                <p className="text-gray-400 text-sm">Ask me questions about your uploaded document</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 fade-in duration-300`}
              >
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-full border border-cyan-500/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-cyan-400" />
                  </div>
                )}

                <div className={`max-w-[70%] ${msg.role === "user" ? "order-first" : ""}`}>
                  <Card
                    className={`p-4 ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-black border-none"
                        : "bg-zinc-800/60 border-zinc-700/60 text-white"
                    } backdrop-blur-sm`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                    {msg.documents && msg.documents.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-300 mb-2">Referenced Documents:</p>
                        {msg.documents.map((doc, docIdx) => (
                          <Card key={docIdx} className="p-3 bg-zinc-900/60 border-zinc-600/40 text-gray-300">
                            <div className="flex items-start gap-2">
                              <FileText className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-400 mb-1">
                                  {doc.metadata?.source && `Source: ${doc.metadata.source}`}
                                  {doc.metadata?.loc?.pageNumber && ` • Page ${doc.metadata.loc.pageNumber}`}
                                </p>
                                <p className="text-sm leading-relaxed line-clamp-3">{doc.pageContent}</p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>

                {msg.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-zinc-600 to-zinc-700 rounded-full border border-zinc-600 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4 justify-start animate-in slide-in-from-bottom-2 fade-in duration-300">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-full border border-cyan-500/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-cyan-400" />
                </div>
                <Card className="p-4 bg-zinc-800/60 border-zinc-700/60 text-white backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    <span className="text-sm text-gray-300">Thinking...</span>
                  </div>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      <div className="relative z-10 border-t border-zinc-800/60 bg-zinc-900/80 backdrop-blur-sm ">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything about your document..."
                disabled={isLoading}
                className="bg-zinc-800/60 border border-zinc-700/60 text-white placeholder:text-gray-400 rounded-xl py-6 px-4 pr-12 focus:border-cyan-400/80 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 text-base"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isLoading}
                  size="sm"
                  className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-black rounded-lg h-8 w-8 p-0 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatComponent
