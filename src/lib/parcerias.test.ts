import { describe, expect, it } from 'vitest';
import { linkMailto, parceriasDoCadastro, type MentoriaDeParceria } from './parcerias';

const mentoria = (
  codigo: string,
  inicio: string,
  extra: Partial<MentoriaDeParceria<string>> = {},
): MentoriaDeParceria<string> => ({
  id: codigo.toLowerCase(),
  codigo,
  titulo: `Mentoria ${codigo}`,
  realizacao: { inicio, fim: inicio },
  ...extra,
});

const tcs = (logo = 'tcs.svg', nome = 'TCS', exibirEmParcerias = true) => ({
  nome,
  logo,
  url: 'https://tcs.example/',
  exibirEmParcerias,
});

describe('parceriasDoCadastro', () => {
  it('ignora mentorias sem parceiro e devolve lista vazia sem nenhuma', () => {
    expect(parceriasDoCadastro([mentoria('M26-01', '2026-03-01')])).toEqual([]);
  });

  it('agrupa pelo nome normalizado e usa nome, logo e site da mentoria mais recente', () => {
    const [p, ...resto] = parceriasDoCadastro([
      mentoria('M26-01', '2026-03-01', { parceiro: tcs('antiga.svg', 'tcs ') }),
      mentoria('M26-04', '2026-05-11', { parceiro: tcs('nova.svg', 'TCS') }),
    ]);
    expect(resto).toEqual([]);
    expect(p).toMatchObject({ slug: 'tcs', nome: 'TCS', logo: 'nova.svg' });
    expect(p!.mentorias.map((m) => m.codigo)).toEqual(['M26-04', 'M26-01']);
  });

  it('ordena as parcerias pela mentoria mais recente', () => {
    const lista = parceriasDoCadastro([
      mentoria('M26-01', '2026-03-01', { parceiro: { nome: 'Qlik', logo: 'q', url: 'https://q.example/', exibirEmParcerias: true } }),
      mentoria('M26-04', '2026-05-11', { parceiro: tcs() }),
    ]);
    expect(lista.map((p) => p.nome)).toEqual(['TCS', 'Qlik']);
  });

  it('só inclui empresas autorizadas; basta uma mentoria marcada', () => {
    const lista = parceriasDoCadastro([
      mentoria('M26-01', '2026-03-01', { parceiro: { nome: 'Qlik', logo: 'q', url: 'https://q.example/', exibirEmParcerias: false } }),
      mentoria('M26-02', '2026-04-01', { parceiro: tcs('tcs.svg', 'TCS', true) }),
      mentoria('M26-04', '2026-05-11', { parceiro: tcs('tcs.svg', 'TCS', false) }),
    ]);
    expect(lista.map((p) => p.nome)).toEqual(['TCS']);
    expect(lista[0]!.mentorias.map((m) => m.codigo)).toEqual(['M26-04', 'M26-02']);
  });

  it('usa a logo do tema escuro da mentoria mais recente', () => {
    const [p] = parceriasDoCadastro([
      mentoria('M26-01', '2026-03-01', { parceiro: { ...tcs(), logoEscura: 'antiga-branca.svg' } }),
      mentoria('M26-04', '2026-05-11', { parceiro: tcs('nova.svg') }),
    ]);
    expect(p).toMatchObject({ logo: 'nova.svg', logoEscura: undefined });
  });

  it('soma inscritos e concluintes só das turmas que informaram', () => {
    const [p] = parceriasDoCadastro([
      mentoria('M26-01', '2026-03-01', { parceiro: tcs(), resultado: { inscritos: 40, depoimentos: [] } }),
      mentoria('M26-04', '2026-05-11', {
        parceiro: tcs(),
        resultado: { inscritos: 140, concluintes: 26, depoimentos: [] },
      }),
      mentoria('M26-06', '2026-08-01', { parceiro: tcs() }),
    ]);
    expect(p).toMatchObject({ inscritos: 180, concluintes: 26 });
  });

  it('sem números informados, deixa inscritos, concluintes e avaliação indefinidos', () => {
    const [p] = parceriasDoCadastro([mentoria('M26-04', '2026-05-11', { parceiro: tcs() })]);
    expect(p!.inscritos).toBeUndefined();
    expect(p!.concluintes).toBeUndefined();
    expect(p!.avaliacao).toBeUndefined();
  });

  it('pondera a média pelas respostas e só publica com o mínimo de respostas somadas', () => {
    const resultado = (media: number, respostas: number) => ({ avaliacao: { media, respostas }, depoimentos: [] });
    const [poucas] = parceriasDoCadastro([
      mentoria('M26-01', '2026-03-01', { parceiro: tcs(), resultado: resultado(5, 2) }),
      mentoria('M26-04', '2026-05-11', { parceiro: tcs(), resultado: resultado(4, 2) }),
    ]);
    expect(poucas!.avaliacao).toBeUndefined();

    const [somadas] = parceriasDoCadastro([
      mentoria('M26-01', '2026-03-01', { parceiro: tcs(), resultado: resultado(5, 3) }),
      mentoria('M26-04', '2026-05-11', { parceiro: tcs(), resultado: resultado(4, 2) }),
    ]);
    expect(somadas!.avaliacao).toEqual({ media: 4.6, respostas: 5 });
  });
});

describe('linkMailto', () => {
  it('codifica assunto e corpo e mantém o +parcerias do endereço', () => {
    const link = linkMailto({
      email: 'programa+parcerias@gmail.com',
      assunto: '[Parceria] Interesse & mentoria',
      corpo: 'Empresa:\r\nNome e cargo:',
    });
    expect(link).toBe(
      'mailto:programa+parcerias@gmail.com?subject=%5BParceria%5D%20Interesse%20%26%20mentoria&body=Empresa%3A%0D%0ANome%20e%20cargo%3A',
    );
  });
});
