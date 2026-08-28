import { MENU_ITEMS, getUnlockedMenuIds, getWeatherForDate, type WeatherKind } from './game-config';

export const SAVE_VERSION = 1;
export const MAX_IMPORT_BYTES = 1024 * 1024;
const DB_NAME = 'cafe-komorebi';
const DB_VERSION = 1;
const MAX_TOTAL_SECONDS = 100 * 365.25 * 24 * 60 * 60;
const MAX_SESSION_SECONDS = 365 * 24 * 60 * 60;

export type WorkSession = {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  menuId: string;
};

export type GameSettings = {
  bgmEnabled: boolean;
  bgmVolume: number;
};

export type GameState = {
  version: 1;
  totalWorkSeconds: number;
  isWorking: boolean;
  workStartedAt: string | null;
  activeMenuId: string;
  unlockedMenuIds: string[];
  decorationProgress: {
    seed: number;
    lastEvaluatedMinutes: number;
    activeDecorationIds: string[];
  };
  weather: {
    kind: WeatherKind;
    generatedAt: string;
  };
  settings: GameSettings;
};

export type SaveFile = {
  version: 1;
  exportedAt: string;
  game: GameState;
  workHistory: WorkSession[];
};

export const createDefaultState = (): GameState => ({
  version: SAVE_VERSION,
  totalWorkSeconds: 0,
  isWorking: false,
  workStartedAt: null,
  activeMenuId: 'blendCoffee',
  unlockedMenuIds: ['blendCoffee'],
  decorationProgress: {
    seed: Math.floor(Math.random() * 1_000_000),
    lastEvaluatedMinutes: 0,
    activeDecorationIds: [],
  },
  weather: { kind: getWeatherForDate(), generatedAt: new Date().toISOString() },
  settings: { bgmEnabled: false, bgmVolume: 0.35 },
});

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains('game')) database.createObjectStore('game');
    if (!database.objectStoreNames.contains('workHistory')) {
      database.createObjectStore('workHistory', { keyPath: 'id' });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('IndexedDBを開けませんでした。'));
});

const requestResult = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('IndexedDBの読み書きに失敗しました。'));
});

const transactionDone = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error ?? new Error('保存処理に失敗しました。'));
  transaction.onabort = () => reject(transaction.error ?? new Error('保存処理が中断されました。'));
});

export const loadGameData = async (): Promise<{ game: GameState; workHistory: WorkSession[] }> => {
  const database = await openDatabase();
  const transaction = database.transaction(['game', 'workHistory'], 'readonly');
  const gameRequest = transaction.objectStore('game').get('current');
  const historyRequest = transaction.objectStore('workHistory').getAll();
  const [storedGame, history] = await Promise.all([
    requestResult(gameRequest) as Promise<GameState | undefined>,
    requestResult(historyRequest) as Promise<WorkSession[]>,
  ]);
  database.close();
  const game = storedGame ?? createDefaultState();
  if (!storedGame) await saveGameState(game);
  return { game, workHistory: history.sort((a, b) => b.startedAt.localeCompare(a.startedAt)) };
};

export const saveGameState = async (game: GameState) => {
  const database = await openDatabase();
  const transaction = database.transaction('game', 'readwrite');
  transaction.objectStore('game').put(game, 'current');
  await transactionDone(transaction);
  database.close();
};

export const saveCompletedSession = async (game: GameState, session: WorkSession) => {
  const database = await openDatabase();
  const transaction = database.transaction(['game', 'workHistory'], 'readwrite');
  transaction.objectStore('game').put(game, 'current');
  transaction.objectStore('workHistory').put(session);
  await transactionDone(transaction);
  database.close();
};

export const exportSaveData = async (): Promise<SaveFile> => {
  const { game, workHistory } = await loadGameData();
  return { version: SAVE_VERSION, exportedAt: new Date().toISOString(), game, workHistory };
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isSafeSeconds = (value: unknown, max = MAX_TOTAL_SECONDS) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
const isIsoDate = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));

