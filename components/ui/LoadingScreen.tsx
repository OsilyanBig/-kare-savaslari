// components/ui/LoadingScreen.tsx
'use client';

interface LoadingScreenProps {
  message?: string;
  submessage?: string;
}

export default function LoadingScreen({
  message = 'Yükleniyor...',
  submessage,
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-military-pattern bg-grid-pattern flex items-center justify-center p-4">
      <div className="text-center animate-fade-in">
        {/* Dönen Logo */}
        <div className="relative inline-block mb-8">
          {/* Dış Halka */}
          <div className="w-24 h-24 rounded-full border-2 border-amber-400/20 animate-spin-slow" />

          {/* İç İkon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 100 100"
              className="animate-pulse"
            >
              <path
                d="M50 5C50 5 20 15 10 25V55C10 80 50 95 50 95C50 95 90 80 90 55V25C80 15 50 5 50 5Z"
                fill="rgba(255,215,0,0.2)"
                stroke="#ffd700"
                strokeWidth="3"
              />
              <path
                d="M50 35L53 45H63L55 51L58 61L50 55L42 61L45 51L37 45H47L50 35Z"
                fill="#ffd700"
              />
            </svg>
          </div>

          {/* Parlayan Noktalar */}
          <div
            className="absolute w-2 h-2 bg-amber-400 rounded-full animate-ping"
            style={{ top: '0', left: '50%', transform: 'translateX(-50%)' }}
          />
          <div
            className="absolute w-2 h-2 bg-amber-400 rounded-full animate-ping"
            style={{ bottom: '0', left: '50%', transform: 'translateX(-50%)', animationDelay: '0.5s' }}
          />
          <div
            className="absolute w-2 h-2 bg-amber-400 rounded-full animate-ping"
            style={{ top: '50%', left: '0', transform: 'translateY(-50%)', animationDelay: '1s' }}
          />
          <div
            className="absolute w-2 h-2 bg-amber-400 rounded-full animate-ping"
            style={{ top: '50%', right: '0', transform: 'translateY(-50%)', animationDelay: '1.5s' }}
          />
        </div>

        {/* Mesajlar */}
        <p className="text-amber-400 font-bold text-lg mb-2">{message}</p>
        {submessage && (
          <p className="text-slate-500 text-sm">{submessage}</p>
        )}

        {/* Yükleniyor Noktaları */}
        <div className="flex items-center justify-center gap-1 mt-6">
          <div
            className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"
            style={{ animationDelay: '0s' }}
          />
          <div
            className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"
            style={{ animationDelay: '0.15s' }}
          />
          <div
            className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"
            style={{ animationDelay: '0.3s' }}
          />
        </div>
      </div>
    </div>
  );
}