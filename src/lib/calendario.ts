/**
 * "Adicionar ao calendário" da página da mentoria. Eventos de dia inteiro (datas de calendário,
 * sem fuso), conforme o status:
 * - em breve e inscrições abertas: o último dia de inscrição;
 * - inscrições encerradas e em andamento: o período da mentoria (início ao fim);
 * - encerrada: nenhum.
 * Funções puras (testadas com Vitest); o .ics é gerado no build em /mentorias/<id>.ics.
 */
import type { Cronograma, StatusMentoria } from './status';

export interface EventoCalendario {
  /** Identificador estável (UID do .ics). */
  uid: string;
  titulo: string;
  descricao: string;
  /** Primeiro dia, `YYYY-MM-DD`. */
  inicio: string;
  /** Último dia, inclusive, `YYYY-MM-DD`. */
  fim: string;
}

interface DadosMentoria extends Cronograma {
  titulo: string;
}

export function eventoCalendario(
  m: DadosMentoria,
  status: StatusMentoria,
  id: string,
  url: string,
): EventoCalendario | null {
  switch (status) {
    case 'em-breve':
    case 'inscricoes-abertas':
      return {
        uid: `${id}-inscricoes@alem-codigo.github.io`,
        titulo: `Último dia de inscrição: ${m.titulo}`,
        descricao: `Último dia para se inscrever na mentoria ${m.titulo} (Além do Código). ${url}`,
        inicio: m.inscricoes.fechamento,
        fim: m.inscricoes.fechamento,
      };
    case 'inscricoes-encerradas':
    case 'em-andamento':
      return {
        uid: `${id}-realizacao@alem-codigo.github.io`,
        titulo: `Mentoria: ${m.titulo}`,
        descricao: `Período da mentoria ${m.titulo} (Além do Código). Aulas, materiais e lives no Classroom. ${url}`,
        inicio: m.realizacao.inicio,
        fim: m.realizacao.fim,
      };
    case 'encerrada':
      return null;
  }
}

/** Dia seguinte a uma data de calendário, sem deslocamento de fuso (`2026-12-31` → `2027-01-01`). */
export function diaSeguinte(data: string): string {
  const [ano, mes, dia] = data.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(ano, mes - 1, dia + 1)).toISOString().slice(0, 10);
}

const compacta = (data: string) => data.replaceAll('-', '');

/** Links dos calendários na web. O fim de eventos de dia inteiro é exclusivo (dia seguinte). */
export function linksCalendario(e: EventoCalendario): { google: string; outlookPessoal: string; outlookEmpresa: string } {
  const fimExclusivo = diaSeguinte(e.fim);
  const google = new URL('https://calendar.google.com/calendar/render');
  google.search = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.titulo,
    dates: `${compacta(e.inicio)}/${compacta(fimExclusivo)}`,
    details: e.descricao,
  }).toString();

  const outlook = (host: string) => {
    const u = new URL(`https://${host}/calendar/0/action/compose`);
    u.search = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: e.titulo,
      body: e.descricao,
      startdt: e.inicio,
      enddt: fimExclusivo,
      allday: 'true',
    }).toString();
    return u.toString();
  };

  return {
    google: google.toString(),
    outlookPessoal: outlook('outlook.live.com'),
    outlookEmpresa: outlook('outlook.office.com'),
  };
}

/** Texto do .ics (RFC 5545): escapa `\ ; , quebras` e dobra linhas em 75 octetos. */
export function gerarIcs(e: EventoCalendario, agora: Date = new Date()): string {
  const escapar = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const carimbo = agora.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Além do Código//Mentorias//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${carimbo}`,
    `DTSTART;VALUE=DATE:${compacta(e.inicio)}`,
    `DTEND;VALUE=DATE:${compacta(diaSeguinte(e.fim))}`,
    `SUMMARY:${escapar(e.titulo)}`,
    `DESCRIPTION:${escapar(e.descricao)}`,
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return linhas.map(dobrar).join('\r\n') + '\r\n';
}

/** Dobra uma linha em pedaços de até 75 octetos UTF-8 (continuação começa com espaço). */
function dobrar(linha: string): string {
  const codificador = new TextEncoder();
  const partes: string[] = [];
  let atual = '';
  for (const c of linha) {
    const limite = partes.length === 0 ? 75 : 74;
    if (codificador.encode(atual + c).length > limite) {
      partes.push(atual);
      atual = c;
    } else {
      atual += c;
    }
  }
  partes.push(atual);
  return partes.join('\r\n ');
}
