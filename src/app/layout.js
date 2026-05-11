import './globals.css';

export const metadata = {
  title: 'GoSniff - It\'s a Dog Meet Dog World',
  description: "See which dogs are at the park right now. Check in, meet up, and make new friends.",
  openGraph: {
    title: 'GoSniff - It\'s a Dog Meet Dog World',
    description: 'See which dogs are at the park right now. Check in, meet up, and make new friends.',
    url: 'https://gosniff.vercel.app',
    siteName: 'GoSniff',
    images: [
      {
        url: 'https://gosniff.vercel.app/GoSniff_Logo.png',
        width: 1496,
        height: 1238,
        alt: 'GoSniff Logo',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'GoSniff - It\'s a Dog Meet Dog World',
    description: 'See which dogs are at the park right now. Check in, meet up, and make new friends.',
    images: ['https://gosniff.vercel.app/GoSniff_Logo.png'],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon-32.png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Nunito', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
