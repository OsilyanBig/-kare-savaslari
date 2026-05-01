// lib/gameEngine.ts
import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  GamePlayer,
  RoomSettings,
  AttackAction,
  AttackResult,
  ProductionAction,
  ProductionResult,
  BattleLogEntry,
  TurnAction,
  Colony,
  COUNTRY_COLORS,
  ROBOT_NAMES,
  ROBOT_COUNTRY_NAMES,
} from './types';
import {
  generateMap,
  countTerritories,
  hasLandBorder,
  hasSeaBorder,
  getBorderNeighbors,
  transferTerritory,
  getConnectedTerritory,
} from './mapGenerator';

// ==================== OYUN OLUŞTURMA ====================

export function createGameState(
  roomId: string,
  players: { id: string; nickname: string; country_name: string; color: string; is_robot: boolean }[],
  settings: RoomSettings
): GameState {
  // Oyuncuları oluştur
  const gamePlayers: GamePlayer[] = players.map((p, index) => ({
    id: p.id,
    user_id: p.is_robot ? null : p.id,
    nickname: p.nickname,
    country_name: p.country_name,
    color: p.color || COUNTRY_COLORS[index % COUNTRY_COLORS.length],
    is_robot: p.is_robot,
    is_alive: true,
    is_surrendered: false,
    fleet_count: 0,
    air_force_count: 0,
    fleet_ban_turns: 0,
    air_ban_turns: 0,
    territories: 0,
  }));

  // Robotları ekle
  const existingCount = gamePlayers.length;
  for (let i = 0; i < settings.robot_count; i++) {
    const robotIndex = existingCount + i;
    gamePlayers.push({
      id: `robot_${uuidv4().slice(0, 8)}`,
      user_id: null,
      nickname: ROBOT_NAMES[i % ROBOT_NAMES.length],
      country_name: ROBOT_COUNTRY_NAMES[i % ROBOT_COUNTRY_NAMES.length],
      color: COUNTRY_COLORS[robotIndex % COUNTRY_COLORS.length],
      is_robot: true,
      is_alive: true,
      is_surrendered: false,
      fleet_count: 0,
      air_force_count: 0,
      fleet_ban_turns: 0,
      air_ban_turns: 0,
      territories: 0,
    });
  }

  // Haritayı oluştur
  const map = generateMap(gamePlayers, {
    playerCount: gamePlayers.length,
    minTerritory: 70,
    maxTerritory: 120,
    seaPercentage: 0.20,
  });

  // Toprak sayılarını hesapla
  const territoryCounts = countTerritories(map.cells, map.width, map.height);
  for (const player of gamePlayers) {
    player.territories = territoryCounts.get(player.id) || 0;
  }

  // İlk oyuncuyu belirle
  const firstPlayer = gamePlayers[0];

  return {
    room_id: roomId,
    map,
    players: gamePlayers,
    current_turn_player_id: firstPlayer.id,
    turn_number: 1,
    turn_start_time: Date.now(),
    turn_timer: settings.turn_timer,
    settings,
    status: 'playing',
    winner_id: null,
    battle_log: [],
    colonies: [],
  };
}

// ==================== COİN FLİP ====================

export function flipCoin(): 'sword' | 'shield' {
  return Math.random() < 0.5 ? 'sword' : 'shield';
}

// Zorluk moduna göre şans hesapla
export function calculateWinChance(
  difficulty: string,
  attackerId: string,
  defenderId: string,
  gameState: GameState
): number {
  if (difficulty === 'medium') return 0.5;

  // Saldırganın hedef ülkeden aldığı toprak yüzdesini hesapla
  const defenderTotal = gameState.players.find(p => p.id === defenderId)?.territories || 0;
  const attackerTerritoriesFromDefender = calculateConqueredPercentage(attackerId, defenderId, gameState);

  if (difficulty === 'easy') {
    // %70'den fazlasını aldıysa şans artar
    if (attackerTerritoriesFromDefender >= 0.7) {
      return 0.5 + (attackerTerritoriesFromDefender - 0.5) * 0.4; // max %70
    }
    return 0.5;
  }

  if (difficulty === 'hard') {
    // %70'den fazlasını aldıysa şans azalır
    if (attackerTerritoriesFromDefender >= 0.7) {
      return 0.5 - (attackerTerritoriesFromDefender - 0.5) * 0.4; // min %30
    }
    return 0.5;
  }

  return 0.5;
}

