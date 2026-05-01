// components/menu/AuthScreen.tsx
'use client';

import { useState } from 'react';
import { signUp, signIn, getProfile } from '@/lib/supabase';
import { useAuthStore, useUIStore } from '@/lib/store';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { setUser } = useAuthStore();
  const { showNotification } = useUIStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // Giriş
        const { data, error: authError } = await signIn(email, password);

        if (authError) {
          if (authError.message.includes('Invalid login')) {
            setError('E-posta veya şifre hatalı!');
          } else if (authError.message.includes('Email not confirmed')) {
            setError('E-posta adresinizi onaylayın! Gelen kutunuzu kontrol edin.');
          } else {
            setError(authError.message);
          }
          setIsLoading(false);
          return;
        }

        if (data.user) {
          const { data: profile } = await getProfile(data.user.id);
          if (profile) {
            setUser({
              id: profile.id,
              email: profile.email,
              username: profile.username,
              created_at: profile.created_at,
              achievements: profile.achievements || [],
              total_wins: profile.total_wins || 0,
              total_games: profile.total_games || 0,
              total_conquests: profile.total_conquests || 0,
            });
            showNotification(`Hoş geldin, ${profile.username}! ⚔️`, 'success');
          }
        }
      } else {
        // Kayıt
        if (username.length < 3) {
          setError('Kullanıcı adı en az 3 karakter olmalıdır.');
          setIsLoading(false);
          return;
        }

        if (username.length > 20) {
          setError('Kullanıcı adı en fazla 20 karakter olabilir.');
          setIsLoading(false);
          return;
        }

        if (password.length < 6) {
          setError('Şifre en az 6 karakter olmalıdır.');
          setIsLoading(false);
          return;
        }

        const { data, error: authError } = await signUp(email, password, username);

        if (authError) {
          if (authError.message.includes('already registered')) {
            setError('Bu e-posta zaten kayıtlı!');
          } else if (authError.message.includes('valid email')) {
            setError('Geçerli bir e-posta adresi girin.');
          } else if (authError.message.includes('least 6')) {
            setError('Şifre en az 6 karakter olmalıdır.');
          } else {
            setError(authError.message);
          }
          setIsLoading(false);
          return;
        }

        if (data.user) {
          // Otomatik giriş yapılabiliyorsa
          if (data.session) {
            const { data: profile } = await getProfile(data.user.id);
            if (profile) {
              setUser({
                id: profile.id,
                email: profile.email,
                username: profile.username,
                created_at: profile.created_at,
                achievements: profile.achievements || [],
                total_wins: profile.total_wins || 0,
                total_games: profile.total_games || 0,
                total_conquests: profile.total_conquests || 0,
              });
              showNotification(`Hesabın oluşturuldu! Hoş geldin, ${username}! 🎉`, 'success');
            }
          } else {
            // E-posta onayı gerekiyorsa
            setSuccessMessage('Hesabın oluşturuldu! E-posta adresine onay linki gönderildi. Lütfen kontrol et.');
            setIsLogin(true);
          }
        }
      }
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      console.error(err);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-military-pattern bg-grid-pattern flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mb-4 animate-float">
            <svg
              width="80"
              height="80"
              viewBox="0 0 100 100"
              className="mx-auto animate-glow"
            >
              <path
                d="M50 5C50 5 20 15 10 25V55C10 80 50 95 50 95C50 95 90 80 90 55V25C80 15 50 5 50 5Z"
                fill="rgba(255,215,0,0.1)"
                stroke="#ffd700"
                strokeWidth="2"
              />
              <path
                d="M50 15C50 15 28 22 20 30V52C20 72 50 85 50 85C50 85 80 72 80 52V30C72 22 50 15 50 15Z"
                fill="rgba(255,215,0,0.05)"
                stroke="#ffd700"
                strokeWidth="1"
                opacity="0.5"
              />
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
              <path
                d="M50 35L53 45H63L55 51L58 61L50 55L42 61L45 51L37 45H47L50 35Z"
                fill="#ffd700"
              />
            </svg>
          </div>
          <h1 className="logo-text text-2xl mb-1">Kare Savaşları</h1>
          <p className="logo-subtitle text-xs">Strateji & Fetih Oyunu</p>
        </div>

        {/* Form Kartı */}
        <div className="glass rounded-2xl p-8">
          {/* Tab Seçimi */}
          <div className="flex mb-8 bg-slate-800/50 rounded-xl p-1">
            <button
              onClick={() => {
                setIsLogin(true);
                setError('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${
                isLogin
                  ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              ⚔️ Giriş Yap
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${
                !isLogin
                  ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              🛡️ Kayıt Ol
            </button>
          </div>

          {/* Başarı Mesajı */}
          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
              ✅ {successMessage}
            </div>
          )}

          {/* Hata Mesajı */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm animate-shake">
              ❌ {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Kullanıcı Adı (Sadece Kayıt) */}
            {!isLogin && (
              <div className="animate-fade-in">
                <label className="block text-slate-400 text-sm font-medium mb-2">
                  👤 Kullanıcı Adı
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Komutan ismin..."
                  className="input-field"
                  required
                  minLength={3}
                  maxLength={20}
                />
                <p className="text-slate-600 text-xs mt-1">
                  Bu isim profilinde görünecek (3-20 karakter)
                </p>
              </div>
            )}

            {/* E-posta */}
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">
                📧 E-posta
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                className="input-field"
                required
              />
            </div>

            {/* Şifre */}
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">
                🔒 Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                required
                minLength={6}
              />
              {!isLogin && (
                <p className="text-slate-600 text-xs mt-1">En az 6 karakter</p>
              )}
            </div>

            {/* Gönder Butonu */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-4 text-base flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin-slow">⚔️</span>
                  <span>İşleniyor...</span>
                </>
              ) : isLogin ? (
                <>
                  <span>⚔️</span>
                  <span>Savaş Alanına Gir</span>
                </>
              ) : (
                <>
                  <span>🛡️</span>
                  <span>Komutan Ol</span>
                </>
              )}
            </button>
          </form>

          {/* Alt Bilgi */}
          <div className="mt-6 text-center">
            <p className="text-slate-600 text-xs">
              {isLogin ? (
                <>
                  Hesabın yok mu?{' '}
                  <button
                    onClick={() => {
                      setIsLogin(false);
                      setError('');
                    }}
                    className="text-amber-400 hover:text-amber-300 font-bold"
                  >
                    Kayıt Ol
                  </button>
                </>
              ) : (
                <>
                  Zaten hesabın var mı?{' '}
                  <button
                    onClick={() => {
                      setIsLogin(true);
                      setError('');
                    }}
                    className="text-amber-400 hover:text-amber-300 font-bold"
                  >
                    Giriş Yap
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Alt Logo */}
        <div className="mt-8 text-center text-slate-700 text-xs">
          <p>⚔️ Strateji. Şans. Zafer. ⚔️</p>
        </div>
      </div>
    </div>
  );
}