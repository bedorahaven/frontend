'use client';

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#0B0F19] text-white pt-8 pb-10 px-6 sm:pt-14 sm:pb-18 md:pt-24 md:pb-26 flex flex-col items-center justify-center text-center">

      {/* 1. TAILWIND CSS SIGNATURE GRID & DIAGONAL HATCH BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">

        {/* Engineering Grid Overlay */}
        <div
          className="absolute inset-0 opacity-25 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px]"
          style={{
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, #000 60%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, #000 60%, transparent 100%)',
          }}
        />

        {/* Diagonal Stripe Margin Accents (Left & Right) */}
        <div className="absolute top-0 bottom-0 left-0 w-12 border-r border-slate-800/60 opacity-30 bg-[repeating-linear-gradient(-45deg,#1e293b,#1e293b_1px,transparent_1px,transparent_8px)] hidden sm:block" />
        <div className="absolute top-0 bottom-0 right-0 w-12 border-l border-slate-800/60 opacity-30 bg-[repeating-linear-gradient(-45deg,#1e293b,#1e293b_1px,transparent_1px,transparent_8px)] hidden sm:block" />

        {/* Subtle Ambient Blue Radial Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-sky-500/10 rounded-full blur-[100px]" />
      </div>

      {/* 2. TOP SVG BLUE GLOW OUTLINE WIREFRAME ("BEDORA") WITH ANIMATION */}
      <div className="w-full max-w-6xl flex justify-center pointer-events-none select-none mb-3 sm:mb-6 relative z-10">
        <svg
          viewBox="0 0 1000 180"
          className="w-full h-auto max-h-[110px] sm:max-h-[170px] md:max-h-[240px] drop-shadow-[0_0_40px_rgba(0,112,243,0.4)] transition-all duration-700"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Moving Electric Sweep Gradient */}
            <linearGradient id="bedora-glow" x1="-100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#0070f3" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#00dfd8" stopOpacity="1" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
              <animate
                attributeName="x1"
                values="-100%; 100%"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="x2"
                values="0%; 200%"
                dur="3s"
                repeatCount="indefinite"
              />
            </linearGradient>

            {/* Electric Spark Filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <text
            x="50%"
            y="50%"
            dominantBaseline="central"
            textAnchor="middle"
            stroke="url(#bedora-glow)"
            strokeWidth="2.2"
            fill="none"
            filter="url(#glow)"
            className="font-black uppercase"
            style={{
              fontSize: '115px',
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              letterSpacing: '-0.04em'
            }}
          >
            BEDORA
          </text>
        </svg>
      </div>

      {/* 3. HERO CONTENT BELOW SVG */}
      <div className="relative z-10 max-w-3xl space-y-4 flex flex-col items-center px-2">

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-6xl md:text-7xl font-extrabold tracking-tight font-heading text-white leading-tight">
          for Kenya & Beyond
        </h1>

        {/* Subtitle Copywriting */}
        <p className="text-sm sm:text-base md:text-lg text-slate-400 font-normal max-w-2xl leading-relaxed pt-1">
          Used by thousands of travelers and hosts, Bedora enables you to discover verified stays and book instantly with complete confidence.
        </p>

      </div>

    </section>
  );
}