function calculateConqueredPercentage(
  attackerId: string,
  defenderId: string,
  gameState: GameState
): number {
  const defenderPlayer = gameState.players.find(p => p.id === defenderId);
  if (!defenderPlayer) return 0;

  const initialTerritory = 95; // ortalama başlangıç
  const currentTerritory = defenderPlayer.territories;
  const lost = initialTerritory - currentTerritory;

  if (lost <= 0) return 0;
  return lost / initialTerritory;
}

// Zorluk modlu coin flip
export function flipCoinWithDifficulty(
  difficulty: string,
  choice: 'sword' | 'shield',
  attackerId: string,
  defenderId: string,
  gameState: GameState
): { result: 'sword' | 'shield'; success: boolean } {
  const winChance = calculateWinChance(difficulty, attackerId, defenderId, gameState);
  const roll = Math.random();
  const won = roll < winChance;

  // Eğer kazandıysa seçtiği sonuç gelir, kaybettiyse diğeri
  const result = won ? choice : (choice === 'sword' ? 'shield' : 'sword');
  return { result, success: won };
}

// ==================== SALDIRI ====================

export function executeAttack(
  gameState: GameState,
  action: AttackAction
): { result: AttackResult; updatedState: GameState } {
  const attacker = gameState.players.find(p => p.id === action.attacker_id)!;
  const defender = gameState.players.find(p => p.id === action.defender_id)!;

  // Coin flip
  const { result: coinResult, success } = flipCoinWithDifficulty(
    gameState.settings.difficulty,
    action.coin_choice,
    action.attacker_id,
    action.defender_id,
    gameState
  );

  let attackResult: AttackResult;

  if (success) {
    // KAZANDIK - Hedef ülkeden kare al
    const cellsAffected = transferTerritory(
      gameState.map.cells,
      gameState.map.width,
      gameState.map.height,
      action.defender_id,
      action.attacker_id,
      action.total_squares
    );

    attackResult = {
      action,
      coin_result: coinResult,
      success: true,
      squares_changed: cellsAffected.length,
      fleet_lost: 0,
      air_lost: 0,
      cells_affected: cellsAffected,
    };

    // Toprak sayılarını güncelle
    attacker.territories += cellsAffected.length;
    defender.territories -= cellsAffected.length;

  } else {
    // KAYBETTİK - Kara kareleri kaybet + donanma/hava azalsın
    const landLoss = action.distribution.land;
    const cellsLost = transferTerritory(
      gameState.map.cells,
      gameState.map.width,
      gameState.map.height,
      action.attacker_id,
      action.defender_id,
      landLoss
    );

    // Donanma ve hava kuvveti kaybı
    const fleetLoss = Math.min(action.distribution.sea, attacker.fleet_count);
    const airLoss = Math.min(action.distribution.air, attacker.air_force_count);

    attacker.fleet_count -= fleetLoss;
    attacker.air_force_count -= airLoss;
    attacker.territories -= cellsLost.length;
    defender.territories += cellsLost.length;

    attackResult = {
      action,
      coin_result: coinResult,
      success: false,
      squares_changed: cellsLost.length,
      fleet_lost: fleetLoss,
      air_lost: airLoss,
      cells_affected: cellsLost,
    };
  }

  // Fetih kontrolü - ülke tamamen ele geçirildi mi?
  if (defender.territories <= 0) {
    defender.is_alive = false;
    // Donanma ve hava kuvvetleri saldırgana geçer
    attacker.fleet_count += defender.fleet_count;
    attacker.air_force_count += defender.air_force_count;
    defender.fleet_count = 0;
    defender.air_force_count = 0;
  }

  // Savaş kaydı
  const logEntry: BattleLogEntry = {
    id: uuidv4(),
    turn_number: gameState.turn_number,
    timestamp: Date.now(),
    attacker_name: attacker.country_name,
    defender_name: defender.country_name,
    attacker_color: attacker.color,
    defender_color: defender.color,
    action_type: 'attack',
    total_squares: action.total_squares,
    distribution: action.distribution,
    coin_choice: action.coin_choice,
    coin_result: coinResult,
    success: attackResult.success,
    description: attackResult.success
      ? `${attacker.country_name}, ${defender.country_name}'den ${attackResult.squares_changed} kare aldı!`
      : `${attacker.country_name}'nin ${defender.country_name}'ye saldırısı başarısız! ${attackResult.squares_changed} kare kaybetti.`,
  };

  gameState.battle_log.push(logEntry);

  // Kazanan kontrolü
  checkWinner(gameState);

  return { result: attackResult, updatedState: gameState };
}

