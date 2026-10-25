import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import {
  codigoMentoria,
  cronograma,
  idTurmaClassroom,
  listaDeTextos,
  opcional,
  slugDoCodigo,
  texto,
  urlHttps,
  validarCronograma,
} from './lib/schemas';

/** ID da entrada = nome do arquivo (é o slug usado nas URLs e nas referências). */
const eixos = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: './src/content/eixos' }),
  schema: z.object({
    numero: z.number().int().positive(),
    titulo: texto,
    descricao: texto,
    ordem: z.number().int(),
  }),
});

/**
 * Selos livres exibidos nos cards ao lado do status (ex.: "Exclusiva para mulheres", "Em parceria").
 * Só o nome: o estilo é único por tema (D-17). ID = nome do arquivo.
 */
const selos = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: './src/content/selos' }),
  schema: z.object({
    nome: texto,
  }),
});

const mentores = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: './src/content/mentores' }),
  schema: ({ image }) =>
    z.object({
      nome: texto,
      foto: image(),
      bio: texto,
      cargo: texto,
      empresa: opcional(texto),
      linkedin: opcional(urlHttps),
      github: opcional(urlHttps),
    }),
});

const mentorias = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/mentorias',
    // A URL vem do código (M1.26A → m1-26a), independentemente do nome do arquivo.
    generateId: ({ entry, data }) =>
      typeof data.codigo === 'string' ? slugDoCodigo(data.codigo) : entry.replace(/\.md$/, ''),
  }),
  schema: ({ image }) =>
    cronograma
      .extend({
        codigo: codigoMentoria,
        titulo: texto,
        resumo: texto,
        cursos: z.array(texto).min(1, 'Informe ao menos um curso elegível'),
        prerequisitos: listaDeTextos,
        eixos: z.array(reference('eixos')).min(1, 'Selecione ao menos um eixo'),
        mentores: z.array(reference('mentores')).min(1, 'Selecione ao menos um mentor'),
        selos: z.preprocess((v) => (v === null || v === undefined ? [] : v), z.array(reference('selos'))),
        formUrl: urlHttps,
        classroomCourseId: opcional(idTurmaClassroom),
        parceiro: opcional(z.object({ nome: texto, logo: image(), url: urlHttps })),
        capa: opcional(image()),
      })
      .superRefine(validarCronograma),
});

export const collections = { eixos, mentores, mentorias, selos };
