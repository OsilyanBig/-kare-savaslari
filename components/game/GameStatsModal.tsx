// components/game/GameStatsModal.tsx
'use client';

import { GameState } from '@/lib/types';
import { calculateGameStats, GameStats } from '@/lib/gameEngine';
import Modal from '../ui/Modal';

interface GameStatsModalProps {
  gameState: GameState;
  currentPlayerId: string;
  onClose: () => void;
  onBackToMenu: () => void;
}

export default function GameStatsModal({
  gameState,
  currentPlayerId,
  onClose,
  onBackToMenu,
}: GameStatsModalProps) {
  const stats = calculateGameStats(gameState);
  const winner = stats.find(s => s.is_winner);
  const isWinner = winner?.player_id === currentPlayerId;

  return (
    <Modal isOpen={true} onClose={onClose} maxWidth="800px" showClose={false}>
      <div className="text-center mb-8 animate-fade-in">
        {/* Zafer / Yenilgi Başlığı */}
        <div className="mb-4">
          <span className="text-6xl block mb-3">
            {isWinner ? '👑' : '⚔️'}
          </span>
          <h2 className="text-3xl font-black text-amber-400 mb-2">
            {isWinner ? 'ZAFER!' : 'OYUN BİTTİ!'}
          </h2>
          {winner && (
            <p className="text-slate-400">
              {isWinner ? 'Dünyayı fethettiniz!' : (
                <>
                  <span
                    className="font-bold"
                    style={{ color: winner.color }}
                  >
                    {winner.country_name}
                  </span>
                  {' '}dünyayı fethetti!
                </>
              )}
            </p>
          )}
        </div>

        {/* Tur Bilgisi */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50">
          <span className="text-slate-400 text-sm">Toplam</span>
          <span className="text-amber-400 font-bold">{gameState.turn_number}</span>
          <span className="text-slate-400 text-sm">tur oynandı</span>
        </div>
      </div>

      {/* Sıralama Tablosu */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>🏆</span> Sıralama
        </h3>

        <div className="space-y-2">
          {stats.map((stat, index) => (
            <StatRow
              key={stat.player_id}
              stat={stat}
              index={index}
              isMe={stat.player_id === currentPlayerId}
            />
          ))}
        </div>
      </div>

      {/* Detaylı İstatistikler - Benim */}
      {(() => {
        const myStat = stats.find(s => s.player_id === currentPlayerId);
        if (!myStat) return null;

        return (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>📊</span> Senin İstatistiklerin
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon="⚔️"
                label="Toplam Saldırı"
                value={myStat.total_attacks}
              />
              <StatCard
                icon="✅"
                label="Başarılı"
                value={myStat.successful_attacks}
                color="text-green-400"
              />
              <StatCard
                icon="❌"
                label="Başarısız"
                value={myStat.failed_attacks}
                color="text-red-400"
              />
              <StatCard
                icon="🏰"
                label="Fethedilen"
                value={myStat.territories_conquered}
                color="text-amber-400"
              />
              <StatCard
                icon="💔"
                label="Kaybedilen"
                value={myStat.territories_lost}
                color="text-red-400"
              />
              <StatCard
                icon="🚢"
                label="Donanma Üretimi"
                value={myStat.fleet_produced}
                color="text-blue-400"
              />
              <StatCard
                icon="✈️"
                label="Hava Üretimi"
                value={myStat.air_force_produced}
                color="text-cyan-400"
              />
              <StatCard
                icon="💀"
                label="Ülke Elenen"
                value={myStat.countries_eliminated}
                color="text-purple-400"
              />
            </div>

            {/* Başarı Oranı */}
            {myStat.total_attacks > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Saldırı Başarı Oranı</span>
                  <span className="text-amber-400 font-bold">
                    {Math.round((myStat.successful_attacks / myStat.total_attacks) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                    style={{
                      width: `${(myStat.successful_attacks / myStat.total_attacks) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Savaş Özeti */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>📜</span> Savaş Özeti
        </h3>

        <div className="grid grid-cols-3 gap-3">
          <div className="card-gold rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-amber-400">
              {gameState.battle_log.filter(l => l.action_type === 'attack').length}
            </p>
            <p className="text-slate-500 text-xs mt-1">Toplam Savaş</p>
          </div>
          <div className="card-gold rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-green-400">
              {gameState.battle_log.filter(l => l.action_type === 'attack' && l.success).length}
            </p>
            <p className="text-slate-500 text-xs mt-1">Başarılı Saldırı</p>
          </div>
          <div className="card-gold rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-blue-400">
              {gameState.battle_log.filter(l => l.action_type === 'produce' && l.success).length}
            </p>
            <p className="text-slate-500 text-xs mt-1">Başarılı Üretim</p>
          </div>
        </div>
      </div>

      {/* Butonlar */}
      <div className="flex gap-4">
        <button
          onClick={onBackToMenu}
          className="btn-primary flex-1 py-4 text-base flex items-center justify-center gap-2"
        >
          <span>🏠</span>
          <span>Ana Menüye Dön</span>
        </button>
      </div>
    </Modal>
  );
}

// Sıralama Satırı
function StatRow({
  stat,
  index,
  isMe,
}: {
  stat: GameStats;
  index: number;
  isMe: boolean;
}) {
  const getMedalIcon = () => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `#${index + 1}`;
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
        stat.is_winner
          ? 'bg-amber-400/10 border-2 border-amber-400/30'
          : isMe
          ? 'bg-blue-500/10 border border-blue-500/20'
          : 'bg-slate-800/30 border border-slate-700/30'
      }`}
    >
      {/* Sıra */}
      <span className="text-lg w-8 text-center">
        {getMedalIcon()}
      </span>

      {/* Renk */}
      <div
        className="color-dot"
        style={{ backgroundColor: stat.color }}
      />

      {/* İsim */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-bold text-sm truncate ${
            stat.is_winner ? 'text-amber-400' : 'text-white'
          }`}>
            {stat.country_name}
          </p>
          {isMe && (
            <span className="text-[10px] text-blue-400">(Sen)</span>
          )}
          {stat.is_winner && (
            <span className="text-sm">👑</span>
          )}
        </div>
        <p className="text-slate-500 text-xs truncate">
          {stat.nickname}
        </p>
      </div>

      {/* İstatistikler */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span title="Kare">📦 {stat.final_territories}</span>
        <span title="Saldırı">⚔️ {stat.total_attacks}</span>
        <span title="Fetih">🏰 {stat.territories_conquered}</span>
      </div>
    </div>
  );
}

// İstatistik Kartı
function StatCard({
  icon,
  label,
  value,
  color = 'text-white',
}: {
  icon: string;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center">
      <span className="text-lg block">{icon}</span>
      <p className={`text-xl font-black ${color} mt-1`}>{value}</p>
      <p className="text-slate-500 text-[10px] mt-1">{label}</p>
    </div>
  );
}