export const validateImportedSave = (input: unknown): SaveFile => {
  if (!isRecord(input) || input.version !== SAVE_VERSION || !isRecord(input.game) || !Array.isArray(input.workHistory)) {
    throw new Error('対応していない、または必要な項目がないセーブデータです。');
  }
  const game = input.game;
  if (game.version !== SAVE_VERSION || !isSafeSeconds(game.totalWorkSeconds) || typeof game.isWorking !== 'boolean') {
    throw new Error('ゲーム進行データが正しくありません。');
  }
  if (game.workStartedAt !== null && !isIsoDate(game.workStartedAt)) throw new Error('作業開始時刻が正しくありません。');
  if (game.isWorking && game.workStartedAt === null) throw new Error('作業中データに開始時刻がありません。');
  if (game.workStartedAt && Date.parse(game.workStartedAt as string) > Date.now() + 5 * 60 * 1000) throw new Error('作業開始時刻が未来になっています。');

  const menuIds = new Set(MENU_ITEMS.map((item) => item.id));
  if (typeof game.activeMenuId !== 'string' || !menuIds.has(game.activeMenuId)) throw new Error('注文メニューが正しくありません。');
  if (!Array.isArray(game.unlockedMenuIds)) throw new Error('メニュー解放データが正しくありません。');

  const rawSettings = isRecord(game.settings) ? game.settings : {};
  if (typeof rawSettings.bgmEnabled !== 'boolean' || typeof rawSettings.bgmVolume !== 'number' || !Number.isFinite(rawSettings.bgmVolume) || rawSettings.bgmVolume < 0 || rawSettings.bgmVolume > 1) {
    throw new Error('BGM設定が正しくありません。');
  }
  const rawDecoration = isRecord(game.decorationProgress) ? game.decorationProgress : {};
  if (typeof rawDecoration.seed !== 'number' || !Number.isFinite(rawDecoration.seed) || !Array.isArray(rawDecoration.activeDecorationIds)) {
    throw new Error('店内装飾の進行データが正しくありません。');
  }
  const rawWeather = isRecord(game.weather) ? game.weather : {};
  const weatherKind: WeatherKind = rawWeather.kind === 'rainy' ? 'rainy' : 'sunny';

  if (input.workHistory.length > 100_000) throw new Error('作業履歴が多すぎます。');
  const history = input.workHistory.map((entry, index): WorkSession => {
    if (!isRecord(entry) || !isIsoDate(entry.startedAt) || !isIsoDate(entry.endedAt) || !isSafeSeconds(entry.durationSeconds, MAX_SESSION_SECONDS) || typeof entry.menuId !== 'string' || !menuIds.has(entry.menuId)) {
      throw new Error(`作業履歴 ${index + 1} 件目が正しくありません。`);
    }
    if (Date.parse(entry.endedAt as string) < Date.parse(entry.startedAt as string)) throw new Error(`作業履歴 ${index + 1} 件目の時刻が逆転しています。`);
    return {
      id: typeof entry.id === 'string' && entry.id.length <= 100 ? entry.id : `imported-${index}-${Date.now()}`,
      startedAt: entry.startedAt as string,
      endedAt: entry.endedAt as string,
      durationSeconds: Math.floor(entry.durationSeconds as number),
      menuId: entry.menuId,
    };
  });

  const totalWorkSeconds = Math.floor(game.totalWorkSeconds as number);
  const unlockedMenuIds = Array.from(new Set([
    ...getUnlockedMenuIds(totalWorkSeconds),
    ...(game.unlockedMenuIds as unknown[]).filter((id): id is string => typeof id === 'string' && menuIds.has(id)),
  ]));
  const sanitizedGame: GameState = {
    version: SAVE_VERSION,
    totalWorkSeconds,
    isWorking: game.isWorking,
    workStartedAt: game.workStartedAt as string | null,
    activeMenuId: unlockedMenuIds.includes(game.activeMenuId) ? game.activeMenuId : 'blendCoffee',
    unlockedMenuIds,
    decorationProgress: {
      seed: Math.abs(Math.floor(rawDecoration.seed as number)) % 1_000_000_000,
      lastEvaluatedMinutes: typeof rawDecoration.lastEvaluatedMinutes === 'number' && Number.isFinite(rawDecoration.lastEvaluatedMinutes) ? Math.max(0, Math.floor(rawDecoration.lastEvaluatedMinutes)) : 0,
      activeDecorationIds: (rawDecoration.activeDecorationIds as unknown[]).filter((id): id is string => typeof id === 'string').slice(0, 100),
    },
    weather: { kind: weatherKind, generatedAt: isIsoDate(rawWeather.generatedAt) ? rawWeather.generatedAt as string : new Date().toISOString() },
    settings: { bgmEnabled: rawSettings.bgmEnabled as boolean, bgmVolume: rawSettings.bgmVolume as number },
  };
  return { version: SAVE_VERSION, exportedAt: isIsoDate(input.exportedAt) ? input.exportedAt as string : new Date().toISOString(), game: sanitizedGame, workHistory: history };
};

export const replaceAllSaveData = async (save: SaveFile) => {
  const database = await openDatabase();
  const transaction = database.transaction(['game', 'workHistory'], 'readwrite');
  transaction.objectStore('game').put(save.game, 'current');
  const historyStore = transaction.objectStore('workHistory');
  historyStore.clear();
  save.workHistory.forEach((session) => historyStore.put(session));
  await transactionDone(transaction);
  database.close();
};
