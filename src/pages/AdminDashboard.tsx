import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  FileText, 
  Trash2, 
  BarChart3, 
  Database,
  LogOut,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Activity,
  X,
  User,
  Calendar,
  Search,
  Filter,
  Eye,
  Info,
  Download,
  Moon,
  Sun
} from 'lucide-react'
import { useAuthStore } from '../stores/useAuthStore'
import { useDocumentStore } from '../stores/useDocumentStore'
import { useNavigate } from 'react-router-dom'
import { documentService, systemService } from '../services/api'
import { formatFileSize, formatDate } from '../utils'
import toast from 'react-hot-toast'
import type { DocumentContent, DocumentDetails } from '../types'

interface SystemStats {
  total_documents: number
  total_chunks: number
  total_conversations: number
  system_health: 'healthy' | 'warning' | 'error'
  last_updated: string
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'documents'>('overview')
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true'
  })
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null)
  const [documentContent, setDocumentContent] = useState<DocumentContent | null>(null)
  const [documentDetails, setDocumentDetails] = useState<DocumentDetails | null>(null)
  const [isLoadingDocument, setIsLoadingDocument] = useState(false)
  
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  
  // Document store
  const {
    documents,
    uploadSessions,
    currentUploadProgress,
    stats: documentStats,
    isLoading: documentsLoading,
    error: documentsError,
    fetchDocuments,
    fetchUploadSessions,
    fetchDocumentStats,
    startUploadTracking,
    stopUploadTracking,
    deleteDocument,
    clearAllDocuments,
    clearError
  } = useDocumentStore()

  useEffect(() => {
    if (!user?.isAuthenticated) {
      navigate('/admin')
      return
    }
    loadData()
  }, [user, navigate])

  useEffect(() => {
    // Load document data when component mounts
    if (user?.isAuthenticated) {
      fetchDocuments()
      fetchUploadSessions()
      fetchDocumentStats()
    }
  }, [user?.isAuthenticated])

  // Clear errors when they exist
  useEffect(() => {
    if (documentsError) {
      toast.error(documentsError)
      clearError()
    }
  }, [documentsError])

  // Apply dark mode to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', isDarkMode.toString())
  }, [isDarkMode])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const statsResponse = await systemService.getStats().catch(() => null)
      setSystemStats(statsResponse)
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    toast.success('Çıkış yapıldı')
    navigate('/admin')
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  // Add refresh all data function
  const refreshAllData = async () => {
    try {
      await Promise.all([
        fetchDocuments(),
        fetchDocumentStats(),
        fetchUploadSessions(),
        loadData()
      ])
      toast.success('Veriler güncellendi')
    } catch (error) {
      toast.error('Veriler güncellenirken hata oluştu')
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error('Lütfen dosya seçin')
      return
    }

    setIsUploading(true)
    const filesArray = Array.from(selectedFiles)

    try {
      const response = await documentService.uploadDocuments(filesArray)

      // If we get a session_id, start tracking progress
      if (response.session_id) {
        startUploadTracking(response.session_id, async () => {
          // This callback runs when upload tracking completes
          await loadData(); // Refresh system stats too
          toast.success('Upload tamamlandı! Tüm veriler güncellendi.')
        })
        toast.success('Upload başlatıldı, ilerleme takip ediliyor...')
      } else {
        toast.success(`${response.files_processed} dosya başarıyla yüklendi`)
        
        // Refresh ALL data including system stats
        await refreshAllData()
      }

      setSelectedFiles(null)
      // Clear file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error('Dosya yükleme başarısız')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Bu dokümanı silmek istediğinizden emin misiniz?')) return

    try {
      await deleteDocument(docId)
      toast.success('Doküman silindi')
      
      // Refresh ALL stats after deletion
      await refreshAllData()
      
      if (selectedDocument === docId) {
        setSelectedDocument(null)
        setDocumentContent(null)
        setDocumentDetails(null)
      }
    } catch (error) {
      toast.error('Doküman silinirken hata oluştu')
    }
  }

  const handleClearAllDocuments = async () => {
    if (!confirm('TÜM dokümanları silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) return

    try {
      await clearAllDocuments()
      toast.success('Tüm dokümanlar silindi')
      
      // Refresh ALL stats after clearing
      await refreshAllData()
      
      setSelectedDocument(null)
      setDocumentContent(null)
      setDocumentDetails(null)
    } catch (error) {
      toast.error('Dokümanlar silinirken hata oluştu')
    }
  }

  const handleViewDocument = async (documentId: string) => {
    setSelectedDocument(documentId);
    setIsLoadingDocument(true);
    
    try {
      // Get both document details and full content
      const [details, content] = await Promise.all([
        documentService.getDocumentDetails(documentId),
        documentService.getDocumentContent(documentId, false) // Get full content, not chunks
      ]);
      
      setDocumentDetails(details);
      setDocumentContent(content);
    } catch (error) {
      console.error('Error loading document:', error);
      toast.error('Doküman yüklenirken hata oluştu');
    } finally {
      setIsLoadingDocument(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed': return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800'
      case 'processing': return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800'
      case 'error': return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800'
      default: return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-800/20 dark:border-gray-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed': return <CheckCircle className="h-4 w-4" />
      case 'processing': return <Clock className="h-4 w-4" />
      case 'error': return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  // Filter documents based on search term
  const filteredDocuments = documents.filter(doc =>
    doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/ABU-logo-tr-lacivert.png" 
                alt="ABU Logo" 
                className="h-10 w-auto"
              />
              <div>
                <h1 className="text-xl font-bold text-blue-900 dark:text-blue-100">Admin Dashboard</h1>
                <p className="text-sm text-blue-600 dark:text-blue-400">Ankara Bilim Üniversitesi RAG Sistemi</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <User className="h-4 w-4" />
                <span>{user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Çıkış</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Upload Progress Notification */}
        <AnimatePresence>
          {currentUploadProgress && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-blue-900 dark:text-blue-100">Upload İşleniyor</span>
                </div>
                <button
                  onClick={stopUploadTracking}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-blue-700 dark:text-blue-300">
                  <span>
                    {currentUploadProgress.processed_files} / {currentUploadProgress.total_files} dosya işlendi
                  </span>
                  <span className="font-medium">{currentUploadProgress.progress_percentage}%</span>
                </div>
                
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 dark:bg-blue-400 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${currentUploadProgress.progress_percentage}%` }}
                  />
                </div>
                
                {currentUploadProgress.current_file && (
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    <span className="font-medium">Şu an işleniyor:</span> {currentUploadProgress.current_file}
                  </p>
                )}
                
                <p className="text-xs text-blue-500 dark:text-blue-400 capitalize">
                  <span className="font-medium">Durum:</span> {currentUploadProgress.status}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 transition-colors">
          <div className="flex">
            {[
              { id: 'overview', label: 'Genel Bakış', icon: BarChart3 },
              { id: 'documents', label: 'Dokümanlar', icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-all border-b-2 flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Header with refresh button */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Sistem İstatistikleri</h2>
                <button
                  onClick={refreshAllData}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={isLoading || documentsLoading}
                  title="Tüm verileri yenile"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading || documentsLoading ? 'animate-spin' : ''}`} />
                  <span>Yenile</span>
                </button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Toplam Doküman</p>
                      <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                        {documentStats?.total_documents ?? systemStats?.total_documents ?? 0}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Toplam Boyut</p>
                      <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                        {documentStats?.total_size ? formatFileSize(documentStats.total_size) : '0 B'}
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Son 24 Saat</p>
                      <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                        {documentStats?.recent_uploads ?? 0}
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                      <Upload className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">İşlem Bekleyen</p>
                      <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                        {documentStats?.processing_documents ?? 0}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Upload Sessions */}
              {uploadSessions.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Son Upload Sessions</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Session ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dosya Sayısı</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlenen</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durum</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tarih</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {uploadSessions.slice(0, 5).map((session) => (
                          <tr key={session.session_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600 dark:text-gray-400">
                              {session.session_id.substring(0, 8)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{session.total_files}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{session.processed_files}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(session.status)}`}>
                                {getStatusIcon(session.status)}
                                <span className="capitalize">{session.status}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{formatDate(session.started_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'documents' && (
            <motion.div
              key="documents"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Upload Section */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Doküman Yükle</h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => setSelectedFiles(e.target.files)}
                    className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/20 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30 transition-colors"
                    disabled={isUploading}
                  />
                  <button
                    onClick={handleFileUpload}
                    disabled={!selectedFiles || selectedFiles.length === 0 || isUploading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 whitespace-nowrap transition-colors"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Yükleniyor...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Yükle</span>
                      </>
                    )}
                  </button>
                </div>
                
                {selectedFiles && selectedFiles.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {selectedFiles.length} dosya seçildi
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Documents List */}
                <div className="lg:col-span-2">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors h-[calc(100vh-200px)]">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          Dokümanlar ({filteredDocuments.length}/{documents.length})
                        </h3>
                        
                        <div className="flex items-center space-x-3">
                          {/* Search */}
                          <div className="relative">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Doküman ara..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                          
                          <button
                            onClick={refreshAllData}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            disabled={documentsLoading}
                            title="Tüm verileri yenile"
                          >
                            <RefreshCw className={`h-4 w-4 ${documentsLoading ? 'animate-spin' : ''}`} />
                          </button>
                          
                          <button
                            onClick={handleClearAllDocuments}
                            className="px-3 py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors"
                          >
                            Tümünü Sil
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-y-auto" style={{ height: 'calc(100% - 100px)' }}>
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-2/5">Dosya Adı</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/6">Boyut</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/6">Chunks</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/6">Durum</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/6">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {filteredDocuments.map((doc) => (
                            <tr key={doc.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedDocument === doc.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                              <td className="px-4 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium w-2/5">
                                <div className="truncate max-w-xs" title={doc.file_name}>
                                  {doc.file_name}
                                </div>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 w-1/6">
                                {formatFileSize(doc.file_size)}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 w-1/6">
                                <span className="font-medium">{doc.chunks_count || 0}</span>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap w-1/6">
                                <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(doc.status)}`}>
                                  {getStatusIcon(doc.status)}
                                  <span className="capitalize">{doc.status}</span>
                                </div>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap w-1/6">
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => handleViewDocument(doc.id)}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                    title="Görüntüle"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    title="Sil"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {filteredDocuments.length === 0 && (
                        <div className="text-center py-8">
                          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500 dark:text-gray-400">
                            {searchTerm ? 'Arama kriterinize uygun doküman bulunamadı' : 'Henüz hiç doküman yüklenmemiş'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Document Viewer */}
                <div className="lg:col-span-1">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors sticky top-24 h-[calc(100vh-120px)]">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Doküman Detayları</h3>
                    </div>
                    
                    <div className="p-6 overflow-y-auto" style={{ height: 'calc(100% - 80px)' }}>
                      {isLoadingDocument ? (
                        <div className="text-center py-8">
                          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">Yükleniyor...</p>
                        </div>
                      ) : selectedDocument && documentDetails ? (
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">{documentDetails.file_name}</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Boyut:</span>
                                <span className="text-gray-900 dark:text-gray-100">{formatFileSize(documentDetails.file_size)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Chunks:</span>
                                <span className="text-gray-900 dark:text-gray-100">{documentDetails.chunks_count}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Weaviate:</span>
                                <span className="text-gray-900 dark:text-gray-100">{documentDetails.weaviate_chunks}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Tarih:</span>
                                <span className="text-gray-900 dark:text-gray-100">{formatDate(documentDetails.created_at)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500 dark:text-gray-400">Durum:</span>
                                <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(documentDetails.status)}`}>
                                  {getStatusIcon(documentDetails.status)}
                                  <span className="capitalize">{documentDetails.status}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {documentContent && (
                            <div>
                              <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                                Doküman İçeriği ({documentContent.total_chunks} chunk'tan oluşuyor)
                              </h5>
                              
                              {/* Full Content Viewer */}
                              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4 max-h-96 overflow-y-auto">
                                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                  {documentContent.full_content || 'İçerik yüklenemedi'}
                                </div>
                              </div>
                              
                              {/* Document Stats */}
                              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                                  <div className="text-blue-600 dark:text-blue-400 font-medium">Toplam Chunk</div>
                                  <div className="text-blue-800 dark:text-blue-300">{documentContent.total_chunks}</div>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                                  <div className="text-green-600 dark:text-green-400 font-medium">Dosya Boyutu</div>
                                  <div className="text-green-800 dark:text-green-300">{formatFileSize(documentContent.file_size)}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Detayları görüntülemek için bir doküman seçin
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
} 