// lib/store.ts
import { create } from 'zustand';
import {
  GameState,
  GamePlayer,
  Room,
  RoomSettings,
  DEFAULT_ROOM_SETTINGS,
  ChatMessage,
  BattleLogEntry,
  AttackAction,
  ProductionAction,
  User,
} from './types';

// ==================== AUTH STORE ====================

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

// ==================== ROOM STORE ====================

interface RoomState {
  currentRoom: Room | null;
  rooms: Room[];
  players: {
    id: string;
    user_id: string;
    nickname: string;
    country_name: string;
    color: string;
    is_robot: boolean;
    is_ready: boolean;
  }[];
  roomSettings: RoomSettings;
  setCurrentRoom: (room: Room | null) => void;
  setRooms: (rooms: Room[]) => void;
  setPlayers: (players: RoomState['players']) => void;
  addPlayer: (player: RoomState['players'][0]) => void;
  removePlayer: (userId: string) => void;
  updateSettings: (settings: Partial<RoomSettings>) => void;
  resetRoom: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  currentRoom: null,
  rooms: [],
  players: [],
  roomSettings: { ...DEFAULT_ROOM_SETTINGS },
  setCurrentRoom: (currentRoom) => set({ currentRoom }),
  setRooms: (rooms) => set({ rooms }),
  setPlayers: (players) => set({ players }),
  addPlayer: (player) => set((state) => ({
    players: [...state.players, player],
  })),
  removePlayer: (userId) => set((state) => ({
    players: state.players.filter((p) => p.user_id !== userId),
  })),
  updateSettings: (settings) => set((state) => ({
    roomSettings: { ...state.roomSettings, ...settings },
  })),
  resetRoom: () => set({
    currentRoom: null,
    players: [],
    roomSettings: { ...DEFAULT_ROOM_SETTINGS },
  }),
}));

// ==================== GAME STORE ====================

type GamePhase = 'idle' | 'selecting_target' | 'selecting_attack' | 'coin_flip' | 'result' | 'producing' | 'game_over';

interface GameStore {
  gameState: GameState | null;
  phase: GamePhase;
  selectedTarget: GamePlayer | null;
  attackAction: AttackAction | null;
  productionAction: ProductionAction | null;
  coinFlipResult: {
    choice: 'sword' | 'shield';
    result: 'sword' | 'shield';
    success: boolean;
  } | null;
  isMyTurn: boolean;
  turnTimeLeft: number;
  showSurrenderConfirm: boolean;

  setGameState: (state: GameState) => void;
  setPhase: (phase: GamePhase) => void;
  setSelectedTarget: (target: GamePlayer | null) => void;
  setAttackAction: (action: AttackAction | null) => void;
  setProductionAction: (action: ProductionAction | null) => void;
  setCoinFlipResult: (result: GameStore['coinFlipResult']) => void;
  setIsMyTurn: (isMyTurn: boolean) => void;
  setTurnTimeLeft: (time: number) => void;
  setShowSurrenderConfirm: (show: boolean) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  phase: 'idle',
  selectedTarget: null,
  attackAction: null,
  productionAction: null,
  coinFlipResult: null,
  isMyTurn: false,
  turnTimeLeft: 60,
  showSurrenderConfirm: false,

  setGameState: (gameState) => set({ gameState }),
  setPhase: (phase) => set({ phase }),
  setSelectedTarget: (selectedTarget) => set({ selectedTarget }),
  setAttackAction: (attackAction) => set({ attackAction }),
  setProductionAction: (productionAction) => set({ productionAction }),
  setCoinFlipResult: (coinFlipResult) => set({ coinFlipResult }),
  setIsMyTurn: (isMyTurn) => set({ isMyTurn }),
  setTurnTimeLeft: (turnTimeLeft) => set({ turnTimeLeft }),
  setShowSurrenderConfirm: (showSurrenderConfirm) => set({ showSurrenderConfirm }),
  resetGame: () => set({
    gameState: null,
    phase: 'idle',
    selectedTarget: null,
    attackAction: null,
    productionAction: null,
    coinFlipResult: null,
    isMyTurn: false,
    turnTimeLeft: 60,
    showSurrenderConfirm: false,
  }),
}));

// ==================== CHAT STORE ====================

interface ChatStore {
  messages: ChatMessage[];
  isOpen: boolean;
  unreadCount: number;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setIsOpen: (isOpen: boolean) => void;
  resetUnread: () => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isOpen: false,
  unreadCount: 0,
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
    unreadCount: state.isOpen ? 0 : state.unreadCount + 1,
  })),
  setMessages: (messages) => set({ messages }),
  setIsOpen: (isOpen) => set({ isOpen, unreadCount: isOpen ? 0 : undefined } as Partial<ChatStore>),
  resetUnread: () => set({ unreadCount: 0 }),
  clearChat: () => set({ messages: [], unreadCount: 0 }),
}));

// ==================== BATTLE LOG STORE ====================

interface BattleLogStore {
  logs: BattleLogEntry[];
  isOpen: boolean;
  addLog: (log: BattleLogEntry) => void;
  setLogs: (logs: BattleLogEntry[]) => void;
  setIsOpen: (isOpen: boolean) => void;
  clearLogs: () => void;
}

export const useBattleLogStore = create<BattleLogStore>((set) => ({
  logs: [],
  isOpen: false,
  addLog: (log) => set((state) => ({
    logs: [...state.logs, log],
  })),
  setLogs: (logs) => set({ logs }),
  setIsOpen: (isOpen) => set({ isOpen }),
  clearLogs: () => set({ logs: [] }),
}));

// ==================== UI STORE ====================

interface UIStore {
  isSidebarOpen: boolean;
  activeTab: 'info' | 'chat' | 'log' | 'stats';
  showHowToPlay: boolean;
  showAchievements: boolean;
  notification: {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null;

  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: UIStore['activeTab']) => void;
  setShowHowToPlay: (show: boolean) => void;
  setShowAchievements: (show: boolean) => void;
  showNotification: (message: string, type: UIStore['notification'] extends null ? never : NonNullable<UIStore['notification']>['type']) => void;
  clearNotification: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isSidebarOpen: true,
  activeTab: 'info',
  showHowToPlay: false,
  showAchievements: false,
  notification: null,

  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setShowHowToPlay: (showHowToPlay) => set({ showHowToPlay }),
  setShowAchievements: (showAchievements) => set({ showAchievements }),
  showNotification: (message, type) => {
    set({ notification: { message, type } });
    setTimeout(() => set({ notification: null }), 4000);
  },
  clearNotification: () => set({ notification: null }),
}));