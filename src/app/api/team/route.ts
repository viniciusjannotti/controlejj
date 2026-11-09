import { NextRequest, NextResponse } from 'next/server';
import { novoMembroSchema } from '@/lib/schema';
import { registrarAtividade } from '@/lib/server/atividade';
import { erroInterno, exigirMembro, listarEquipe } from '@/lib/server/auth';
import { store } from '@/lib/server/store';

export async function GET(req: NextRequest) {
  try {
    const { erro } = await exigirMembro(req);
    if (erro) return erro;
    return NextResponse.json(await listarEquipe());
  } catch (e) {
    return erroInterno(e);
  }
}

/** Libera um e-mail. Só administradores. */
export async function POST(req: NextRequest) {
  try {
    const { membro, erro } = await exigirMembro(req, ['admin']);
    if (erro) return erro;

    const r = novoMembroSchema.safeParse(await req.json().catch(() => null));
    if (!r.success) return NextResponse.json({ erro: 'Informe um e-mail válido.' }, { status: 400 });

    const { email, nome, papel } = r.data;
    if (await store().get('equipe', email)) return NextResponse.json({ erro: 'Esse e-mail já está na equipe.' }, { status: 409 });

    const doc = await store().create('equipe', { email, nome: nome || email, papel, primeiro_acesso: null }, email);
    await registrarAtividade({ acao: 'criou', colecao: 'equipe', ref_id: email, titulo: nome || email, ator: membro.nome });
    return NextResponse.json(doc, { status: 201 });
  } catch (e) {
    return erroInterno(e);
  }
}
