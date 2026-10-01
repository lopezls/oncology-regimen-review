import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Oncology Regimen Review",
  description: "Pharmacist regimen completeness review (synthetic data MVP)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-zinc-900">
        <div className="bg-amber-100 px-4 py-1 text-center text-xs text-amber-900">
          Synthetic data only – not for clinical use
        </div>
        <main className="mx-auto max-w-4xl p-6">{children}</main>
      </body>
    </html>
  );
}
