"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles, X, Send, Bot, User, Loader2 } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface AIPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function AIPanel({ isOpen, onClose }: AIPanelProps) {
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = prompt.trim()
    if (!text || isTyping) return

    const userMessage: Message = {
      role: "user",
      content: text,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setPrompt("")
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        role: "assistant",
        content: "I'm here to help you with your course content! This is a demo response. In production, this would connect to your AI backend.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed right-4 bottom-4 z-50"
      role="dialog"
      aria-label="AI assistant panel"
      style={{ 
        transform: "translateY(-12px)",
        animation: "slideIn 0.3s ease-out"
      }}
    >
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(-12px);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
        
        .message-animation {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
      
      <div 
        className="flex flex-col shadow-xl rounded-lg overflow-hidden"
        style={{ 
          width: 380, 
          height: 550,
          backgroundColor: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))"
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 border-b"
          style={{ 
            borderColor: "hsl(var(--border))",
            background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white">AI Learning Assistant</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs text-white/80">Online</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/20"
            aria-label="Close AI" 
            title="Close"
            style={{ color: "white" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages Area */}
        <div 
          className="flex-1 p-4 overflow-y-auto"
          style={{ backgroundColor: "hsl(var(--background))" }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: "hsl(var(--muted))" }}
              >
                <Bot className="w-8 h-8" style={{ color: "hsl(var(--muted-foreground))" }} />
              </div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "hsl(var(--foreground))" }}>
                Welcome to AI Assistant
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--muted-foreground))" }}>
                Ask me anything about your course content, assignments, or learning materials. I'm here to help!
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2 w-full">
                {["Explain this topic", "Quiz me on this", "Summarize content"].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(suggestion)}
                    className="text-xs px-3 py-2 rounded-lg text-left transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: "hsl(var(--muted))",
                      color: "hsl(var(--foreground))",
                      border: "1px solid hsl(var(--border))"
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, i) => (
                <div 
                  key={i} 
                  className={`flex gap-3 message-animation ${message.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ 
                      backgroundColor: message.role === "user" 
                        ? "hsl(var(--primary))" 
                        : "hsl(var(--muted))"
                    }}
                  >
                    {message.role === "user" ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4" style={{ color: "hsl(var(--foreground))" }} />
                    )}
                  </div>
                  <div className={`flex-1 ${message.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                    <div
                      className="px-4 py-2.5 rounded-2xl max-w-[85%]"
                      style={{
                        backgroundColor: message.role === "user" 
                          ? "hsl(var(--primary))" 
                          : "hsl(var(--muted))",
                        color: message.role === "user" 
                          ? "white" 
                          : "hsl(var(--foreground))",
                        borderRadius: message.role === "user" 
                          ? "1rem 1rem 0.25rem 1rem" 
                          : "1rem 1rem 1rem 0.25rem"
                      }}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>
                    <span className="text-xs mt-1 px-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-3 message-animation">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "hsl(var(--muted))" }}
                  >
                    <Bot className="w-4 h-4" style={{ color: "hsl(var(--foreground))" }} />
                  </div>
                  <div
                    className="px-4 py-2.5 rounded-2xl"
                    style={{
                      backgroundColor: "hsl(var(--muted))",
                      borderRadius: "1rem 1rem 1rem 0.25rem"
                    }}
                  >
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(var(--muted-foreground))", animation: "bounce 1.4s infinite" }} />
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(var(--muted-foreground))", animation: "bounce 1.4s infinite 0.2s" }} />
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(var(--muted-foreground))", animation: "bounce 1.4s infinite 0.4s" }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div 
          className="p-4 border-t"
          style={{ 
            borderColor: "hsl(var(--border))",
            backgroundColor: "hsl(var(--card))"
          }}
        >
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <input
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full rounded-xl px-4 py-2.5 transition-all focus:ring-2 focus:ring-primary"
                style={{
                  backgroundColor: "hsl(var(--muted))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                  fontSize: "0.875rem",
                  outline: "none"
                }}
                placeholder="Type your question..."
                disabled={isTyping}
              />
            </div>
            <button 
              onClick={handleSubmit}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:opacity-90"
              style={{
                backgroundColor: prompt.trim() && !isTyping ? "hsl(var(--primary))" : "hsl(var(--muted))",
                color: prompt.trim() && !isTyping ? "white" : "hsl(var(--muted-foreground))",
                cursor: prompt.trim() && !isTyping ? "pointer" : "not-allowed"
              }}
              disabled={!prompt.trim() || isTyping}
              aria-label="Send message"
            >
              {isTyping ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}