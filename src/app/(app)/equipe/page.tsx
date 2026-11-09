'use client';

import { UserPlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Avatar, Botao, CabecalhoPagina, Carregando, Erro, Painel, Selo } from '@/components/ui';
import { api } from '@/lib/client/api';
import { useMembro } from '@/lib/client/auth';
import { useEquipe } from '@/lib/client/hooks';
import { MEMBRO_PAPEL, type Membro, type Papel } from '@/lib/schema';

export default function PaginaEquipe() {
  const eu = useMembro();
  const { membros, carregando, erro, recarregar } = useEquipe();
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [papel, setPapel] = useState<Papel>('membro');
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState('');
  const [removendo, setRemovendo] = useState<string | null>(null);
  const admin = eu.papel === 'admin';

  async function executar(acao: () => Promise<unknown>) {
    setFalha('');
    try {
      await acao();
      await recarregar();
      return true;
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível concluir.');
      return false;
    }
  }

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const ok = await executar(() => api('/api/team', { metodo: 'POST', corpo: { email, nome, papel } }));
    if (ok) {
      setEmail('');
      setNome('');
      setPapel('membro');
    }
    setEnviando(false);
  }

  const caminho = (m: Membro) => `/api/team/${encodeURIComponent(m.email)}`;

  return (
    <div className="max-w-3xl">
      <CabecalhoPagina titulo="Equipe" descricao="Só quem está nesta lista entra no QG. Todos veem e editam tudo; administradores também gerenciam esta lista." />

      {admin && (
        <Painel titulo="Liberar acesso" className="mb-4">
          <form onSubmit={(e) => void adicionar(e)} className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
            <div>
              <label htmlFor="novo-email" className="mb-1 block text-[13px] font-medium text-tinta-2">E-mail (Gmail ou outro)</label>
              <input id="novo-email" type="email" required className="campo" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label htmlFor="novo-nome" className="mb-1 block text-[13px] font-medium text-tinta-2">Nome</label>
              <input id="novo-nome" className="campo" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div>
              <label htmlFor="novo-papel" className="mb-1 block text-[13px] font-medium text-tinta-2">Papel</label>
              <select id="novo-papel" className="campo" value={papel} onChange={(e) => setPapel(e.target.value as Papel)}>
                <option value="membro">{MEMBRO_PAPEL.membro}</option>
                <option value="admin">{MEMBRO_PAPEL.admin}</option>
              </select>
            </div>
            <Botao variante="primario" type="submit" carregando={enviando}><UserPlus size={15} aria-hidden /> Liberar</Botao>
          </form>
          <p className="border-t border-linha px-4 py-2.5 text-[13px] text-tinta-2">Depois de liberar, envie o endereço do QG à pessoa. Ela entra com o Google ou cria uma senha usando este mesmo e-mail.</p>
        </Painel>
      )}

      {(falha || erro) && <div className="mb-3"><Erro mensagem={falha || erro?.message || ''} /></div>}

      {carregando ? (
        <Carregando />
      ) : (
        <Painel>
          <ul className="divide-y divide-linha">
            {membros.map((m) => (
              <li key={m.email} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Avatar nome={m.nome} foto={m.foto} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.nome}{m.email === eu.email && ' (você)'}</p>
                  <p className="truncate text-xs text-tinta-2">{m.email}</p>
                </div>
                {!m.primeiro_acesso && m.email !== eu.email && <Selo>Ainda não entrou</Selo>}
                {admin && m.email !== eu.email ? (
                  <div className="flex items-center gap-2">
                    <select
                      aria-label={`Papel de ${m.nome}`}
                      className="campo w-auto"
                      value={m.papel}
                      onChange={(e) => void executar(() => api(caminho(m), { metodo: 'PATCH', corpo: { papel: e.target.value } }))}
                    >
                      <option value="membro">{MEMBRO_PAPEL.membro}</option>
                      <option value="admin">{MEMBRO_PAPEL.admin}</option>
                    </select>
                    {removendo === m.email ? (
                      <>
                        <Botao pequeno variante="fantasma" onClick={() => setRemovendo(null)}>Manter</Botao>
                        <Botao pequeno variante="perigo" onClick={() => void executar(() => api(caminho(m), { metodo: 'DELETE' })).then(() => setRemovendo(null))}>Confirmar</Botao>
                      </>
                    ) : (
                      <Botao pequeno variante="perigo" onClick={() => setRemovendo(m.email)}>Remover</Botao>
                    )}
                  </div>
                ) : (
                  <Selo tom={m.papel === 'admin' ? 'marca' : 'neutro'}>{MEMBRO_PAPEL[m.papel]}</Selo>
                )}
              </li>
            ))}
          </ul>
        </Painel>
      )}
    </div>
  );
}