// ==================== ÜRETİM ====================

export function executeProduction(
  gameState: GameState,
  action: ProductionAction
): { result: ProductionResult; updatedState: GameState } {
  const player = gameState.players.find(p => p.id === action.player_id)!;

  // Coin flip
  const { result: coinResult, success } = flipCoinWithDifficulty(
    gameState.settings.difficulty,
    action.coin_choice,
    action.player_id,
    action.player_id,
    gameState
  );

  let productionResult: ProductionResult;

  if (success) {
    // Üretim başarılı
    if (action.type === 'fleet') {
      player.fleet_count += action.amount;
    } else {
      player.air_force_count += action.amount;
    }

    productionResult = {
      action,
      coin_result: coinResult,
      success: true,
      ban_turns: 0,
    };
  } else {
    // Üretim başarısız - ban
    const banTurns = action.type === 'fleet' ? 2 : 3;

    if (action.type === 'fleet') {
      player.fleet_ban_turns = banTurns;
    } else {
      player.air_ban_turns = banTurns;
    }

    productionResult = {
      action,
      coin_result: coinResult,
      success: false,
      ban_turns: banTurns,
    };
  }

  // Savaş kaydı
  const typeName = action.type === 'fleet' ? 'Donanma' : 'Hava Kuvveti';
  const logEntry: BattleLogEntry = {
    id: uuidv4(),
    turn_number: gameState.turn_number,
    timestamp: Date.now(),
    attacker_name: player.country_name,
    defender_name: '',
    attacker_color: player.color,
    defender_color: '',
    action_type: 'produce',
    total_squares: action.amount,
    coin_choice: action.coin_choice,
    coin_result: coinResult,
    success: productionResult.success,
    description: productionResult.success
      ? `${player.country_name} ${action.amount} ${typeName} üretti!`
      : `${player.country_name}'nin ${typeName} üretimi başarısız! ${productionResult.ban_turns} tur üretim yasağı.`,
  };

  gameState.battle_log.push(logEntry);

  return { result: productionResult, updatedState: gameState };
}

// ==================== TUR YÖNETİMİ ====================

export function nextTurn(gameState: GameState): GameState {
  const alivePlayers = gameState.players.filter(p => p.is_alive && !p.is_surrendered);

  if (alivePlayers.length <= 1) {
    gameState.status = 'finished';
    gameState.winner_id = alivePlayers[0]?.id || null;
    return gameState;
  }

  // Mevcut oyuncunun indexini bul
  const currentIndex = alivePlayers.findIndex(p => p.id === gameState.current_turn_player_id);
  const nextIndex = (currentIndex + 1) % alivePlayers.length;

  // Eğer tur tamamlandıysa (herkes oynadı) tur numarasını artır
  if (nextIndex === 0) {
    gameState.turn_number++;

    // Ban turlarını azalt
    for (const player of gameState.players) {
      if (player.fleet_ban_turns > 0) player.fleet_ban_turns--;
      if (player.air_ban_turns > 0) player.air_ban_turns--;
    }
  }

  gameState.current_turn_player_id = alivePlayers[nextIndex].id;
  gameState.turn_start_time = Date.now();

  return gameState;
}

// ==================== TESLİM OLMA ====================

export function surrender(gameState: GameState, playerId: string): GameState {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return gameState;

  player.is_alive = false;
  player.is_surrendered = true;

  // Topraklarını komşulara dağıt
  const alivePlayers = gameState.players.filter(p => p.is_alive && p.id !== playerId);
  if (alivePlayers.length > 0) {
    distributeTerritory(gameState, playerId, alivePlayers);
  }

  // Donanma ve hava kuvvetleri yok olur
  player.fleet_count = 0;
  player.air_force_count = 0;
  player.territories = 0;

  // Savaş kaydı
  const logEntry: BattleLogEntry = {
    id: uuidv4(),
    turn_number: gameState.turn_number,
    timestamp: Date.now(),
    attacker_name: player.country_name,
    defender_name: '',
    attacker_color: player.color,
    defender_color: '',
    action_type: 'surrender',
    total_squares: 0,
    coin_choice: 'sword',
    coin_result: 'sword',
    success: false,
    description: `${player.country_name} teslim oldu! 🏳️`,
  };

  gameState.battle_log.push(logEntry);

  // Eğer sıra teslim olan oyuncudaysa sonraki tura geç
  if (gameState.current_turn_player_id === playerId) {
    nextTurn(gameState);
  }

  // Kazanan kontrolü
  checkWinner(gameState);

  return gameState;
}

