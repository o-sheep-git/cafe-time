'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { BookOpen, Clock, Coffee, Download, Music2, Play, Settings, Square, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { DECORATIONS, MENU_ITEMS, WEATHER_SCENES, getUnlockedMenuIds, pickDecorations } from '@/lib/game-config';
import {
  MAX_IMPORT_BYTES,
  createDefaultState,
  exportSaveData,
  loadGameData,
  replaceAllSaveData,
  saveGameState,
  validateImportedSave,
  type GameState,
} from '@/lib/game-db';

const formatClock = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((safe % 3600) / 60).toString().padStart(2, '0');
  const secs = (safe % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${secs}`;
};

const formatTotal = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}時間 ${minutes}分`;
  return `${minutes}分`;
};

const formatUnlock = (minutes: number) => minutes === 0 ? 'はじめから' : `累計 ${minutes}分`;

export default function Home() {
  const [game, setGame] = useState<GameState>(() => createDefaultState());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const activeMenu = useMemo(
    () => MENU_ITEMS.find((item) => item.id === game.activeMenuId) ?? MENU_ITEMS[0],
    [game.activeMenuId],
  );
  const unlockedIds = useMemo(() => new Set(game.unlockedMenuIds), [game.unlockedMenuIds]);
  const activeDecorations = useMemo(
    () => DECORATIONS.filter((item) => game.decorationProgress.activeDecorationIds.includes(item.id) && item.image),
    [game.decorationProgress.activeDecorationIds],
  );

  const notify = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 4200);
  }, []);

  useEffect(() => {
    let mounted = true;
    loadGameData()
      .then((storedGame) => {
        if (!mounted) return;
        setGame(storedGame);
        if (storedGame.isWorking && storedGame.workStartedAt) {
          setElapsedSeconds(Math.max(0, Math.floor((Date.now() - Date.parse(storedGame.workStartedAt)) / 1000)));
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!mounted) return;
        setLoaded(true);
        notify('セーブデータを読み込めませんでした。このタブでは引き続き遊べます。');
      });
    return () => { mounted = false; };
  }, [notify]);

  useEffect(() => {
    if (!game.isWorking || !game.workStartedAt) return;
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - Date.parse(game.workStartedAt!)) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [game.isWorking, game.workStartedAt]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = game.settings.bgmVolume;
  }, [game.settings.bgmVolume]);

  const playBgmFromGesture = async () => {
    if (!game.settings.bgmEnabled || !audioRef.current) return;
    audioRef.current.volume = game.settings.bgmVolume;
    try { await audioRef.current.play(); } catch { notify('BGMは設定画面のスイッチから再生できます。'); }
  };

  const persist = async (next: GameState) => {
    setGame(next);
    try { await saveGameState(next); } catch { notify('保存に失敗しました。ブラウザのストレージ設定をご確認ください。'); }
  };

  const chooseMenu = async (menuId: string) => {
    if (!unlockedIds.has(menuId) || game.isWorking) return;
    const next = { ...game, activeMenuId: menuId };
    await persist(next);
  };

  const startWork = async () => {
    if (game.isWorking) return;
    const startedAt = new Date().toISOString();
    const next = { ...game, isWorking: true, workStartedAt: startedAt };
    setElapsedSeconds(0);
    await persist(next);
    setOrderOpen(false);
    void playBgmFromGesture();
    notify('ごゆっくりお過ごしください');
  };

  const finishWork = async () => {
    if (!game.isWorking || !game.workStartedAt) return;
    const endedAt = new Date();
    const durationSeconds = Math.max(1, Math.floor((endedAt.getTime() - Date.parse(game.workStartedAt)) / 1000));
    const totalWorkSeconds = Math.min(game.totalWorkSeconds + durationSeconds, 100 * 365.25 * 24 * 60 * 60);
    const unlockedMenuIds = getUnlockedMenuIds(totalWorkSeconds);
    const minutes = Math.floor(totalWorkSeconds / 60);
    const activeDecorationIds = pickDecorations(totalWorkSeconds, game.decorationProgress.seed + minutes);
    const next: GameState = {
      ...game,
      totalWorkSeconds,
      completedSessionCount: Math.min(game.completedSessionCount + 1, 1_000_000_000),
      isWorking: false,
      workStartedAt: null,
      unlockedMenuIds,
      decorationProgress: { ...game.decorationProgress, lastEvaluatedMinutes: minutes, activeDecorationIds },
    };
    setGame(next);
    setElapsedSeconds(0);
    try { await saveGameState(next); } catch { notify('今回の作業を保存できませんでした。'); return; }
    notify('またのご来店をお待ちしております');
  };

  const updateBgmEnabled = async (enabled: boolean) => {
    const next = { ...game, settings: { ...game.settings, bgmEnabled: enabled } };
    await persist(next);
    if (!audioRef.current) return;
    if (enabled) {
      audioRef.current.volume = next.settings.bgmVolume;
      try { await audioRef.current.play(); } catch { notify('ブラウザで音声再生が許可されていません。'); }
    } else {
      audioRef.current.pause();
    }
  };

  const updateVolume = (value: number | readonly number[]) => {
    const amount = Array.isArray(value) ? value[0] : value;
    const volume = Math.max(0, Math.min(1, Number(amount) / 100));
    const next = { ...game, settings: { ...game.settings, bgmVolume: volume } };
    setGame(next);
    if (audioRef.current) audioRef.current.volume = volume;
    void saveGameState(next).catch(() => notify('音量設定を保存できませんでした。'));
  };

  const downloadSave = async () => {
    try {
      const save = await exportSaveData();
      const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `cafe-komorebi-save-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      notify('セーブデータを書き出しました。');
    } catch { notify('セーブデータを書き出せませんでした。'); }
  };

  const importSave = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('ファイルサイズは1MB以下にしてください。');
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const save = validateImportedSave(parsed);
      await replaceAllSaveData(save);
      setGame(save.game);
      setElapsedSeconds(save.game.isWorking && save.game.workStartedAt ? Math.max(0, Math.floor((Date.now() - Date.parse(save.game.workStartedAt)) / 1000)) : 0);
      if (!save.game.settings.bgmEnabled) audioRef.current?.pause();
      notify('セーブデータを復元しました。');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'JSONファイルを読み込めませんでした。');
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  return (
    <main className="game-shell">
      <audio ref={audioRef} src="/assets/bgm_01.mp3" loop preload="none">
        <track kind="captions" src="/assets/bgm_01.vtt" srcLang="ja" label="歌詞のない店内BGM" default />
      </audio>
      <section className={`cafe-stage weather-${game.weather.kind}`} aria-label="カフェ店内">
        <Image src="/assets/bgimg_01.png" alt="陽だまりの静かなカフェ店内" fill priority sizes="(max-width: 640px) 100vw, 1200px" className="cafe-background" />
        {WEATHER_SCENES[game.weather.kind].image && (
          <Image src={WEATHER_SCENES[game.weather.kind].image!} alt="" fill className="weather-scene" />
        )}
        {activeDecorations.map((decoration) => (
          <div key={decoration.id} className={`cafe-decoration ${decoration.positionClass}`}>
            <Image src={decoration.image!} alt="" fill sizes="220px" />
          </div>
        ))}

        {game.isWorking && (
          <div
            className="ordered-item is-working"
            style={{
              '--item-x': `${activeMenu.placement.x}%`,
              '--item-y': `${activeMenu.placement.y}%`,
              '--item-scale': activeMenu.placement.scale,
            } as CSSProperties}
            aria-label={`注文中：${activeMenu.name}`}
          >
            <Image key={activeMenu.id} src={activeMenu.image} alt={activeMenu.name} fill sizes="(max-width: 640px) 28vw, 290px" />
          </div>
        )}

        <header className="top-bar">
          <div className="brand-zone">
            <div className="brand-mark">
              <Coffee aria-hidden="true" />
              <div><p className="eyebrow">WORK &amp; REST</p><h1>Café Komorebi</h1></div>
            </div>
            <div className={`compact-timer ${game.isWorking ? 'is-working' : ''}`} title="現在の作業時間 / 累計作業時間">
              <Clock aria-hidden="true" />
              <div>
                <time aria-label={`現在の作業時間 ${formatClock(elapsedSeconds)}`}>{formatClock(elapsedSeconds)}</time>
                <span aria-label={`累計作業時間 ${formatTotal(game.totalWorkSeconds)}`}>{formatTotal(game.totalWorkSeconds)}</span>
              </div>
            </div>
          </div>
          <nav className="top-actions" aria-label="補助メニュー">
            <Button variant="outline" className="glass-button" onClick={() => setCollectionOpen(true)}><BookOpen /> 図鑑</Button>
            <Button variant="outline" size="icon" className="glass-button" onClick={() => setSettingsOpen(true)} aria-label="設定"><Settings /></Button>
          </nav>
        </header>

        <div className={`control-dock ${game.isWorking ? 'is-working' : 'is-idle'}`}>
          <div className="order-summary">
            <span className="order-label">{game.isWorking ? 'TODAY\'S ORDER' : 'ORDER AT THE COUNTER'}</span>
            <strong>{game.isWorking ? activeMenu.name : 'お好きなメニューをどうぞ'}</strong>
          </div>
          <Button variant="outline" className="order-button" onClick={() => setOrderOpen(true)} disabled={game.isWorking || !loaded}>メニューを選ぶ</Button>
          {game.isWorking && (
            <Button className="finish-button" onClick={finishWork}><Square /> 作業をおえる</Button>
          )}
        </div>

        {!loaded && <div className="loading-veil"><Coffee /><span>いつもの席を準備しています…</span></div>}
        {notice && <output className="notice-toast" aria-live="polite">{notice}</output>}
      </section>

      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent className="game-dialog menu-dialog">
          <DialogHeader><p className="dialog-kicker">ORDER</p><DialogTitle>今日のメニュー</DialogTitle><DialogDescription>作業のおともを選んでください。</DialogDescription></DialogHeader>
          <div className="menu-grid">
            {MENU_ITEMS.map((item) => {
              const unlocked = unlockedIds.has(item.id);
              const selected = item.id === game.activeMenuId;
              return (
                <button key={item.id} type="button" className={`menu-tile ${selected ? 'is-selected' : ''} ${unlocked ? '' : 'is-locked'}`} onClick={() => chooseMenu(item.id)} disabled={!unlocked || game.isWorking}>
                  <span className="menu-art"><Image src={item.image} alt="" fill sizes="150px" /></span>
                  <span className="menu-tile-copy"><strong>{unlocked ? item.name : '？？？'}</strong><small>{unlocked ? (selected ? '選択中' : item.category === 'drink' ? 'ドリンク' : 'フード') : formatUnlock(item.unlockMinutes)}</small></span>
                </button>
              );
            })}
          </div>
          <div className="menu-order-footer">
            <div className="menu-order-selection"><span>選択中のメニュー</span><strong>{activeMenu.name}</strong></div>
            <Button className="start-button" onClick={startWork} disabled={!loaded || game.isWorking}><Play /> 注文する</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={collectionOpen} onOpenChange={setCollectionOpen}>
        <DialogContent className="game-dialog collection-dialog">
          <DialogHeader><p className="dialog-kicker">MENU BOOK</p><DialogTitle>いつものメニュー</DialogTitle><DialogDescription>{game.unlockedMenuIds.length} / {MENU_ITEMS.length} 品を見つけました</DialogDescription></DialogHeader>
          <div className="collection-list">
            {MENU_ITEMS.map((item) => {
              const unlocked = unlockedIds.has(item.id);
              return (
                <article key={item.id} className={`collection-item ${unlocked ? '' : 'is-locked'}`}>
                  <span className="collection-art"><Image src={item.image} alt="" fill sizes="120px" /></span>
                  <div><p>{item.category === 'drink' ? 'DRINK' : 'FOOD'} · {formatUnlock(item.unlockMinutes)}</p><h3>{unlocked ? item.name : '？？？'}</h3><span>{unlocked ? item.description : `あと ${Math.max(0, item.unlockMinutes - Math.floor(game.totalWorkSeconds / 60))}分で出会えます`}</span></div>
                </article>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="game-dialog settings-dialog">
          <DialogHeader><p className="dialog-kicker">PREFERENCES</p><DialogTitle>カフェの設定</DialogTitle><DialogDescription>音とセーブデータを調整できます。</DialogDescription></DialogHeader>
          <section className="setting-section">
            <div className="setting-row">
              <div className="setting-icon"><Music2 /></div>
              <div className="setting-copy"><strong>BGM</strong><span>店内の音楽を再生します</span></div>
              <Switch checked={game.settings.bgmEnabled} onCheckedChange={updateBgmEnabled} aria-label="BGMのオン・オフ" />
            </div>
            <div className="volume-row">
              <label htmlFor="volume-slider">音量</label>
              <Slider id="volume-slider" min={0} max={100} step={1} value={[Math.round(game.settings.bgmVolume * 100)]} onValueChange={updateVolume} disabled={!game.settings.bgmEnabled} />
              <output>{Math.round(game.settings.bgmVolume * 100)}%</output>
            </div>
          </section>
          <section className="setting-section save-section">
            <div><strong>セーブデータ</strong><p>この端末に自動保存されています · 完了セッション {game.completedSessionCount}回</p></div>
            <div className="save-actions">
              <Button variant="outline" onClick={downloadSave}><Download /> セーブデータを書き出す</Button>
              <Button variant="outline" onClick={() => importInputRef.current?.click()}><Upload /> JSONから復元</Button>
              <input ref={importInputRef} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => void importSave(event.target.files?.[0])} />
            </div>
            <p className="save-note">version 2形式・読み込み上限 1MB。復元すると、この端末の現在のセーブデータを置き換えます。</p>
          </section>
        </DialogContent>
      </Dialog>
    </main>
  );
}
