// components/game/PlayerSidebar.tsx
'use client';

import { GameState, GamePlayer } from '@/lib/types';

interface PlayerSidebarProps {
  gameState: GameState;
  currentPlayerId: string;
  onSurrender: () => void;
  showSurrenderConfirm: boolean;
  setShowSurrenderConfirm: (show: boolean) => void;
}

export default function PlayerSidebar({
  gameState,
  currentPlayerId,
  onSurrender,
  showSurrenderConfirm,
  setShowSurrenderConfirm,
}: PlayerSidebarProps) {
  const { players, current_turn_player_id } = gameState;

  // Oyuncuları sırala: canlılar önce, toprak sayısına göre
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.is_alive && !b.is_alive) return -1;
    if (!a.is_alive && b.is_alive) return 1;
    return b.territories - a.territories;
  });

  const myPlayer = players.find(p => p.id === currentPlayerId);
  const totalLand = players.reduce((sum, p) => sum + p.territories, 0);

  return (
    <div className="glass rounded-2xl p-4 flex flex-col h-full">
      {/* Başlık */}
      <h3 className="font-bold text-amber-400 flex items-center gap-2 mb-4 text-sm">
        <span>🏰</span> Ülkeler
      </h3>

      {/* Benim Bilgilerim */}
      {myPlayer && myPlayer.is_alive && (
        <div className="mb-4 p-3 rounded-xl border-2 border-amber-400/30 bg-amber-400/5">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="color-dot"
              style={{
                backgroundColor: myPlayer.color,
                width: '14px',
                height: '14px',
              }}
            />
            <span className="font-bold text-amber-400 text-sm truncate">
              {myPlayer.country_name}
            </span>
            <span className="text-amber-400/50 text-xs">👑</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-black text-white">{myPlayer.territories}</p>
              <p className="text-[10px] text-slate-500">📦 Kare</p>
            </div>
            <div>
              <p className="text-lg font-black text-blue-400">{myPlayer.fleet_count}</p>
              <p className="text-[10px] text-slate-500">🚢 Donanma</p>
            </div>
            <div>
              <p className="text-lg font-black text-amber-400">{myPlayer.air_force_count}</p>
              <p className="text-[10px] text-slate-500">✈️ Hava</p>
            </div>
          </div>

          {/* Üretim Yasakları */}
          {(myPlayer.fleet_ban_turns > 0 || myPlayer.air_ban_turns > 0) && (
            <div className="mt-2 pt-2 border-t border-amber-400/10 flex gap-2">
              {myPlayer.fleet_ban_turns > 0 && (
                <span className="badge badge-red text-[10px]">
                  🚢 {myPlayer.fleet_ban_turns} tur yasak
                </span>
              )}
              {myPlayer.air_ban_turns > 0 && (
                <span className="badge badge-red text-[10px]">
                  ✈️ {myPlayer.air_ban_turns} tur yasak
                </span>
              )}
            </div>
          )}

          {/* Toprak Yüzdesi */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>Dünya Hakimiyeti</span>
              <span className="text-amber-400 font-bold">
                {totalLand > 0 ? Math.round((myPlayer.territories / totalLand) * 100) : 0}%
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${totalLand > 0 ? (myPlayer.territories / totalLand) * 100 : 0}%`,
                  backgroundColor: myPlayer.color,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tüm Oyuncular */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
        {sortedPlayers.map((player, index) => {
          const isMe = player.id === currentPlayerId;
          const isTurn = player.id === current_turn_player_id;
          const landPercent = totalLand > 0 ? (player.territories / totalLand) * 100 : 0;

          if (isMe) return null; // Zaten üstte gösterdik

          return (
            <div
              key={player.id}
              className={`p-3 rounded-xl transition-all ${
                !player.is_alive
                  ? 'bg-slate-800/20 border border-slate-700/20 opacity-50'
                  : isTurn
                  ? 'bg-slate-800/50 border border-slate-600/50'
                  : 'bg-slate-800/30 border border-slate-700/30'
              }`}
            >
              {/* Üst Satır */}
              <div className="flex items-center gap-2 mb-1">
                {/* Sıra */}
                <span className="text-[10px] text-slate-600 w-4">
                  #{index + 1}
                </span>

                {/* Renk */}
                <div
                  className="color-dot flex-shrink-0"
                  style={{
                    backgroundColor: player.is_alive ? player.color : '#475569',
                  }}
                />

                {/* İsim */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className={`font-bold text-xs truncate ${
                      player.is_alive ? 'text-white' : 'text-slate-600 line-through'
                    }`}>
                      {player.country_name}
                    </p>
                    {player.is_robot && <span className="text-[10px]">🤖</span>}
                    {isTurn && player.is_alive && (
                      <span className="text-amber-400 text-[10px] animate-pulse">⚔️</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-600 truncate">
                    {player.nickname}
                  </p>
                </div>

                {/* Durum */}
                {!player.is_alive && (
                  <span className="text-[10px]">
                    {player.is_surrendered ? '🏳️' : '💀'}
                  </span>
                )}
              </div>

              {/* İstatistikler */}
              {player.is_alive && (
                <>
                  <div className="flex gap-3 text-[10px] text-slate-500 mb-1">
                    <span>📦 {player.territories}</span>
                    <span>🚢 {player.fleet_count}</span>
                    <span>✈️ {player.air_force_count}</span>
                  </div>

                  {/* Toprak Çubuğu */}
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${landPercent}%`,
                        backgroundColor: player.color,
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Teslim Ol Butonu */}
      {myPlayer && myPlayer.is_alive && (
        <div className="mt-4 pt-4 border-t border-slate-700/30">
          {!showSurrenderConfirm ? (
            <button
              onClick={() => setShowSurrenderConfirm(true)}
              className="w-full py-2 px-4 rounded-xl text-xs font-bold text-slate-500 hover:text-red-400 border border-slate-700/30 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
            >
              🏳️ Teslim Ol
            </button>
          ) : (
            <div className="space-y-2 animate-fade-in">
              <p className="text-red-400 text-xs text-center font-bold">
                Emin misiniz? Tüm topraklarınız paylaştırılacak!
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSurrenderConfirm(false)}
                  className="btn-secondary flex-1 text-xs py-2"
                >
                  İptal
                </button>
                <button
                  onClick={onSurrender}
                  className="btn-danger flex-1 text-xs py-2"
                >
                  🏳️ Teslim Ol
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Elendiyse Mesaj */}
      {myPlayer && !myPlayer.is_alive && (
        <div className="mt-4 pt-4 border-t border-slate-700/30 text-center">
          <p className="text-slate-600 text-xs">
            {myPlayer.is_surrendered ? '🏳️ Teslim oldunuz' : '💀 Elendiniz'}
          </p>
          <p className="text-slate-700 text-[10px] mt-1">
            İzleyici olarak devam ediyorsunuz
          </p>
        </div>
      )}
    </div>
  );
}