// Teslim olan oyuncunun topraklarını dağıt
function distributeTerritory(gameState: GameState, surrenderedId: string, alivePlayers: GamePlayer[]): void {
  const { cells, width, height } = gameState.map;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y][x].owner_id === surrenderedId) {
        // En yakın canlı oyuncunun toprağına ver
        let closestPlayer: GamePlayer | null = null;
        let closestDist = Infinity;

        for (const player of alivePlayers) {
          // Bu oyuncunun en yakın hücresini bul
          for (let dy = -5; dy <= 5; dy++) {
            for (let dx = -5; dx <= 5; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                if (cells[ny][nx].owner_id === player.id) {
                  const dist = Math.abs(dx) + Math.abs(dy);
                  if (dist < closestDist) {
                    closestDist = dist;
                    closestPlayer = player;
                  }
                }
              }
            }
          }
        }

        if (closestPlayer) {
          cells[y][x].owner_id = closestPlayer.id;
          cells[y][x].is_capital = false;
        } else {
          // Rastgele bir oyuncuya ver
          const randomPlayer = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
          cells[y][x].owner_id = randomPlayer.id;
          cells[y][x].is_capital = false;
        }
      }
    }
  }

  // Toprak sayılarını güncelle
  const territoryCounts = countTerritories(cells, width, height);
  for (const player of gameState.players) {
    player.territories = territoryCounts.get(player.id) || 0;
  }
}

// ==================== KAZANAN KONTROLÜ ====================

function checkWinner(gameState: GameState): void {
  const alivePlayers = gameState.players.filter(p => p.is_alive && !p.is_surrendered);

  if (alivePlayers.length <= 1) {
    gameState.status = 'finished';
    gameState.winner_id = alivePlayers[0]?.id || null;
  }
}

// ==================== SALDIRI VALİDASYONU ====================

export function validateAttack(
  gameState: GameState,
  action: AttackAction
): { valid: boolean; error?: string } {
  const attacker = gameState.players.find(p => p.id === action.attacker_id);
  const defender = gameState.players.find(p => p.id === action.defender_id);

  if (!attacker || !defender) {
    return { valid: false, error: 'Oyuncu bulunamadı.' };
  }

  if (!attacker.is_alive) {
    return { valid: false, error: 'Elenmiş oyuncu saldıramaz.' };
  }

  if (!defender.is_alive) {
    return { valid: false, error: 'Elenmiş ülkeye saldırılamaz.' };
  }

  if (action.attacker_id === action.defender_id) {
    return { valid: false, error: 'Kendi ülkenize saldıramazsınız.' };
  }

  // Sınır kontrolü
  const { cells, width, height } = gameState.map;
  const landBorder = hasLandBorder(cells, width, height, action.attacker_id, action.defender_id);
  const seaBorder = hasSeaBorder(cells, width, height, action.attacker_id, action.defender_id);

  if (action.distribution.land > 0 && !landBorder) {
    return { valid: false, error: 'Karadan saldırı için kara sınırı gerekli.' };
  }

  if (action.distribution.sea > 0 && !seaBorder) {
    return { valid: false, error: 'Denizden saldırı için deniz sınırı gerekli.' };
  }

  // Hava saldırısı için hava kuvveti gerekli
  if (action.distribution.air > 0 && attacker.air_force_count < action.distribution.air) {
    return { valid: false, error: 'Yeterli hava kuvveti yok.' };
  }

  // Deniz saldırısı için donanma gerekli
  if (action.distribution.sea > 0 && attacker.fleet_count < action.distribution.sea) {
    return { valid: false, error: 'Yeterli donanma yok.' };
  }

  // Toplam kontrolü
  const totalAttack = action.distribution.land + action.distribution.sea + action.distribution.air;
  if (totalAttack !== action.total_squares) {
    return { valid: false, error: 'Saldırı dağılımı toplama eşit değil.' };
  }

  // Limit kontrolleri
  if (action.distribution.land > gameState.settings.max_land_attack) {
    return { valid: false, error: `Karadan maksimum ${gameState.settings.max_land_attack} saldırılabilir.` };
  }

  if (action.distribution.sea > gameState.settings.max_sea_attack) {
    return { valid: false, error: `Denizden maksimum ${gameState.settings.max_sea_attack} saldırılabilir.` };
  }

  if (action.distribution.air > gameState.settings.max_air_attack) {
    return { valid: false, error: `Havadan maksimum ${gameState.settings.max_air_attack} saldırılabilir.` };
  }

  // Kara saldırısı kare sayısı kontrolü (toprak kadar saldırabilir)
  if (action.distribution.land > attacker.territories) {
    return { valid: false, error: 'Topraklarınızdan fazla karadan saldırı yapamazsınız.' };
  }

  return { valid: true };
}

