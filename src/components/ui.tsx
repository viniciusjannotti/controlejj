'use client';

import { AlertTriangle, Loader2, X } from 'lucide-react';
import { type ButtonHTMLAttributes, type ComponentType, type ReactNode, useEffect, useRef } from 'react';
import { prazoRelativo } from '@/lib/dates';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

/** Link de WhatsApp para telefone brasileiro; null se o número não for reconhecível. */
export function linkWhatsApp(telefone: string): string | null {
  const d = telefone.replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) return `https://wa.me/55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return `https://wa.me/${d}`;
  return null;
}

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo';

export function Botao({
  variante = 'secundario',
  pequeno,
  carregando,
  className,
  children,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; pequeno?: boolean; carregando?: boolean }) {
  return (
    <button
      type="button"
      {...resto}
      disabled={resto.disabled || carregando}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors disabled:opacity-55',
        pequeno ? 'min-h-8 px-2.5 text-[13px]' : 'min-h-10 px-3.5 text-sm',
        variante === 'primario' && 'bg-marca text-sobre-marca hover:bg-marca-forte',
        variante === 'secundario' && 'border border-linha bg-painel text-tinta hover:bg-painel-2',
        variante === 'fantasma' && 'text-tinta-2 hover:bg-painel-2 hover:text-tinta',
        variante === 'perigo' && 'border border-perigo/40 text-perigo hover:bg-perigo-suave',
        className,
      )}
    >
      {carregando && <Loader2 size={15} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function CabecalhoPagina({ titulo, descricao, acoes }: { titulo: string; descricao?: string; acoes?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-titulo text-[32px] leading-none font-bold tracking-wide uppercase">{titulo}</h1>
        {descricao && <p className="mt-1.5 max-w-2xl text-sm text-tinta-2">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </header>
  );
}

export type Tom = 'neutro' | 'marca' | 'alerta' | 'perigo' | 'info';

const TONS: Record<Tom, string> = {
  neutro: 'bg-painel-2 text-tinta-2',
  marca: 'bg-marca-suave text-marca',
  alerta: 'bg-alerta-suave text-alerta',
  perigo: 'bg-perigo-suave text-perigo',
  info: 'bg-info-suave text-info',
};

export function Selo({ tom = 'neutro', children, className }: { tom?: Tom; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap', TONS[tom], className)}>{children}</span>;
}

/** Prazo com texto relativo: o atraso nunca é comunicado só pela cor. */
export function SeloPrazo({ data, concluido }: { data: string | null | undefined; concluido?: boolean }) {
  if (!data) return null;
  const { texto, tom } = prazoRelativo(data);
  if (concluido) return <Selo>{texto.includes('atraso') ? 'Prazo passado' : texto}</Selo>;
  return <Selo tom={tom === 'atrasado' ? 'perigo' : tom === 'hoje' || tom === 'breve' ? 'alerta' : 'neutro'}>{texto}</Selo>;
}

export function Painel({ titulo, acao, children, className }: { titulo?: string; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-lg border border-linha bg-painel shadow-painel', className)}>
      {titulo && (
        <div className="flex items-center justify-between gap-2 border-b border-linha px-4 py-2.5">
          <h2 className="font-titulo text-lg leading-none font-semibold tracking-wide uppercase">{titulo}</h2>
          {acao}
        </div>
      )}
      {children}
    </section>
  );
}

export function Vazio({ icone: Icone, titulo, descricao, acao }: { icone: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>; titulo: string; descricao?: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="text-tinta-3">
        <Icone size={28} aria-hidden />
      </span>
      <p className="font-medium">{titulo}</p>
      {descricao && <p className="max-w-sm text-sm text-tinta-2">{descricao}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  );
}

export function Carregando({ texto = 'Carregando' }: { texto?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-tinta-2">
      <Loader2 size={18} className="animate-spin" aria-hidden />
      {texto}
    </div>
  );
}

export function Erro({ mensagem, aoTentar }: { mensagem: string; aoTentar?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md bg-perigo-suave px-3 py-2.5 text-sm text-perigo">
      <AlertTriangle size={16} aria-hidden className="shrink-0" />
      <span className="min-w-0 flex-1">{mensagem}</span>
      {aoTentar && (
        <Botao pequeno onClick={aoTentar}>
          Tentar de novo
        </Botao>
      )}
    </div>
  );
}

export function Modal({ titulo, aoFechar, children, largo }: { titulo: string; aoFechar: () => void; children: ReactNode; largo?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    // Sem isto, o foco cairia no botão de fechar, o primeiro elemento do diálogo.
    d?.querySelector<HTMLElement>('input, textarea, select')?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      onClick={(e) => e.target === ref.current && aoFechar()}
      className={cx('m-auto max-h-[92dvh] w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-linha bg-painel p-0 text-tinta', largo ? 'max-w-2xl' : 'max-w-lg')}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-linha bg-painel px-4 py-3">
        <h2 className="font-titulo text-xl leading-none font-semibold tracking-wide uppercase">{titulo}</h2>
        <button type="button" onClick={aoFechar} aria-label="Fechar" className="rounded p-1.5 text-tinta-2 hover:bg-painel-2">
          <X size={18} aria-hidden />
        </button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}

export function Avatar({ nome, foto, pequeno }: { nome: string; foto?: string; pequeno?: boolean }) {
  const iniciais = nome.split(/[^\p{L}]+/u).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  const tam = pequeno ? 'size-6 text-[10px]' : 'size-8 text-xs';
  if (foto) {
    // eslint-disable-next-line @next/next/no-img-element -- foto do Google, domínio externo e tamanho mínimo
    return <img src={foto} alt="" referrerPolicy="no-referrer" className={cx('shrink-0 rounded-full object-cover', tam)} />;
  }
  return <span aria-hidden className={cx('inline-flex shrink-0 items-center justify-center rounded-full bg-marca-suave font-semibold text-marca', tam)}>{iniciais}</span>;
}

export function Busca({ valor, aoMudar, rotulo }: { valor: string; aoMudar: (v: string) => void; rotulo: string }) {
  return <input type="search" className="campo sm:max-w-xs" placeholder={rotulo} aria-label={rotulo} value={valor} onChange={(e) => aoMudar(e.target.value)} />;
}

export function Seletor({ rotulo, valor, aoMudar, opcoes }: { rotulo: string; valor: string; aoMudar: (v: string) => void; opcoes: { valor: string; rotulo: string }[] }) {
  return (
    <select className="campo w-auto max-w-full" aria-label={rotulo} value={valor} onChange={(e) => aoMudar(e.target.value)}>
      {opcoes.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.rotulo}
        </option>
      ))}
    </select>
  );
}

/** Barra de progresso com o valor sempre em texto ao lado. */
export function Progresso({ valor, alvo, rotulo }: { valor: number; alvo: number | null; rotulo: string }) {
  const pct = alvo ? Math.min(100, Math.max(0, (valor / alvo) * 100)) : 0;
  return (
    <div role="progressbar" aria-label={rotulo} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-painel-2">
      <div className="h-full rounded-full bg-marca" style={{ width: `${pct}%` }} />
    </div>
  );
}
