import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";

export const metadata: Metadata = {
  title: "IPPAN Explorer",
  description: "Modern dashboard for inspecting the IPPAN network",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100">
        <div className="min-h-screen bg-slate-950">
          <TopNav />
          <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 pb-24 pt-6 lg:pb-10 lg:px-8">
            <Sidebar />
            <main className="flex-1 min-w-0 space-y-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
