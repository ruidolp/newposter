import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { loadExtensions } from '@/lib/extensions/loader'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'posfer.com - POS & Ecommerce',
  description: 'Sistema de ventas y comercio electrónico',
}

// Load extensions on app startup
loadExtensions()

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
