'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import type { Atividade, Colecao, DocumentosPorColecao, Membro } from '@/lib/schema';
import { api } from './api';

const buscar = <T,>(caminho: string) => api<T>(caminho);

/** Lê uma coleção e oferece escrita com atualização imediata da tela. */
export function useColecao<C extends Colecao>(colecao: C) {
  type Doc = DocumentosPorColecao[C];
  const caminho = `/api/data/${colecao}`;
  const { data, error, isLoading, mutate } = useSWR<Doc[]>(caminho, buscar, { revalidateOnFocus: true, dedupingInterval: 3000 });

  const criar = useCallback(
    async (valores: Record<string, unknown>) => {
      const doc = await api<Doc>(caminho, { metodo: 'POST', corpo: valores });
      await mutate((atual) => [...(atual ?? []), doc], { revalidate: false });
      return doc;
    },
    [caminho, mutate],
  );

  const atualizar = useCallback(
    async (id: string, valores: Record<string, unknown>) => {
      await mutate(
        async (atual) => {
          const doc = await api<Doc>(`${caminho}/${encodeURIComponent(id)}`, { metodo: 'PATCH', corpo: valores });
          return (atual ?? []).map((d) => (d.id === id ? doc : d));
        },
        {
          optimisticData: (atual) => (atual ?? []).map((d) => (d.id === id ? { ...d, ...valores } : d)),
          rollbackOnError: true,
          revalidate: false,
        },
      );
    },
    [caminho, mutate],
  );

  const remover = useCallback(
    async (id: string) => {
      await api(`${caminho}/${encodeURIComponent(id)}`, { metodo: 'DELETE' });
      await mutate((atual) => (atual ?? []).filter((d) => d.id !== id), { revalidate: false });
    },
    [caminho, mutate],
  );

  return { itens: data ?? [], erro: error as Error | undefined, carregando: isLoading, criar, atualizar, remover, recarregar: mutate };
}

export function useEquipe() {
  const { data, error, isLoading, mutate } = useSWR<Membro[]>('/api/team', buscar);
  const membros = useMemo(() => [...(data ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [data]);
  const nomeDe = useCallback((email: string | null | undefined) => {
    if (!email) return '';
    return membros.find((m) => m.email === email)?.nome ?? email;
  }, [membros]);
  return { membros, nomeDe, erro: error as Error | undefined, carregando: isLoading, recarregar: mutate };
}

export function useAtividade() {
  const { data } = useSWR<Atividade[]>('/api/atividade', buscar, { refreshInterval: 60_000 });
  return data ?? [];
}
