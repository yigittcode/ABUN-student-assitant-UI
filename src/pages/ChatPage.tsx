import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Moon, Sun, BookOpen, Users, Award, MapPin, User, GraduationCap, Phone, Mail, Instagram, Linkedin, Mic, Brain, MessageCircle, Plus, History, ChevronDown, Clock, Trash2, RefreshCw, X } from 'lucide-react'
import Lottie from 'lottie-react'
import { useChatStore } from '../stores/useChatStore'
import { useConversationStore } from '../stores/useConversationStore'
import VoiceAssistant from '../components/VoiceAssistant'
import toast from 'react-hot-toast'

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
  const [isMemoryMode, setIsMemoryMode] = useState(() => {
    const saved = localStorage.getItem('abu-memory-mode')
    return saved === 'true'
  })
  const [showSessionHistory, setShowSessionHistory] = useState(false)
  const [availableSessions, setAvailableSessions] = useState<any[]>([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  
  const lottieRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Normal chat store
  const { 
    messages: normalMessages, 
    sendMessage: sendNormalMessage, 
    isLoading: normalLoading, 
    isStreaming: normalStreaming, 
    streamingMessage: normalStreamingMessage 
  } = useChatStore()
  
  // Memory chat store
  const {
    messages: memoryMessages,
    sendMessageWithMemoryStream,
    startNewConversation,
    currentSessionId,
    messageCount,
    isNewConversation,
    isLoading: memoryLoading,
    isStreaming: memoryStreaming,
    streamingMessage: memoryStreamingMessage,
    error: memoryError,
    clearError,
    loadConversationHistory,
    initializeStore,
    // User session management
    myConversations,
    isLoadingMySessions,
    loadMyConversations,
    deleteMySession,
    deleteAllMySessions,
    switchToSession
  } = useConversationStore()

  // Use appropriate store based on mode
  const messages = isMemoryMode ? memoryMessages : normalMessages
  const isLoading = isMemoryMode ? memoryLoading : normalLoading
  const isStreaming = isMemoryMode ? memoryStreaming : normalStreaming
  const streamingMessage = isMemoryMode ? memoryStreamingMessage : normalStreamingMessage

  // Debug console logs
  useEffect(() => {
    console.log(`🔍 [ChatPage] Debug Info:`)
    console.log(`   📱 Mode: ${isMemoryMode ? 'Memory' : 'Normal'}`)
    console.log(`   🆔 Session: ${currentSessionId || 'none'}`)
    console.log(`   📊 Count: ${messageCount}`)
    console.log(`   💭 Memory Messages: ${memoryMessages.length}`)
    console.log(`   💬 Normal Messages: ${normalMessages.length}`)
    console.log(`   ✅ Displayed Messages: ${messages.length}`)
    if (memoryMessages.length > 0) {
      console.log(`   📝 Memory Messages:`, memoryMessages.map(m => `${m.role}: ${m.content.substring(0, 50)}...`))
    }
  }, [isMemoryMode, currentSessionId, messageCount, memoryMessages, normalMessages, messages])

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

  useEffect(() => {
    localStorage.setItem('abu-memory-mode', isMemoryMode.toString())
  }, [isMemoryMode])

  useEffect(() => {
    if (memoryError) {
      console.error('Memory chat error:', memoryError)
      clearError()
    }
  }, [memoryError, clearError])

  // Initialize conversation store on mount
  useEffect(() => {
    initializeStore()
  }, [initializeStore])

  // Close session history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSessionHistory) {
        const target = event.target as Element
        if (!target.closest('.session-dropdown')) {
          setShowSessionHistory(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSessionHistory])

  // Handle memory mode activation
  useEffect(() => {
    if (isMemoryMode) {
      console.log(`🔄 Memory mode activated, currentSessionId: ${currentSessionId}, messages: ${memoryMessages.length}`)
      
      if (currentSessionId && memoryMessages.length === 0) {
        console.log(`📥 Loading history for session: ${currentSessionId}`)
        const loadHistory = async () => {
          try {
            await loadConversationHistory(currentSessionId)
          } catch (error) {
            console.error('Failed to load conversation history:', error)
          }
        }
        loadHistory()
      } else if (!currentSessionId) {
        console.log(`ℹ️ No session ID found in memory mode`)
      } else {
        console.log(`ℹ️ Already have ${memoryMessages.length} messages`)
      }
    }
  }, [isMemoryMode, currentSessionId, memoryMessages.length, loadConversationHistory])

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
    
    if (isMemoryMode) {
      await sendMessageWithMemoryStream(userMessage)
    } else {
      await sendNormalMessage(userMessage)
    }
  }

  const handleQuickQuestion = async (question: string) => {
    if (isMemoryMode) {
      await sendMessageWithMemoryStream(question)
    } else {
      await sendNormalMessage(question)
    }
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

            {/* Center - Chat Mode Buttons */}
            <div className="flex items-center gap-3">
              {/* Chat Mode Buttons */}
              <div className={`flex rounded-lg p-1 ${
                isDark ? 'bg-navy-800/50' : 'bg-gray-100'
              }`}>
                <button
                  onClick={() => setIsMemoryMode(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    !isMemoryMode
                      ? isDark
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-blue-600 text-white shadow-md'
                      : isDark
                        ? 'text-navy-300 hover:text-white hover:bg-navy-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Normal</span>
                </button>
                
                <button
                  onClick={() => setIsMemoryMode(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isMemoryMode
                      ? isDark
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-blue-600 text-white shadow-md'
                      : isDark
                        ? 'text-navy-300 hover:text-white hover:bg-navy-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <Brain className="w-4 h-4" />
                  <span>Memory</span>
                  {isMemoryMode && currentSessionId && messageCount > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/20">
                      {messageCount}
                    </span>
                  )}
                </button>
              </div>
              
                            {/* Session Management Button */}
              {isMemoryMode && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSessionHistory(!showSessionHistory)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isDark 
                        ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30' 
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300'
                    }`}
                    title="Konuşma Geçmişi"
                  >
                    <History className="w-4 h-4" />
                    <span>Geçmiş ({myConversations.length})</span>
                  </button>
                  
                  <button
                    onClick={startNewConversation}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isDark 
                        ? 'bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30' 
                        : 'bg-green-100 hover:bg-green-200 text-green-700 border border-green-300'
                    }`}
                    title="Yeni Konuşma Başlat"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Yeni Konuşma</span>
                  </button>
                </div>
              )}
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
            
            {/* Enhanced Chat Mode Info */}
            <div className={`mb-6 p-6 rounded-xl border-2 ${
              isMemoryMode
                ? isDark 
                  ? 'bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border-blue-500/30 text-blue-200' 
                  : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 text-blue-700'
                : isDark 
                  ? 'bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30 text-purple-200' 
                  : 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-300 text-purple-700'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    isMemoryMode 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-purple-500 text-white'
                  }`}>
                    {isMemoryMode ? <Brain className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="font-bold text-lg">
                      {isMemoryMode ? '🧠 Memory Chat' : '💬 Normal Chat'}
                    </span>
                    <p className={`text-xs ${isMemoryMode ? 'text-blue-400' : 'text-purple-400'}`}>
                      {isMemoryMode ? 'Akıllı konuşma modu' : 'Basit soru-cevap modu'}
                    </p>
                  </div>
                </div>
                
                {isMemoryMode && myConversations.length > 0 && (
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {myConversations.length} session
                    </div>
                    <div className="text-xs opacity-70">
                      IP-based tracking
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-sm leading-relaxed">
                {isMemoryMode 
                  ? (isNewConversation 
                    ? '🚀 Yeni bir akıllı konuşma başlatıyorsunuz. Konuşma geçmişiniz hatırlanacak ve bağlamsal yanıtlar alacaksınız!' 
                    : `✨ Akıllı konuşmaya devam ediyorsunuz (${messageCount} mesaj). Önceki mesajlarınız hatırlanıyor ve bağlam korunuyor.`
                  )
                  : '📝 Basit soru-cevap modu. Her mesaj bağımsız işlenir, geçmiş hatırlanmaz. Hızlı sorular için idealdir.'
                }
              </p>
              
              {isMemoryMode && currentSessionId && (
                <div className="mt-4 pt-4 border-t border-blue-200/30 dark:border-blue-700/30">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="opacity-70">🔗 Aktif konuşma bağlantısı kuruldu</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="opacity-70">💬 {messageCount} mesaj</span>
                      <span className="opacity-70">🟢 {isNewConversation ? 'Yeni konuşma' : 'Devam ediyor'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

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
        isMemoryMode={isMemoryMode}
        currentSessionId={currentSessionId}
      />

      {/* Session Management Modal */}
      <AnimatePresence>
        {showSessionHistory && isMemoryMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: isDark 
                ? 'rgba(0, 0, 0, 0.8)' 
                : 'rgba(0, 0, 0, 0.5)'
            }}
            onClick={() => setShowSessionHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3 }}
              className={`w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden ${
                isDark 
                  ? 'bg-navy-900 border border-navy-700' 
                  : 'bg-white border border-gray-200'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`flex items-center justify-between p-6 border-b ${
                isDark ? 'border-navy-700' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 text-white rounded-lg">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      Konuşma Geçmişi
                    </h2>
                    <p className={`text-sm ${
                      isDark ? 'text-navy-300' : 'text-gray-600'
                    }`}>
                      {myConversations.length} konuşma bulundu
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadMyConversations}
                    disabled={isLoadingMySessions}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark 
                        ? 'hover:bg-navy-700 text-navy-300' 
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    title="Yenile"
                  >
                    <RefreshCw className={`w-5 h-5 ${isLoadingMySessions ? 'animate-spin' : ''}`} />
                  </button>
                  
                  <button
                    onClick={() => setShowSessionHistory(false)}
                    className={`p-2 rounded-lg transition-colors ${
                      isDark 
                        ? 'hover:bg-navy-700 text-navy-300' 
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-96 overflow-y-auto">
                {isLoadingMySessions ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className={`text-sm ${isDark ? 'text-navy-300' : 'text-gray-600'}`}>
                      Konuşmalar yükleniyor...
                    </p>
                  </div>
                ) : myConversations.length > 0 ? (
                  <div className="space-y-4">
                    {myConversations.map((session, index) => {
                      const sessionName = (() => {
                        const firstWords = session.first_message.split(' ').slice(0, 3).join(' ')
                        const date = new Date(session.created_at).toLocaleDateString('tr-TR')
                        return `${firstWords}... (${date})`
                      })()
                      
                      const isCurrentSession = session.session_id === currentSessionId
                      
                      return (
                        <motion.div
                          key={session.session_id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                            isCurrentSession
                              ? isDark
                                ? 'bg-blue-900/30 border-blue-500/50 shadow-lg'
                                : 'bg-blue-50 border-blue-200 shadow-md'
                              : isDark
                                ? 'bg-navy-800 border-navy-600 hover:bg-navy-700'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                          onClick={async () => {
                            if (!isCurrentSession) {
                              try {
                                await switchToSession(session.session_id)
                                toast.success(`"${sessionName}" konuşmasına geçildi`)
                                setShowSessionHistory(false)
                              } catch (error) {
                                toast.error('Konuşma geçişi başarısız')
                              }
                            }
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                {isCurrentSession && (
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                )}
                                <h3 className={`font-medium truncate ${
                                  isCurrentSession 
                                    ? isDark ? 'text-blue-200' : 'text-blue-700'
                                    : isDark ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {sessionName}
                                </h3>
                                {isCurrentSession && (
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    isDark 
                                      ? 'bg-green-900/30 text-green-300' 
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    Aktif
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm">
                                <div className={`flex items-center gap-1 ${
                                  isDark ? 'text-navy-300' : 'text-gray-600'
                                }`}>
                                  <MessageCircle className="w-4 h-4" />
                                  <span>{session.message_count} mesaj</span>
                                </div>
                                
                                <div className={`flex items-center gap-1 ${
                                  isDark ? 'text-navy-300' : 'text-gray-600'
                                }`}>
                                  <Clock className="w-4 h-4" />
                                  <span>{new Date(session.updated_at).toLocaleDateString('tr-TR')}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 ml-4">
                              {!isCurrentSession && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    if (confirm(`"${sessionName}" konuşmasını silmek istediğinizden emin misiniz?`)) {
                                      try {
                                        await deleteMySession(session.session_id)
                                        toast.success('Konuşma silindi')
                                      } catch (error) {
                                        toast.error('Konuşma silinemedi')
                                      }
                                    }
                                  }}
                                  className={`p-2 rounded-lg transition-colors ${
                                    isDark 
                                      ? 'hover:bg-red-900/30 text-red-400' 
                                      : 'hover:bg-red-100 text-red-600'
                                  }`}
                                  title="Konuşmayı sil"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Brain className={`w-12 h-12 mx-auto mb-4 ${
                      isDark ? 'text-navy-400' : 'text-gray-400'
                    }`} />
                    <p className={`text-lg font-medium mb-2 ${
                      isDark ? 'text-navy-200' : 'text-gray-700'
                    }`}>
                      Henüz konuşma bulunmuyor
                    </p>
                    <p className={`text-sm ${
                      isDark ? 'text-navy-400' : 'text-gray-500'
                    }`}>
                      İlk konuşmanızı başlatmak için "Yeni Konuşma" butonuna tıklayın
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {myConversations.length > 0 && (
                <div className={`px-6 py-4 border-t ${
                  isDark ? 'border-navy-700 bg-navy-800/50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        startNewConversation()
                        setShowSessionHistory(false)
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Yeni Konuşma Başlat</span>
                    </button>
                    
                    <button
                      onClick={async () => {
                        if (confirm('TÜM konuşmalarınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
                          try {
                            await deleteAllMySessions()
                            toast.success('Tüm konuşmalar silindi')
                            setShowSessionHistory(false)
                          } catch (error) {
                            toast.error('Konuşmalar silinemedi')
                          }
                        }
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        isDark 
                          ? 'text-red-400 hover:bg-red-900/30' 
                          : 'text-red-600 hover:bg-red-100'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Tümünü Sil</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 