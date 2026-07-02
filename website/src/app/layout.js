
export const metadata = {
  title: 'RaaziMarzi — Online Dispute Resolution',
  description: 'Fast, affordable and confidential mediation for personal, consumer and commercial disputes in India.',
  icons: {
    icon: [
      { url: '/favicon.svg?v=3', type: 'image/svg+xml' },
      { url: '/favicon.ico',     sizes: 'any' },
    ],
    apple: '/apple-touch-icon.png',
  },
  themeColor: '#4F3CC9',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
