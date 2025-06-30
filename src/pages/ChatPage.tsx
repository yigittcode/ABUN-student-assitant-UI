import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Moon, Sun, BookOpen, Users, Award, MapPin, User, GraduationCap, Phone, Mail, Instagram, Linkedin, Mic } from 'lucide-react'
import Lottie from 'lottie-react'
import { useChatStore } from '../stores/useChatStore'
import VoiceAssistant from '../components/VoiceAssistant'

const quickQuestions = [
  { icon: BookOpen, text: "Hangi bölümleriniz var?" },
  { icon: Users, text: "Kampüs hayatı nasıl?" },
  { icon: Award, text: "Başarı programları" },
  { icon: MapPin, text: "Kampüs konumu" }
]

export default function ChatPage() {
  const [message, setMessage] = useState('')
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('abu-theme')
    return saved === 'dark'
  })
  const [animationData, setAnimationData] = useState(null)
  const [shouldLoop, setShouldLoop] = useState(false)
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false)
  const lottieRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { messages, sendMessage, isLoading, isStreaming, streamingMessage } = useChatStore()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('abu-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  // Load animation data
  useEffect(() => {
    const loadAnimation = async () => {
      try {
        const response = await fetch('/animations/710fd635-05b8-4645-8d11-5135cdfbba2c.json')
        const data = await response.json()
        setAnimationData(data)
      } catch (error) {
        console.error('Failed to load animation:', error)
      }
    }
    loadAnimation()
  }, [])

  // Animation hover handlers
  const handleAnimationHover = () => {
    if (lottieRef.current) {
      lottieRef.current.stop()
      lottieRef.current.play()
    }
  }

  const handleAnimationComplete = () => {
    setShouldLoop(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    
    const userMessage = message.trim()
    setMessage('')
    await sendMessage(userMessage)
  }

  const handleQuickQuestion = async (question: string) => {
    await sendMessage(question)
  }

  return (
    <div className={`h-screen transition-colors duration-300 flex flex-col overflow-hidden ${
      isDark 
        ? 'bg-gradient-to-br from-dark-navy via-dark-slate to-navy-950' 
        : 'bg-gradient-to-br from-white via-navy-50 to-navy-100'
    }`}>
      {/* Header */}
      <div className={`backdrop-blur-md border-b transition-colors duration-300 h-20 ${
        isDark 
          ? 'bg-dark-navy/80 border-navy-800' 
          : 'bg-white/80 border-navy-200'
      }`}>
        <div className="w-full px-6 py-0 h-full">
          <div className="flex items-center justify-between w-full h-full">
            {/* Left Side - Logo Only */}
            <div className="flex items-center h-full">
              <img 
                src={isDark ? "/ABU-logo-en-beyaz.png" : "/ABU-logo-tr-lacivert.png"}
                alt="ABU Logo" 
                className="h-36 w-56 object-contain" 
              />
            </div>

            {/* Right Side - Theme Toggle Only */}
            <div className="flex items-center">
              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-2 rounded-lg transition-all duration-300 ${
                  isDark 
                    ? 'bg-navy-800 hover:bg-navy-700 text-navy-300 shadow-lg' 
                    : 'bg-navy-100 hover:bg-navy-200 text-navy-700 shadow-md hover:shadow-lg'
                }`}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto px-6 py-6 w-full overflow-y-auto">
        {/* Welcome Screen */}
        {messages.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            {/* Lottie Animation */}
            <div className="flex justify-center mb-6">
              {animationData ? (
                <div 
                  className="cursor-pointer transition-transform duration-300 hover:scale-105"
                  onMouseEnter={handleAnimationHover}
                >
                  <Lottie 
                    lottieRef={lottieRef}
                    animationData={animationData}
                    style={{ width: 240, height: 240 }}
                    loop={shouldLoop}
                    autoplay={true}
                    onComplete={handleAnimationComplete}
                  />
                </div>
              ) : (
                <div className="w-[240px] h-[240px] flex items-center justify-center">
                  <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${
                    isDark ? 'border-navy-400' : 'border-navy-600'
                  }`}></div>
                </div>
              )}
            </div>
            
            <h2 className={`text-3xl font-display font-bold mb-4 ${
              isDark ? 'text-white' : 'text-navy-900'
            }`}>
              Merhaba! 👋
            </h2>
            <p className={`text-lg mb-6 ${
              isDark ? 'text-navy-300' : 'text-navy-600'
            }`}>
              ABU hakkında merak ettiklerinizi sorabilirsiniz!
            </p>

            {/* Quick Questions */}
            <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
              {quickQuestions.map((item, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleQuickQuestion(item.text)}
                  className={`p-3 rounded-xl transition-all duration-300 text-left group ${
                    isDark 
                      ? 'bg-navy-800/50 hover:bg-navy-700/50 border border-navy-700' 
                      : 'bg-white hover:bg-navy-50 border border-navy-200 shadow-sm hover:shadow-md'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mb-2 transition-colors ${
                    isDark ? 'text-navy-400 group-hover:text-navy-300' : 'text-navy-600 group-hover:text-navy-700'
                  }`} />
                  <span className={`text-sm font-medium ${
                    isDark ? 'text-navy-200' : 'text-navy-800'
                  }`}>
                    {item.text}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Messages */}
        <div className="space-y-4 mb-6">
          <AnimatePresence>
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[80%] ${
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' 
                      ? isDark ? 'bg-navy-700' : 'bg-navy-200'
                      : isDark ? 'bg-navy-800' : 'bg-white border border-navy-200'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className={`w-4 h-4 ${
                        isDark ? 'text-navy-300' : 'text-navy-700'
                      }`} />
                    ) : (
                      <GraduationCap className={`w-4 h-4 ${
                        isDark ? 'text-navy-300' : 'text-navy-600'
                      }`} />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className={`px-4 py-3 rounded-2xl ${
                    msg.role === 'user'
                      ? isDark 
                        ? 'bg-navy-700 text-navy-100' 
                        : 'bg-navy-600 text-white'
                      : isDark 
                        ? 'bg-navy-800 text-navy-100' 
                        : 'bg-white text-navy-900 border border-navy-200'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className={`text-xs mt-2 opacity-70 ${
                      msg.role === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      {new Date(msg.timestamp).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Streaming Message */}
          {isStreaming && streamingMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex gap-3 max-w-[80%]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isDark ? 'bg-navy-800' : 'bg-white border border-navy-200'
                }`}>
                  <GraduationCap className={`w-4 h-4 ${
                    isDark ? 'text-navy-300' : 'text-navy-600'
                  }`} />
                </div>
                <div className={`px-4 py-3 rounded-2xl ${
                  isDark ? 'bg-navy-800 text-navy-100' : 'bg-white text-navy-900 border border-navy-200'
                }`}>
                  <p className="text-sm leading-relaxed">
                    {streamingMessage}
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="inline-block w-2 h-4 bg-current ml-1 rounded-sm"
                    />
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {isLoading && !streamingMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex gap-3 max-w-[80%]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isDark ? 'bg-navy-800' : 'bg-white border border-navy-200'
                }`}>
                  <GraduationCap className={`w-4 h-4 ${
                    isDark ? 'text-navy-300' : 'text-navy-600'
                  }`} />
                </div>
                <div className={`px-4 py-3 rounded-2xl ${
                  isDark ? 'bg-navy-800' : 'bg-white border border-navy-200'
                }`}>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                        className={`w-2 h-2 rounded-full ${
                          isDark ? 'bg-navy-300' : 'bg-navy-400'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

                {/* Message Input */}
        <form onSubmit={handleSubmit} className="relative">
          <div className={`flex gap-3 p-4 rounded-2xl backdrop-blur-md ${
            isDark 
              ? 'bg-navy-800/50 border border-navy-700' 
              : 'bg-white/80 border border-navy-200 shadow-lg'
          }`}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Mesajınızı yazın..."
              className={`flex-1 bg-transparent border-none outline-none text-sm placeholder:transition-colors ${
                isDark 
                  ? 'text-navy-100 placeholder:text-navy-400' 
                  : 'text-navy-900 placeholder:text-navy-500'
              }`}
              disabled={isLoading || isStreaming}
            />
            
            {/* Voice Assistant Button */}
            <button
              type="button"
              onClick={() => setIsVoiceAssistantOpen(true)}
              disabled={isLoading || isStreaming}
              className={`p-2 rounded-xl transition-all duration-300 ${
                isLoading || isStreaming
                  ? isDark 
                    ? 'bg-navy-700 text-navy-500 cursor-not-allowed' 
                    : 'bg-navy-100 text-navy-400 cursor-not-allowed'
                  : isDark 
                    ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg hover:shadow-xl' 
                    : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg'
              }`}
              title="Sesli Asistan"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!message.trim() || isLoading || isStreaming}
              className={`p-2 rounded-xl transition-all duration-300 ${
                !message.trim() || isLoading || isStreaming
                  ? isDark 
                    ? 'bg-navy-700 text-navy-500 cursor-not-allowed' 
                    : 'bg-navy-100 text-navy-400 cursor-not-allowed'
                  : isDark 
                    ? 'bg-navy-600 hover:bg-navy-500 text-white' 
                    : 'bg-navy-600 hover:bg-navy-700 text-white'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <footer className={`border-t transition-colors duration-300 ${
        isDark 
          ? 'bg-dark-navy/95 border-navy-700' 
          : 'bg-white/95 border-navy-200'
      }`}>
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
            {/* Logo and University Name */}
            <div className="flex items-center space-x-3">
              <img 
                src={isDark ? "/ABU-logo-en-beyaz.png" : "/ABU-logo-tr-lacivert.png"}
                alt="ABU Logo" 
                className="h-8 w-12 object-contain" 
              />
              <div className={`text-sm ${isDark ? 'text-navy-300' : 'text-navy-600'}`}>
                <p className="font-semibold">Ankara Bilim Üniversitesi</p>
                <p className="text-xs opacity-75">©2025 Tüm hakları saklıdır.</p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="flex items-center space-x-6">
              {/* Phone */}
              <a 
                href="tel:4442228" 
                className={`flex items-center space-x-2 transition-colors duration-200 ${
                  isDark 
                    ? 'text-navy-300 hover:text-white' 
                    : 'text-navy-600 hover:text-navy-800'
                }`}
              >
                <Phone className="h-4 w-4" />
                <span className="text-sm font-medium">444 22 28</span>
              </a>

              {/* Email */}
              <a 
                href="mailto:info@ankarabilim.edu.tr" 
                className={`flex items-center space-x-2 transition-colors duration-200 ${
                  isDark 
                    ? 'text-navy-300 hover:text-blue-400' 
                    : 'text-navy-600 hover:text-blue-600'
                }`}
              >
                <Mail className="h-4 w-4" />
                <span className="text-sm font-medium">info@ankarabilim.edu.tr</span>
              </a>

              {/* Social Links */}
              <div className="flex space-x-4">
                {/* Instagram */}
                <a 
                  href="https://www.instagram.com/ankarabilimuni/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`transition-colors duration-200 ${
                    isDark 
                      ? 'text-navy-300 hover:text-pink-400' 
                      : 'text-navy-600 hover:text-pink-600'
                  }`}
                >
                  <Instagram className="h-4 w-4" />
                </a>

                {/* LinkedIn */}
                <a 
                  href="https://www.linkedin.com/school/ankarabilimuniversitesi/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`transition-colors duration-200 ${
                    isDark 
                      ? 'text-navy-300 hover:text-blue-400' 
                      : 'text-navy-600 hover:text-blue-600'
                  }`}
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Voice Assistant Modal */}
      <VoiceAssistant 
        isOpen={isVoiceAssistantOpen}
        onClose={() => setIsVoiceAssistantOpen(false)}
        isDark={isDark}
      />
    </div>
  )
} 