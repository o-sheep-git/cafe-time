import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Café Komorebi | 作業時間を育てるカフェ',
  description: '作業した時間が、いつものカフェを少しずつ育てる静かな放置ゲーム。',
  openGraph: {
    title: 'Café Komorebi',
    description: '作業時間を育てるカフェ',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'Café Komorebi — 作業時間を育てるカフェ' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Café Komorebi',
    description: '作業時間を育てるカフェ',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
