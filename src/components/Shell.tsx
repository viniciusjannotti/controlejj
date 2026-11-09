'use client';

import { BookOpen, CalendarDays, CheckSquare, ContactRound, FolderKanban, LayoutDashboard, LogOut, Map, Menu, Moon, Sparkles, Sun, Target, Upload, Users, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { useAuth, useMembro } from '@/lib/client/auth';
import { modoDemo } from '@/lib/client/firebase';
import { Avatar, cx } from './ui';

const GRUPOS = [
  {
    itens: [
      { href: '/', rotulo: 'Painel', icone: LayoutDashboard },
      { href: '/ia', rotulo: 'Conselheiro IA', icone: Sparkles },
    ],
  },
  {
    titulo: 'Planejamento',
    itens: [
      { href: '/tarefas', rotulo: 'Tarefas', icone: CheckSquare },
      { href: '/metas', rotulo: 'Metas', icone: Target },
      { href: '/roadmap', rotulo: 'Roadmap', icone: Map },
      { href: '/agenda', rotulo: 'Agenda', icone: CalendarDays },
    ],
  },
  {
    titulo: 'Base',
    itens: [
      { href: '/contatos', rotulo: 'Contatos', icone: ContactRound },
      { href: '/projetos', rotulo: 'Projetos', icone: FolderKanban },
      { href: '/informacoes', rotulo: 'Informações', icone: BookOpen },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { href: '/importar', rotulo: 'Importar', icone: Upload },
      { href: '/equipe', rotulo: 'Equipe', icone: Users },
    ],
  },
];

export function Marca() {
  return (
    <span className="font-titulo text-2xl leading-none font-bold tracking-wide text-white uppercase">
      QG <span className="text-[#3ccb97]">Joga Junto</span>
    </span>
  );
}

function BotaoTema() {
  function alternar() {
    const escuro = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem('qg-tema', escuro ? 'escuro' : 'claro');
    } catch {
      // A escolha vale só para esta visita.
    }
  }
  return (
    <button type="button" onClick={alternar} aria-label="Alternar tema claro e escuro" className="rounded p-2 text-lateral-tinta hover:bg-lateral-2 hover:text-white">
      <Sun size={16} aria-hidden className="hidden dark:block" />
      <Moon size={16} aria-hidden className="dark:hidden" />
    </button>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const membro = useMembro();
  const { sair } = useAuth();
  const [aberto, setAberto] = useState(false);

  const navegacao = (
    <nav aria-label="Principal" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {GRUPOS.map((g, i) => (
        <div key={i}>
          {g.titulo && <p className="mb-1 px-2.5 text-[11px] font-semibold tracking-wider text-lateral-tinta/70 uppercase">{g.titulo}</p>}
          <ul className="space-y-0.5">
            {g.itens.map(({ href, rotulo, icone: Icone }) => {
              const ativo = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setAberto(false)}
                    aria-current={ativo ? 'page' : undefined}
                    className={cx(
                      'flex min-h-10 items-center gap-2.5 rounded-md border-l-2 px-2.5 text-sm transition-colors',
                      ativo ? 'border-[#f1c15c] bg-lateral-2 font-medium text-white' : 'border-transparent text-lateral-tinta hover:bg-lateral-2/60 hover:text-white',
                    )}
                  >
                    <Icone size={16} aria-hidden />
                    {rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const rodape = (
    <div className="flex items-center gap-2 border-t border-white/10 p-3">
      <Avatar nome={membro.nome} foto={membro.foto} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-white">{membro.nome}</p>
        <p className="truncate text-[11px] text-lateral-tinta/80">{membro.papel === 'admin' ? 'Administrador' : 'Membro'}</p>
      </div>
      <BotaoTema />
      <button type="button" onClick={() => void sair()} aria-label="Sair" className="rounded p-2 text-lateral-tinta hover:bg-lateral-2 hover:text-white">
        <LogOut size={16} aria-hidden />
      </button>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-lateral lg:flex">
        <div className="px-5 pt-5 pb-1">
          <Marca />
        </div>
        {navegacao}
        {rodape}
      </aside>

      <div className="sticky top-0 z-20 flex h-13 items-center justify-between bg-lateral px-4 lg:hidden">
        <Marca />
        <button type="button" onClick={() => setAberto(true)} aria-label="Abrir menu" aria-expanded={aberto} className="rounded p-2 text-white">
          <Menu size={20} aria-hidden />
        </button>
      </div>

      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-black/55" onClick={() => setAberto(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col bg-lateral">
            <div className="flex items-center justify-between px-4 py-3">
              <Marca />
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar menu" className="rounded p-2 text-white">
                <X size={20} aria-hidden />
              </button>
            </div>
            {navegacao}
            {rodape}
          </aside>
        </div>
      )}

      {modoDemo && (
        <p className="bg-alerta-suave px-4 py-1.5 text-center text-xs font-medium text-alerta">Modo demonstração: dados fictícios, salvos só neste computador.</p>
      )}
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
