// components/menu/RoomList.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuthStore, useUIStore } from '@/lib/store';
import { getRooms, joinRoom, supabase } from '@/lib/supabase';
import { Room, COUNTRY_COLORS } from '@/lib/types';

interface RoomListProps {
  onBack: () => void;
  onJoin: (roomId: string) => void;
}

export default function RoomList({ onBack, onJoin }: RoomListProps) {
  const { user } = useAuthStore();
  const { showNotification } = useUIStore();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [nickname, setNickname] = useState(user?.username || '');
  const [countryName, setCountryName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Odaları yükle
  const loadRooms = async () => {
    setIsLoading(true);
    const { data, error } = await getRooms();
    if (data) {
      setRooms(data as Room[]);
    }
    if (error) {
      showNotification('Odalar yüklenemedi!', 'error');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadRooms();

    // Realtime oda güncellemeleri
    const channel = supabase
      .channel('rooms-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        () => {
          loadRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectRoom = (room: Room) => {
    setSelectedRoom(room);
    setShowJoinModal(true);
    setRoomPassword('');
  };

  const handleJoinRoom = async () => {
    if (!user || !selectedRoom) return;

    if (!nickname.trim()) {
      showNotification('Komutan ismi boş olamaz!', 'error');
      return;
    }

    if (!countryName.trim()) {
      showNotification('Ülke ismi boş olamaz!', 'error');
      return;
    }

    // Şifre kontrolü
    if (selectedRoom.has_password) {
      if (!roomPassword.trim()) {
        showNotification('Bu oda şifreli! Şifre girin.', 'error');
        return;
      }
    }

    setIsJoining(true);

    try {
      // Şifre doğrulama (basit kontrol)
      if (selectedRoom.has_password) {
        const { data: roomData } = await supabase
          .from('rooms')
          .select('password_hash')
          .eq('id', selectedRoom.id)
          .single();

        if (roomData?.password_hash !== roomPassword) {
          showNotification('Şifre yanlış!', 'error');
          setIsJoining(false);
          return;
        }
      }

      // Ban kontrolü
      const { data: roomData } = await supabase
        .from('rooms')
        .select('banned_players')
        .eq('id', selectedRoom.id)
        .single();

      if (roomData?.banned_players?.includes(user.id)) {
        showNotification('Bu odadan banlanmışsınız!', 'error');
        setIsJoining(false);
        return;
      }

      // Mevcut oyuncu sayısını kontrol et
      const settings = selectedRoom.settings as { player_count?: number };
      if (selectedRoom.current_players >= (settings?.player_count || 8)) {
        showNotification('Oda dolu!', 'error');
        setIsJoining(false);
        return;
      }

      // Renk seç (mevcut oyuncuların kullanmadığı)
      const { data: existingPlayers } = await supabase
        .from('room_players')
        .select('color')
        .eq('room_id', selectedRoom.id);

      const usedColors = existingPlayers?.map(p => p.color) || [];
      const availableColor = COUNTRY_COLORS.find(c => !usedColors.includes(c)) || COUNTRY_COLORS[0];

      const { error: joinError } = await joinRoom(
        selectedRoom.id,
        user.id,
        nickname,
        countryName,
        availableColor
      );

      if (joinError) {
        if (joinError.message.includes('duplicate')) {
          showNotification('Zaten bu odadasınız!', 'warning');
          onJoin(selectedRoom.id);
        } else {
          showNotification('Katılınamadı: ' + joinError.message, 'error');
        }
        setIsJoining(false);
        return;
      }

      // Oda oyuncu sayısını güncelle
      await supabase
        .from('rooms')
        .update({ current_players: (selectedRoom.current_players || 1) + 1 })
        .eq('id', selectedRoom.id);

      showNotification('Odaya katıldınız! ⚔️', 'success');
      onJoin(selectedRoom.id);
    } catch (err) {
      showNotification('Bir hata oluştu!', 'error');
      console.error(err);
    }

    setIsJoining(false);
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return <span className="badge badge-green">😊 Kolay</span>;
      case 'medium':
        return <span className="badge badge-gold">😐 Orta</span>;
      case 'hard':
        return <span className="badge badge-red">😈 Zor</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-military-pattern bg-grid-pattern flex items-center justify-center p-4">
      <div className="w-full max-w-3xl animate-fade-in">
        {/* Üst Bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="btn-icon">
              ←
            </button>
            <h1 className="text-2xl font-bold text-amber-400">
              🚪 Odaya Katıl
            </h1>
          </div>
          <button
            onClick={loadRooms}
            className="btn-icon"
            title="Yenile"
          >
            🔄
          </button>
        </div>

        {/* Oda Listesi */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="glass rounded-2xl p-12 text-center">
              <span className="text-4xl animate-spin-slow inline-block mb-4">⚔️</span>
              <p className="text-slate-400">Odalar yükleniyor...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <span className="text-4xl mb-4 block">🏜️</span>
              <p className="text-slate-400 text-lg mb-2">Henüz açık oda yok</p>
              <p className="text-slate-600 text-sm">
                İlk odayı sen oluşturabilirsin!
              </p>
            </div>
          ) : (
            rooms.map((room) => {
              const settings = room.settings as {
                difficulty?: string;
                player_count?: number;
                robot_count?: number;
                turn_timer?: number;
              };

              return (
                <button
                  key={room.id}
                  onClick={() => handleSelectRoom(room)}
                  className="w-full glass rounded-2xl p-5 flex items-center gap-4 hover:border-amber-400/30 transition-all group text-left"
                >
                  {/* Oda İkonu */}
                  <div className="w-14 h-14 rounded-xl bg-amber-400/10 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
                    {room.has_password ? '🔒' : '🏠'}
                  </div>

                  {/* Oda Bilgileri */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                        {room.name}
                      </p>
                      {room.has_password && (
                        <span className="text-amber-400 text-xs">🔒</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getDifficultyBadge(settings?.difficulty || 'medium')}
                      <span className="badge badge-blue">
                        ⏱️ {settings?.turn_timer || 60}sn
                      </span>
                      {(settings?.robot_count || 0) > 0 && (
                        <span className="badge" style={{
                          background: 'rgba(148, 163, 184, 0.15)',
                          color: '#94a3b8',
                          border: '1px solid rgba(148, 163, 184, 0.3)',
                        }}>
                          🤖 {settings?.robot_count}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Oyuncu Sayısı */}
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-2xl font-black text-amber-400">
                        {room.current_players}
                      </span>
                      <span className="text-slate-600 text-lg">/</span>
                      <span className="text-slate-500 text-lg">
                        {settings?.player_count || 4}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs">Oyuncu</p>
                  </div>

                  {/* Ok */}
                  <span className="text-slate-600 group-hover:text-amber-400 transition-colors text-xl flex-shrink-0">
                    →
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Katılma Modal */}
        {showJoinModal && selectedRoom && (
          <div className="modal-overlay" onClick={(e) => {
            if (e.target === e.currentTarget) setShowJoinModal(false);
          }}>
            <div className="modal-content" style={{ maxWidth: '450px' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-amber-400">
                  🚪 Odaya Katıl
                </h2>
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="btn-icon"
                >
                  ✕
                </button>
              </div>

              {/* Oda Bilgisi */}
              <div className="card-gold rounded-xl p-4 mb-6">
                <p className="font-bold text-white">{selectedRoom.name}</p>
                <p className="text-slate-400 text-sm mt-1">
                  {selectedRoom.current_players} / {(selectedRoom.settings as { player_count?: number })?.player_count || 4} Oyuncu
                </p>
              </div>

              <div className="space-y-4">
                {/* Komutan İsmi */}
                <div>
                  <label className="block text-slate-400 text-sm font-medium mb-2">
                    ⚔️ Komutan İsmi
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

                {/* Şifre */}
                {selectedRoom.has_password && (
                  <div>
                    <label className="block text-slate-400 text-sm font-medium mb-2">
                      🔒 Oda Şifresi
                    </label>
                    <input
                      type="password"
                      value={roomPassword}
                      onChange={(e) => setRoomPassword(e.target.value)}
                      placeholder="Şifreyi girin..."
                      className="input-field"
                    />
                  </div>
                )}
              </div>

              {/* Butonlar */}
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="btn-secondary flex-1"
                >
                  İptal
                </button>
                <button
                  onClick={handleJoinRoom}
                  disabled={isJoining || !nickname.trim() || !countryName.trim()}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isJoining ? (
                    <>
                      <span className="animate-spin-slow">⚔️</span>
                      <span>Katılınıyor...</span>
                    </>
                  ) : (
                    <>
                      <span>⚔️</span>
                      <span>Katıl</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}