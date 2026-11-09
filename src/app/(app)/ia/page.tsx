'use client';

import { Check, Loader2, Send, Sparkles, Square, Trash2, X } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { EventoIA } from '@/app/api/ai/route';
import { Botao, cx, Erro, Selo, SeloPrazo } from '@/components/ui';
import { useMembro } from '@/lib/client/auth';
import { cabecalhosAuth } from '@/lib/client/api';
import { useColecao, useEquipe } from '@/lib/client/hooks';
import { desanonimizar } from '@/lib/pseudonimos';
import { PRIORIDADE } from '@/lib/schema';
import type { Proposta } from '@/lib/server/ai-context';

type EstadoProposta = 'pendente' | 'criando' | 'criada' | 'dispensada';
interface PropostaUI extends Proposta {
  estado: EstadoProposta;
}
interface Mensagem {
  papel: 'user' | 'assistant';
  texto: string;
  propostas?: PropostaUI[];
  erro?: string;
}

const SUGESTOES = [
  'O que devemos priorizar nesta semana?',
  'O que está travado ou em risco agora?',
  'Quais contatos deveríamos retomar e por quê?',
  'Olhando as metas, qual é o próximo movimento mais importante?',
];

const CHAVE = 'qg-conversa-ia';

/** O servidor recebe só texto; as propostas entram como resumo, para a IA lembrar do que sugeriu. */
function paraEnvio(mensagens: Mensagem[]) {
  const historico = mensagens
    .map((m) => {
      const resumo = m.propostas?.length ? `\n\n[Tarefas sugeridas: ${m.propostas.map((p) => `${p.titulo} (${p.estado})`).join('; ')}]` : '';
      return { papel: m.papel, texto: (m.texto + resumo).trim() };
    })
    .filter((m) => m.texto)
    .slice(-39);
  const inicio = historico.findIndex((m) => m.papel === 'user');
  return inicio < 0 ? [] : historico.slice(inicio);
}

