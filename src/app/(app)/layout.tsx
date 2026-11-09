'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { Shell } from '@/components/Shell';
import { Carregando } from '@/components/ui';
import { useAuth } from '@/lib/client/auth';

/** Tudo aqui exige membro da equipe; as rotas /api conferem de novo no servidor. */
export default function LayoutProtegido({ children }: { children: ReactNode }) {
  const { estado } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (estado.fase !== 'ok' && estado.fase !== 'carregando') router.replace('/login');
  }, [estado.fase, router]);

  if (estado.fase !== 'ok') return <Carregando />;
  return <Shell>{children}</Shell>;
}
