/**
 * Núcleo da sincronização do Classroom (spec, seções 6.6 e 8.1).
 *
 * Só funções puras: não chama nenhum serviço do Google nem o GitHub. O mesmo arquivo roda no
 * Apps Script (escopo global, junto com sincronizar.js) e nos testes (apps-script/nucleo.test.ts).
 * Por isso: sem import/export, só declarações `function` e `var` no topo.
 *
 * Privacidade (D-13 e 6.6): o JSON é montado por lista branca. Nenhum campo do Classroom passa
 * adiante sem ser escolhido aqui. Vídeos do YouTube só têm ID ou link publicados se o ID estiver
 * no conjunto de vídeos públicos; links de reunião nunca são publicados.
 */

var PASTA_JSON_CLASSROOM = 'src/data/classroom';

var AVISO_VIDEO = '(vídeo disponível no Classroom)';
var AVISO_REUNIAO = '(link disponível no Classroom)';

/** Hosts de reunião ou estúdio cujos links nunca vão para o site (6.6). */
var HOSTS_REUNIAO = [
  'meet.google.com',
  'teams.microsoft.com',
  'teams.live.com',
  'zoom.us',
  'streamyard.com',
  'whereby.com',
  'jitsi.org',
  'meet.jit.si',
];

var RE_URL = /https?:\/\/[^\s<>"')\]]+/gi;
var RE_ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;

function hostDaUrl(url) {
  var m = /^https?:\/\/([^/?#:]+)/i.exec(url);
  return m ? m[1].toLowerCase() : '';
}

function hostCasa(host, dominio) {
  return host === dominio || host.slice(-(dominio.length + 1)) === '.' + dominio;
}

function ehLinkDeReuniao(url) {
  var host = hostDaUrl(url);
  for (var i = 0; i < HOSTS_REUNIAO.length; i++) {
    if (hostCasa(host, HOSTS_REUNIAO[i])) return true;
  }
  return false;
}

/** ID de 11 caracteres de um link do YouTube, ou null se não for um vídeo do YouTube. */
function extrairIdYoutube(url) {
  if (typeof url !== 'string') return null;
  var host = hostDaUrl(url);
  var caminho = url.replace(/^https?:\/\/[^/]+/i, '').split('#')[0];
  var id = null;
  if (host === 'youtu.be') {
    id = caminho.split('?')[0].split('/')[1];
  } else if (hostCasa(host, 'youtube.com') || hostCasa(host, 'youtube-nocookie.com')) {
    var v = /[?&]v=([^&]+)/.exec(caminho);
    var p = /^\/(?:live|shorts|embed|v)\/([^/?]+)/.exec(caminho);
    id = v ? v[1] : p ? p[1] : null;
  }
  return id && RE_ID_YOUTUBE.test(id) ? id : null;
}

function encontrarUrls(texto) {
  if (typeof texto !== 'string' || !texto) return [];
  return texto.match(RE_URL) || [];
}

function urlDoYoutube(id) {
  return 'https://www.youtube.com/watch?v=' + id;
}

/** Converte valor (ID numérico ou link da turma) no ID numérico; null se inválido. Igual a idDoLinkDaTurma (src/lib/schemas.ts). */
function idDaTurma(valor) {
  var t = String(valor || '').trim();
  if (/^\d+$/.test(t)) return t;
  var m = /classroom\.google\.com\/(?:u\/\d+\/)?c\/([A-Za-z0-9_-]+)/.exec(t);
  var codigo = m ? m[1] : t;
  if (!/^[A-Za-z0-9_-]+$/.test(codigo)) return null;
  var id = decodificarBase64Url(codigo);
  return id !== null && /^\d+$/.test(id) ? id : null;
}

/** base64url → texto ASCII, sem depender de atob (ausente no Apps Script). */
function decodificarBase64Url(codigo) {
  var alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  var bits = 0;
  var acumulado = 0;
  var saida = '';
  for (var i = 0; i < codigo.length; i++) {
    var v = alfabeto.indexOf(codigo.charAt(i));
    if (v < 0) return null;
    acumulado = (acumulado << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      saida += String.fromCharCode((acumulado >> bits) & 0xff);
    }
  }
  return saida;
}

/** `COURSE_IDS` (separados por vírgula, espaço ou linha; IDs ou links) → IDs únicos. Lança erro com o valor inválido. */
function listarIdsDasTurmas(valor) {
  var partes = String(valor || '')
    .split(/[\s,;]+/)
    .filter(function (p) {
      return p;
    });
  var ids = [];
  partes.forEach(function (p) {
    var id = idDaTurma(p);
    if (!id) throw new Error('COURSE_IDS: valor inválido "' + p + '" (use o ID numérico ou o link da turma)');
    if (ids.indexOf(id) < 0) ids.push(id);
  });
  return ids;
}

function anexosBrutos(item) {
  return (item && item.materials) || [];
}

/**
 * Todos os IDs do YouTube que aparecem na turma (anexos, links, descrições e eventos), sem
 * repetição, para uma única consulta de privacyStatus.
 */
function idsYoutubeDaTurma(dados) {
  var ids = [];
  function incluir(id) {
    if (id && ids.indexOf(id) < 0) ids.push(id);
  }
  function deTexto(texto) {
    encontrarUrls(texto).forEach(function (u) {
      incluir(extrairIdYoutube(u));
    });
  }
  var itens = (dados.atividades || []).concat(dados.materiais || []);
  itens.forEach(function (item) {
    deTexto(item.description);
    anexosBrutos(item).forEach(function (m) {
      if (m.youtubeVideo) incluir(m.youtubeVideo.id);
      if (m.link) incluir(extrairIdYoutube(m.link.url));
    });
  });
  (dados.eventos || []).forEach(function (e) {
    (e.textos || []).forEach(deTexto);
  });
  return ids;
}

function criarEhPublico(publicos) {
  var conjunto = {};
  (publicos || []).forEach(function (id) {
    conjunto[id] = true;
  });
  return function (id) {
    return Boolean(id && conjunto[id] === true);
  };
}

/** Texto puro, com links de vídeos não públicos e de reunião trocados por avisos. */
function limparTexto(texto, ehPublico) {
  if (typeof texto !== 'string') return '';
  var limpo = texto.replace(/\r\n?/g, '\n').replace(RE_URL, function (url) {
    if (ehLinkDeReuniao(url)) return AVISO_REUNIAO;
    var id = extrairIdYoutube(url);
    if (id && !ehPublico(id)) return AVISO_VIDEO;
    return url;
  });
  return limpo.trim();
}

function montarAnexo(material, ehPublico) {
  if (material.youtubeVideo) {
    var id = material.youtubeVideo.id;
    return {
      tipo: 'youtube',
      titulo: material.youtubeVideo.title || 'Vídeo',
      youtubeId: ehPublico(id) ? id : null,
    };
  }
  if (material.driveFile && material.driveFile.driveFile) {
    var arquivo = material.driveFile.driveFile;
    return { tipo: 'drive', titulo: arquivo.title || 'Arquivo do Drive', url: arquivo.alternateLink || null };
  }
  if (material.form) {
    return { tipo: 'form', titulo: material.form.title || 'Formulário', url: material.form.formUrl || null };
  }
  if (material.link) {
    var url = material.link.url || '';
    var idLink = extrairIdYoutube(url);
    if (idLink) {
      return {
        tipo: 'youtube',
        titulo: material.link.title || 'Vídeo',
        youtubeId: ehPublico(idLink) ? idLink : null,
      };
    }
    var reuniao = ehLinkDeReuniao(url);
    return {
      tipo: 'link',
      titulo: reuniao ? 'Link da aula' : material.link.title || url,
      url: reuniao ? null : url || null,
    };
  }
  // Tipos desconhecidos (ou novos na API) ficam de fora: lista branca.
  return null;
}

function prazoDaAtividade(atividade, isoSaoPaulo) {
  var d = atividade.dueDate;
  if (!d || !d.year || !d.month || !d.day) return null;
  var t = atividade.dueTime || {};
  // dueDate e dueTime vêm em UTC; campos zerados são omitidos pela API.
  return isoSaoPaulo(new Date(Date.UTC(d.year, d.month - 1, d.day, t.hours || 0, t.minutes || 0)));
}

function montarItem(bruto, tipo, ehPublico, isoSaoPaulo, idsDosTopicos) {
  var publicado = bruto.scheduledTime || bruto.creationTime;
  var anexos = anexosBrutos(bruto)
    .map(function (m) {
      return montarAnexo(m, ehPublico);
    })
    .filter(function (a) {
      return a !== null;
    });
  return {
    id: String(bruto.id),
    tipo: tipo,
    titulo: bruto.title || '',
    descricao: limparTexto(bruto.description, ehPublico),
    topicoId: bruto.topicId && idsDosTopicos[bruto.topicId] ? String(bruto.topicId) : null,
    publicadoEm: publicado ? isoSaoPaulo(new Date(publicado)) : null,
    prazo: tipo === 'atividade' ? prazoDaAtividade(bruto, isoSaoPaulo) : null,
    anexos: anexos,
  };
}

function urlPublicaDoEvento(evento, ehPublico) {
  var textos = evento.textos || [];
  for (var i = 0; i < textos.length; i++) {
    var urls = encontrarUrls(textos[i]);
    for (var j = 0; j < urls.length; j++) {
      var id = extrairIdYoutube(urls[j]);
      if (id && ehPublico(id)) return urlDoYoutube(id);
    }
  }
  return null;
}

function comparar(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Monta o conteúdo do JSON (contrato 6.6), sem `geradoEm`.
 *
 * @param dados {curso, topicos, atividades, materiais, eventos}: curso, tópicos, atividades e
 *   materiais como vêm da API do Classroom (já filtrados por PUBLISHED); eventos já convertidos
 *   pelo adaptador em {titulo, inicio: Date, fim: Date, textos: string[]}.
 * @param publicos IDs do YouTube com privacyStatus = public.
 * @param isoSaoPaulo (Date) => "AAAA-MM-DDTHH:mm:ss-03:00".
 */
function montarConteudo(dados, publicos, isoSaoPaulo) {
  var ehPublico = criarEhPublico(publicos);
  var idsDosTopicos = {};
  // A API devolve os tópicos na ordem em que aparecem no Classroom; essa é a `ordem`.
  var topicos = (dados.topicos || []).map(function (t, i) {
    idsDosTopicos[t.topicId] = true;
    return { id: String(t.topicId), nome: t.name || '', ordem: i };
  });
  var itens = (dados.atividades || [])
    .map(function (a) {
      return montarItem(a, 'atividade', ehPublico, isoSaoPaulo, idsDosTopicos);
    })
    .concat(
      (dados.materiais || []).map(function (m) {
        return montarItem(m, 'material', ehPublico, isoSaoPaulo, idsDosTopicos);
      }),
    )
    .sort(function (a, b) {
      return comparar(a.publicadoEm || '', b.publicadoEm || '') || comparar(a.id, b.id);
    });
  var eventos = (dados.eventos || [])
    .map(function (e) {
      return {
        titulo: e.titulo || '',
        inicio: isoSaoPaulo(e.inicio),
        fim: isoSaoPaulo(e.fim),
        url: urlPublicaDoEvento(e, ehPublico),
      };
    })
    .sort(function (a, b) {
      return comparar(a.inicio, b.inicio) || comparar(a.titulo, b.titulo);
    });
  return {
    courseId: String(dados.curso.id),
    nome: dados.curso.name || '',
    topicos: topicos,
    itens: itens,
    eventos: eventos,
  };
}

/** Texto final do arquivo: `geradoEm` primeiro, 2 espaços e quebra de linha no fim (.editorconfig). */
function serializar(conteudo, geradoEm) {
  var saida = { geradoEm: geradoEm };
  Object.keys(conteudo).forEach(function (k) {
    saida[k] = conteudo[k];
  });
  return JSON.stringify(saida, null, 2) + '\n';
}

/** Forma comparável do arquivo: sem `geradoEm`. Null se o texto não for JSON válido. */
function semGeradoEm(texto) {
  try {
    var obj = JSON.parse(texto);
    if (!obj || typeof obj !== 'object') return null;
    delete obj.geradoEm;
    return JSON.stringify(obj);
  } catch (e) {
    return null;
  }
}

/** true se o conteúdo novo difere do arquivo atual do repositório (ignorando `geradoEm`). */
function conteudoMudou(textoAtual, conteudo) {
  if (textoAtual === null || textoAtual === undefined) return true;
  var atual = semGeradoEm(textoAtual);
  return atual === null || atual !== semGeradoEm(serializar(conteudo, ''));
}

function caminhoDoJson(courseId) {
  return PASTA_JSON_CLASSROOM + '/' + courseId + '.json';
}

/** Mensagem de commit sem dado pessoal (seção 10): só o nome da turma e o ID. */
function mensagemDeCommit(conteudo) {
  var nome = (conteudo.nome || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return 'Classroom: atualiza ' + (nome ? nome + ' ' : '') + '(' + conteudo.courseId + ')';
}