function CartaoProposta({ p, aoCriar, aoDispensar }: { p: PropostaUI; aoCriar: () => void; aoDispensar: () => void }) {
  const { nomeDe } = useEquipe();
  if (p.estado === 'dispensada') return null;
  return (
    <div className="rounded-md border border-linha bg-painel-2/50 p-3">
      <p className="text-sm font-medium">{p.titulo}</p>
      <p className="mt-1 text-[13px] text-tinta-2">{p.justificativa}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-tinta-2">
        <Selo tom={p.prioridade === 'alta' ? 'alerta' : 'neutro'}>Prioridade {PRIORIDADE[p.prioridade].toLowerCase()}</Selo>
        <SeloPrazo data={p.prazo} />
        {p.responsavel && <span>{nomeDe(p.responsavel)}</span>}
        <span className="ml-auto flex gap-1.5">
          {p.estado === 'criada' ? (
            <Selo tom="marca"><Check size={12} aria-hidden /> Tarefa criada</Selo>
          ) : (
            <>
              <Botao pequeno variante="fantasma" onClick={aoDispensar} disabled={p.estado === 'criando'}><X size={14} aria-hidden /> Dispensar</Botao>
              <Botao pequeno variante="primario" onClick={aoCriar} carregando={p.estado === 'criando'}>Criar tarefa</Botao>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

export default function PaginaIA() {
  const eu = useMembro();
  const tarefas = useColecao('tarefas');
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [respondendo, setRespondendo] = useState(false);
  const [erroGeral, setErroGeral] = useState('');
  const controle = useRef<AbortController | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const restaurou = useRef(false);

  // Mantém a conversa ao navegar entre telas, só até fechar a aba.
  useEffect(() => {
    try {
      const salvo = sessionStorage.getItem(CHAVE);
      if (salvo) setMensagens(JSON.parse(salvo) as Mensagem[]);
    } catch {
      // Sem armazenamento, a conversa começa vazia.
    }
    restaurou.current = true;
  }, []);

  useEffect(() => {
    if (!restaurou.current) return;
    try {
      sessionStorage.setItem(CHAVE, JSON.stringify(mensagens));
    } catch {
      // A conversa só não sobrevive à troca de tela.
    }
  }, [mensagens]);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens, respondendo]);

  const alterarUltima = (f: (m: Mensagem) => Mensagem) => setMensagens((l) => l.map((m, i) => (i === l.length - 1 ? f(m) : m)));

  async function perguntar(pergunta: string) {
    const conteudo = pergunta.trim();
    if (!conteudo || respondendo) return;
    setErroGeral('');
    setTexto('');
    const historico = paraEnvio([...mensagens, { papel: 'user', texto: conteudo }]);
    setMensagens((l) => [...l, { papel: 'user', texto: conteudo }, { papel: 'assistant', texto: '', propostas: [] }]);
    setRespondendo(true);

    const abortar = new AbortController();
    controle.current = abortar;
    let inicioEtapa = 0;
    // O texto chega com códigos ([C3]); a tela mostra os nomes. O código pode vir
    // partido entre dois pedaços, por isso a troca é feita sempre sobre o texto inteiro.
    let acumulado = '';
    let nomes: Record<string, string> = {};
    const mostrar = () => alterarUltima((m) => ({ ...m, texto: desanonimizar(acumulado, nomes) }));

    const tratar = (ev: EventoIA) => {
      if (ev.tipo === 'nomes') {
        nomes = ev.nomes;
      } else if (ev.tipo === 'etapa') {
        if (acumulado && !acumulado.endsWith('\n\n')) acumulado += '\n\n';
        inicioEtapa = acumulado.length;
      } else if (ev.tipo === 'reenvio') {
        acumulado = acumulado.slice(0, inicioEtapa);
        mostrar();
      } else if (ev.tipo === 'texto') {
        acumulado += ev.texto;
        mostrar();
      } else if (ev.tipo === 'proposta') {
        alterarUltima((m) => ({ ...m, propostas: [...(m.propostas ?? []), { ...ev.proposta, estado: 'pendente' }] }));
      } else if (ev.tipo === 'erro') {
        alterarUltima((m) => ({ ...m, erro: ev.mensagem }));
      }
    };

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await cabecalhosAuth()) },
        body: JSON.stringify({ mensagens: historico }),
        signal: abortar.signal,
      });
      if (!res.ok || !res.body) {
        const corpo = await res.json().catch(() => null);
        throw new Error(corpo?.erro ?? 'Não foi possível consultar a IA.');
      }
      const leitor = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      for (;;) {
        const { value, done } = await leitor.read();
        if (done) break;
        buffer += value;
        const linhas = buffer.split('\n');
        buffer = linhas.pop() ?? '';
        for (const linha of linhas) if (linha.trim()) tratar(JSON.parse(linha) as EventoIA);
      }
    } catch (e) {
      if (!abortar.signal.aborted) alterarUltima((m) => ({ ...m, erro: e instanceof Error ? e.message : 'Não foi possível consultar a IA.' }));
    } finally {
      setRespondendo(false);
      controle.current = null;
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    void perguntar(texto);
  }

  function aoTeclar(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void perguntar(texto);
    }
  }

  const mudarProposta = (iMsg: number, iProp: number, estado: EstadoProposta) =>
    setMensagens((l) => l.map((m, i) => (i === iMsg ? { ...m, propostas: m.propostas?.map((p, j) => (j === iProp ? { ...p, estado } : p)) } : m)));

  async function criarTarefa(iMsg: number, iProp: number, p: PropostaUI) {
    mudarProposta(iMsg, iProp, 'criando');
    setErroGeral('');
    try {
      await tarefas.criar({
        titulo: p.titulo,
        descricao: p.justificativa,
        prioridade: p.prioridade,
        responsavel: p.responsavel,
        pedido_por: eu.email,
        prazo: p.prazo,
        contato_id: p.contato_id,
        projeto_id: p.projeto_id,
      });
      mudarProposta(iMsg, iProp, 'criada');
    } catch (e) {
      mudarProposta(iMsg, iProp, 'pendente');
      setErroGeral(e instanceof Error ? e.message : 'Não foi possível criar a tarefa.');
    }
  }

  const vazio = mensagens.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100dvh-8.25rem)] max-w-3xl flex-col lg:h-[calc(100dvh-5rem)]">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h1 className="font-titulo text-[32px] leading-none font-bold tracking-wide uppercase">Conselheiro</h1>
        {!vazio && (
          <Botao
            pequeno
            variante="fantasma"
            disabled={respondendo}
            onClick={() => setMensagens([])}
          >
            <Trash2 size={14} aria-hidden /> Nova conversa
          </Botao>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {vazio ? (
          <div className="flex h-full flex-col justify-center">
            <span className="text-marca"><Sparkles size={26} aria-hidden /></span>
            <p className="mt-2 text-lg font-medium">O que a equipe precisa decidir?</p>
            <p className="mt-1 mb-5 max-w-xl text-sm text-tinta-2">
              O conselheiro lê tarefas, metas, roadmap, agenda, projetos, contatos e informações antes de responder. Ele pode sugerir tarefas, mas nada é criado sem a aprovação de alguém da equipe.
            </p>
            <p className="-mt-3 mb-5 max-w-xl text-xs text-tinta-3">
              Privacidade: antes de ir para a IA, nomes de pessoas viram códigos e telefones e e-mails são removidos. Os nomes voltam só aqui dentro.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {SUGESTOES.map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => void perguntar(s)} className="h-full w-full rounded-md border border-linha bg-painel p-3 text-left text-sm transition-colors hover:border-marca">{s}</button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ol aria-live="polite" aria-busy={respondendo} className="space-y-4 pb-3">
            {mensagens.map((m, i) => {
              const ultima = i === mensagens.length - 1;
              return (
                <li key={i} className={cx(m.papel === 'user' && 'flex justify-end')}>
                  {m.papel === 'user' ? (
                    <p className="max-w-[85%] rounded-lg bg-marca-suave px-3.5 py-2 text-[15px] whitespace-pre-wrap">{m.texto}</p>
                  ) : (
                    <div className="space-y-2.5">
                      {m.texto && (
                        <div className="markdown">
                          <Markdown remarkPlugins={[remarkGfm]}>{m.texto}</Markdown>
                        </div>
                      )}
                      {m.propostas?.map((p, j) => (
                        <CartaoProposta key={j} p={p} aoCriar={() => void criarTarefa(i, j, p)} aoDispensar={() => mudarProposta(i, j, 'dispensada')} />
                      ))}
                      {m.erro && <Erro mensagem={m.erro} />}
                      {ultima && respondendo && (
                        <p role="status" className="flex items-center gap-2 text-sm text-tinta-2">
                          <Loader2 size={15} className="animate-spin" aria-hidden /> {m.texto ? 'Escrevendo' : 'Analisando os dados do QG'}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        <div ref={fim} />
      </div>

      {erroGeral && <div className="mb-2"><Erro mensagem={erroGeral} /></div>}

      <form onSubmit={enviar} className="flex items-end gap-2 border-t border-linha pt-3">
        <textarea
          aria-label="Sua pergunta"
          rows={2}
          maxLength={20000}
          className="campo resize-none"
          placeholder="Pergunte algo ou conte uma novidade para o conselheiro considerar"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={aoTeclar}
        />
        {respondendo ? (
          <Botao aria-label="Parar resposta" onClick={() => controle.current?.abort()}><Square size={15} aria-hidden /></Botao>
        ) : (
          <Botao variante="primario" type="submit" aria-label="Enviar" disabled={!texto.trim()}><Send size={15} aria-hidden /></Botao>
        )}
      </form>
    </div>
  );
}
