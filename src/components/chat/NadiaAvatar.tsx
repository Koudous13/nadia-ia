'use client';

export function NadiaAvatar({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  if (size === 'sm') {
    return (
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2563eb] to-[#1d3f7a] flex items-center justify-center shadow-lg shadow-blue-500/20 ring-2 ring-white">
        <span className="text-white font-bold text-sm">N</span>
      </div>
    );
  }

  return (
    <div className="relative w-52 h-52 welcome-glow rounded-3xl">
      {/* Decorative floating elements */}
      <div className="absolute -top-3 -right-3 w-10 h-10 bg-white/80 backdrop-blur rounded-xl shadow-lg flex items-center justify-center float-slow">
        <span className="text-lg">📊</span>
      </div>
      <div className="absolute -bottom-2 -left-3 w-9 h-9 bg-white/80 backdrop-blur rounded-xl shadow-lg flex items-center justify-center float-mid">
        <span className="text-base">💬</span>
      </div>
      <div className="absolute top-8 -left-4 w-8 h-8 bg-white/80 backdrop-blur rounded-lg shadow-lg flex items-center justify-center float-fast">
        <span className="text-sm">📈</span>
      </div>
      <div className="absolute -top-1 left-8 w-7 h-7 bg-blue-100 rounded-full float-mid opacity-60" />
      <div className="absolute bottom-6 -right-2 w-5 h-5 bg-blue-200 rounded-full float-slow opacity-40" />

      {/* Main avatar */}
      <div className="w-full h-full rounded-3xl bg-gradient-to-br from-[#eff6ff] via-[#dbeafe] to-[#bfdbfe] flex items-center justify-center overflow-hidden border border-blue-100/50 shadow-xl shadow-blue-500/10">
        <svg viewBox="0 0 200 200" className="w-40 h-40" fill="none">
          {/* Laptop / desk */}
          <rect x="50" y="130" rx="4" width="100" height="8" fill="#93c5fd" opacity="0.5" />
          <rect x="60" y="100" rx="6" width="80" height="35" fill="#2563eb" opacity="0.15" />
          <rect x="65" y="105" rx="3" width="70" height="22" fill="white" opacity="0.8" />
          {/* Chart bars on screen */}
          <rect x="72" y="118" width="8" height="6" rx="1" fill="#3b82f6" />
          <rect x="83" y="114" width="8" height="10" rx="1" fill="#2563eb" />
          <rect x="94" y="110" width="8" height="14" rx="1" fill="#1d4ed8" />
          <rect x="105" y="116" width="8" height="8" rx="1" fill="#60a5fa" />
          <rect x="116" y="112" width="8" height="12" rx="1" fill="#3b82f6" />

          {/* Person - body */}
          <ellipse cx="100" cy="90" rx="22" ry="25" fill="#2563eb" opacity="0.9" />
          {/* Hijab */}
          <ellipse cx="100" cy="55" rx="25" ry="23" fill="#2563eb" />
          <ellipse cx="100" cy="52" rx="22" ry="20" fill="#3b82f6" />
          {/* Face */}
          <ellipse cx="100" cy="56" rx="16" ry="15" fill="#f5d0a9" />
          {/* Eyes */}
          <ellipse cx="94" cy="55" rx="2" ry="2.5" fill="#1e293b" />
          <ellipse cx="106" cy="55" rx="2" ry="2.5" fill="#1e293b" />
          {/* Smile */}
          <path d="M95 62 Q100 67 105 62" stroke="#c2856e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Eyebrows */}
          <path d="M91 50 Q94 48 97 50" stroke="#4a3728" strokeWidth="1" fill="none" />
          <path d="M103 50 Q106 48 109 50" stroke="#4a3728" strokeWidth="1" fill="none" />
        </svg>
      </div>
    </div>
  );
}
