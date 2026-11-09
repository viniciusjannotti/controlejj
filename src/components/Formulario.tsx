'use client';

import { type FormEvent, useState } from 'react';
import { useColecao, useEquipe } from '@/lib/client/hooks';
import { Botao, cx, Erro, Modal } from './ui';

export interface Campo {
  nome: string;
  rotulo: string;
  tipo: 'texto' | 'area' | 'data' | 'hora' | 'numero' | 'email' | 'telefone' | 'opcoes' | 'membro' | 'contato' | 'projeto' | 'meta' | 'booleano';
  opcoes?: Record<string, string>;
  /** Opção já marcada numa criação. Sem isso, vale a primeira. */
  padrao?: string;
  obrigatorio?: boolean;
  largo?: boolean;
  dica?: string;
  linhas?: number;
}

type Valores = Record<string, unknown>;

function valorInicial(c: Campo, inicial: Valores): string | boolean {
  const v = inicial[c.nome];
  if (c.tipo === 'booleano') return Boolean(v);
  if (v !== undefined && v !== null) return String(v);
  if (c.tipo === 'opcoes' && c.opcoes) return c.padrao ?? Object.keys(c.opcoes)[0];
  if (c.nome === 'valor_atual') return '0';
  return '';
}

/** Campos vazios viram o que o servidor espera: null em datas e vínculos, número em numéricos. */
function paraEnvio(c: Campo, v: string | boolean): unknown {
  if (c.tipo === 'booleano') return v;
  const s = String(v);
  if (c.tipo === 'numero') return s === '' ? null : Number(s);
  if (['data', 'membro', 'contato', 'projeto', 'meta'].includes(c.tipo)) return s === '' ? null : s;
  return s;
}

function SelectVinculo({ c, id, valor, aoMudar }: { c: Campo; id: string; valor: string; aoMudar: (v: string) => void }) {
  const { membros } = useEquipe();
  const contatos = useColecao('contatos');
  const projetos = useColecao('projetos');
  const metas = useColecao('metas');

  const opcoes =
    c.tipo === 'membro'
      ? membros.map((m) => ({ v: m.email, r: m.nome }))
      : c.tipo === 'contato'
        ? contatos.itens.map((x) => ({ v: x.id, r: x.organizacao ? `${x.nome} (${x.organizacao})` : x.nome }))
        : c.tipo === 'projeto'
          ? projetos.itens.map((x) => ({ v: x.id, r: x.nome }))
          : metas.itens.map((x) => ({ v: x.id, r: x.titulo }));
  opcoes.sort((a, b) => a.r.localeCompare(b.r, 'pt-BR'));

  return (
    <select id={id} className="campo" value={valor} onChange={(e) => aoMudar(e.target.value)}>
      <option value="">Não definido</option>
      {opcoes.map((o) => (
        <option key={o.v} value={o.v}>
          {o.r}
        </option>
      ))}
    </select>
  );
}

export function Formulario({
  titulo,
  campos,
  inicial = {},
  aoSalvar,
  aoExcluir,
  aoFechar,
}: {
  titulo: string;
  campos: Campo[];
  inicial?: Valores;
  aoSalvar: (valores: Valores) => Promise<unknown>;
  aoExcluir?: () => Promise<unknown>;
  aoFechar: () => void;
}) {
  const [valores, setValores] = useState<Record<string, string | boolean>>(() => Object.fromEntries(campos.map((c) => [c.nome, valorInicial(c, inicial)])));
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState('');

  const definir = (nome: string, v: string | boolean) => setValores((a) => ({ ...a, [nome]: v }));

  async function executar(acao: () => Promise<unknown>) {
    setSalvando(true);
    setErro('');
    try {
      await acao();
      aoFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.');
      setSalvando(false);
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    void executar(() => aoSalvar(Object.fromEntries(campos.map((c) => [c.nome, paraEnvio(c, valores[c.nome])]))));
  }

  return (
    <Modal titulo={titulo} aoFechar={aoFechar} largo={campos.length > 6}>
      <form onSubmit={enviar} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {campos.map((c) => {
          const id = `campo-${c.nome}`;
          const v = valores[c.nome];
          if (c.tipo === 'booleano') {
            return (
              <label key={c.nome} className={cx('flex min-h-10 items-center gap-2 self-end text-sm', c.largo && 'sm:col-span-2')}>
                <input type="checkbox" className="size-4 accent-[var(--marca)]" checked={Boolean(v)} onChange={(e) => definir(c.nome, e.target.checked)} />
                {c.rotulo}
              </label>
            );
          }
          return (
            <div key={c.nome} className={cx(c.largo && 'sm:col-span-2')}>
              <label htmlFor={id} className="mb-1 block text-[13px] font-medium text-tinta-2">
                {c.rotulo}
                {c.obrigatorio && <span aria-hidden className="text-perigo"> *</span>}
              </label>
              {c.tipo === 'area' ? (
                <textarea id={id} className="campo" rows={c.linhas ?? 3} value={String(v)} onChange={(e) => definir(c.nome, e.target.value)} />
              ) : c.tipo === 'opcoes' ? (
                <select id={id} className="campo" value={String(v)} onChange={(e) => definir(c.nome, e.target.value)}>
                  {Object.entries(c.opcoes ?? {}).map(([k, r]) => (
                    <option key={k} value={k}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : ['membro', 'contato', 'projeto', 'meta'].includes(c.tipo) ? (
                <SelectVinculo c={c} id={id} valor={String(v)} aoMudar={(x) => definir(c.nome, x)} />
              ) : (
                <input
                  id={id}
                  className="campo"
                  required={c.obrigatorio}
                  type={c.tipo === 'data' ? 'date' : c.tipo === 'hora' ? 'time' : c.tipo === 'numero' ? 'number' : c.tipo === 'email' ? 'email' : c.tipo === 'telefone' ? 'tel' : 'text'}
                  step={c.tipo === 'numero' ? 'any' : undefined}
                  value={String(v)}
                  onChange={(e) => definir(c.nome, e.target.value)}
                />
              )}
              {c.dica && <p className="mt-1 text-xs text-tinta-3">{c.dica}</p>}
            </div>
          );
        })}

        {erro && (
          <div className="sm:col-span-2">
            <Erro mensagem={erro} />
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center justify-end gap-2 sm:col-span-2">
          {aoExcluir &&
            (confirmando ? (
              <>
                <span className="mr-auto text-sm text-tinta-2">Excluir de vez?</span>
                <Botao variante="fantasma" onClick={() => setConfirmando(false)}>
                  Manter
                </Botao>
                <Botao variante="perigo" carregando={salvando} onClick={() => void executar(aoExcluir)}>
                  Sim, excluir
                </Botao>
              </>
            ) : (
              <Botao variante="perigo" className="mr-auto" onClick={() => setConfirmando(true)}>
                Excluir
              </Botao>
            ))}
          {!confirmando && (
            <>
              <Botao variante="fantasma" onClick={aoFechar}>
                Cancelar
              </Botao>
              <Botao variante="primario" type="submit" carregando={salvando}>
                Salvar
              </Botao>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}
