import type { Metadata } from 'next'
import { TooltipProvider } from '@/components/sql/ui/tooltip'
import './globals.css'

export const metadata: Metadata = {
  title: 'data-peek | SQL Client',
  description: 'Fast PostgreSQL, MySQL, and MSSQL client for developers.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased">
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  )
}
