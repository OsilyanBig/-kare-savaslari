// components/game/TurnIndicator.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { GamePlayer } from '@/lib/types';

interface TurnIndicatorProps {
  currentTurnPlayer: GamePlayer;
  isMyTurn: boolean;
  turnNumber: number;
  turnTimer: number;
  turnStartTime: number;
  onTimeUp: () => void;
}

export default function TurnIndicator({
  currentTurnPlayer,
  isMyTurn,
  turnNumber,
  turnTimer,
  turnStartTime,
  onTimeUp,
}: TurnIndicatorProps) {
  const [timeLeft, setTimeLeft] = useState(turnTimer);

  const calculateTimeLeft = useCallback(() => {
    const elapsed = Math.floor((Date.now() - turnStartTime) / 1000);
    const remaining = Math.max(0, turnTimer - elapsed);
    return remaining;
  }, [turnTimer, turnStartTime]);

  useEffect(() => {
    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (isMyTurn) {
          onTimeUp();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateTimeLeft, isMyTurn, onTimeUp]);

  const timerPercent = (timeLeft / turnTimer) * 100;
  const timerClass = timeLeft > turnTimer * 0.5
    ? 'safe'
    : timeLeft > turnTimer * 0.2
    ? 'warning'
    : 'danger';

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass rounded-2xl p-4 animate-fade-in">
      {/* Tur Numarası */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-sm font-bold">⚔️ Tur {turnNumber}</span>
        </div>
        <div className={`text-lg font-black ${
          timeLeft <= turnTimer * 0.2 ? 'text-red-400 animate-pulse' : 'text-white'
        }`}>
          ⏱️ {formatTime(timeLeft)}
        </div>
      </div>

      {/* Zamanlayıcı Çubuğu */}
      <div className="timer-bar mb-3">
        <div
          className={`timer-fill ${timerClass}`}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      {/* Kimin Turu */}
      <div className="flex items-center gap-3">
        <div
          className="color-dot"
          style={{
            backgroundColor: currentTurnPlayer.color,
            width: '16px',
            height: '16px',
          }}
        />
        <div className="flex-1">
          <p className={`font-bold text-sm ${isMyTurn ? 'text-amber-400' : 'text-white'}`}>
            {isMyTurn ? '🎯 Senin Turun!' : currentTurnPlayer.nickname}
          </p>
          <p className="text-slate-500 text-xs">
            {currentTurnPlayer.country_name}
          </p>
        </div>
        <div className={`turn-indicator ${isMyTurn ? 'my-turn' : 'waiting'}`}>
          {isMyTurn ? 'OYNA' : 'BEKLİYOR'}
        </div>
      </div>

      {/* Sıra bilgisi - benim turum değilse */}
      {!isMyTurn && (
        <div className="mt-3 pt-3 border-t border-slate-700/30">
          <p className="text-slate-600 text-xs text-center">
            ⏳ {currentTurnPlayer.is_robot ? 'Robot düşünüyor...' : `${currentTurnPlayer.nickname} oynuyor...`}
          </p>
        </div>
      )}
    </div>
  );
}