// components/game/BattleLog.tsx
'use client';

import { BattleLogEntry } from '@/lib/types';

interface BattleLogProps {
  logs: BattleLogEntry[];
  isOpen: boolean;
  onToggle: () => void;
}

export default function BattleLog({ logs, isOpen, onToggle }: BattleLogProps) {
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="btn-icon relative"
        title="Savaş Geçmişi"
      >
        📜
        {logs.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
            {logs.length > 99 ? '99' : logs.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 h-full flex flex-col animate-slide-right">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-amber-400 flex items-center gap-2">
          <span>📜</span> Savaş Geçmişi
        </h3>
        <button onClick={onToggle} className="btn-icon text-sm">
          ✕
        </button>
      </div>

      {/* Log Listesi */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {logs.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-3xl block mb-2">⚔️</span>
            <p className="text-slate-600 text-sm">Henüz savaş yok</p>
            <p className="text-slate-700 text-xs mt-1">İlk hamle yapıldığında burada görünecek</p>
          </div>
        ) : (
          [...logs].reverse().map((log) => (
            <LogEntry key={log.id} log={log} />
          ))
        )}
      </div>

      {/* İstatistik Özeti */}
      {logs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Toplam: {logs.length} aksiyon</span>
            <span>
              ✅ {logs.filter(l => l.success).length} başarılı •{' '}
              ❌ {logs.filter(l => !l.success).length} başarısız
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Tek bir log kaydı
function LogEntry({ log }: { log: BattleLogEntry }) {
  const getActionIcon = () => {
    switch (log.action_type) {
      case 'attack':
        return log.success ? '⚔️' : '🛡️';
      case 'produce':
        return log.success ? '🏭' : '🚫';
      case 'surrender':
        return '🏳️';
      case 'skip':
        return '⏭️';
      default:
        return '❓';
    }
  };

  const getBorderColor = () => {
    if (log.action_type === 'surrender') return 'border-slate-500/30';
    return log.success ? 'border-green-500/30' : 'border-red-500/30';
  };

  const getBgColor = () => {
    if (log.action_type === 'surrender') return 'bg-slate-500/5';
    return log.success ? 'bg-green-500/5' : 'bg-red-500/5';
  };

  return (
    <div className={`p-3 rounded-xl border ${getBorderColor()} ${getBgColor()} transition-all hover:scale-[1.01]`}>
      {/* Üst Satır */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{getActionIcon()}</span>
        <span className="text-xs text-slate-500">Tur {log.turn_number}</span>
        <span className={`ml-auto text-xs font-bold ${log.success ? 'text-green-400' : 'text-red-400'}`}>
          {log.action_type === 'surrender' ? 'TESLİM' : log.success ? 'BAŞARILI' : 'BAŞARISIZ'}
        </span>
      </div>

      {/* Açıklama */}
      <p className="text-xs text-slate-300 leading-relaxed">
        {log.description}
      </p>

      {/* Detaylar */}
      {log.action_type === 'attack' && log.distribution && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {log.distribution.land > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
              🏔️ {log.distribution.land}
            </span>
          )}
          {log.distribution.sea > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              🚢 {log.distribution.sea}
            </span>
          )}
          {log.distribution.air > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              ✈️ {log.distribution.air}
            </span>
          )}
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {log.coin_choice === 'sword' ? '⚔️' : '🛡️'} → {log.coin_result === 'sword' ? '⚔️' : '🛡️'}
          </span>
        </div>
      )}

      {/* Saldırgan ve Savunmacı Renkleri */}
      {log.action_type === 'attack' && (
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: log.attacker_color }}
            />
            <span className="text-[10px] text-slate-500">{log.attacker_name}</span>
          </div>
          <span className="text-slate-600 text-[10px]">→</span>
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: log.defender_color }}
            />
            <span className="text-[10px] text-slate-500">{log.defender_name}</span>
          </div>
        </div>
      )}
    </div>
  );
}