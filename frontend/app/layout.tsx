import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Multi-Asset Portfolio Analyzer",
  description: "Privacy-preserving multi-asset portfolio analyzer using FHEVM technology",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-white">
        <div className="min-h-screen bg-white">
          <header className="bg-blue-400 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-extrabold text-gray-900 text-shadow">
                    Multi-Asset Portfolio Analyzer
                  </h1>
                  <p className="mt-2 text-sm text-gray-800 font-medium">
                    Privacy-Preserving Financial Analytics with Fully Homomorphic Encryption
                  </p>
                </div>
                <div className="hidden md:flex items-center space-x-2 bg-white bg-opacity-90 px-4 py-2 rounded-full">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-gray-900">Secure & Encrypted</span>
                </div>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Providers>{children}</Providers>
          </main>
        </div>
      </body>
    </html>
  );
}

