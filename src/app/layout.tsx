import type { Metadata } from 'next'
import { Toaster } from '@/shared/components/molecules/Toast'
import '@/shared/styles/globals.css'

export const metadata: Metadata = {
  title: 'ZED - Seu Assistente Virtual Inteligente',
  description: 'ZED é seu assistente virtual pessoal com IA avançada. Organize sua vida, rotina, finanças e agenda com inteligência artificial.',
  keywords: ['assistente virtual', 'IA', 'inteligência artificial', 'produtividade', 'organização pessoal'],
  authors: [{ name: 'ZED Team' }],
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'ZED - Seu Assistente Virtual Inteligente',
    description: 'Organize sua vida com inteligência artificial',
    type: 'website',
    images: ['/logo.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Meta tags para PWA */}
        <meta name="application-name" content="ZED" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ZED" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#1E293B" />

        {/* Viewport otimizado para mobile */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />

        {/* Apple Touch Icons - iOS */}
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="60x60" href="/logo.png" />
        <link rel="apple-touch-icon" sizes="57x57" href="/logo.png" />

        {/* Favicons - múltiplos formatos para melhor compatibilidade */}
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="icon" type="image/png" href="/icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/logo.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/logo.png" />
        <link rel="shortcut icon" href="/icon.png" />
        <link rel="mask-icon" href="/icon.svg" color="#1E293B" />

        {/* Preconnect para performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-screen bg-[hsl(222,47%,6%)] text-slate-100 antialiased"
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  )
}


