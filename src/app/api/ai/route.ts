import { ApiError, type Content, FinishReason, GoogleGenAI, type Part } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hojeISO } from '@/lib/dates';
import { anonimizarTexto, desanonimizar } from '@/lib/pseudonimos';
import { type DadosQG, FUNCAO_PROPOR_TAREFA, montarFoto, normalizarProposta, type Proposta, pseudonimosDe, SISTEMA } from '@/lib/server/ai-context';
import { erroInterno, exigirMembro, listarEquipe } from '@/lib/server/auth';
import { store } from '@/lib/server/store';

export const maxDuration = 120;

// Modelo com cota gratuita na API do Gemini. Troque por GEMINI_MODEL sem mexer no código.
// Em 2026-11-09, no plano gratuito, o gemini-3.6-flash respondia em ~7 s e o 3.8 levava mais de 100 s.
const MODELO = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const MAX_ETAPAS = 5; // rodadas de chamada de função numa mesma resposta
const MAX_REENVIOS = 2;

const corpoSchema = z.object({
  mensagens: z
    .array(z.object({ papel: z.enum(['user', 'assistant']), texto: z.string().trim().min(1).max(20000) }))
    .min(1)
    .max(40)
    .refine((m) => m.at(-1)?.papel === 'user' && m[0]?.papel === 'user', 'A conversa deve começar e terminar com a pessoa.'),
});

export type EventoIA =
  | { tipo: 'nomes'; nomes: Record<string, string> }
  | { tipo: 'etapa' }
  | { tipo: 'texto'; texto: string }
  | { tipo: 'reenvio' }
  | { tipo: 'proposta'; proposta: Proposta }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'fim' };

async function carregarDados(): Promise<DadosQG> {
  const db = store();
  const [equipe, tarefas, metas, roadmap, eventos, contatos, projetos, informacoes, atividade] = await Promise.all([
    listarEquipe(),
    db.list('tarefas'),
    db.list('metas'),
    db.list('roadmap'),
    db.list('eventos'),
    db.list('contatos'),
    db.list('projetos'),
    db.list('informacoes'),
    db.recentes('atividade', 'em', 20),
  ]);
  return { equipe, tarefas, metas, roadmap, eventos, contatos, projetos, informacoes, atividade } as unknown as DadosQG;
}

function mensagemDeErro(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return 'O limite gratuito da IA foi atingido por agora. Tente de novo em alguns minutos.';
    if (e.status === 400 && /api key/i.test(e.message)) return 'A chave da IA é inválida. Confira a variável GEMINI_API_KEY.';
    if (e.status === 401 || e.status === 403) return 'A chave da IA foi recusada. Confira a variável GEMINI_API_KEY.';
    if (e.status === 404) return `O modelo ${MODELO} não está disponível para esta chave. Ajuste a variável GEMINI_MODEL.`;
    if (e.status >= 500) return 'A IA está instável no momento. Tente de novo em instantes.';
    return `A IA respondeu com um erro (${e.status}). Tente de novo.`;
  }
  return 'Algo deu errado ao consultar a IA.';
}

const BLOQUEIOS = new Set<string>([FinishReason.SAFETY, FinishReason.PROHIBITED_CONTENT, FinishReason.BLOCKLIST, FinishReason.SPII, FinishReason.RECITATION]);

