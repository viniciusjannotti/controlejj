// Datas de negócio são strings AAAA-MM-DD, comparáveis como texto e sem
// o risco de "voltar um dia" ao passar por fuso horário.

const TZ = 'America/Sao_Paulo';

export function hojeISO(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
}

export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

export function diasEntre(deISO: string, ateISO: string): number {
  const ms = (s: string) => {
    const [a, m, d] = s.split('-').map(Number);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((ms(ateISO) - ms(deISO)) / 86_400_000);
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/** "12 mar" ou "12 mar 2027" quando não é o ano corrente. */
export function dataCurta(iso: string | null | undefined, hoje: string = hojeISO()): string {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  const base = `${Number(d)} ${MESES[Number(m) - 1]}`;
  return a === hoje.slice(0, 4) ? base : `${base} ${a}`;
}

/** Descrição relativa de um prazo: "Atrasada 3 dias", "Hoje", "Amanhã", "12 mar". */
export function prazoRelativo(iso: string, hoje: string = hojeISO()): { texto: string; tom: 'atrasado' | 'hoje' | 'breve' | 'normal' } {
  const n = diasEntre(hoje, iso);
  if (n < 0) return { texto: `${-n} ${n === -1 ? 'dia' : 'dias'} de atraso`, tom: 'atrasado' };
  if (n === 0) return { texto: 'Hoje', tom: 'hoje' };
  if (n === 1) return { texto: 'Amanhã', tom: 'breve' };
  if (n <= 7) return { texto: `Em ${n} dias`, tom: 'breve' };
  return { texto: dataCurta(iso, hoje), tom: 'normal' };
}

/** "2027 · T1" para agrupar o roadmap por trimestre. */
export function trimestreDe(iso: string): { chave: string; rotulo: string } {
  const [a, m] = iso.split('-').map(Number);
  const t = Math.ceil(m / 3);
  return { chave: `${a}-${t}`, rotulo: `${a} · T${t}` };
}
