// components/lobby/Lobby.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore, useRoomStore, useUIStore } from '@/lib/store';
import {
  supabase,
  getRoomPlayers,
  getRoom,
  updateRoom,
  leaveRoom,
  deleteRoom,
  sendMessage,
  getChatMessages,
} from '@/lib/supabase';
import { COUNTRY_COLORS, QUICK_EMOJIS, ChatMessage } from '@/lib/types';

interface LobbyProps {
  roomId: string;
  onBack: () => void;
  onGameStart: (roomId: string) => void;
}

interface LobbyPlayer {
  id: string;
  user_id: string;
  nickname: string;
  country_name: string;
  color: string;
  is_robot: boolean;
  is_ready: boolean;
}

export default function Lobby({ roomId, onBack, onGameStart }: LobbyProps) {
  const { user } = useAuthStore();
  const { showNotification } = useUIStore();
  const { currentRoom, setCurrentRoom } = useRoomStore();

  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showBanConfirm, setShowBanConfirm] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Verileri yükle
  useEffect(() => {
    loadData();
    setupSubscriptions();

    return () => {
      supabase.removeAllChannels();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Chat scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    setIsLoading(true);

    // Oda bilgisi
    const { data: roomData } = await getRoom(roomId);
    if (roomData) {
      setCurrentRoom(roomData);
      setIsHost(roomData.host_id === user?.id);

      // Oyun başlamışsa yönlendir
      if (roomData.status === 'playing') {
        onGameStart(roomId);
        return;
      }
    }

    // Oyuncular
    const { data: playersData } = await getRoomPlayers(roomId);
    if (playersData) {
      setPlayers(playersData as LobbyPlayer[]);
    }

    // Mesajlar
    const { data: messagesData } = await getChatMessages(roomId);
    if (messagesData) {
      setMessages(messagesData.map(m => ({
        id: m.id,
        room_id: m.room_id,
        player_id: m.player_id,
        player_nickname: m.player_nickname,
        player_color: m.player_color,
        message: m.message,
        is_emoji: m.is_emoji,
        timestamp: new Date(m.created_at).getTime(),
      })));
    }

    setIsLoading(false);
  };

  const setupSubscriptions = () => {
    // Oda değişiklikleri
    supabase
      .channel(`lobby-room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          const newData = payload.new as Record<string, unknown>;
          if (newData) {
            setCurrentRoom(newData as unknown as typeof currentRoom);
            if (newData.status === 'playing') {
              onGameStart(roomId);
            }
          }
        }
      )
      .subscribe();

    // Oyuncu değişiklikleri
    supabase
      .channel(`lobby-players:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        () => {
          loadPlayers();
        }
      )
      .subscribe();

    // Chat mesajları
    supabase
      .channel(`lobby-chat:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newMsg = payload.new as Record<string, unknown>;
          if (newMsg) {
            const chatMsg: ChatMessage = {
              id: newMsg.id as string,
              room_id: newMsg.room_id as string,
              player_id: newMsg.player_id as string,
              player_nickname: newMsg.player_nickname as string,
              player_color: (newMsg.player_color as string) || '#ffffff',
              message: newMsg.message as string,
              is_emoji: newMsg.is_emoji as boolean,
              timestamp: new Date(newMsg.created_at as string).getTime(),
            };
            setMessages(prev => [...prev, chatMsg]);
          }
        }
      )
      .subscribe();
  };

  const loadPlayers = async () => {
    const { data } = await getRoomPlayers(roomId);
    if (data) {
      setPlayers(data as LobbyPlayer[]);
    }
  };

  // Mesaj gönder
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const myPlayer = players.find(p => p.user_id === user.id);
    const nickname = myPlayer?.nickname || user.username;
    const color = myPlayer?.color || '#ffd700';

    await sendMessage(roomId, user.id, nickname, color, newMessage.trim(), false);
    setNewMessage('');
  };

  // Emoji gönder
  const handleSendEmoji = async (emoji: string) => {
    if (!user) return;

    const myPlayer = players.find(p => p.user_id === user.id);
    const nickname = myPlayer?.nickname || user.username;
    const color = myPlayer?.color || '#ffd700';

    await sendMessage(roomId, user.id, nickname, color, emoji, true);
    setShowEmojiPicker(false);
  };

  // Oyuncuyu at
  const handleKickPlayer = async (playerId: string) => {
    await leaveRoom(roomId, playerId);
    await supabase
      .from('rooms')
      .update({ current_players: Math.max(1, players.length - 1) })
      .eq('id', roomId);
    showNotification('Oyuncu atıldı!', 'info');
  };

  // Oyuncuyu banla
  const handleBanPlayer = async (playerId: string) => {
    const { data: roomData } = await getRoom(roomId);
    if (roomData) {
      const bannedList = roomData.banned_players || [];
      bannedList.push(playerId);
      await updateRoom(roomId, { banned_players: bannedList });
    }
    await handleKickPlayer(playerId);
    showNotification('Oyuncu banlandı!', 'warning');
    setShowBanConfirm(null);
  };

  // Lobi ayrıl
  const handleLeave = async () => {
    if (!user) return;

    if (isHost) {
      // Host ayrılırsa odayı sil
      await deleteRoom(roomId);
      showNotification('Oda silindi.', 'info');
    } else {
      await leaveRoom(roomId, user.id);
      await supabase
        .from('rooms')
        .update({ current_players: Math.max(0, players.length - 1) })
        .eq('id', roomId);
    }

    onBack();
  };

  // Oyunu başlat
  const handleStartGame = async () => {
    if (!isHost) return;

    const totalPlayers = players.length;
    const settings = (currentRoom?.settings || {}) as { robot_count?: number };
    const robotCount = settings.robot_count || 0;

    if (totalPlayers + robotCount < 2) {
      showNotification('Oyun başlatmak için en az 2 oyuncu/robot gerekli!', 'error');
      return;
    }

    await updateRoom(roomId, { status: 'playing' });
    showNotification('Oyun başlıyor! ⚔️', 'success');
  };

  const roomSettings = (currentRoom?.settings || {}) as {
    difficulty?: string;
    player_count?: number;
    robot_count?: number;
    turn_timer?: number;
    max_land_attack?: number;
    max_sea_attack?: number;
    max_air_attack?: number;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-military-pattern bg-grid-pattern flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl animate-spin-slow inline-block mb-4">⚔️</span>
          <p className="text-slate-400 text-lg">Lobi yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-military-pattern bg-grid-pattern p-4">
      <div className="max-w-6xl mx-auto animate-fade-in">
        {/* Üst Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={handleLeave} className="btn-icon">
              ←
            </button>
            <div>
              <h1 className="text-xl font-bold text-amber-400">
                {currentRoom?.name || 'Lobi'}
              </h1>
              <p className="text-slate-500 text-sm">
                Oda ID: {roomId.slice(0, 8)}...
              </p>
            </div>
          </div>

          {isHost && (
            <button
              onClick={handleStartGame}
              className="btn-primary flex items-center gap-2 animate-pulse-gold"
            >
              <span>⚔️</span>
              <span>Oyunu Başlat!</span>
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sol Panel - Oyuncular */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>👥</span>
                <span>Oyuncular</span>
                <span className="badge badge-gold ml-auto">
                  {players.length}/{roomSettings.player_count || 4}
                </span>
              </h2>

              <div className="space-y-3">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50"
                  >
                    {/* Renk */}
                    <div
                      className="color-dot"
                      style={{ backgroundColor: player.color }}
                    />

                    {/* Bilgi */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white text-sm truncate">
                          {player.nickname}
                        </p>
                        {player.user_id === currentRoom?.host_id && (
                          <span className="text-amber-400 text-xs">👑</span>
                        )}
                        {player.is_robot && (
                          <span className="text-xs">🤖</span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs truncate">
                        {player.country_name}
                      </p>
                    </div>

                    {/* Host Aksiyonları */}
                    {isHost && player.user_id !== user?.id && !player.is_robot && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleKickPlayer(player.user_id)}
                          className="text-slate-500 hover:text-red-400 transition-colors text-sm p-1"
                          title="At"
                        >
                          👢
                        </button>
                        <button
                          onClick={() => setShowBanConfirm(player.user_id)}
                          className="text-slate-500 hover:text-red-400 transition-colors text-sm p-1"
                          title="Banla"
                        >
                          🚫
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Robot bilgisi */}
                {(roomSettings.robot_count || 0) > 0 && (
                  <div className="text-center py-2">
                    <p className="text-slate-600 text-xs">
                      🤖 {roomSettings.robot_count} robot oyun başladığında eklenecek
                    </p>
                  </div>
                )}

                {/* Boş slotlar */}
                {Array.from({
                  length: Math.max(0, (roomSettings.player_count || 4) - players.length),
                }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-700/50 opacity-40"
                  >
                    <div className="color-dot bg-slate-700" />
                    <p className="text-slate-600 text-sm">Bekleniyor...</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Oda Ayarları */}
            <div className="glass rounded-2xl p-6 mt-4">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>⚙️</span> Ayarlar
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Zorluk</span>
                  <span className="text-white font-bold">
                    {roomSettings.difficulty === 'easy' ? '😊 Kolay' : roomSettings.difficulty === 'hard' ? '😈 Zor' : '😐 Orta'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tur Süresi</span>
                  <span className="text-white font-bold">⏱️ {roomSettings.turn_timer || 60}sn</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kara Saldırı</span>
                  <span className="text-white font-bold">🏔️ Maks {roomSettings.max_land_attack || 30}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Deniz Saldırı</span>
                  <span className="text-white font-bold">🚢 Maks {roomSettings.max_sea_attack || 15}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hava Saldırı</span>
                  <span className="text-white font-bold">✈️ Maks {roomSettings.max_air_attack || 10}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sağ Panel - Chat */}
          <div className="lg:col-span-2">
            <div className="glass rounded-2xl p-6 h-[600px] flex flex-col">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span>💬</span> Lobi Sohbeti
              </h2>

              {/* Mesajlar */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="text-3xl block mb-2">💬</span>
                    <p className="text-slate-600 text-sm">Henüz mesaj yok. İlk mesajı sen yaz!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.player_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isMe
                              ? 'bg-amber-400/10 border border-amber-400/20'
                              : 'bg-slate-800/80 border border-slate-700/50'
                          }`}
                        >
                          {!isMe && (
                            <p
                              className="text-xs font-bold mb-1"
                              style={{ color: msg.player_color }}
                            >
                              {msg.player_nickname}
                            </p>
                          )}
                          <p
                            className={`${
                              msg.is_emoji ? 'text-3xl text-center' : 'text-sm text-slate-300'
                            }`}
                          >
                            {msg.message}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Mesaj Gönder */}
              <div className="relative">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="btn-icon flex-shrink-0"
                  >
                    😀
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Mesaj yaz..."
                    className="input-field flex-1"
                    maxLength={200}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="btn-primary px-6"
                  >
                    Gönder
                  </button>
                </form>

                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 mb-2 glass rounded-xl p-3 grid grid-cols-6 gap-2 animate-slide-up">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleSendEmoji(emoji)}
                        className="text-2xl hover:scale-125 transition-transform p-1"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ban Onay Modal */}
        {showBanConfirm && (
          <div className="modal-overlay" onClick={() => setShowBanConfirm(null)}>
            <div className="modal-content" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-red-400 mb-4">🚫 Oyuncuyu Banla</h3>
              <p className="text-slate-400 text-sm mb-6">
                Bu oyuncuyu banlarsanız bir daha bu odaya katılamaz. Emin misiniz?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBanConfirm(null)}
                  className="btn-secondary flex-1"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleBanPlayer(showBanConfirm)}
                  className="btn-danger flex-1"
                >
                  🚫 Banla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bekleme Bilgisi */}
        {!isHost && (
          <div className="mt-6 text-center animate-pulse">
            <p className="text-slate-500 text-sm">
              ⏳ Host oyunu başlatmasını bekliyor...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}