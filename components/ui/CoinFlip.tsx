// components/ui/CoinFlip.tsx
'use client';

import { useState, useEffect } from 'react';

interface CoinFlipProps {
  choice: 'sword' | 'shield';
  result: 'sword' | 'shield';
  success: boolean;
  onComplete: () => void;
  isMyAction?: boolean;
  attackerName?: string;
  defenderName?: string;
}

export default function CoinFlip({
  choice,
  result,
  success,
  onComplete,
  isMyAction = true,
  attackerName,
  defenderName,
}: CoinFlipProps) {
  const [phase, setPhase] = useState<'waiting' | 'flipping' | 'result'>('waiting');
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setPhase('flipping');
    }, isMyAction ? 500 : 200);

    const flipTimer = setTimeout(() => {
      setPhase('result');
      setShowResult(true);
    }, isMyAction ? 2800 : 1500);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, isMyAction ? 4500 : 2500);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(flipTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, isMyAction]);

  // Başkasının coin flip'i - küçük köşe gösterimi
  if (!isMyAction) {
    return (
      <div className="fixed bottom-4 right-4 z-40 animate-slide-up">
        <div className="glass rounded-2xl p-4 w-64 border border-amber-400/20">
          {/* Başlık */}
          <div className="flex items-center gap-2 mb-3">
            <div className="coin-container" style={{ width: '40px', height: '40px' }}>
              <div
                className={`coin ${
                  phase === 'flipping'
                    ? result === 'sword'
                      ? 'coin-result-sword'
                      : 'coin-result-shield'
                    : ''
                }`}
                style={{ width: '40px', height: '40px' }}
              >
                <div className="coin-face coin-front" style={{ fontSize: '18px', borderWidth: '2px' }}>
                  ⚔️
                </div>
                <div className="coin-face coin-back" style={{ fontSize: '18px', borderWidth: '2px' }}>
                  🛡️
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 truncate">
                {attackerName || 'Rakip'}
              </p>
              {defenderName && (
                <p className="text-[10px] text-slate-600 truncate">
                  → {defenderName}
                </p>
              )}
            </div>
          </div>

          {/* Sonuç */}
          {showResult && (
            <div className="flex items-center gap-2 animate-fade-in">
              <span className="text-lg">
                {result === 'sword' ? '⚔️' : '🛡️'}
              </span>
              <span
                className={`text-xs font-bold ${
                  success ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {success ? 'Başarılı!' : 'Başarısız!'}
              </span>
            </div>
          )}

          {/* Bekleme */}
          {phase === 'flipping' && (
            <p className="text-amber-400 text-[10px] animate-pulse">
              Madalyon havada...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Benim coin flip'im - tam ekran
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-filter backdrop-blur-sm">
      <div className="text-center animate-fade-in">
        {/* Seçim Bilgisi */}
        <div className="mb-8">
          <p className="text-slate-400 text-sm uppercase tracking-widest mb-2">
            Seçimin
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-3xl">
              {choice === 'sword' ? '⚔️' : '🛡️'}
            </span>
            <span className="text-xl font-bold text-amber-400">
              {choice === 'sword' ? 'KILIÇ' : 'KALKAN'}
            </span>
          </div>
        </div>

        {/* Coin */}
        <div className="coin-container mb-8">
          <div
            className={`coin ${
              phase === 'flipping'
                ? result === 'sword'
                  ? 'coin-result-sword'
                  : 'coin-result-shield'
                : ''
            }`}
          >
            <div className="coin-face coin-front">
              <div className="flex flex-col items-center">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path d="M24 4L28 8L26 24L30 28L28 30L24 26L20 30L18 28L22 24L20 8L24 4Z" fill="#0a1628" stroke="#0a1628" strokeWidth="1" />
                  <path d="M18 32L24 26L30 32L28 34L24 30L20 34L18 32Z" fill="#0a1628" />
                  <rect x="22" y="34" width="4" height="8" rx="1" fill="#0a1628" />
                  <circle cx="24" cy="44" r="2" fill="#0a1628" />
                </svg>
              </div>
            </div>
            <div className="coin-face coin-back">
              <div className="flex flex-col items-center">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path d="M24 4C24 4 12 8 8 12V24C8 36 24 44 24 44C24 44 40 36 40 24V12C36 8 24 4 24 4Z" fill="#0a1628" stroke="#0a1628" strokeWidth="1" />
                  <path d="M24 10C24 10 15 13 12 16V24C12 33 24 39 24 39C24 39 36 33 36 24V16C33 13 24 10 24 10Z" fill="#64748b" stroke="#0a1628" strokeWidth="0.5" />
                  <path d="M24 16L26 22H32L27 26L29 32L24 28L19 32L21 26L16 22H22L24 16Z" fill="#0a1628" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Sonuç */}
        {showResult && (
          <div className="animate-slide-up">
            <div className="mb-4">
              <span className="text-5xl">
                {result === 'sword' ? '⚔️' : '🛡️'}
              </span>
            </div>
            <div
              className={`text-2xl font-black uppercase tracking-wider mb-3 ${
                success ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {success ? '🎉 ZAFER!' : '💀 YENİLGİ!'}
            </div>
            <div className="text-slate-400">
              {result === 'sword' ? 'Kılıç' : 'Kalkan'} geldi!
              {success ? ' Saldırın başarılı!' : ' Savunma galip!'}
            </div>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: success
                  ? 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)',
              }}
            />
          </div>
        )}

        {phase === 'waiting' && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        )}

        {phase === 'flipping' && (
          <p className="text-amber-400 font-bold uppercase tracking-widest animate-pulse mt-4">
            Madalyon Havada...
          </p>
        )}
      </div>
    </div>
  );
}