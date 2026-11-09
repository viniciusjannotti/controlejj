import type { Atividade } from '@/lib/schema';
import { store } from './store';

/** Histórico de movimentações. Falhar aqui não pode desfazer a ação principal. */
export async function registrarAtividade(a: Omit<Atividade, 'id' | 'em'>): Promise<void> {
  try {
    await store().create('atividade', { ...a, em: new Date().toISOString() });
  } catch (e) {
    console.error('Falha ao registrar atividade', e);
  }
}
