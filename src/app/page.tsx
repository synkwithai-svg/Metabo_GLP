"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0C0F1A] via-[#1A2333] to-[#0C0F1A] px-6">
      <main className="flex flex-col items-center justify-center gap-8 text-center max-w-2xl">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white drop-shadow-lg leading-tight">
          Welcome to
          <span className="inline-block bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
            MetaBox GLP
          </span>
        </h1>

        <p className="text-lg md:text-xl text-white/80 leading-relaxed">
          Your advanced platform for managing and optimizing your digital
          experience with ease and efficiency.
        </p>

        {/* <Link
          href="/login"
          className="px-10 py-3 rounded-xl font-semibold text-white shadow-lg shadow-black/20 
                     backdrop-blur-md border border-white/30 transition-all duration-300
                     hover:bg-white/20 hover:scale-105 active:scale-95"
        >
          Login
        </Link> */}

        {/* Small Floating Glow Effect */}
        <div className="absolute w-72 h-72 bg-[#4fc3f7]/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
      </main>
    </div>
  );
}
