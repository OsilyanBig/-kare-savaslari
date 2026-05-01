// src/lib/types.ts

// ==================== GENEL TİPLER ====================

export interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
  achievements: string[];
  total_wins: number;
  total_games: number;
  total_conquests: number;
}

// ==================== ODA TİPLERİ ====================

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface RoomSettings {
  difficulty: Difficulty;
  max_land_attack: number;
  max_sea_attack: number;
  max_air_attack: number;
  max_fleet_production: number;
  max_air_production: number;
  player_count: number;
  robot_count: number;
  turn_timer: number; // saniye
  password?: string;
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  difficulty: 'medium',
  max_land_attack: 30,
  max_sea_attack: 15,
  max_air_attack: 10,
  max_fleet_production: 10,
  max_air_production: 8,
  player_count: 4,
  robot_count: 0,
  turn_timer: 60,
};

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface Room {
  id: string;
  name: string;
  host_id: string;
  settings: RoomSettings;
  status: RoomStatus;
  created_at: string;
  has_password: boolean;
  current_players: number;
  banned_players: string[];
}

// ==================== OYUNCU TİPLERİ ====================

export interface GamePlayer {
  id: string;
  user_id: string | null; // null ise robot
  nickname: string;
  country_name: string;
  color: string;
  is_robot: boolean;
  is_alive: boolean;
  is_surrendered: boolean;
  fleet_count: number;
  air_force_count: number;
  fleet_ban_turns: number; // donanma üretim yasağı kalan tur
  air_ban_turns: number; // hava kuvveti üretim yasağı kalan tur
  territories: number; // toplam kare sayısı
}

// ==================== HARİTA TİPLERİ ====================

export type CellType = 'land' | 'sea';

export interface MapCell {
  x: number;
  y: number;
  type: CellType;
  owner_id: string | null; // oyuncu id, null ise sahipsiz deniz
  is_capital: boolean; // başkent mi
}

export interface GameMap {
  width: number;
  height: number;
  cells: MapCell[][];
}

// ==================== KOLONI TİPLERİ ====================

export interface Colony {
  id: string;
  owner_id: string;
  cells: { x: number; y: number }[];
  fleet_count: number;
  air_force_count: number;
}

// ==================== SALDIRI TİPLERİ ====================

export type AttackType = 'land' | 'sea' | 'air';

export interface AttackDistribution {
  land: number;
  sea: number;
  air: number;
  total: number;
}

export interface AttackAction {
  attacker_id: string;
  defender_id: string;
  target_country: string;
  total_squares: number;
  distribution: AttackDistribution;
  coin_choice: 'sword' | 'shield'; // kılıç veya kalkan
  from_colony_id?: string; // koloniden saldırıyorsa
}

export interface AttackResult {
  action: AttackAction;
  coin_result: 'sword' | 'shield';
  success: boolean;
  squares_changed: number;
  fleet_lost: number;
  air_lost: number;
  cells_affected: { x: number; y: number }[];
}

// ==================== ÜRETİM TİPLERİ ====================

export type ProductionType = 'fleet' | 'air_force';

export interface ProductionAction {
  player_id: string;
  type: ProductionType;
  amount: number;
  coin_choice: 'sword' | 'shield';
}

export interface ProductionResult {
  action: ProductionAction;
  coin_result: 'sword' | 'shield';
  success: boolean;
  ban_turns: number; // başarısızsa kaç tur ban
}

// ==================== TUR TİPLERİ ====================

export type ActionType = 'attack' | 'produce' | 'surrender' | 'skip';

export interface TurnAction {
  player_id: string;
  action_type: ActionType;
  attack?: AttackAction;
  production?: ProductionAction;
  timestamp: number;
}

// ==================== OYUN DURUMU ====================

export interface GameState {
  room_id: string;
  map: GameMap;
  players: GamePlayer[];
  current_turn_player_id: string;
  turn_number: number;
  turn_start_time: number;
  turn_timer: number;
  settings: RoomSettings;
  status: 'playing' | 'finished';
  winner_id: string | null;
  battle_log: BattleLogEntry[];
  colonies: Colony[];
}

// ==================== SAVAŞ KAYDI ====================

export interface BattleLogEntry {
  id: string;
  turn_number: number;
  timestamp: number;
  attacker_name: string;
  defender_name: string;
  attacker_color: string;
  defender_color: string;
  action_type: ActionType;
  total_squares: number;
  distribution?: AttackDistribution;
  coin_choice: 'sword' | 'shield';
  coin_result: 'sword' | 'shield';
  success: boolean;
  description: string;
}

