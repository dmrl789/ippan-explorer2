import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "IPPAN — Deterministic Intelligence for a Decentralised World",
  description:
    "IPPAN is a deterministic high-throughput ledger for AI and machine-to-machine economies, built on HashTimer ordering and a BlockDAG architecture.",
  metadataBase: new URL("https://ippan.uk"),
};

function Header() {
  return (
    <header className="border-b border-white/10 bg-black/20 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-semibold tracking-wide">
          IPPAN
        </Link>
        <nav className="flex gap-4 text-sm text-white/80">
          <Link className="hover:text-white" href="/technology">Technology</Link>
          <Link className="hover:text-white" href="/devnet">Devnet</Link>
          <Link className="hover:text-white" href="/docs">Docs</Link>
          <a className="hover:text-white" href="https://github.com/dmrl789/IPPAN" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-white/60">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} IPPAN</div>
          <div className="flex gap-4">
            <Link className="hover:text-white" href="/contact">Contact</Link>
            <a className="hover:text-white" href="https://ippan-org2.vercel.app" target="_blank" rel="noreferrer">
              Vercel Preview
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#05060a] text-white">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
