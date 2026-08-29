import { MENU_ITEMS, getUnlockedMenuIds, getWeatherForDate, type WeatherKind } from './game-config';

export const SAVE_VERSION = 2;
export const MAX_IMPORT_BYTES = 1024 * 1024;
const DB_NAME = 'cafe-komorebi';
const DB_VERSION = 2;
const MAX_TOTAL_SECONDS = 100 * 365.25 * 24 * 60 * 60;
const MAX_COMPLETED_SESSION_COUNT = 1_000_000_000;

export type GameSettings = {
  bgmEnabled: boolean;
  bgmVolume: number;
};

export type GameState = {
  version: 2;
  totalWorkSeconds: number;
  completedSessionCount: number;
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
  version: 2;
  exportedAt: string;
  game: GameState;
};

export const createDefaultState = (): GameState => ({
  version: SAVE_VERSION,
  totalWorkSeconds: 0,
  completedSessionCount: 0,
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
    // 既存の workHistory は読み込み時に件数へ移行します。
    // 新規データベースには履歴ストアを作りません。
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

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isSafeSeconds = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_TOTAL_SECONDS;
const isSafeSessionCount = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_COMPLETED_SESSION_COUNT;
const isIsoDate = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));

const migrateStoredGame = (storedGame: unknown, legacyHistoryCount: number): GameState => {
  if (!isRecord(storedGame)) return createDefaultState();
  const storedCount = isSafeSessionCount(storedGame.completedSessionCount) ? storedGame.completedSessionCount as number : 0;
  return {
    ...(storedGame as unknown as GameState),
    version: SAVE_VERSION,
    completedSessionCount: Math.max(storedCount, legacyHistoryCount),
  };
};

const clearLegacyWorkHistory = async () => {
  const database = await openDatabase();
  if (!database.objectStoreNames.contains('workHistory')) {
    database.close();
    return;
  }
  const transaction = database.transaction('workHistory', 'readwrite');
  transaction.objectStore('workHistory').clear();
  await transactionDone(transaction);
  database.close();
};

export const loadGameData = async (): Promise<GameState> => {
  const database = await openDatabase();
  const hasLegacyHistory = database.objectStoreNames.contains('workHistory');
  const storeNames = hasLegacyHistory ? ['game', 'workHistory'] : ['game'];
  const transaction = database.transaction(storeNames, 'readonly');
  const gameRequest = transaction.objectStore('game').get('current');
  const historyCountRequest = hasLegacyHistory ? transaction.objectStore('workHistory').count() : null;
  const [storedGame, legacyHistoryCount] = await Promise.all([
    requestResult(gameRequest) as Promise<unknown>,
    historyCountRequest ? requestResult(historyCountRequest) : Promise.resolve(0),
  ]);
  database.close();

  const game = migrateStoredGame(storedGame, legacyHistoryCount);
  const needsMigration = !isRecord(storedGame)
    || storedGame.version !== SAVE_VERSION
    || storedGame.completedSessionCount !== game.completedSessionCount;
  if (needsMigration) await saveGameState(game);
  if (hasLegacyHistory) await clearLegacyWorkHistory();
  return game;
};

export const saveGameState = async (game: GameState) => {
  const database = await openDatabase();
  const transaction = database.transaction('game', 'readwrite');
  transaction.objectStore('game').put(game, 'current');
  await transactionDone(transaction);
  database.close();
};

export const exportSaveData = async (): Promise<SaveFile> => {
  const game = await loadGameData();
  return { version: SAVE_VERSION, exportedAt: new Date().toISOString(), game };
};

export const validateImportedSave = (input: unknown): SaveFile => {
  if (!isRecord(input) || input.version !== SAVE_VERSION || !isRecord(input.game)) {
    throw new Error('対応していない、または必要な項目がないセーブデータです。');
  }
  const game = input.game;
  if (game.version !== SAVE_VERSION || !isSafeSeconds(game.totalWorkSeconds) || !isSafeSessionCount(game.completedSessionCount) || typeof game.isWorking !== 'boolean') {
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

  const totalWorkSeconds = Math.floor(game.totalWorkSeconds as number);
  const unlockedMenuIds = Array.from(new Set([
    ...getUnlockedMenuIds(totalWorkSeconds),
    ...(game.unlockedMenuIds as unknown[]).filter((id): id is string => typeof id === 'string' && menuIds.has(id)),
  ]));
  const sanitizedGame: GameState = {
    version: SAVE_VERSION,
    totalWorkSeconds,
    completedSessionCount: game.completedSessionCount as number,
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
  return { version: SAVE_VERSION, exportedAt: isIsoDate(input.exportedAt) ? input.exportedAt as string : new Date().toISOString(), game: sanitizedGame };
};

export const replaceAllSaveData = async (save: SaveFile) => {
  await saveGameState(save.game);
  await clearLegacyWorkHistory();
};
