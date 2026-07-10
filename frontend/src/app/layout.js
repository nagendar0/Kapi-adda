import "./globals.css";

export const metadata = {
  title: "Kapi Adda - AI-Powered Smart Restaurant Operating System",
  description: "Comprehensive restaurant platform with real-time operations, customer recommendations, and Business Intelligence engine.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
