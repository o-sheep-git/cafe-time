export type MenuCategory = 'drink' | 'food';
export type WeatherKind = 'sunny' | 'rainy';

export type MenuItem = {
  id: string;
  name: string;
  image: string;
  category: MenuCategory;
  unlockMinutes: number;
  description: string;
};

export type Decoration = {
  id: string;
  image: string | null;
  minMinutes: number;
  probability: number;
  positionClass: string;
};

export const MENU_ITEMS: MenuItem[] = [
  { id: 'blendCoffee', name: 'ブレンドコーヒー', image: '/assets/drink_brend.png', category: 'drink', unlockMinutes: 0, description: 'いつもの一杯。やさしい香りで作業をはじめよう。' },
  { id: 'icedCoffee', name: 'アイスコーヒー', image: '/assets/drink_iced-coffee.png', category: 'drink', unlockMinutes: 60, description: '気分をすっきり切り替えたい日に。' },
  { id: 'tea', name: '紅茶', image: '/assets/drink_tea.png', category: 'drink', unlockMinutes: 180, description: 'ゆっくり考えたい時間に似合う一杯。' },
  { id: 'coffeeJelly', name: 'コーヒーゼリー', image: '/assets/food_coffee-jelly.png', category: 'food', unlockMinutes: 300, description: 'ほろ苦く、ひと休みにちょうどいい甘さ。' },
  { id: 'cheesecake', name: 'チーズケーキ', image: '/assets/food_cheese-cake.png', category: 'food', unlockMinutes: 600, description: '常連さんに人気の濃厚なケーキ。' },
  { id: 'pudding', name: 'プリン', image: '/assets/food_pudding.png', category: 'food', unlockMinutes: 900, description: '長く通った人だけが知っている昔ながらの味。' },
];

// 画像が届いたら image を指定するだけで、条件を満たした装飾が静かに店内へ現れます。
export const DECORATIONS: Decoration[] = [
  { id: 'shelfFlower', image: null, minMinutes: 240, probability: 0.35, positionClass: 'decor-shelf' },
  { id: 'windowOrnament', image: null, minMinutes: 720, probability: 0.22, positionClass: 'decor-window' },
];

export const WEATHER_SCENES: Record<WeatherKind, { label: string; image: string | null }> = {
  sunny: { label: '晴れ', image: null },
  rainy: { label: '雨', image: null },
};

export const getUnlockedMenuIds = (totalSeconds: number) => {
  const minutes = totalSeconds / 60;
  return MENU_ITEMS.filter((item) => minutes >= item.unlockMinutes).map((item) => item.id);
};

export const getWeatherForDate = (date = new Date()): WeatherKind => {
  // 日付ごとに安定した簡易天候。将来はこの関数を API / 季節ロジックに置き換えます。
  const seed = date.getFullYear() * 372 + (date.getMonth() + 1) * 31 + date.getDate();
  return seed % 4 === 0 ? 'rainy' : 'sunny';
};

export const pickDecorations = (totalSeconds: number, seed: number) => {
  const minutes = totalSeconds / 60;
  return DECORATIONS.filter((item, index) => {
    if (minutes < item.minMinutes) return false;
    const value = Math.abs(Math.sin(seed * 12.9898 + index * 78.233)) % 1;
    return value < item.probability;
  }).map((item) => item.id);
};
