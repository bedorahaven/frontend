import type { Metadata } from "next";
import { Mona_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { OfflineBanner } from "@/components/offline-banner";
import { Header } from "@/components/header";
import { Toaster } from "react-hot-toast";

const monaSans = Mona_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bedora Haven | Airbnb Rentals & Homes",
  description: "Book unique places to stay and things to do.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${monaSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <OfflineBanner />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster position="top-center" />
          {/* Global Header rendered across all pages */}
          <Header />


          {/* Page Content */}
          <div className="flex-1">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
