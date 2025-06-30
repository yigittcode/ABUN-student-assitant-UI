import React from 'react'
import { motion } from 'framer-motion'
import { Home, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <img 
            src="/ABU-logo-tr-lacivert.png" 
            alt="ABU Logo" 
            className="h-16 w-auto mx-auto mb-6"
          />
          
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <h1 className="text-8xl font-bold text-blue-900 mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Sayfa Bulunamadı
            </h2>
            <p className="text-gray-600 mb-6">
              Aradığınız sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            <Link
              to="/"
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
            >
              <Home className="h-5 w-5" />
              <span>Ana Sayfaya Dön</span>
            </Link>
            
            <div className="block">
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Geri Git</span>
              </button>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-sm text-gray-500"
        >
          © 2024 Ankara Bilim Üniversitesi
        </motion.div>
      </div>
    </div>
  )
} 