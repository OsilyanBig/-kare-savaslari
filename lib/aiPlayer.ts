// lib/aiPlayer.ts
import {
  GameState,
  GamePlayer,
  AttackAction,
  ProductionAction,
  TurnAction,
  AttackDistribution,
} from './types';
import {
  getBorderNeighbors,
  countTerritories,
  hasLandBorder,
  hasSeaBorder,
} from './mapGenerator';
import { validateAttack, validateProduction } from './gameEngine';

// Robot zorluk seviyesi
type AIStrategy = 'aggressive' | 'defensive' | 'balanced';

// Robot için strateji belirle
function determineStrategy(player: GamePlayer, gameState: GameState): AIStrategy {
  const alivePlayers = gameState.players.filter(p => p.is_alive && p.id !== player.id);
  const avgTerritory = alivePlayers.reduce((sum, p) => sum + p.territories, 0) / alivePlayers.length;

  // Toprakları ortalamanın üstündeyse agresif ol
  if (player.territories > avgTerritory * 1.3) {
    return 'aggressive';
  }

  // Toprakları ortalamanın altındaysa defansif ol
  if (player.territories < avgTerritory * 0.7) {
    return 'defensive';
  }

  return 'balanced';
}

// En iyi saldırı hedefini seç
function selectTarget(
  player: GamePlayer,
  gameState: GameState,
  strategy: AIStrategy
): GamePlayer | null {
  const { cells, width, height } = gameState.map;
  const neighbors = getBorderNeighbors(cells, width, height, player.id);

  if (neighbors.length === 0) return null;

  const alivePlayers = gameState.players.filter(p => p.is_alive && p.id !== player.id);
  const targets: { player: GamePlayer; score: number; hasLand: boolean; hasSea: boolean }[] = [];

  for (const neighbor of neighbors) {
    const targetPlayer = alivePlayers.find(p => p.id === neighbor.playerId);
    if (!targetPlayer) continue;

    let score = 0;

    switch (strategy) {
      case 'aggressive':
        // En zayıf ülkeye saldır
        score = 100 - targetPlayer.territories;
        // Kara sınırı varsa bonus
        if (neighbor.hasLandBorder) score += 30;
        // Az donanması varsa bonus
        score += (20 - targetPlayer.fleet_count);
        break;

      case 'defensive':
        // En tehlikeli komşuya saldır (en güçlü)
        score = targetPlayer.territories;
        // Kara sınırı varsa daha tehlikeli
        if (neighbor.hasLandBorder) score += 20;
        break;

      case 'balanced':
        // Dengeyi koru, orta güçteki hedefleri seç
        const avgTerr = alivePlayers.reduce((s, p) => s + p.territories, 0) / alivePlayers.length;
        score = 50 - Math.abs(targetPlayer.territories - avgTerr);
        if (neighbor.hasLandBorder) score += 15;
        // Neredeyse biten ülkelere öncelik ver (fetih bonusu için)
        if (targetPlayer.territories < 20) score += 40;
        break;
    }

    targets.push({
      player: targetPlayer,
      score,
      hasLand: neighbor.hasLandBorder,
      hasSea: neighbor.hasSeaBorder,
    });
  }

  if (targets.length === 0) return null;

  // En yüksek skora göre sırala
  targets.sort((a, b) => b.score - a.score);

  // Biraz rastgelelik ekle (her zaman aynı hamleyi yapmasın)
  const topTargets = targets.slice(0, Math.min(3, targets.length));
  const selectedIdx = Math.floor(Math.random() * topTargets.length);
  return topTargets[selectedIdx].player;
}

// Saldırı miktarını ve dağılımını belirle
function calculateAttackDistribution(
  player: GamePlayer,
  target: GamePlayer,
  gameState: GameState,
  strategy: AIStrategy
): AttackDistribution | null {
  const { cells, width, height } = gameState.map;
  const settings = gameState.settings;
  const landBorder = hasLandBorder(cells, width, height, player.id, target.id);
  const seaBorder = hasSeaBorder(cells, width, height, player.id, target.id);

  // Toplam saldırı gücünü belirle
  let totalAttack: number;

  switch (strategy) {
    case 'aggressive':
      // Yüksek saldırı
      totalAttack = Math.min(
        Math.floor(player.territories * 0.4),
        settings.max_land_attack
      );
      break;
    case 'defensive':
      // Düşük saldırı
      totalAttack = Math.min(
        Math.floor(player.territories * 0.2),
        Math.floor(settings.max_land_attack * 0.5)
      );
      break;
    default:
      // Orta saldırı
      totalAttack = Math.min(
        Math.floor(player.territories * 0.3),
        Math.floor(settings.max_land_attack * 0.7)
      );
      break;
  }

  // En az 3 kare saldır
  totalAttack = Math.max(3, totalAttack);

  // Dağılımı hesapla
  let land = 0;
  let sea = 0;
  let air = 0;

  if (landBorder) {
    land = Math.min(totalAttack, settings.max_land_attack, player.territories);
  }

  const remaining = totalAttack - land;

  if (remaining > 0 && seaBorder && player.fleet_count > 0) {
    sea = Math.min(remaining, settings.max_sea_attack, player.fleet_count);
  }

  const stillRemaining = totalAttack - land - sea;

  if (stillRemaining > 0 && player.air_force_count > 0) {
    air = Math.min(stillRemaining, settings.max_air_attack, player.air_force_count);
  }

  // Eğer kara sınırı yoksa ve deniz/hava yoksa saldıramaz
  if (!landBorder && sea === 0 && air === 0) {
    // Sadece hava ile dene
    if (player.air_force_count > 0) {
      air = Math.min(totalAttack, settings.max_air_attack, player.air_force_count);
      land = 0;
      sea = 0;
    } else {
      return null;
    }
  }

  const actualTotal = land + sea + air;
  if (actualTotal <= 0) return null;

  return {
    land,
    sea,
    air,
    total: actualTotal,
  };
}

