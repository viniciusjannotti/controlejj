import { NextRequest, NextResponse } from 'next/server';
import { isColecao, parseCreate, tituloDe } from '@/lib/schema';
import { registrarAtividade } from '@/lib/server/atividade';
import { erroInterno, exigirMembro } from '@/lib/server/auth';
import { store } from '@/lib/server/store';

const naoEncontrada = () => NextResponse.json({ erro: 'Coleção não encontrada.' }, { status: 404 });

export async function GET(req: NextRequest, ctx: RouteContext<'/api/data/[collection]'>) {
  try {
    const { erro } = await exigirMembro(req);
    if (erro) return erro;
    const { collection } = await ctx.params;
    if (!isColecao(collection)) return naoEncontrada();
    return NextResponse.json(await store().list(collection));
  } catch (e) {
    return erroInterno(e);
  }
}

export async function POST(req: NextRequest, ctx: RouteContext<'/api/data/[collection]'>) {
  try {
    const { membro, erro } = await exigirMembro(req);
    if (erro) return erro;
    const { collection } = await ctx.params;
    if (!isColecao(collection)) return naoEncontrada();

    const r = parseCreate(collection, await req.json().catch(() => null));
    if (!r.success) return NextResponse.json({ erro: r.error.issues[0]?.message ?? 'Dados inválidos.' }, { status: 400 });

    const agora = new Date().toISOString();
    const doc = await store().create(collection, { ...r.data, criado_em: agora, atualizado_em: agora, criado_por: membro.email });
    await registrarAtividade({ acao: 'criou', colecao: collection, ref_id: doc.id, titulo: tituloDe(doc), ator: membro.nome });
    return NextResponse.json(doc, { status: 201 });
  } catch (e) {
    return erroInterno(e);
  }
}
