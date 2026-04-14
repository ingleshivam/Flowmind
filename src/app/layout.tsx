import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowMind — Visual AI Workflow Builder",
  description: "Build, connect, and execute LLM workflows visually",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased" style={{ background: 'hsl(222, 47%, 6%)' }}>{children}</body>
    </html>
  );
}
