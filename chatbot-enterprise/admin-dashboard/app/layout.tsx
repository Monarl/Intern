import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from '@/components/ui/sonner';
import { SupabaseProvider } from '@/lib/supabase/context';
import { createClient } from '@/app/lib/supabase/server';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chatbot Enterprise Admin",
  description: "Admin dashboard for the enterprise chatbot solution",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Initialize supabase for server components
  const supabase = await createClient();
  
  // Get initial user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SupabaseProvider initialUser={user}>
          {children}
          <Toaster />
        </SupabaseProvider>
      </body>
    </html>
  );
}
