// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth yardımcı fonksiyonları
export async function signUp(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
    },
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
}

export async function updateProfile(userId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  return { data, error };
}

// Oda fonksiyonları
export async function createRoom(
  name: string,
  hostId: string,
  settings: Record<string, unknown>,
  password?: string
) {
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      name,
      host_id: hostId,
      settings,
      has_password: !!password,
      password_hash: password || null,
      status: 'waiting',
      current_players: 1,
    })
    .select()
    .single();
  return { data, error };
}

export async function getRooms() {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('status', 'waiting')
    .order('created_at', { ascending: false });
  return { data, error };
}

export async function getRoom(roomId: string) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  return { data, error };
}

export async function updateRoom(roomId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', roomId)
    .select()
    .single();
  return { data, error };
}

export async function deleteRoom(roomId: string) {
  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', roomId);
  return { error };
}

// Oda oyuncuları
export async function joinRoom(
  roomId: string,
  userId: string,
  nickname: string,
  countryName: string,
  color: string
) {
  const { data, error } = await supabase
    .from('room_players')
    .insert({
      room_id: roomId,
      user_id: userId,
      nickname,
      country_name: countryName,
      color,
      is_robot: false,
    })
    .select()
    .single();

  if (!error) {
    await supabase.rpc('increment_room_players', { room_id_input: roomId });
  }

  return { data, error };
}

export async function leaveRoom(roomId: string, userId: string) {
  const { error } = await supabase
    .from('room_players')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId);

  if (!error) {
    await supabase.rpc('decrement_room_players', { room_id_input: roomId });
  }

  return { error };
}

export async function getRoomPlayers(roomId: string) {
  const { data, error } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true });
  return { data, error };
}

// Game State
export async function createGameState(roomId: string, gameState: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('game_states')
    .insert({
      room_id: roomId,
      ...gameState,
    })
    .select()
    .single();
  return { data, error };
}

export async function getGameState(roomId: string) {
  const { data, error } = await supabase
    .from('game_states')
    .select('*')
    .eq('room_id', roomId)
    .single();
  return { data, error };
}

export async function updateGameState(roomId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('game_states')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('room_id', roomId)
    .select()
    .single();
  return { data, error };
}

// Savaş kayıtları
export async function addBattleLog(roomId: string, turnNumber: number, entryData: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('battle_logs')
    .insert({
      room_id: roomId,
      turn_number: turnNumber,
      entry_data: entryData,
    })
    .select()
    .single();
  return { data, error };
}

export async function getBattleLogs(roomId: string) {
  const { data, error } = await supabase
    .from('battle_logs')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });
  return { data, error };
}

// Sohbet
export async function sendMessage(
  roomId: string,
  playerId: string,
  playerNickname: string,
  playerColor: string,
  message: string,
  isEmoji: boolean = false
) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      room_id: roomId,
      player_id: playerId,
      player_nickname: playerNickname,
      player_color: playerColor,
      message,
      is_emoji: isEmoji,
    })
    .select()
    .single();
  return { data, error };
}

export async function getChatMessages(roomId: string) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });
  return { data, error };
}

// Realtime subscriptions
export function subscribeToRoom(roomId: string, callback: (payload: Record<string, unknown>) => void) {
  return supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      callback
    )
    .subscribe();
}

export function subscribeToRoomPlayers(roomId: string, callback: (payload: Record<string, unknown>) => void) {
  return supabase
    .channel(`room_players:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
      callback
    )
    .subscribe();
}

export function subscribeToGameState(roomId: string, callback: (payload: Record<string, unknown>) => void) {
  return supabase
    .channel(`game_state:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'game_states', filter: `room_id=eq.${roomId}` },
      callback
    )
    .subscribe();
}

export function subscribeToBattleLogs(roomId: string, callback: (payload: Record<string, unknown>) => void) {
  return supabase
    .channel(`battle_logs:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'battle_logs', filter: `room_id=eq.${roomId}` },
      callback
    )
    .subscribe();
}

export function subscribeToChat(roomId: string, callback: (payload: Record<string, unknown>) => void) {
  return supabase
    .channel(`chat:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
      callback
    )
    .subscribe();
}

export function unsubscribeAll() {
  supabase.removeAllChannels();
}