// components/game/AttackPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import { GameState, GamePlayer, AttackAction } from '@/lib/types';
import { hasLandBorder, hasSeaBorder } from '@/lib/mapGenerator';
import { validateAttack } from '@/lib/gameEngine';

interface AttackPanelProps {
  gameState: GameState;
  currentPlayer: GamePlayer;
  target: GamePlayer;
  onAttack: (action: AttackAction) => void;
  onCancel: () => void;
}

export default function AttackPanel({
  gameState,
  currentPlayer,
  target,
  onAttack,
  onCancel,
}: AttackPanelProps) {
  const { map, settings } = gameState;

  // Sınır bilgileri
  const landBorder = hasLandBorder(map.cells, map.width, map.height, currentPlayer.id, target.id);
  const seaBorder = hasSeaBorder(map.cells, map.width, map.height, currentPlayer.id, target.id);

  // TOPLAM SALDIRI LİMİTİ = karadan max saldırı limiti (en büyük limit)
  const TOTAL_ATTACK_LIMIT = settings.max_land_attack;

  // Saldırı değerleri
  const [landAmount, setLandAmount] = useState(0);
  const [seaAmount, setSeaAmount] = useState(0);
  const [airAmount, setAirAmount] = useState(0);
  const [coinChoice, setCoinChoice] = useState<'sword' | 'shield'>('sword');
  const [error, setError] = useState('');

  const totalAttack = landAmount + seaAmount + airAmount;
  const remainingAttack = TOTAL_ATTACK_LIMIT - totalAttack;

  // Her bir tür için gerçek max değerler (toplam limit dahil)
  const effectiveMaxLand = landBorder
    ? Math.min(settings.max_land_attack, currentPlayer.territories, TOTAL_ATTACK_LIMIT - seaAmount - airAmount)
    : 0;

  const effectiveMaxSea = seaBorder && currentPlayer.fleet_count > 0
    ? Math.min(settings.max_sea_attack, currentPlayer.fleet_count, TOTAL_ATTACK_LIMIT - landAmount - airAmount)
    : 0;

  const effectiveMaxAir = currentPlayer.air_force_count > 0
    ? Math.min(settings.max_air_attack, currentPlayer.air_force_count, TOTAL_ATTACK_LIMIT - landAmount - seaAmount)
    : 0;

  // Başlangıç değerleri
  useEffect(() => {
    if (landBorder) {
      setLandAmount(Math.min(5, effectiveMaxLand));
    } else if (seaBorder && currentPlayer.fleet_count > 0) {
      setSeaAmount(Math.min(3, effectiveMaxSea));
    } else if (currentPlayer.air_force_count > 0) {
      setAirAmount(Math.min(2, effectiveMaxAir));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bir değer değiştiğinde diğerlerinin limitlerini aşmamasını sağla
  const handleLandChange = (value: number) => {
    const maxAllowed = landBorder
      ? Math.min(settings.max_land_attack, currentPlayer.territories, TOTAL_ATTACK_LIMIT - seaAmount - airAmount)
      : 0;
    setLandAmount(Math.min(value, Math.max(0, maxAllowed)));
  };

  const handleSeaChange = (value: number) => {
    const maxAllowed = seaBorder && currentPlayer.fleet_count > 0
      ? Math.min(settings.max_sea_attack, currentPlayer.fleet_count, TOTAL_ATTACK_LIMIT - landAmount - airAmount)
      : 0;
    setSeaAmount(Math.min(value, Math.max(0, maxAllowed)));
  };

  const handleAirChange = (value: number) => {
    const maxAllowed = currentPlayer.air_force_count > 0
      ? Math.min(settings.max_air_attack, currentPlayer.air_force_count, TOTAL_ATTACK_LIMIT - landAmount - seaAmount)
      : 0;
    setAirAmount(Math.min(value, Math.max(0, maxAllowed)));
  };

  // Doğrulama
  useEffect(() => {
    if (totalAttack <= 0) {
      setError('En az 1 birimlik saldırı yapmalısınız.');
      return;
    }

    if (totalAttack > TOTAL_ATTACK_LIMIT) {
      setError(`Toplam saldırı ${TOTAL_ATTACK_LIMIT} limitini aşamaz!`);
      return;
    }

    const action: AttackAction = {
      attacker_id: currentPlayer.id,
      defender_id: target.id,
      target_country: target.country_name,
      total_squares: totalAttack,
      distribution: { land: landAmount, sea: seaAmount, air: airAmount, total: totalAttack },
      coin_choice: coinChoice,
    };

    const validation = validateAttack(gameState, action);
    setError(validation.valid ? '' : validation.error || '');
  }, [landAmount, seaAmount, airAmount, totalAttack, coinChoice, currentPlayer, target, gameState, TOTAL_ATTACK_LIMIT]);

  const handleAttack = () => {
    if (totalAttack <= 0 || error) return;

    const action: AttackAction = {
      attacker_id: currentPlayer.id,
      defender_id: target.id,
      target_country: target.country_name,
      total_squares: totalAttack,
      distribution: {
        land: landAmount,
        sea: seaAmount,
        air: airAmount,
        total: totalAttack,
      },
      coin_choice: coinChoice,
    };

    onAttack(action);
  };

  return (
    <div className="glass rounded-2xl p-6 animate-slide-up">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
          <span>⚔️</span> Saldırı Planı
        </h3>
        <button onClick={onCancel} className="btn-icon text-sm">
          ✕
        </button>
      </div>

      {/* Hedef Bilgisi */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
          style={{ backgroundColor: target.color + '40', border: `2px solid ${target.color}` }}
        >
          🎯
        </div>
        <div className="flex-1">
          <p className="font-bold text-white">{target.country_name}</p>
          <p className="text-slate-400 text-xs">
            Komutan: {target.nickname} • 📦 {target.territories} kare • 🚢 {target.fleet_count} • ✈️ {target.air_force_count}
          </p>
        </div>
      </div>

      {/* TOPLAM LİMİT GÖSTERGESİ */}
      <div className="p-3 rounded-xl bg-amber-400/5 border border-amber-400/20 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-amber-400 text-xs font-bold">
            ⚔️ Toplam Saldırı Limiti
          </span>
          <span className={`font-black text-sm ${
            totalAttack >= TOTAL_ATTACK_LIMIT ? 'text-red-400' : 'text-amber-400'
          }`}>
            {totalAttack} / {TOTAL_ATTACK_LIMIT}
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              totalAttack >= TOTAL_ATTACK_LIMIT
                ? 'bg-red-500'
                : totalAttack >= TOTAL_ATTACK_LIMIT * 0.7
                ? 'bg-amber-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(100, (totalAttack / TOTAL_ATTACK_LIMIT) * 100)}%` }}
          />
        </div>
        <p className="text-slate-600 text-[10px] mt-1">
          Kara + Deniz + Hava toplamı {TOTAL_ATTACK_LIMIT} geçemez
          {remainingAttack > 0 && ` • ${remainingAttack} birim kaldı`}
        </p>
      </div>

      {/* Sınır Bilgisi */}
      <div className="flex gap-2 mb-4">
        {landBorder && (
          <span className="badge badge-green">🏔️ Kara Sınırı</span>
        )}
        {seaBorder && (
          <span className="badge badge-blue">🚢 Deniz Sınırı</span>
        )}
        <span className="badge badge-gold">✈️ Hava</span>
        {!landBorder && !seaBorder && (
          <span className="badge badge-red">⚠️ Sadece Hava</span>
        )}
      </div>

      {/* Kuvvet Dağılımı */}
      <div className="space-y-3 mb-4">
        {/* Kara Kuvvetleri */}
        <div className={`p-3 rounded-xl border ${landBorder ? 'bg-green-500/5 border-green-500/20' : 'bg-slate-800/30 border-slate-700/30 opacity-40'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span>🏔️</span>
              <span className="font-bold text-xs text-white">Kara</span>
            </div>
            <span className="text-[10px] text-slate-400">
              Maks: {Math.min(settings.max_land_attack, currentPlayer.territories)} (Limit: {effectiveMaxLand})
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={effectiveMaxLand}
              value={Math.min(landAmount, effectiveMaxLand)}
              onChange={(e) => handleLandChange(parseInt(e.target.value))}
              disabled={!landBorder}
              className="flex-1 accent-green-500"
            />
            <div className="w-14 text-center">
              <input
                type="number"
                min={0}
                max={effectiveMaxLand}
                value={landAmount}
                onChange={(e) => handleLandChange(parseInt(e.target.value) || 0)}
                disabled={!landBorder}
                className="input-field text-center text-xs py-1 px-1"
              />
            </div>
          </div>
          {!landBorder && (
            <p className="text-slate-600 text-[10px] mt-1">Kara sınırı yok</p>
          )}
        </div>

        {/* Deniz Kuvvetleri */}
        <div className={`p-3 rounded-xl border ${seaBorder && currentPlayer.fleet_count > 0 ? 'bg-blue-500/5 border-blue-500/20' : 'bg-slate-800/30 border-slate-700/30 opacity-40'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span>🚢</span>
              <span className="font-bold text-xs text-white">Donanma</span>
            </div>
            <span className="text-[10px] text-slate-400">
              Maks: {Math.min(settings.max_sea_attack, currentPlayer.fleet_count)} (Limit: {effectiveMaxSea})
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={effectiveMaxSea}
              value={Math.min(seaAmount, effectiveMaxSea)}
              onChange={(e) => handleSeaChange(parseInt(e.target.value))}
              disabled={!seaBorder || currentPlayer.fleet_count === 0}
              className="flex-1 accent-blue-500"
            />
            <div className="w-14 text-center">
              <input
                type="number"
                min={0}
                max={effectiveMaxSea}
                value={seaAmount}
                onChange={(e) => handleSeaChange(parseInt(e.target.value) || 0)}
                disabled={!seaBorder || currentPlayer.fleet_count === 0}
                className="input-field text-center text-xs py-1 px-1"
              />
            </div>
          </div>
          {!seaBorder && <p className="text-slate-600 text-[10px] mt-1">Deniz sınırı yok</p>}
          {seaBorder && currentPlayer.fleet_count === 0 && <p className="text-slate-600 text-[10px] mt-1">Donanma yok</p>}
        </div>

        {/* Hava Kuvvetleri */}
        <div className={`p-3 rounded-xl border ${currentPlayer.air_force_count > 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-slate-800/30 border-slate-700/30 opacity-40'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span>✈️</span>
              <span className="font-bold text-xs text-white">Hava Kuvveti</span>
            </div>
            <span className="text-[10px] text-slate-400">
              Maks: {Math.min(settings.max_air_attack, currentPlayer.air_force_count)} (Limit: {effectiveMaxAir})
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={effectiveMaxAir}
              value={Math.min(airAmount, effectiveMaxAir)}
              onChange={(e) => handleAirChange(parseInt(e.target.value))}
              disabled={currentPlayer.air_force_count === 0}
              className="flex-1 accent-amber-500"
            />
            <div className="w-14 text-center">
              <input
                type="number"
                min={0}
                max={effectiveMaxAir}
                value={airAmount}
                onChange={(e) => handleAirChange(parseInt(e.target.value) || 0)}
                disabled={currentPlayer.air_force_count === 0}
                className="input-field text-center text-xs py-1 px-1"
              />
            </div>
          </div>
          {currentPlayer.air_force_count === 0 && <p className="text-slate-600 text-[10px] mt-1">Hava kuvveti yok</p>}
        </div>
      </div>

      {/* Dağılım Özeti */}
      <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-slate-400 text-sm">Toplam Saldırı</span>
          <span className={`text-xl font-black ${totalAttack > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
            {totalAttack} Kare
          </span>
        </div>
        {totalAttack > 0 && (
          <div className="flex gap-3 text-xs text-slate-500">
            {landAmount > 0 && <span>🏔️ {landAmount}</span>}
            {seaAmount > 0 && <span>🚢 {seaAmount}</span>}
            {airAmount > 0 && <span>✈️ {airAmount}</span>}
          </div>
        )}
      </div>

      {/* Kaybetme Riski */}
      {totalAttack > 0 && (
        <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 mb-4">
          <p className="text-red-400 text-xs font-bold mb-1">⚠️ Kaybederseniz:</p>
          <div className="text-slate-400 text-xs space-y-0.5">
            {landAmount > 0 && <p>• {landAmount} kare toprak kaybedersiniz</p>}
            {seaAmount > 0 && <p>• {seaAmount} donanma kaybedersiniz</p>}
            {airAmount > 0 && <p>• {airAmount} hava kuvveti kaybedersiniz</p>}
          </div>
        </div>
      )}

      {/* Madalyon Seçimi */}
      <div className="mb-4">
        <p className="text-slate-400 text-xs font-medium mb-2">🪙 Madalyon Seçimi</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setCoinChoice('sword')}
            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
              coinChoice === 'sword'
                ? 'border-amber-400 bg-amber-400/10'
                : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
            }`}
          >
            <span className="text-2xl">⚔️</span>
            <span className={`font-bold text-xs ${coinChoice === 'sword' ? 'text-amber-400' : 'text-slate-400'}`}>
              KILIÇ
            </span>
          </button>
          <button
            onClick={() => setCoinChoice('shield')}
            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
              coinChoice === 'shield'
                ? 'border-amber-400 bg-amber-400/10'
                : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
            }`}
          >
            <span className="text-2xl">🛡️</span>
            <span className={`font-bold text-xs ${coinChoice === 'shield' ? 'text-amber-400' : 'text-slate-400'}`}>
              KALKAN
            </span>
          </button>
        </div>
      </div>

      {/* Hata */}
      {error && (
        <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 mb-3 animate-shake">
          <p className="text-red-400 text-xs">❌ {error}</p>
        </div>
      )}

      {/* Butonlar */}
      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-secondary flex-1">
          ← Geri
        </button>
        <button
          onClick={handleAttack}
          disabled={totalAttack <= 0 || !!error}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          <span>⚔️</span>
          <span>SALDIR!</span>
        </button>
      </div>
    </div>
  );
}