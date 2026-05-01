// components/menu/RoomSetup.tsx
'use client';

import { useState } from 'react';
import { useAuthStore, useRoomStore, useUIStore } from '@/lib/store';
import { createRoom, joinRoom } from '@/lib/supabase';
import { DEFAULT_ROOM_SETTINGS, RoomSettings, Difficulty, COUNTRY_COLORS } from '@/lib/types';

interface RoomSetupProps {
  mode: 'solo' | 'create';
  onBack: () => void;
  onStart: (roomId: string) => void;
}

export default function RoomSetup({ mode, onBack, onStart }: RoomSetupProps) {
  const { user } = useAuthStore();
  const { updateSettings } = useRoomStore();
  const { showNotification } = useUIStore();

  const [settings, setSettings] = useState<RoomSettings>({ ...DEFAULT_ROOM_SETTINGS });
  const [roomName, setRoomName] = useState(`${user?.username || 'Oyuncu'}'nin Odası`);
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState(user?.username || '');
  const [countryName, setCountryName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSettingChange = (key: keyof RoomSettings, value: number | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleCreate = async () => {
    if (!user) return;

    if (!nickname.trim()) {
      showNotification('Komutan ismi boş olamaz!', 'error');
      return;
    }

    if (!countryName.trim()) {
      showNotification('Ülke ismi boş olamaz!', 'error');
      return;
    }

    if (mode === 'create' && !roomName.trim()) {
      showNotification('Oda ismi boş olamaz!', 'error');
      return;
    }

    setIsCreating(true);

    try {
      const finalSettings = {
        ...settings,
        player_count: mode === 'solo' ? 1 : settings.player_count,
      };

      const { data: room, error } = await createRoom(
        mode === 'solo' ? `${nickname} - Solo` : roomName,
        user.id,
        finalSettings,
        password || undefined
      );

      if (error) {
        showNotification('Oda oluşturulamadı: ' + error.message, 'error');
        setIsCreating(false);
        return;
      }

      if (room) {
        // Odaya katıl
        const { error: joinError } = await joinRoom(
          room.id,
          user.id,
          nickname,
          countryName,
          COUNTRY_COLORS[0]
        );

        if (joinError) {
          showNotification('Odaya katılınamadı: ' + joinError.message, 'error');
          setIsCreating(false);
          return;
        }

        updateSettings(finalSettings);
        onStart(room.id);
      }
    } catch (err) {
      showNotification('Bir hata oluştu!', 'error');
      console.error(err);
    }

    setIsCreating(false);
  };

  return (
    <div className="min-h-screen bg-military-pattern bg-grid-pattern flex items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-fade-in">
        {/* Üst Bar */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="btn-icon">
            ←
          </button>
          <h1 className="text-2xl font-bold text-amber-400">
            {mode === 'solo' ? '🤖 Tek Başına Oyna' : '🏠 Oda Oluştur'}
          </h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Sol Panel - Oyuncu Bilgileri */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span>👤</span> Oyuncu Bilgileri
            </h2>

            <div className="space-y-5">
              {/* Oda İsmi (Sadece Oda Oluştur) */}
              {mode === 'create' && (
                <div>
                  <label className="block text-slate-400 text-sm font-medium mb-2">
                    🏠 Oda İsmi
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Oda ismi..."
                    className="input-field"
                    maxLength={30}
                  />
                </div>
              )}

              {/* Komutan İsmi */}
              <div>
                <label className="block text-slate-400 text-sm font-medium mb-2">
                  ⚔️ Komutan İsmi (Nickname)
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Komutan ismin..."
                  className="input-field"
                  maxLength={20}
                />
              </div>

              {/* Ülke İsmi */}
              <div>
                <label className="block text-slate-400 text-sm font-medium mb-2">
                  🏳️ Ülke İsmi
                </label>
                <input
                  type="text"
                  value={countryName}
                  onChange={(e) => setCountryName(e.target.value)}
                  placeholder="Ülkenin adı..."
                  className="input-field"
                  maxLength={25}
                />
              </div>

              {/* Şifre (Sadece Oda Oluştur) */}
              {mode === 'create' && (
                <div>
                  <label className="block text-slate-400 text-sm font-medium mb-2">
                    🔒 Oda Şifresi (Opsiyonel)
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Boş bırakılırsa şifresiz olur"
                    className="input-field"
                    maxLength={20}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sağ Panel - Oyun Ayarları */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span>⚙️</span> Oyun Ayarları
            </h2>

            <div className="space-y-5">
              {/* Zorluk */}
              <div>
                <label className="block text-slate-400 text-sm font-medium mb-2">
                  🎚️ Zorluk Modu
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => handleSettingChange('difficulty', diff)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                        settings.difficulty === diff
                          ? diff === 'easy'
                            ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                            : diff === 'medium'
                            ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400'
                            : 'bg-red-500/20 border border-red-500/50 text-red-400'
                          : 'bg-slate-800/50 border border-slate-700 text-slate-500 hover:text-white'
                      }`}
                    >
                      {diff === 'easy' ? '😊 Kolay' : diff === 'medium' ? '😐 Orta' : '😈 Zor'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Oyuncu & Robot Sayısı */}
              {mode === 'create' && (
                <div>
                  <label className="block text-slate-400 text-sm font-medium mb-2">
                    👥 Oyuncu Sayısı: {settings.player_count}
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={8}
                    value={settings.player_count}
                    onChange={(e) => handleSettingChange('player_count', parseInt(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                  <div className="flex justify-between text-xs text-slate-600 mt-1">
                    <span>2</span>
                    <span>8</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-400 text-sm font-medium mb-2">
                  🤖 Robot Sayısı: {settings.robot_count}
                </label>
                <input
                  type="range"
                  min={mode === 'solo' ? 1 : 0}
                  max={7}
                  value={settings.robot_count}
                  onChange={(e) => handleSettingChange('robot_count', parseInt(e.target.value))}
                  className="w-full accent-amber-400"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>{mode === 'solo' ? 1 : 0}</span>
                  <span>7</span>
                </div>
              </div>

              {/* Tur Süresi */}
              <div>
                <label className="block text-slate-400 text-sm font-medium mb-2">
                  ⏱️ Tur Süresi: {settings.turn_timer}sn
                </label>
                <input
                  type="range"
                  min={15}
                  max={120}
                  step={15}
                  value={settings.turn_timer}
                  onChange={(e) => handleSettingChange('turn_timer', parseInt(e.target.value))}
                  className="w-full accent-amber-400"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>15sn</span>
                  <span>120sn</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alt Panel - Saldırı & Üretim Limitleri */}
        <div className="glass rounded-2xl p-6 mt-6">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <span>⚔️</span> Saldırı & Üretim Limitleri
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Karadan Maks Saldırı */}
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-2">
                🏔️ Kara Saldırı Limiti
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={30}
                  value={settings.max_land_attack}
                  onChange={(e) => handleSettingChange('max_land_attack', Math.min(30, Math.max(5, parseInt(e.target.value) || 5)))}
                  className="input-field text-center text-sm"
                />
              </div>
            </div>

            {/* Denizden Maks Saldırı */}
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-2">
                🚢 Deniz Saldırı Limiti
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={3}
                  max={20}
                  value={settings.max_sea_attack}
                  onChange={(e) => handleSettingChange('max_sea_attack', Math.min(20, Math.max(3, parseInt(e.target.value) || 3)))}
                  className="input-field text-center text-sm"
                />
              </div>
            </div>

            {/* Havadan Maks Saldırı */}
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-2">
                ✈️ Hava Saldırı Limiti
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={2}
                  max={15}
                  value={settings.max_air_attack}
                  onChange={(e) => handleSettingChange('max_air_attack', Math.min(15, Math.max(2, parseInt(e.target.value) || 2)))}
                  className="input-field text-center text-sm"
                />
              </div>
            </div>

            {/* Maks Donanma Üretimi */}
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-2">
                🚢 Donanma Üretim Limiti
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={3}
                  max={15}
                  value={settings.max_fleet_production}
                  onChange={(e) => handleSettingChange('max_fleet_production', Math.min(15, Math.max(3, parseInt(e.target.value) || 3)))}
                  className="input-field text-center text-sm"
                />
              </div>
            </div>

            {/* Maks Hava Kuvveti Üretimi */}
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-2">
                ✈️ Hava Kuvveti Üretim Limiti
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={settings.max_air_production}
                  onChange={(e) => handleSettingChange('max_air_production', Math.min(12, Math.max(2, parseInt(e.target.value) || 2)))}
                  className="input-field text-center text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Özet ve Başlat */}
        <div className="glass rounded-2xl p-6 mt-6">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="badge badge-gold">
              {settings.difficulty === 'easy' ? '😊 Kolay' : settings.difficulty === 'medium' ? '😐 Orta' : '😈 Zor'}
            </span>
            <span className="badge badge-blue">
              ⏱️ {settings.turn_timer}sn
            </span>
            {mode === 'create' && (
              <span className="badge badge-green">
                👥 {settings.player_count} Oyuncu
              </span>
            )}
            <span className="badge badge-red">
              🤖 {settings.robot_count} Robot
            </span>
            {password && (
              <span className="badge badge-gold">
                🔒 Şifreli
              </span>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={onBack}
              className="btn-secondary flex-1"
            >
              ← Geri
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating || !nickname.trim() || !countryName.trim()}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <span className="animate-spin-slow">⚔️</span>
                  <span>Hazırlanıyor...</span>
                </>
              ) : mode === 'solo' ? (
                <>
                  <span>⚔️</span>
                  <span>Savaşı Başlat!</span>
                </>
              ) : (
                <>
                  <span>🏠</span>
                  <span>Oda Oluştur</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}