// ==================== ÜRETİM VALİDASYONU ====================

export function validateProduction(
  gameState: GameState,
  action: ProductionAction
): { valid: boolean; error?: string } {
  const player = gameState.players.find(p => p.id === action.player_id);

  if (!player) {
    return { valid: false, error: 'Oyuncu bulunamadı.' };
  }

  if (!player.is_alive) {
    return { valid: false, error: 'Elenmiş oyuncu üretim yapamaz.' };
  }

  if (action.type === 'fleet') {
    if (player.fleet_ban_turns > 0) {
      return { valid: false, error: `Donanma üretim yasağı: ${player.fleet_ban_turns} tur kaldı.` };
    }
    if (action.amount > gameState.settings.max_fleet_production) {
      return { valid: false, error: `Maksimum ${gameState.settings.max_fleet_production} donanma üretilebilir.` };
    }
  }

  if (action.type === 'air_force') {
    if (player.air_ban_turns > 0) {
      return { valid: false, error: `Hava kuvveti üretim yasağı: ${player.air_ban_turns} tur kaldı.` };
    }
    if (action.amount > gameState.settings.max_air_production) {
      return { valid: false, error: `Maksimum ${gameState.settings.max_air_production} hava kuvveti üretilebilir.` };
    }
  }

  if (action.amount <= 0) {
    return { valid: false, error: 'Üretim miktarı 0\'dan büyük olmalı.' };
  }

  return { valid: true };
}

// ==================== OYUN İSTATİSTİKLERİ ====================

export interface GameStats {
  player_id: string;
  nickname: string;
  country_name: string;
  color: string;
  final_territories: number;
  total_attacks: number;
  successful_attacks: number;
  failed_attacks: number;
  territories_conquered: number;
  territories_lost: number;
  fleet_produced: number;
  air_force_produced: number;
  countries_eliminated: number;
  is_winner: boolean;
  placement: number;
}

export function calculateGameStats(gameState: GameState): GameStats[] {
  const stats: GameStats[] = [];

  // Sıralama: canlı oyuncular önce (toprak sayısına göre), sonra elenmiş oyuncular
  const sortedPlayers = [...gameState.players].sort((a, b) => {
    if (a.is_alive && !b.is_alive) return -1;
    if (!a.is_alive && b.is_alive) return 1;
    return b.territories - a.territories;
  });

  for (let i = 0; i < sortedPlayers.length; i++) {
    const player = sortedPlayers[i];
    const playerLogs = gameState.battle_log.filter(
      log => log.attacker_name === player.country_name
    );

    const attacks = playerLogs.filter(log => log.action_type === 'attack');
    const productions = playerLogs.filter(log => log.action_type === 'produce');

    stats.push({
      player_id: player.id,
      nickname: player.nickname,
      country_name: player.country_name,
      color: player.color,
      final_territories: player.territories,
      total_attacks: attacks.length,
      successful_attacks: attacks.filter(a => a.success).length,
      failed_attacks: attacks.filter(a => !a.success).length,
      territories_conquered: attacks.filter(a => a.success).reduce((sum, a) => sum + a.total_squares, 0),
      territories_lost: gameState.battle_log
        .filter(log => log.defender_name === player.country_name && log.success)
        .reduce((sum, a) => sum + a.total_squares, 0),
      fleet_produced: productions.filter(p => p.success && p.description.includes('Donanma')).length,
      air_force_produced: productions.filter(p => p.success && p.description.includes('Hava')).length,
      countries_eliminated: gameState.players.filter(
        p => !p.is_alive && gameState.battle_log.some(
          log => log.attacker_name === player.country_name &&
                 log.defender_name === p.country_name &&
                 log.success
        )
      ).length,
      is_winner: gameState.winner_id === player.id,
      placement: i + 1,
    });
  }

  return stats;
}