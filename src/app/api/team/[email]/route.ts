import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { registrarAtividade } from '@/lib/server/atividade';
import { erroInterno, exigirMembro } from '@/lib/server/auth';
import { store } from '@/lib/server/store';

const patchSchema = z.strictObject({ papel: z.enum(['admin', 'membro']).optional(), nome: z.string().trim().min(1).max(120).optional() });
const alvoDe = (email: string) => decodeURIComponent(email).toLowerCase();

export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/team/[email]'>) {
  try {
    const { membro, erro } = await exigirMembro(req, ['admin']);
    if (erro) return erro;
    const alvo = alvoDe((await ctx.params).email);

    const r = patchSchema.safeParse(await req.json().catch(() => null));
    if (!r.success) return NextResponse.json({ erro: 'Dados inválidos.' }, { status: 400 });
    // Evita que a equipe fique sem nenhum administrador.
    if (alvo === membro.email && r.data.papel && r.data.papel !== 'admin') {
      return NextResponse.json({ erro: 'Você não pode retirar seu próprio acesso de administrador.' }, { status: 400 });
    }

    const doc = await store().update('equipe', alvo, r.data);
    if (!doc) return NextResponse.json({ erro: 'Pessoa não encontrada.' }, { status: 404 });
    await registrarAtividade({ acao: 'editou', colecao: 'equipe', ref_id: alvo, titulo: String(doc.nome ?? alvo), ator: membro.nome });
    return NextResponse.json(doc);
  } catch (e) {
    return erroInterno(e);
  }
}

/** Remove o acesso. Vale na próxima requisição da pessoa, pois a lista é conferida em cada uma. */
export async function DELETE(req: NextRequest, ctx: RouteContext<'/api/team/[email]'>) {
  try {
    const { membro, erro } = await exigirMembro(req, ['admin']);
    if (erro) return erro;
    const alvo = alvoDe((await ctx.params).email);
    if (alvo === membro.email) return NextResponse.json({ erro: 'Você não pode remover o próprio acesso.' }, { status: 400 });

    if (!(await store().remove('equipe', alvo))) return NextResponse.json({ erro: 'Pessoa não encontrada.' }, { status: 404 });
    await registrarAtividade({ acao: 'removeu', colecao: 'equipe', ref_id: alvo, titulo: alvo, ator: membro.nome });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return erroInterno(e);
  }
}
