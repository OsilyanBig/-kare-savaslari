// components/menu/Achievements.tsx
'use client';

import { useAuthStore } from '@/lib/store';
import { ACHIEVEMENTS } from '@/lib/types';
import Modal from '../ui/Modal';

interface AchievementsProps {
  onClose: () => void;
}

export default function Achievements({ onClose }: AchievementsProps) {
  const { user } = useAuthStore();
  const userAchievements = user?.achievements || [];
  const unlockedCount = userAchievements.length;
  const totalCount = ACHIEVEMENTS.length;
  const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  return (
    <Modal isOpen={true} onClose={onClose} title="🏆 Başarılar" maxWidth="700px">
      {/* İlerleme Çubuğu */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-400 text-sm">İlerleme</span>
          <span className="text-amber-400 font-bold text-sm">
            {unlockedCount} / {totalCount}
          </span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #ffd700, #f59e0b)',
            }}
          />
        </div>
        {unlockedCount === totalCount && (
          <p className="text-amber-400 text-center text-sm mt-2 animate-pulse">
            🎉 Tüm başarıları kazandın! Efsane!
          </p>
        )}
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="card-gold text-center py-3 px-2">
          <p className="text-2xl font-black text-amber-400">
            {user?.total_wins || 0}
          </p>
          <p className="text-slate-500 text-xs mt-1">Zafer</p>
        </div>
        <div className="card-gold text-center py-3 px-2">
          <p className="text-2xl font-black text-amber-400">
            {user?.total_games || 0}
          </p>
          <p className="text-slate-500 text-xs mt-1">Oyun</p>
        </div>
        <div className="card-gold text-center py-3 px-2">
          <p className="text-2xl font-black text-amber-400">
            {user?.total_conquests || 0}
          </p>
          <p className="text-slate-500 text-xs mt-1">Fetih</p>
        </div>
      </div>

      {/* Başarı Listesi */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = userAchievements.includes(achievement.id);

          return (
            <div
              key={achievement.id}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                isUnlocked
                  ? 'bg-amber-400/10 border border-amber-400/30'
                  : 'bg-slate-800/50 border border-slate-700/50 opacity-60'
              }`}
            >
              {/* İkon */}
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                  isUnlocked
                    ? 'bg-amber-400/20'
                    : 'bg-slate-700/50'
                }`}
              >
                {isUnlocked ? achievement.icon : '🔒'}
              </div>

              {/* Bilgi */}
              <div className="flex-1 min-w-0">
                <p
                  className={`font-bold text-sm ${
                    isUnlocked ? 'text-amber-400' : 'text-slate-500'
                  }`}
                >
                  {achievement.name}
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  {achievement.description}
                </p>
              </div>

              {/* Durum */}
              <div className="flex-shrink-0">
                {isUnlocked ? (
                  <span className="badge badge-gold">
                    ✅ Kazanıldı
                  </span>
                ) : (
                  <span className="badge" style={{
                    background: 'rgba(100, 116, 139, 0.15)',
                    color: '#64748b',
                    border: '1px solid rgba(100, 116, 139, 0.3)',
                  }}>
                    Kilitli
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Alt Bilgi */}
      <div className="mt-6 pt-4 border-t border-slate-700/50 text-center">
        <p className="text-slate-600 text-xs">
          Oyun oynayarak yeni başarılar kazanabilirsin! Her başarı seni daha güçlü yapar. 💪
        </p>
      </div>
    </Modal>
  );
}