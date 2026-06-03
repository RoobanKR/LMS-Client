import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'
import { ThemeProvider } from '@/components/ui/themeprovider'
import { Providers } from './providers'
import { ToastContainer } from 'react-toastify'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })

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
      <body className={inter.className}>
        <Providers>
         <Toaster
    position="top-right"
    toastOptions={{
      duration: 3000,
      style: {
        fontFamily: "'Inter', sans-serif",
        fontSize: '13px',
      },
    }}
    containerStyle={{
    zIndex: 99999,
  }}
  />
          {children}
        </Providers>

      </body>
    </html>
  )
}