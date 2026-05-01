// components/game/ChatBox.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage, QUICK_EMOJIS } from '@/lib/types';

interface ChatBoxProps {
  messages: ChatMessage[];
  currentPlayerId: string;
  isOpen: boolean;
  unreadCount: number;
  onToggle: () => void;
  onSendMessage: (message: string, isEmoji: boolean) => void;
}

export default function ChatBox({
  messages,
  currentPlayerId,
  isOpen,
  unreadCount,
  onToggle,
  onSendMessage,
}: ChatBoxProps) {
  const [newMessage, setNewMessage] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    onSendMessage(newMessage.trim(), false);
    setNewMessage('');
  };

  const handleEmojiSend = (emoji: string) => {
    onSendMessage(emoji, true);
    setShowEmojis(false);
  };

  // Kapalıyken sadece buton göster
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="btn-icon relative"
        title="Sohbet"
      >
        💬
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 h-full flex flex-col animate-slide-right">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-amber-400 flex items-center gap-2 text-sm">
          <span>💬</span> Sohbet
        </h3>
        <button onClick={onToggle} className="btn-icon text-sm">
          ✕
        </button>
      </div>

      {/* Mesajlar */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <span className="text-2xl block mb-1">💬</span>
            <p className="text-slate-600 text-xs">Mesaj yok</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.player_id === currentPlayerId;

            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                    isMe
                      ? 'bg-amber-400/10 border border-amber-400/20 rounded-br-md'
                      : 'bg-slate-800/80 border border-slate-700/50 rounded-bl-md'
                  }`}
                >
                  {/* İsim */}
                  {!isMe && (
                    <p
                      className="text-[10px] font-bold mb-0.5"
                      style={{ color: msg.player_color }}
                    >
                      {msg.player_nickname}
                    </p>
                  )}

                  {/* Mesaj */}
                  {msg.is_emoji ? (
                    <p className="text-2xl text-center">{msg.message}</p>
                  ) : (
                    <p className="text-xs text-slate-300 break-words">
                      {msg.message}
                    </p>
                  )}

                  {/* Zaman */}
                  <p className={`text-[9px] mt-0.5 ${isMe ? 'text-amber-400/40' : 'text-slate-600'} text-right`}>
                    {new Date(msg.timestamp).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Emoji Picker */}
      {showEmojis && (
        <div className="mb-2 p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 grid grid-cols-6 gap-1 animate-slide-up">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiSend(emoji)}
              className="text-xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-slate-700/50"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Mesaj Gönder */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowEmojis(!showEmojis)}
          className={`btn-icon flex-shrink-0 text-sm ${
            showEmojis ? 'bg-amber-400/20 border-amber-400/40' : ''
          }`}
        >
          😀
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Mesaj..."
          className="input-field flex-1 py-2 text-xs"
          maxLength={150}
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="btn-primary px-3 py-2 text-xs"
        >
          ➤
        </button>
      </form>
    </div>
  );
}