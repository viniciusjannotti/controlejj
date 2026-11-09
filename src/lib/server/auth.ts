// ============================================================
// Controle de acesso. O login (Google ou e-mail) prova QUEM é a
// pessoa; a coleção `equipe` decide SE ela entra. Sem isso, qualquer
// conta Google do mundo veria os contatos do projeto.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { DEMO_TOKEN, type Membro, type Papel } from '@/lib/schema';
import { adminAuth, ConfiguracaoAusente } from './firebase';
import { isDemo, store } from './store';

const DEMO_MEMBRO: Membro = { id: 'voce@demo.local', email: 'voce@demo.local', nome: 'Você (demonstração)', papel: 'admin' };

type Resultado = { membro: Membro; erro?: never } | { membro?: never; erro: NextResponse };

const negar = (status: number, codigo: string, mensagem: string): Resultado => ({
  erro: NextResponse.json({ codigo, erro: mensagem }, { status }),
});

export function emailsAdmin(valor = process.env.ADMIN_EMAILS ?? ''): Set<string> {
  return new Set(valor.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
}

interface Identidade {
  email: string;
  verificado: boolean;
  nome?: string;
  foto?: string;
}

async function identidade(token: string): Promise<Identidade | null> {
  try {
    const d = await adminAuth().verifyIdToken(token);
    if (!d.email) return null;
    return { email: d.email.toLowerCase(), verificado: d.email_verified === true, nome: d.name as string | undefined, foto: d.picture };
  } catch (e) {
    if (e instanceof ConfiguracaoAusente) throw e;
    return null;
  }
}

/**
 * Autoriza uma requisição. Exige e-mail verificado: sem isso, alguém poderia
 * criar uma conta com senha usando o e-mail de um membro que ainda não entrou.
 */
export async function exigirMembro(req: NextRequest, papeis?: Papel[]): Promise<Resultado> {
  const cabecalho = req.headers.get('authorization') ?? '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : '';
  if (!token) return negar(401, 'nao_autenticado', 'Faça login para continuar.');

  if (isDemo()) {
    if (token !== DEMO_TOKEN) return negar(401, 'sessao_invalida', 'Sessão inválida.');
    return { membro: DEMO_MEMBRO };
  }

  let quem: Identidade | null;
  try {
    quem = await identidade(token);
  } catch (e) {
    if (e instanceof ConfiguracaoAusente) {
      console.error(e.message);
      return negar(503, 'nao_configurado', 'O servidor ainda não foi configurado.');
    }
    throw e;
  }
  if (!quem) return negar(401, 'sessao_invalida', 'Sua sessão expirou. Entre novamente.');
  if (!quem.verificado) return negar(403, 'email_nao_verificado', 'Confirme seu e-mail para continuar.');

  const db = store();
  let doc = await db.get('equipe', quem.email);
  if (!doc && emailsAdmin().has(quem.email)) {
    doc = await db.create('equipe', { email: quem.email, nome: quem.nome ?? quem.email, papel: 'admin', primeiro_acesso: new Date().toISOString() }, quem.email);
  }
  if (!doc) return negar(403, 'sem_convite', 'Seu e-mail ainda não foi liberado por um administrador.');

  const membro = doc as unknown as Membro;
  if (papeis && !papeis.includes(membro.papel)) return negar(403, 'sem_permissao', 'Só administradores podem fazer isso.');

  if (!membro.primeiro_acesso || (quem.foto && membro.foto !== quem.foto)) {
    const nome = membro.nome && membro.nome !== membro.email ? membro.nome : (quem.nome ?? membro.nome);
    const dados = { nome, foto: quem.foto ?? '', primeiro_acesso: membro.primeiro_acesso ?? new Date().toISOString() };
    await db.update('equipe', quem.email, dados);
    return { membro: { ...membro, ...dados } };
  }
  return { membro };
}

/** Lista da equipe; no modo demonstração inclui quem está usando. */
export async function listarEquipe(): Promise<Membro[]> {
  const membros = (await store().list('equipe')) as unknown as Membro[];
  return isDemo() && !membros.some((m) => m.email === DEMO_MEMBRO.email) ? [DEMO_MEMBRO, ...membros] : membros;
}

/** Erros inesperados viram uma resposta genérica; o detalhe fica só no log do servidor. */
export function erroInterno(e: unknown): NextResponse {
  console.error(e);
  return NextResponse.json({ codigo: 'erro_interno', erro: 'Algo deu errado no servidor. Tente de novo.' }, { status: 500 });
}
