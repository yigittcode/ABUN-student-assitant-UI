import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, VolumeX, Loader2, X, Phone, Headphones, User, UserX } from 'lucide-react'
import { speechService } from '../services/api'
import toast from 'react-hot-toast'

interface VoiceAssistantProps {
  isOpen: boolean
  onClose: () => void
  isDark: boolean
}

export default function VoiceAssistant({ isOpen, onClose, isDark }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isInitializing, setIsInitializing] = useState(false)
  const [waveformData, setWaveformData] = useState<number[]>(new Array(20).fill(0))
  const [selectedGender, setSelectedGender] = useState<'female' | 'male'>('female')
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const animationRef = useRef<number | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  // Enhanced cleanup function - completely stops everything
  const cleanup = () => {
    console.log('🧹 Cleaning up voice assistant...')
    
    // Abort ongoing API request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      console.log('🚫 Aborted API request')
    }
    
    // Stop media recorder immediately and prevent onstop event
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        // Remove onstop event handler to prevent processAudio from running
        mediaRecorderRef.current.onstop = null
        mediaRecorderRef.current.stop()
        console.log('⏹️ Stopped media recorder and removed onstop handler')
      }
      mediaRecorderRef.current = null
    }
    
    // Stop and remove audio completely
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current.src = ''
      audioRef.current.load() // Force browser to stop any ongoing audio processing
      audioRef.current.removeEventListener('play', () => {})
      audioRef.current.removeEventListener('ended', () => {})
      audioRef.current.removeEventListener('error', () => {})
      audioRef.current = null
      console.log('🔇 Stopped and removed audio')
    }
    
    // Clear all timers and animations
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      console.log('⏰ Cleared timer')
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
      console.log('🎬 Stopped animation frame')
    }
    
    // Stop media streams completely
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        console.log('🎤 Stopped track:', track.kind)
      })
      streamRef.current = null
    }
    
    // Close audio context properly
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().then(() => {
          console.log('🔊 Audio context closed')
        }).catch(console.error)
      }
      audioContextRef.current = null
      analyserRef.current = null
    }
    
    // Reset all states
    setIsRecording(false)
    setIsProcessing(false)
    setIsPlaying(false)
    setAudioLevel(0)
    setRecordingTime(0)
    setIsInitializing(false)
    setWaveformData(new Array(20).fill(0))
    
    console.log('✅ Voice assistant cleanup completed')
  }

  const handleClose = () => {
    console.log('🚪 Closing voice assistant...')
    cleanup()
    onClose()
  }

  // Immediate cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      console.log('👋 Modal closed, cleaning up...')
      // Force stop all ongoing processes immediately
      setIsRecording(false)
      setIsProcessing(false)
      setIsPlaying(false)
      cleanup()
    }
    
    return () => {
      console.log('🔄 Component unmounting, cleaning up...')
      cleanup()
    }
  }, [isOpen])

  // Optimized waveform visualization
  const updateWaveform = () => {
    if (analyserRef.current && (isRecording || isPlaying)) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(dataArray)
      
      // Sample 20 frequency bands for waveform
      const step = Math.floor(dataArray.length / 20)
      const newWaveform = Array.from({ length: 20 }, (_, i) => {
        const start = i * step
        const end = start + step
        const slice = dataArray.slice(start, end)
        const average = slice.reduce((sum, value) => sum + value, 0) / slice.length
        return Math.min(average / 255, 1)
      })
      
      setWaveformData(newWaveform)
      setAudioLevel(Math.max(...newWaveform) * 100)
      
      animationRef.current = requestAnimationFrame(updateWaveform)
    }
  }

  const startRecording = async () => {
    setIsInitializing(true)
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      })
      streamRef.current = stream
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      analyserRef.current.fftSize = 512
      analyserRef.current.smoothingTimeConstant = 0.85
      
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, 
        MediaRecorder.isTypeSupported(options.mimeType) ? options : undefined
      )
      chunksRef.current = []
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      
      mediaRecorderRef.current.onstop = async () => {
        // Don't process if modal is closed
        if (!isOpen) {
          console.log('🚫 Modal closed, skipping audio processing')
          return
        }
        
        const audioBlob = new Blob(chunksRef.current, { 
          type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
        })
        await processAudio(audioBlob)
      }
      
      mediaRecorderRef.current.start(1000)
      setIsRecording(true)
      setRecordingTime(0)
      setIsInitializing(false)
      updateWaveform()
      
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      setIsInitializing(false)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      // Also abort any ongoing API request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
        console.log('🚫 Aborted ongoing API request')
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      
      setWaveformData(new Array(20).fill(0))
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    // Double check - don't process if modal is closed
    if (!isOpen) {
      console.log('🚫 Modal closed, aborting audio processing')
      return
    }
    
    setIsProcessing(true)
    
    // Create abort controller for this request
    abortControllerRef.current = new AbortController()
    
    try {
      const audioFile = new File([audioBlob], 'recording.webm', { 
        type: audioBlob.type 
      })
      
      const responseBlob = await speechService.speechToSpeech(audioFile, {
        gender: selectedGender,
        signal: abortControllerRef.current.signal
      })
      
      // Ensure no existing audio is playing
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current.load()
        audioRef.current = null
      }
      
      const audioUrl = URL.createObjectURL(responseBlob)
      audioRef.current = new Audio(audioUrl)
      audioRef.current.volume = 0.8
      
      const onPlay = () => {
        setIsPlaying(true)
        updateWaveform() // Start waveform for playback
      }
      
      const onEnded = () => {
        setIsPlaying(false)
        setWaveformData(new Array(20).fill(0))
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
          animationRef.current = null
        }
        URL.revokeObjectURL(audioUrl)
        if (audioRef.current) {
          audioRef.current.removeEventListener('play', onPlay)
          audioRef.current.removeEventListener('ended', onEnded)
          audioRef.current.removeEventListener('error', onError)
          audioRef.current = null
        }
      }
      
      const onError = () => {
        setIsPlaying(false)
        setWaveformData(new Array(20).fill(0))
        URL.revokeObjectURL(audioUrl)
        if (audioRef.current) {
          audioRef.current.removeEventListener('play', onPlay)
          audioRef.current.removeEventListener('ended', onEnded)
          audioRef.current.removeEventListener('error', onError)
          audioRef.current = null
        }
      }
      
      audioRef.current.addEventListener('play', onPlay)
      audioRef.current.addEventListener('ended', onEnded)
      audioRef.current.addEventListener('error', onError)
      
      await audioRef.current.play()
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🚫 API request aborted')
        // Don't show error for intentionally aborted requests
      } else {
        console.error('Failed to process audio:', error)
      }
    } finally {
      setIsProcessing(false)
      // Clear abort controller when done
      if (abortControllerRef.current) {
        abortControllerRef.current = null
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const stopPlaying = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current.src = ''
      audioRef.current.load()
      setIsPlaying(false)
      setWaveformData(new Array(20).fill(0))
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      audioRef.current = null
    }
    
    // Also abort any ongoing API request when stopping playback
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      console.log('🚫 Aborted ongoing API request from stop playing')
    }
  }

  // Get consistent soft color scheme - always the same
  const getColors = () => {
    if (isDark) {
      return {
        primary: 'from-blue-400/20 to-indigo-400/20',
        icon: 'text-blue-300',
        border: 'border-blue-300/20',
        bg: 'bg-blue-400/10',
        text: 'text-blue-200'
      }
    } else {
      return {
        primary: 'from-blue-300/20 to-indigo-300/20',
        icon: 'text-blue-500',
        border: 'border-blue-400/20',
        bg: 'bg-blue-400/10',
        text: 'text-blue-600'
      }
    }
  }

  const colors = getColors()

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        style={{
          background: isDark 
            ? `radial-gradient(circle at center, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)` 
            : `radial-gradient(circle at center, rgba(241, 245, 249, 0.95) 0%, rgba(248, 250, 252, 0.98) 100%)`
        }}
        onClick={handleClose}
      >
        {/* Background Waveform Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center">
            {waveformData.map((value, i) => (
              <motion.div
                key={i}
                className={`w-1 mx-1 rounded-full bg-gradient-to-t ${colors.primary}`}
                style={{
                  height: `${Math.max(value * 40, 2)}vh`,
                  opacity: isRecording || isPlaying ? 0.3 : 0.15
                }}
                animate={{
                  height: `${Math.max(value * 40, 2)}vh`,
                  opacity: isRecording || isPlaying ? 0.3 : 0.15
                }}
                transition={{ duration: 0.1 }}
              />
            ))}
          </div>
        </div>

        {/* Main Content */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="relative h-full flex flex-col items-center justify-center p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleClose}
            className={`absolute top-8 right-8 p-4 rounded-full backdrop-blur-md transition-all duration-300 ${
              isDark 
                ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' 
                : 'bg-black/10 hover:bg-black/20 text-gray-800 border border-black/20'
            }`}
          >
            <X className="w-6 h-6" />
          </motion.button>

          {/* Gender Selection - Compact Toggle */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="absolute top-8 left-8"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSelectedGender(selectedGender === 'female' ? 'male' : 'female')}
              className={`relative p-3 rounded-full backdrop-blur-md transition-all duration-300 ${
                isDark 
                  ? 'bg-white/10 hover:bg-white/20 border border-white/20' 
                  : 'bg-black/10 hover:bg-black/20 border border-black/20'
              }`}
              title={selectedGender === 'female' ? 'Kadın Ses (Erkek sese geç)' : 'Erkek Ses (Kadın sese geç)'}
            >
              <div className="text-xl">
                {selectedGender === 'female' ? '👩‍🎤' : '👨‍🎤'}
              </div>
              {/* Small indicator dot */}
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 ${
                isDark ? 'border-slate-800' : 'border-white'
              } ${
                selectedGender === 'female'
                  ? 'bg-pink-400'
                  : 'bg-blue-400'
              }`} />
            </motion.button>
          </motion.div>

          {/* Top Status */}
          <motion.div 
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-12"
          >
            <div className={`text-lg font-medium mb-2 ${
              isDark ? 'text-white/80' : 'text-gray-700'
            }`}>
              ABU Sesli Asistan
            </div>
            <div className={`text-4xl font-light tracking-wide ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              {isRecording ? 'Dinliyorum...' : 
               isProcessing ? 'Düşünüyorum...' : 
               isPlaying ? 'Konuşuyorum...' : 
               'Merhaba!'}
            </div>
          </motion.div>

          {/* Central Audio Visualizer */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="relative"
          >
            {/* Glassmorphism Circle */}
            <div className={`relative w-80 h-80 rounded-full backdrop-blur-xl border ${
              isDark 
                ? 'bg-white/5 border-white/10' 
                : 'bg-white/20 border-white/30'
            }`}>
              
              {/* Waveform Bars Inside Circle */}
              <div className="absolute inset-8 flex items-center justify-center">
                <div className="flex items-end justify-center gap-1 h-32">
                  {waveformData.slice(8, 12).map((value, i) => (
                    <motion.div
                      key={i}
                      className={`w-3 rounded-full bg-gradient-to-t ${colors.primary}`}
                      style={{
                        height: `${Math.max(value * 120, 8)}px`
                      }}
                      animate={{
                        height: `${Math.max(value * 120, 8)}px`
                      }}
                      transition={{ duration: 0.1 }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Central Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div 
                  animate={isRecording ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`w-24 h-24 rounded-full flex items-center justify-center backdrop-blur-md ${colors.bg} border-2 ${colors.border}`}
                >
                  {isInitializing ? (
                    <Loader2 className={`w-8 h-8 animate-spin ${colors.icon}`} />
                  ) : isProcessing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <Headphones className={`w-8 h-8 ${colors.icon}`} />
                    </motion.div>
                  ) : isPlaying ? (
                    <Volume2 className={`w-8 h-8 ${colors.icon}`} />
                  ) : isRecording ? (
                    <Mic className={`w-8 h-8 ${colors.icon}`} />
                  ) : (
                    <Phone className={`w-8 h-8 ${isDark ? 'text-white/70' : 'text-gray-600'}`} />
                  )}
                </motion.div>
              </div>

              {/* Recording Timer */}
              {isRecording && (
                <div className={`absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center ${colors.text}`}>
                  <div className="text-3xl font-mono font-bold">
                    {formatTime(recordingTime)}
                  </div>
                  <div className="text-sm opacity-80">
                    🔴 Kaydediliyor
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Bottom Controls */}
          <motion.div 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-16 flex items-center gap-8"
          >
            {!isRecording && !isProcessing && !isPlaying && !isInitializing && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startRecording}
                className={`px-12 py-5 rounded-full font-semibold text-xl backdrop-blur-md transition-all duration-300 ${
                  isDark 
                    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30' 
                    : 'bg-black/10 hover:bg-black/20 text-gray-800 border border-black/20 hover:border-black/30'
                }`}
              >
                🎤 Konuşmaya Başla
              </motion.button>
            )}

            {isInitializing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`px-12 py-5 rounded-full text-xl backdrop-blur-md ${
                  isDark 
                    ? 'bg-white/5 text-white/60 border border-white/10' 
                    : 'bg-black/5 text-gray-500 border border-black/10'
                }`}
              >
                <Loader2 className="w-6 h-6 inline mr-3 animate-spin" />
                Hazırlanıyor...
              </motion.div>
            )}

            {isRecording && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={stopRecording}
                className={`px-12 py-5 rounded-full font-semibold text-xl backdrop-blur-md transition-all duration-300 ${colors.bg} ${colors.border} border ${colors.text}`}
              >
                ⏹️ Kayıt Durdur
              </motion.button>
            )}

            {isPlaying && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={stopPlaying}
                className={`px-12 py-5 rounded-full font-semibold text-xl backdrop-blur-md transition-all duration-300 ${colors.bg} ${colors.border} border ${colors.text}`}
              >
                <VolumeX className="w-6 h-6 inline mr-3" />
                Durdur
              </motion.button>
            )}
          </motion.div>

          {/* Instructions */}
          {!isRecording && !isProcessing && !isPlaying && !isInitializing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center max-w-md ${
                isDark ? 'text-white/60' : 'text-gray-600'
              }`}
            >
              <p className="text-lg">
                ABU hakkında merak ettiklerinizi sesli olarak sorun
              </p>
              <p className="text-sm mt-2 opacity-80">
                Butona basarak konuşmaya başlayın • Net bir şekilde konuşun
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
} 