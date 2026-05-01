// components/game/ProductionPanel.tsx
'use client';

import { useState } from 'react';
import { GameState, GamePlayer, ProductionAction, ProductionType } from '@/lib/types';
import { validateProduction } from '@/lib/gameEngine';

interface ProductionPanelProps {
  gameState: GameState;
  currentPlayer: GamePlayer;
  onProduce: (action: ProductionAction) => void;
  onCancel: () => void;
}

export default function ProductionPanel({
  gameState,
  currentPlayer,
  onProduce,
  onCancel,
}: ProductionPanelProps) {
  const { settings } = gameState;

  const [productionType, setProductionType] = useState<ProductionType>(
    currentPlayer.fleet_ban_turns > 0 ? 'air_force' : 'fleet'
  );
  const [amount, setAmount] = useState(1);
  const [coinChoice, setCoinChoice] = useState<'sword' | 'shield'>('sword');

  const isFleetBanned = currentPlayer.fleet_ban_turns > 0;
  const isAirBanned = currentPlayer.air_ban_turns > 0;

  const maxAmount = productionType === 'fleet'
    ? settings.max_fleet_production
    : settings.max_air_production;

  const currentCount = productionType === 'fleet'
    ? currentPlayer.fleet_count
    : currentPlayer.air_force_count;

  const isBanned = productionType === 'fleet' ? isFleetBanned : isAirBanned;
  const banTurns = productionType === 'fleet'
    ? currentPlayer.fleet_ban_turns
    : currentPlayer.air_ban_turns;

  const penaltyTurns = productionType === 'fleet' ? 2 : 3;

  // Doğrulama
  const action: ProductionAction = {
    player_id: currentPlayer.id,
    type: productionType,
    amount,
    coin_choice: coinChoice,
  };

  const validation = validateProduction(gameState, action);

  const handleProduce = () => {
    if (!validation.valid) return;
    onProduce(action);
  };

  return (
    <div className="glass rounded-2xl p-6 animate-slide-up">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
          <span>🏭</span> Üretim Merkezi
        </h3>
        <button onClick={onCancel} className="btn-icon text-sm">
          ✕
        </button>
      </div>

      {/* Mevcut Güçler */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card-gold rounded-xl p-3 text-center">
          <p className="text-2xl mb-1">🚢</p>
          <p className="text-xl font-black text-amber-400">{currentPlayer.fleet_count}</p>
          <p className="text-slate-500 text-xs">Donanma</p>
          {isFleetBanned && (
            <p className="text-red-400 text-xs mt-1 font-bold">
              🚫 {currentPlayer.fleet_ban_turns} tur yasak
            </p>
          )}
        </div>
        <div className="card-gold rounded-xl p-3 text-center">
          <p className="text-2xl mb-1">✈️</p>
          <p className="text-xl font-black text-amber-400">{currentPlayer.air_force_count}</p>
          <p className="text-slate-500 text-xs">Hava Kuvveti</p>
          {isAirBanned && (
            <p className="text-red-400 text-xs mt-1 font-bold">
              🚫 {currentPlayer.air_ban_turns} tur yasak
            </p>
          )}
        </div>
      </div>

      {/* Üretim Türü Seçimi */}
      <div className="mb-6">
        <p className="text-slate-400 text-sm font-medium mb-3">Üretim Türü</p>
        <div className="grid grid-cols-2 gap-3">
          {/* Donanma */}
          <button
            onClick={() => {
              if (!isFleetBanned) {
                setProductionType('fleet');
                setAmount(Math.min(amount, settings.max_fleet_production));
              }
            }}
            disabled={isFleetBanned}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
              isFleetBanned
                ? 'border-red-500/30 bg-red-500/5 opacity-50 cursor-not-allowed'
                : productionType === 'fleet'
                ? 'border-blue-400 bg-blue-400/10'
                : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
            }`}
          >
            <span className="text-3xl">{isFleetBanned ? '🚫' : '🚢'}</span>
            <span className={`font-bold text-sm ${
              isFleetBanned
                ? 'text-red-400'
                : productionType === 'fleet'
                ? 'text-blue-400'
                : 'text-slate-400'
            }`}>
              DONANMA
            </span>
            {isFleetBanned && (
              <span className="text-red-400 text-xs">
                {currentPlayer.fleet_ban_turns} tur kaldı
              </span>
            )}
            {!isFleetBanned && (
              <span className="text-slate-500 text-xs">
                Maks {settings.max_fleet_production} birim
              </span>
            )}
          </button>

          {/* Hava Kuvveti */}
          <button
            onClick={() => {
              if (!isAirBanned) {
                setProductionType('air_force');
                setAmount(Math.min(amount, settings.max_air_production));
              }
            }}
            disabled={isAirBanned}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
              isAirBanned
                ? 'border-red-500/30 bg-red-500/5 opacity-50 cursor-not-allowed'
                : productionType === 'air_force'
                ? 'border-amber-400 bg-amber-400/10'
                : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
            }`}
          >
            <span className="text-3xl">{isAirBanned ? '🚫' : '✈️'}</span>
            <span className={`font-bold text-sm ${
              isAirBanned
                ? 'text-red-400'
                : productionType === 'air_force'
                ? 'text-amber-400'
                : 'text-slate-400'
            }`}>
              HAVA KUVVETİ
            </span>
            {isAirBanned && (
              <span className="text-red-400 text-xs">
                {currentPlayer.air_ban_turns} tur kaldı
              </span>
            )}
            {!isAirBanned && (
              <span className="text-slate-500 text-xs">
                Maks {settings.max_air_production} birim
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Miktar */}
      {!isBanned && (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 text-sm font-medium">
                Üretim Miktarı
              </p>
              <span className="text-amber-400 font-bold text-lg">{amount}</span>
            </div>
            <input
              type="range"
              min={1}
              max={maxAmount}
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value))}
              className={`w-full ${productionType === 'fleet' ? 'accent-blue-500' : 'accent-amber-500'}`}
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>1</span>
              <span>{maxAmount}</span>
            </div>
          </div>

          {/* Sonuç Özeti */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Başarılı */}
            <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20">
              <p className="text-green-400 text-xs font-bold mb-2">✅ Başarılı olursa:</p>
              <p className="text-white text-sm">
                {productionType === 'fleet' ? '🚢' : '✈️'} {currentCount} → {currentCount + amount}
              </p>
              <p className="text-green-400 text-xs mt-1">
                +{amount} {productionType === 'fleet' ? 'donanma' : 'hava kuvveti'}
              </p>
            </div>

            {/* Başarısız */}
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <p className="text-red-400 text-xs font-bold mb-2">❌ Başarısız olursa:</p>
              <p className="text-white text-sm">
                🚫 {penaltyTurns} tur üretim yasağı
              </p>
              <p className="text-red-400 text-xs mt-1">
                {productionType === 'fleet' ? 'Donanma' : 'Hava kuvveti'} üretemezsiniz
              </p>
            </div>
          </div>

          {/* Madalyon Seçimi */}
          <div className="mb-6">
            <p className="text-slate-400 text-sm font-medium mb-3">🪙 Madalyon Seçimi</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCoinChoice('sword')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  coinChoice === 'sword'
                    ? 'border-amber-400 bg-amber-400/10'
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                }`}
              >
                <span className="text-3xl">⚔️</span>
                <span className={`font-bold text-sm ${coinChoice === 'sword' ? 'text-amber-400' : 'text-slate-400'}`}>
                  KILIÇ
                </span>
              </button>
              <button
                onClick={() => setCoinChoice('shield')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  coinChoice === 'shield'
                    ? 'border-amber-400 bg-amber-400/10'
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                }`}
              >
                <span className="text-3xl">🛡️</span>
                <span className={`font-bold text-sm ${coinChoice === 'shield' ? 'text-amber-400' : 'text-slate-400'}`}>
                  KALKAN
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Her iki üretim de yasaklıysa */}
      {isFleetBanned && isAirBanned && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-6 text-center">
          <span className="text-3xl block mb-2">🚫</span>
          <p className="text-red-400 font-bold">Tüm üretimler yasaklı!</p>
          <p className="text-slate-500 text-xs mt-1">
            Donanma: {currentPlayer.fleet_ban_turns} tur • Hava: {currentPlayer.air_ban_turns} tur
          </p>
        </div>
      )}

      {/* Hata */}
      {!validation.valid && !isBanned && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4 animate-shake">
          <p className="text-red-400 text-xs">❌ {validation.error}</p>
        </div>
      )}

      {/* Butonlar */}
      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-secondary flex-1">
          ← Geri
        </button>
        <button
          onClick={handleProduce}
          disabled={!validation.valid || isBanned}
          className={`flex-1 flex items-center justify-center gap-2 ${
            productionType === 'fleet'
              ? 'btn-primary'
              : 'btn-primary'
          }`}
        >
          <span>🏭</span>
          <span>
            {isBanned ? 'YASAKLI' : 'ÜRET!'}
          </span>
        </button>
      </div>
    </div>
  );
}