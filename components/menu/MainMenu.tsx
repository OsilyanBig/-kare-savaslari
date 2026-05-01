// components/menu/MainMenu.tsx
'use client';

import { useState } from 'react';
import { useAuthStore, useUIStore } from '@/lib/store';
import { signOut } from '@/lib/supabase';
import HowToPlay from './HowToPlay';
import Achievements from './Achievements';

interface MainMenuProps {
  onSoloPlay: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export default function MainMenu({ onSoloPlay, onCreateRoom, onJoinRoom }: MainMenuProps) {
  const { user, logout } = useAuthStore();
  const { showHowToPlay, showAchievements, setShowHowToPlay, setShowAchievements } = useUIStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
    logout();
    setIsLoggingOut(false);
  };

  return (
    <div className="min-h-screen bg-military-pattern bg-grid-pattern flex flex-col items-center justify-center p-4">
      {/* Üst Bar - Kullanıcı Bilgisi */}
      <div className="fixed top-4 right-4 flex items-center gap-3 z-10">
        {user && (
          <div className="glass rounded-xl px-4 py-2 flex items-center gap-3">
            <div className="text-right">
              <p className="text-amber-400 font-bold text-sm">{user.username}</p>
              <p className="text-slate-500 text-xs">
                🏆 {user.total_wins} Zafer | 🎮 {user.total_games} Oyun
              </p>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="btn-icon text-sm"
              title="Çıkış Yap"
            >
              🚪
            </button>
          </div>
        )}
      </div>

      {/* Logo ve Başlık */}
      <div className="text-center mb-12 animate-fade-in">
        {/* Logo SVG */}
        <div className="mb-6 animate-float">
          <div className="relative inline-block">
            <svg
              width="100"
              height="100"
              viewBox="0 0 100 100"
              className="animate-glow"
            >
              {/* Kalkan Şekli */}
              <path
                d="M50 5C50 5 20 15 10 25V55C10 80 50 95 50 95C50 95 90 80 90 55V25C80 15 50 5 50 5Z"
                fill="rgba(255,215,0,0.1)"
                stroke="#ffd700"
                strokeWidth="2"
              />
              {/* İç Kalkan */}
              <path
                d="M50 15C50 15 28 22 20 30V52C20 72 50 85 50 85C50 85 80 72 80 52V30C72 22 50 15 50 15Z"
                fill="rgba(255,215,0,0.05)"
                stroke="#ffd700"
                strokeWidth="1"
                opacity="0.5"
              />
              {/* Kılıçlar */}
              <path
                d="M35 30L50 55L45 60L40 55L35 30Z"
                fill="#ffd700"
                opacity="0.8"
              />
              <path
                d="M65 30L50 55L55 60L60 55L65 30Z"
                fill="#ffd700"
                opacity="0.8"
              />
              {/* Yıldız */}
              <path
                d="M50 35L53 45H63L55 51L58 61L50 55L42 61L45 51L37 45H47L50 35Z"
                fill="#ffd700"
              />
              {/* Grid Çizgileri */}
              <line x1="30" y1="45" x2="70" y2="45" stroke="#ffd700" strokeWidth="0.5" opacity="0.3" />
              <line x1="30" y1="55" x2="70" y2="55" stroke="#ffd700" strokeWidth="0.5" opacity="0.3" />
              <line x1="40" y1="30" x2="40" y2="70" stroke="#ffd700" strokeWidth="0.5" opacity="0.3" />
              <line x1="50" y1="25" x2="50" y2="75" stroke="#ffd700" strokeWidth="0.5" opacity="0.3" />
              <line x1="60" y1="30" x2="60" y2="70" stroke="#ffd700" strokeWidth="0.5" opacity="0.3" />
            </svg>
          </div>
        </div>

        <h1 className="logo-text mb-2">Kare Savaşları</h1>
        <p className="logo-subtitle">Strateji & Fetih Oyunu</p>
      </div>

      {/* Ana Menü Butonları */}
      <div className="w-full max-w-md space-y-4 animate-slide-up">
        {/* Nasıl Oynanır */}
        <button
          onClick={() => setShowHowToPlay(true)}
          className="w-full glass rounded-2xl p-4 flex items-center gap-4 hover:border-amber-400/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            📖
          </div>
          <div className="text-left">
            <p className="font-bold text-white group-hover:text-amber-400 transition-colors">
              Nasıl Oynanır?
            </p>
            <p className="text-slate-500 text-sm">Kuralları öğren, strateji geliştir</p>
          </div>
          <span className="ml-auto text-slate-600 group-hover:text-amber-400 transition-colors">→</span>
        </button>

        {/* Başarılar */}
        <button
          onClick={() => setShowAchievements(true)}
          className="w-full glass rounded-2xl p-4 flex items-center gap-4 hover:border-amber-400/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            🏆
          </div>
          <div className="text-left">
            <p className="font-bold text-white group-hover:text-amber-400 transition-colors">
              Başarılar
            </p>
            <p className="text-slate-500 text-sm">
              {user?.achievements?.length || 0} / 12 başarı kazanıldı
            </p>
          </div>
          <span className="ml-auto text-slate-600 group-hover:text-amber-400 transition-colors">→</span>
        </button>

        {/* Ayırıcı */}
        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
          <span className="text-amber-400/50 text-xs font-bold uppercase tracking-widest">Oyna</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
        </div>

        {/* Tek Başına Oyna */}
        <button
          onClick={onSoloPlay}
          className="w-full btn-primary text-lg py-5 rounded-2xl flex items-center justify-center gap-3"
        >
          <span className="text-2xl">🤖</span>
          <span>Tek Başına Oyna</span>
        </button>

        {/* Oda Oluştur */}
        <button
          onClick={onCreateRoom}
          className="w-full btn-success text-lg py-5 rounded-2xl flex items-center justify-center gap-3"
        >
          <span className="text-2xl">🏠</span>
          <span>Oda Oluştur</span>
        </button>

        {/* Odaya Katıl */}
        <button
          onClick={onJoinRoom}
          className="w-full btn-secondary text-lg py-5 rounded-2xl flex items-center justify-center gap-3"
        >
          <span className="text-2xl">🚪</span>
          <span>Odaya Katıl</span>
        </button>

        {/* Yakında Gelecekler */}
        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600/30 to-transparent" />
          <span className="text-slate-600 text-xs font-bold uppercase tracking-widest">Yakında</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600/30 to-transparent" />
        </div>

        {/* Hikaye Modu - Yakında */}
        <button
          disabled
          className="w-full glass rounded-2xl p-4 flex items-center gap-4 opacity-50 cursor-not-allowed relative overflow-hidden"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl">
            📕
          </div>
          <div className="text-left">
            <p className="font-bold text-white">Hikaye Modu</p>
            <p className="text-slate-500 text-sm">Epik maceralar seni bekliyor</p>
          </div>
          <span className="badge badge-gold ml-auto">Yakında</span>
        </button>

        {/* Shop - Yakında */}
        <button
          disabled
          className="w-full glass rounded-2xl p-4 flex items-center gap-4 opacity-50 cursor-not-allowed relative overflow-hidden"
        >
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl">
            🛒
          </div>
          <div className="text-left">
            <p className="font-bold text-white">Mağaza</p>
            <p className="text-slate-500 text-sm">Özel görünümler ve efektler</p>
          </div>
          <span className="badge badge-gold ml-auto">Yakında</span>
        </button>
      </div>

      {/* Alt Bilgi */}
      <div className="mt-12 text-center text-slate-600 text-xs animate-fade-in">
        <p>Kare Savaşları v1.0 • Ortaokul efsanesi dijitalde!</p>
        <p className="mt-1">⚔️ Strateji. Şans. Zafer. ⚔️</p>
      </div>

      {/* Modals */}
      {showHowToPlay && <HowToPlay onClose={() => setShowHowToPlay(false)} />}
      {showAchievements && <Achievements onClose={() => setShowAchievements(false)} />}
    </div>
  );
}