// ==================== SOHBET ====================

export interface ChatMessage {
  id: string;
  room_id: string;
  player_id: string;
  player_nickname: string;
  player_color: string;
  message: string;
  is_emoji: boolean;
  timestamp: number;
}

export const QUICK_EMOJIS = [
  '⚔️', '🛡️', '💀', '👑', '🏳️', '🔥',
  '😂', '😡', '😱', '🤝', '👏', '💪',
  '🎯', '⭐', '💣', '🚢', '✈️', '🏰'
];

// ==================== BAŞARILAR ====================

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: AchievementRequirement;
}

export interface AchievementRequirement {
  type: 'wins' | 'games' | 'conquests' | 'special';
  value: number;
  special_id?: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_blood',
    name: 'İlk Kan',
    description: 'İlk savaşını kazan',
    icon: '⚔️',
    requirement: { type: 'special', value: 1, special_id: 'first_battle_won' }
  },
  {
    id: 'conqueror',
    name: 'Fatih',
    description: 'Bir ülkeyi tamamen fethet',
    icon: '👑',
    requirement: { type: 'conquests', value: 1 }
  },
  {
    id: 'emperor',
    name: 'İmparator',
    description: 'İlk oyununu kazan',
    icon: '🏆',
    requirement: { type: 'wins', value: 1 }
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: '10 oyun oyna',
    icon: '🎖️',
    requirement: { type: 'games', value: 10 }
  },
  {
    id: 'warlord',
    name: 'Savaş Lordu',
    description: '10 oyun kazan',
    icon: '⚔️',
    requirement: { type: 'wins', value: 10 }
  },
  {
    id: 'world_dominator',
    name: 'Dünya Hakimi',
    description: '50 ülke fethet (toplam)',
    icon: '🌍',
    requirement: { type: 'conquests', value: 50 }
  },
  {
    id: 'naval_commander',
    name: 'Deniz Komutanı',
    description: 'Denizden 20 başarılı saldırı yap',
    icon: '🚢',
    requirement: { type: 'special', value: 20, special_id: 'naval_attacks' }
  },
  {
    id: 'air_marshal',
    name: 'Hava Mareşali',
    description: 'Havadan 20 başarılı saldırı yap',
    icon: '✈️',
    requirement: { type: 'special', value: 20, special_id: 'air_attacks' }
  },
  {
    id: 'lucky_star',
    name: 'Şanslı Yıldız',
    description: 'Üst üste 5 coin flip kazan',
    icon: '⭐',
    requirement: { type: 'special', value: 5, special_id: 'consecutive_wins' }
  },
  {
    id: 'underdog',
    name: 'Mazlumun Zaferi',
    description: 'En az toprakla başlayıp oyunu kazan',
    icon: '💪',
    requirement: { type: 'special', value: 1, special_id: 'underdog_win' }
  },
  {
    id: 'peaceful_warrior',
    name: 'Barışçıl Savaşçı',
    description: 'Bir oyunda hiç saldırı kaybetmeden kazan',
    icon: '🕊️',
    requirement: { type: 'special', value: 1, special_id: 'no_loss_win' }
  },
  {
    id: 'blitz',
    name: 'Yıldırım Savaşı',
    description: 'Bir oyunu 10 turda bitir',
    icon: '⚡',
    requirement: { type: 'special', value: 1, special_id: 'blitz_win' }
  },
];

// ==================== ÜLKE RENKLERİ ====================
// Mavi hariç (deniz rengi)
export const COUNTRY_COLORS = [
  '#e74c3c', // Kırmızı
  '#2ecc71', // Yeşil
  '#f39c12', // Turuncu
  '#9b59b6', // Mor
  '#e67e22', // Koyu Turuncu
  '#1abc9c', // Turkuaz
  '#e91e63', // Pembe
  '#8bc34a', // Açık Yeşil
];

// ==================== ROBOT İSİMLERİ ====================
export const ROBOT_NAMES = [
  'Komutan Atlas', 'General Kara', 'Amiral Deniz',
  'Mareşal Yıldız', 'Paşa Demir', 'Komutan Fırtına',
  'General Şimşek', 'Amiral Bulut'
];

export const ROBOT_COUNTRY_NAMES = [
  'Demir İmparatorluğu', 'Yıldız Krallığı', 'Fırtına Cumhuriyeti',
  'Şimşek Hanlığı', 'Atlas Devleti', 'Kara Sultanlığı',
  'Deniz Federasyonu', 'Bulut Prensliği'
];