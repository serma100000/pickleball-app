import Dexie, { type Table } from 'dexie';

// Types for offline storage
interface OfflineGame {
  id: string;
  localId: string; // Local unique ID before sync
  gameType: 'singles' | 'doubles';
  partners: string[];
  opponents: string[];
  scores: Array<{ team1: number; team2: number }>;
  courtId?: string;
  notes?: string;
  date: Date;
  synced: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface OfflineCourt {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  numberOfCourts: number;
  indoor: boolean;
  lighted: boolean;
  rating: number;
  cachedAt: Date;
}

interface OfflinePlayer {
  id: string;
  name: string;
  skillLevel: number;
  avatarUrl?: string;
  cachedAt: Date;
}

interface SyncQueue {
  id: string;
  type: 'game' | 'court_review' | 'club_join' | 'tournament_register' | 'tournament' | 'tournament_event';
  action: 'create' | 'update' | 'delete';
  data: unknown;
  retries: number;
  lastAttempt?: Date;
  createdAt: Date;
}

interface AppCache {
  key: string;
  value: unknown;
  expiresAt: Date;
}

// Database class
class PicklePlayDB extends Dexie {
  games!: Table<OfflineGame, string>;
  courts!: Table<OfflineCourt, string>;
  players!: Table<OfflinePlayer, string>;
  syncQueue!: Table<SyncQueue, string>;
  cache!: Table<AppCache, string>;

  constructor() {
    super('PicklePlayDB');

    this.version(1).stores({
      games: 'id, localId, synced, date, createdAt',
      courts: 'id, name, [lat+lng], cachedAt',
      players: 'id, name, skillLevel, cachedAt',
      syncQueue: 'id, type, action, createdAt, lastAttempt',
      cache: 'key, expiresAt',
    });
  }
}

// Singleton instance
export const db = new PicklePlayDB();

// Helper functions
export async function addOfflineGame(game: Omit<OfflineGame, 'synced' | 'createdAt' | 'updatedAt'>) {
  const now = new Date();
  return db.games.add({
    ...game,
    synced: false,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getUnsyncedGames(): Promise<OfflineGame[]> {
  return db.games.where('synced').equals(0).toArray();
}

export async function markGameSynced(localId: string, serverId: string) {
  return db.games.where('localId').equals(localId).modify({
    id: serverId,
    synced: true,
    updatedAt: new Date(),
  });
}

export async function cacheCourtData(courts: OfflineCourt[]) {
  const cachedAt = new Date();
  const courtsWithTimestamp = courts.map((court) => ({
    ...court,
    cachedAt,
  }));
  return db.courts.bulkPut(courtsWithTimestamp);
}

export async function getCachedCourts(options?: {
  lat?: number;
  lng?: number;
  maxAge?: number; // minutes
}): Promise<OfflineCourt[]> {
  let query = db.courts.toCollection();

  if (options?.maxAge) {
    const minDate = new Date(Date.now() - options.maxAge * 60 * 1000);
    query = query.filter((court) => court.cachedAt >= minDate);
  }

  return query.toArray();
}

export async function cachePlayerData(players: OfflinePlayer[]) {
  const cachedAt = new Date();
  const playersWithTimestamp = players.map((player) => ({
    ...player,
    cachedAt,
  }));
  return db.players.bulkPut(playersWithTimestamp);
}

export async function getCachedPlayer(id: string): Promise<OfflinePlayer | undefined> {
  return db.players.get(id);
}

export async function addToSyncQueue(item: Omit<SyncQueue, 'id' | 'retries' | 'createdAt'>) {
  return db.syncQueue.add({
    id: crypto.randomUUID(),
    ...item,
    retries: 0,
    createdAt: new Date(),
  });
}

export async function getPendingSyncItems(): Promise<SyncQueue[]> {
  return db.syncQueue.where('retries').below(5).toArray();
}

export async function incrementSyncRetry(id: string) {
  return db.syncQueue.update(id, {
    retries: (await db.syncQueue.get(id))?.retries ?? 0 + 1,
    lastAttempt: new Date(),
  });
}

export async function removeSyncItem(id: string) {
  return db.syncQueue.delete(id);
}

export async function setCache(key: string, value: unknown, ttlMinutes: number = 60) {
  return db.cache.put({
    key,
    value,
    expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
  });
}

export async function getCache<T>(key: string): Promise<T | undefined> {
  const item = await db.cache.get(key);
  if (!item) return undefined;
  if (item.expiresAt < new Date()) {
    await db.cache.delete(key);
    return undefined;
  }
  return item.value as T;
}

export async function clearExpiredCache() {
  const now = new Date();
  return db.cache.where('expiresAt').below(now).delete();
}

export async function clearAllData() {
  await db.games.clear();
  await db.courts.clear();
  await db.players.clear();
  await db.syncQueue.clear();
  await db.cache.clear();
}

// Export types
export type { OfflineGame, OfflineCourt, OfflinePlayer, SyncQueue, AppCache };