export async function POST(req: NextRequest) {
  try {
    const { erro } = await exigirMembro(req);
    if (erro) return erro;

    const chave = process.env.GEMINI_API_KEY;
    if (!chave) {
      return NextResponse.json({ codigo: 'ia_nao_configurada', erro: 'A IA ainda não foi configurada: falta a variável GEMINI_API_KEY.' }, { status: 503 });
    }

    const corpo = corpoSchema.safeParse(await req.json().catch(() => null));
    if (!corpo.success) return NextResponse.json({ erro: 'Conversa em formato inválido.' }, { status: 400 });

    const dados = await carregarDados();
    const pseudo = pseudonimosDe(dados);
    const foto = montarFoto(dados, hojeISO(), pseudo);
    const ai = new GoogleGenAI({ apiKey: chave, ...(process.env.GEMINI_BASE_URL ? { httpOptions: { baseUrl: process.env.GEMINI_BASE_URL } } : {}) });

    // O histórico chega com nomes reais (é o que a equipe vê) e é anonimizado aqui, a cada envio.
    const conteudos: Content[] = corpo.data.mensagens.map((m) => ({
      role: m.papel === 'user' ? 'user' : 'model',
      parts: [{ text: anonimizarTexto(m.texto, pseudo) }],
    }));

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enviar = (ev: EventoIA) => controller.enqueue(encoder.encode(JSON.stringify(ev) + '\n'));
        let reenvios = 0;
        enviar({ tipo: 'nomes', nomes: pseudo.nomes });

        try {
          for (let etapa = 0; etapa < MAX_ETAPAS; etapa++) {
            enviar({ tipo: 'etapa' });

            const resposta = await ai.models.generateContentStream({
              model: MODELO,
              contents: conteudos,
              config: {
                systemInstruction: `${SISTEMA}\n\n<dados_do_qg>${foto}</dados_do_qg>`,
                tools: [{ functionDeclarations: [FUNCAO_PROPOR_TAREFA] }],
                maxOutputTokens: 8192,
                abortSignal: req.signal,
              },
            });

            // Guarda as partes exatamente como vieram: as assinaturas de raciocínio
            // precisam voltar intactas na próxima rodada.
            const partes: Part[] = [];
            let motivo: string | undefined;
            let bloqueioPedido: string | undefined;
            for await (const pedaco of resposta) {
              bloqueioPedido ??= pedaco.promptFeedback?.blockReason;
              const candidato = pedaco.candidates?.[0];
              motivo = candidato?.finishReason ?? motivo;
              for (const parte of candidato?.content?.parts ?? []) {
                partes.push(parte);
                if (parte.text && !parte.thought) enviar({ tipo: 'texto', texto: parte.text });
              }
            }

            if (bloqueioPedido || (motivo && BLOQUEIOS.has(motivo))) {
              enviar({ tipo: 'erro', mensagem: 'A IA não pôde responder a este pedido. Tente reformular.' });
              break;
            }
            if (motivo === FinishReason.MALFORMED_FUNCTION_CALL) {
              if (reenvios >= MAX_REENVIOS) {
                enviar({ tipo: 'erro', mensagem: 'A IA se confundiu ao montar uma sugestão. Tente perguntar de novo.' });
                break;
              }
              reenvios++;
              etapa--;
              enviar({ tipo: 'reenvio' });
              continue;
            }
            reenvios = 0;

            const chamadas = partes.filter((x) => x.functionCall);
            if (chamadas.length === 0) {
              if (motivo === FinishReason.MAX_TOKENS) enviar({ tipo: 'erro', mensagem: 'A resposta ficou longa demais e foi cortada. Peça algo mais específico.' });
              break;
            }
            // Entrada cortada pode parecer válida: não usa sugestões de uma resposta truncada.
            if (motivo === FinishReason.MAX_TOKENS) {
              enviar({ tipo: 'erro', mensagem: 'A resposta ficou longa demais e foi cortada. Peça algo mais específico.' });
              break;
            }

            conteudos.push({ role: 'model', parts: partes });
            conteudos.push({
              role: 'user',
              parts: chamadas.map(({ functionCall: fc }) => {
                const proposta = fc!.name === FUNCAO_PROPOR_TAREFA.name ? normalizarProposta(fc!.args, pseudo, dados) : null;
                const resultado = proposta
                  ? { resultado: 'Sugestão mostrada à equipe, aguardando aprovação. Nada foi criado ainda.' }
                  : { erro: 'Entrada inválida: confira os campos obrigatórios e os valores permitidos.' };
                if (proposta) {
                  enviar({ tipo: 'proposta', proposta: { ...proposta, titulo: desanonimizar(proposta.titulo, pseudo.nomes), justificativa: desanonimizar(proposta.justificativa, pseudo.nomes) } });
                }
                return { functionResponse: { name: fc!.name, response: resultado, ...(fc!.id ? { id: fc!.id } : {}) } };
              }),
            });
          }
          enviar({ tipo: 'fim' });
        } catch (e) {
          if (!req.signal.aborted) {
            console.error('Erro na IA', e);
            enviar({ tipo: 'erro', mensagem: mensagemDeErro(e) });
            enviar({ tipo: 'fim' });
          }
        } finally {
          try {
            controller.close();
          } catch {
            // A pessoa saiu da página no meio da resposta; o fluxo já foi cancelado.
          }
        }
      },
    });

    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch (e) {
    return erroInterno(e);
  }
}