// Üretim kararı ver
function shouldProduce(
  player: GamePlayer,
  gameState: GameState,
  strategy: AIStrategy
): ProductionAction | null {
  const settings = gameState.settings;
  const { cells, width, height } = gameState.map;

  // Denize komşu mu kontrol et
  let hasSeaAccess = false;
  for (let y = 0; y < height && !hasSeaAccess; y++) {
    for (let x = 0; x < width && !hasSeaAccess; x++) {
      if (cells[y][x].owner_id === player.id) {
        const neighbors = [
          { x: x - 1, y }, { x: x + 1, y },
          { x, y: y - 1 }, { x, y: y + 1 },
        ].filter(n => n.x >= 0 && n.x < width && n.y >= 0 && n.y < height);

        if (neighbors.some(n => cells[n.y][n.x].type === 'sea')) {
          hasSeaAccess = true;
        }
      }
    }
  }

  // Donanma üretim kararı
  if (
    hasSeaAccess &&
    player.fleet_ban_turns === 0 &&
    player.fleet_count < settings.max_sea_attack
  ) {
    const needFleet = strategy === 'aggressive'
      ? player.fleet_count < settings.max_sea_attack * 0.8
      : player.fleet_count < settings.max_sea_attack * 0.5;

    if (needFleet) {
      const amount = Math.min(
        strategy === 'aggressive'
          ? settings.max_fleet_production
          : Math.ceil(settings.max_fleet_production * 0.6),
        settings.max_fleet_production
      );

      return {
        player_id: player.id,
        type: 'fleet',
        amount,
        coin_choice: Math.random() < 0.5 ? 'sword' : 'shield',
      };
    }
  }

  // Hava kuvveti üretim kararı
  if (
    player.air_ban_turns === 0 &&
    player.air_force_count < settings.max_air_attack
  ) {
    const needAir = strategy === 'aggressive'
      ? player.air_force_count < settings.max_air_attack * 0.8
      : player.air_force_count < settings.max_air_attack * 0.5;

    if (needAir) {
      const amount = Math.min(
        strategy === 'aggressive'
          ? settings.max_air_production
          : Math.ceil(settings.max_air_production * 0.6),
        settings.max_air_production
      );

      return {
        player_id: player.id,
        type: 'air_force',
        amount,
        coin_choice: Math.random() < 0.5 ? 'sword' : 'shield',
      };
    }
  }

  return null;
}

// ==================== ANA AI FONKSİYONU ====================

export function getAIAction(player: GamePlayer, gameState: GameState): TurnAction {
  const strategy = determineStrategy(player, gameState);

  // Üretim mi saldırı mı karar ver
  const productionAction = shouldProduce(player, gameState, strategy);

  // %30 ihtimalle üretim yap (eğer mümkünse)
  // Ama donanma/hava yoksa ve ihtiyaç varsa %60 ihtimalle üret
  let preferProduction = false;

  if (productionAction) {
    if (player.fleet_count === 0 && player.air_force_count === 0) {
      preferProduction = Math.random() < 0.6;
    } else {
      preferProduction = Math.random() < 0.3;
    }
  }

  if (preferProduction && productionAction) {
    const validation = validateProduction(gameState, productionAction);
    if (validation.valid) {
      return {
        player_id: player.id,
        action_type: 'produce',
        production: productionAction,
        timestamp: Date.now(),
      };
    }
  }

  // Saldırı yap
  const target = selectTarget(player, gameState, strategy);

  if (target) {
    const distribution = calculateAttackDistribution(player, target, gameState, strategy);

    if (distribution) {
      const attackAction: AttackAction = {
        attacker_id: player.id,
        defender_id: target.id,
        target_country: target.country_name,
        total_squares: distribution.total,
        distribution,
        coin_choice: Math.random() < 0.5 ? 'sword' : 'shield',
      };

      const validation = validateAttack(gameState, attackAction);
      if (validation.valid) {
        return {
          player_id: player.id,
          action_type: 'attack',
          attack: attackAction,
          timestamp: Date.now(),
        };
      }
    }
  }

  // Saldırı yapılamıyorsa üretim dene
  if (productionAction) {
    const validation = validateProduction(gameState, productionAction);
    if (validation.valid) {
      return {
        player_id: player.id,
        action_type: 'produce',
        production: productionAction,
        timestamp: Date.now(),
      };
    }
  }

  // Hiçbir şey yapılamıyorsa tur geç
  return {
    player_id: player.id,
    action_type: 'skip',
    timestamp: Date.now(),
  };
}

// Teslim olma kararı (çok zayıfsa)
export function shouldSurrender(player: GamePlayer, gameState: GameState): boolean {
  const alivePlayers = gameState.players.filter(p => p.is_alive && p.id !== player.id);
  if (alivePlayers.length === 0) return false;

  const maxTerritory = Math.max(...alivePlayers.map(p => p.territories));

  // Toprakları en güçlü oyuncunun %10'undan azsa teslim ol
  if (player.territories < maxTerritory * 0.1 && player.territories < 10) {
    return Math.random() < 0.3; // %30 ihtimalle teslim ol
  }

  return false;
}