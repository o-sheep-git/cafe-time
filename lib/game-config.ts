export type MenuCategory = 'drink' | 'food';
export type WeatherKind = 'sunny' | 'rainy';

export type MenuItem = {
  id: string;
  name: string;
  image: string;
  category: MenuCategory;
  unlockMinutes: number;
  description: string;
  placement: {
    x: number;
    y: number;
    scale: number;
  };
};

export type Decoration = {
  id: string;
  image: string | null;
  minMinutes: number;
  probability: number;
  positionClass: string;
};

export const MENU_ITEMS: MenuItem[] = [
  { id: 'blendCoffee', name: 'ブレンドコーヒー', image: '/assets/drink_brend-trimmed.png', category: 'drink', unlockMinutes: 0, description: 'いつもの一杯。やさしい香りで作業をはじめよう。', placement: { x: 50, y: 60, scale: 0.92 } },
  { id: 'butterToast', name: 'バタートースト', image: '/assets/food_butter-toast-v1-trimmed.png', category: 'food', unlockMinutes: 30, description: '厚切りパンに、じゅわっと溶けるバター。', placement: { x: 50, y: 60, scale: 0.92 } },
  { id: 'icedCoffee', name: 'アイスコーヒー', image: '/assets/drink_iced-coffee-trimmed.png', category: 'drink', unlockMinutes: 60, description: '気分をすっきり切り替えたい日に。', placement: { x: 50, y: 60, scale: 0.9 } },
  { id: 'cafeLatte', name: 'カフェラテ', image: '/assets/drink_cafe-latte-v1-trimmed.png', category: 'drink', unlockMinutes: 120, description: 'ミルクの甘さで、ひと息やわらぐ一杯。', placement: { x: 50, y: 60, scale: 0.9 } },
  { id: 'tea', name: '紅茶', image: '/assets/drink_tea-trimmed.png', category: 'drink', unlockMinutes: 180, description: 'ゆっくり考えたい時間に似合う一杯。', placement: { x: 50, y: 60, scale: 0.9 } },
  { id: 'croissant', name: 'クロワッサン', image: '/assets/food_croissant-v1-trimmed.png', category: 'food', unlockMinutes: 240, description: '香ばしく焼けた、さくさくの朝の定番。', placement: { x: 50, y: 60, scale: 0.9 } },
  { id: 'coffeeJelly', name: 'コーヒーゼリー', image: '/assets/food_coffee-jelly-trimmed.png', category: 'food', unlockMinutes: 300, description: 'ほろ苦く、ひと休みにちょうどいい甘さ。', placement: { x: 50, y: 60, scale: 0.88 } },
  { id: 'cappuccino', name: 'カプチーノ', image: '/assets/drink_cappuccino-v1-trimmed.png', category: 'drink', unlockMinutes: 420, description: 'ふんわり泡とシナモンが香るご褒美。', placement: { x: 50, y: 60, scale: 0.9 } },
  { id: 'eggSandwich', name: 'たまごサンド', image: '/assets/food_egg-sandwich-v1-trimmed.png', category: 'food', unlockMinutes: 480, description: 'ふわふわ卵をはさんだ喫茶店の軽食。', placement: { x: 50, y: 60, scale: 0.88 } },
  { id: 'cheesecake', name: 'チーズケーキ', image: '/assets/food_cheese-cake-trimmed.png', category: 'food', unlockMinutes: 600, description: '常連さんに人気の濃厚なケーキ。', placement: { x: 50, y: 60, scale: 0.92 } },
  { id: 'espresso', name: 'エスプレッソ', image: '/assets/drink_espresso-v1-trimmed.png', category: 'drink', unlockMinutes: 720, description: '短い休憩に、きりっと濃い一杯。', placement: { x: 50, y: 60, scale: 0.78 } },
  { id: 'pancakes', name: 'パンケーキ', image: '/assets/food_pancakes-v1-trimmed.png', category: 'food', unlockMinutes: 780, description: 'バターとシロップを重ねた、ふかふかの三段。', placement: { x: 50, y: 60, scale: 0.9 } },
  { id: 'pudding', name: 'プリン', image: '/assets/food_pudding-trimmed.png', category: 'food', unlockMinutes: 900, description: '長く通った人だけが知っている昔ながらの味。', placement: { x: 50, y: 60, scale: 0.86 } },
  { id: 'cafeMocha', name: 'カフェモカ', image: '/assets/drink_cafe-mocha-v1-trimmed.png', category: 'drink', unlockMinutes: 1080, description: 'チョコレートとクリームで甘い気分転換。', placement: { x: 50, y: 60, scale: 0.88 } },
  { id: 'napolitan', name: 'ナポリタン', image: '/assets/food_napolitan-v1-trimmed.png', category: 'food', unlockMinutes: 1200, description: 'ケチャップの香りが懐かしい喫茶店の定番。', placement: { x: 50, y: 60, scale: 0.94 } },
  { id: 'matchaLatte', name: '抹茶ラテ', image: '/assets/drink_matcha-latte-v1-trimmed.png', category: 'drink', unlockMinutes: 1440, description: '抹茶のほろ苦さをミルクでまろやかに。', placement: { x: 50, y: 60, scale: 0.9 } },
  { id: 'tiramisu', name: 'ティラミス', image: '/assets/food_tiramisu-v1-trimmed.png', category: 'food', unlockMinutes: 1680, description: 'コーヒー香る、少し大人のデザート。', placement: { x: 50, y: 60, scale: 0.88 } },
  { id: 'hotChocolate', name: 'ホットチョコレート', image: '/assets/drink_hot-chocolate-v1-trimmed.png', category: 'drink', unlockMinutes: 1920, description: 'マシュマロを浮かべた、あたたかな甘さ。', placement: { x: 50, y: 60, scale: 0.88 } },
  { id: 'fruitTart', name: 'フルーツタルト', image: '/assets/food_fruit-tart-v1-trimmed.png', category: 'food', unlockMinutes: 2160, description: '色とりどりの果実を飾った華やかな一皿。', placement: { x: 50, y: 60, scale: 0.9 } },
  { id: 'creamSoda', name: 'クリームソーダ', image: '/assets/drink_cream-soda-v1-trimmed.png', category: 'drink', unlockMinutes: 2400, description: 'メロン色のソーダにアイスとさくらんぼ。', placement: { x: 50, y: 60, scale: 0.72 } },
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
