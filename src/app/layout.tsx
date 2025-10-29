import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'
import { ThemeProvider } from '@/components/ui/themeprovider'
import { Providers } from './providers'
import { ToastContainer } from 'react-toastify'
import { Toaster } from 'react-hot-toast'

// const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'LMS - Learning Management System',
  description: 'A modern learning management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <Toaster position="top-right" />
          <ToastContainer />
          {children}
        </Providers>

      </body>
    </html>
  )
}