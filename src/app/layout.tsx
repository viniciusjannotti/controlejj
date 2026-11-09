import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/client/auth';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const barlow = Barlow_Condensed({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-barlow', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'QG Joga Junto', template: '%s · QG Joga Junto' },
  description: 'Planejamento e organização da equipe do Joga Junto.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: '#0d2a20' };

// Aplica o tema antes da primeira pintura, para não piscar claro no modo escuro.
const SCRIPT_TEMA = `try{var t=localStorage.getItem('qg-tema');if(t==='escuro'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${barlow.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
