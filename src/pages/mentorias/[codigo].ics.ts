/**
 * Arquivo .ics de "Adicionar ao calendário" (/mentorias/<id>.ics), gerado no build com o evento
 * conforme o status do dia (src/lib/calendario.ts). Mentorias encerradas não têm arquivo.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { eventoCalendario, gerarIcs } from '../../lib/calendario';
import { hojeEmSaoPaulo } from '../../lib/datas';
import { calcularStatus } from '../../lib/status';

export const getStaticPaths = (async () => {
  const hoje = hojeEmSaoPaulo();
  const mentorias = await getCollection('mentorias');
  return mentorias
    .filter((m) => calcularStatus(m.data, hoje) !== 'encerrada')
    .map((mentoria) => ({ params: { codigo: mentoria.id }, props: { mentoria } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props, site }) => {
  const { mentoria } = props as { mentoria: Awaited<ReturnType<typeof getCollection<'mentorias'>>>[number] };
  const url = new URL(`/mentorias/${mentoria.id}/`, site).toString();
  const evento = eventoCalendario(mentoria.data, calcularStatus(mentoria.data, hojeEmSaoPaulo()), mentoria.id, url)!;
  return new Response(gerarIcs(evento), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
