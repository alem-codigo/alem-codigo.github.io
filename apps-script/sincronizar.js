/**
 * Sincronização Classroom → repositório (spec, seção 8.1). Roda na conta Google do programa,
 * dona das turmas. A lógica e a lista branca estão em nucleo.js; aqui ficam só as chamadas ao
 * Classroom, à Agenda, ao YouTube e ao GitHub.
 *
 * Funções para rodar pelo editor do Apps Script:
 *   verificarConfiguracao  confere as propriedades e o acesso a cada turma, sem gravar nada
 *   simular                monta o JSON de cada turma e mostra no registro, sem gravar nada
 *   sincronizar            monta e faz commit quando o conteúdo mudou (é a que o gatilho chama)
 *   instalarGatilho        cria (ou recria) o gatilho de hora em hora
 *
 * Script Properties: COURSE_IDS, GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH (padrão main) e,
 * opcional, GITHUB_AUTOR_EMAIL (e-mail noreply do GitHub para autor dos commits).
 */

var FUSO = 'America/Sao_Paulo';
var DIAS_DE_AGENDA = 60;
var TAMANHO_LOTE_YOUTUBE = 50;
var NOME_AUTOR_COMMIT = 'Sincronização do Classroom';

function sincronizar() {
  executar_(true);
}

function simular() {
  executar_(false);
}

function instalarGatilho() {
  ScriptApp.getProjectTriggers().forEach(function (g) {
    if (g.getHandlerFunction() === 'sincronizar') ScriptApp.deleteTrigger(g);
  });
  ScriptApp.newTrigger('sincronizar').timeBased().everyHours(1).create();
  console.log('Gatilho de hora em hora criado para sincronizar().');
}

function verificarConfiguracao() {
  var cfg = lerConfiguracao_();
  console.log('Repositório: %s (branch %s)', cfg.repo, cfg.branch);
  console.log('Autor dos commits: %s', cfg.autorEmail ? cfg.autorEmail : 'padrão do token (confira se é o e-mail noreply)');
  var resposta = chamarGitHub_(cfg, 'get', '/repos/' + cfg.repo);
  if (resposta.codigo !== 200) throw new Error('GitHub respondeu ' + resposta.codigo + ' ao ler o repositório. Confira GITHUB_REPO e GITHUB_TOKEN.');
  console.log('Token com acesso ao repositório: ok');
  cfg.turmas.forEach(function (id) {
    var curso = Classroom.Courses.get(id);
    var agenda = curso.calendarId ? CalendarApp.getCalendarById(curso.calendarId) : null;
    console.log('Turma %s: "%s" (%s); agenda %s', id, curso.name, curso.courseState, agenda ? 'ok' : 'indisponível');
  });
}

function executar_(gravar) {
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(5000)) {
    console.warn('Outra execução está em andamento; esta foi ignorada.');
    return;
  }
  try {
    var cfg = lerConfiguracao_();
    var erros = [];
    cfg.turmas.forEach(function (id) {
      try {
        sincronizarTurma_(id, cfg, gravar);
      } catch (e) {
        console.error('Turma %s: %s', id, e && e.stack ? e.stack : e);
        erros.push(id + ': ' + (e && e.message ? e.message : e));
      }
    });
    // Lançar no fim faz o Apps Script enviar o e-mail nativo de falha do gatilho (8.1).
    if (erros.length) throw new Error('Falha em ' + erros.length + ' turma(s):\n' + erros.join('\n'));
  } finally {
    trava.releaseLock();
  }
}

function sincronizarTurma_(courseId, cfg, gravar) {
  var dados = lerTurma_(courseId);
  var publicos = consultarVideosPublicos_(idsYoutubeDaTurma(dados));
  var conteudo = montarConteudo(dados, publicos, isoSaoPaulo_);
  var caminho = caminhoDoJson(courseId);

  if (!gravar) {
    console.log('Simulação de %s:\n%s', caminho, serializar(conteudo, isoSaoPaulo_(new Date())));
    return;
  }

  for (var tentativa = 1; tentativa <= 2; tentativa++) {
    var atual = lerArquivo_(cfg, caminho);
    if (!conteudoMudou(atual ? atual.texto : null, conteudo)) {
      console.log('%s: sem mudanças.', caminho);
      return;
    }
    var codigo = gravarArquivo_(cfg, caminho, serializar(conteudo, isoSaoPaulo_(new Date())), atual ? atual.sha : null, mensagemDeCommit(conteudo));
    if (codigo === 200 || codigo === 201) {
      console.log('%s: commit feito.', caminho);
      return;
    }
    // 409: o arquivo mudou entre a leitura e a gravação (outro commit no meio). Lê de novo e tenta mais uma vez.
    if (codigo !== 409 || tentativa === 2) throw new Error('GitHub respondeu ' + codigo + ' ao gravar ' + caminho);
  }
}

// ---------- Configuração ----------

function lerConfiguracao_() {
  var p = PropertiesService.getScriptProperties().getProperties();
  var faltando = ['COURSE_IDS', 'GITHUB_TOKEN', 'GITHUB_REPO'].filter(function (k) {
    return !p[k] || !String(p[k]).trim();
  });
  if (faltando.length) throw new Error('Script Properties ausentes: ' + faltando.join(', '));
  return {
    turmas: listarIdsDasTurmas(p.COURSE_IDS),
    token: String(p.GITHUB_TOKEN).trim(),
    repo: String(p.GITHUB_REPO).trim(),
    branch: String(p.GITHUB_BRANCH || 'main').trim(),
    autorEmail: p.GITHUB_AUTOR_EMAIL ? String(p.GITHUB_AUTOR_EMAIL).trim() : null,
  };
}

// ---------- Google ----------

function isoSaoPaulo_(data) {
  return Utilities.formatDate(data, FUSO, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function listarTodas_(chamar, campo) {
  var todas = [];
  var token;
  do {
    var resposta = chamar(token) || {};
    todas = todas.concat(resposta[campo] || []);
    token = resposta.nextPageToken;
  } while (token);
  return todas;
}

function lerTurma_(courseId) {
  var curso = Classroom.Courses.get(courseId);
  var topicos = listarTodas_(function (t) {
    return Classroom.Courses.Topics.list(courseId, { pageSize: 100, pageToken: t });
  }, 'topic');
  // Só PUBLISHED: rascunhos e itens agendados ficam de fora (6.6).
  var atividades = listarTodas_(function (t) {
    return Classroom.Courses.CourseWork.list(courseId, { courseWorkStates: ['PUBLISHED'], pageSize: 100, pageToken: t });
  }, 'courseWork');
  var materiais = listarTodas_(function (t) {
    return Classroom.Courses.CourseWorkMaterials.list(courseId, { courseWorkMaterialStates: ['PUBLISHED'], pageSize: 100, pageToken: t });
  }, 'courseWorkMaterial');
  return { curso: curso, topicos: topicos, atividades: atividades, materiais: materiais, eventos: lerEventos_(curso) };
}

/** Eventos da agenda da turma de hoje (00:00 em São Paulo) até DIAS_DE_AGENDA dias depois. */
function lerEventos_(curso) {
  if (!curso.calendarId) return [];
  var agenda = CalendarApp.getCalendarById(curso.calendarId);
  if (!agenda) {
    console.warn('Turma %s: agenda %s indisponível para esta conta.', curso.id, curso.calendarId);
    return [];
  }
  // Janela ancorada no início do dia: o conjunto de eventos só muda uma vez por dia, sem commits a cada hora.
  var inicio = Utilities.parseDate(Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd'), FUSO, 'yyyy-MM-dd');
  var fim = new Date(inicio.getTime() + DIAS_DE_AGENDA * 24 * 60 * 60 * 1000);
  return agenda.getEvents(inicio, fim).map(function (e) {
    // Só o necessário para o núcleo: título, horários e os textos onde pode haver o link da live.
    return { titulo: e.getTitle(), inicio: e.getStartTime(), fim: e.getEndTime(), textos: [e.getLocation(), e.getDescription()] };
  });
}

/** IDs com privacyStatus = public. Em falha, o lote é tratado como não público (8.1, passo 3). */
function consultarVideosPublicos_(ids) {
  var publicos = [];
  for (var i = 0; i < ids.length; i += TAMANHO_LOTE_YOUTUBE) {
    var lote = ids.slice(i, i + TAMANHO_LOTE_YOUTUBE);
    try {
      var resposta = YouTube.Videos.list('status', { id: lote.join(','), maxResults: TAMANHO_LOTE_YOUTUBE });
      (resposta.items || []).forEach(function (v) {
        if (v.status && v.status.privacyStatus === 'public') publicos.push(v.id);
      });
    } catch (e) {
      console.warn('Consulta ao YouTube falhou; %s vídeo(s) tratados como não públicos: %s', lote.length, e);
    }
  }
  return publicos;
}

// ---------- GitHub (Contents API) ----------

function chamarGitHub_(cfg, metodo, caminho, corpo) {
  var opcoes = {
    method: metodo,
    muteHttpExceptions: true,
    headers: {
      Authorization: 'Bearer ' + cfg.token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  };
  if (corpo) {
    opcoes.contentType = 'application/json';
    opcoes.payload = JSON.stringify(corpo);
  }
  var r = UrlFetchApp.fetch('https://api.github.com' + caminho, opcoes);
  return { codigo: r.getResponseCode(), texto: r.getContentText() };
}

function urlDoArquivo_(cfg, caminho) {
  return '/repos/' + cfg.repo + '/contents/' + caminho.split('/').map(encodeURIComponent).join('/');
}

/** {sha, texto} do arquivo no branch, ou null se ainda não existe. */
function lerArquivo_(cfg, caminho) {
  var r = chamarGitHub_(cfg, 'get', urlDoArquivo_(cfg, caminho) + '?ref=' + encodeURIComponent(cfg.branch));
  if (r.codigo === 404) return null;
  if (r.codigo !== 200) throw new Error('GitHub respondeu ' + r.codigo + ' ao ler ' + caminho);
  var json = JSON.parse(r.texto);
  var bytes = Utilities.base64Decode(String(json.content || '').replace(/\s/g, ''));
  return { sha: json.sha, texto: Utilities.newBlob(bytes).getDataAsString('UTF-8') };
}

/** Faz o commit e devolve o código HTTP (200/201 ok; 409 conflito). */
function gravarArquivo_(cfg, caminho, texto, sha, mensagem) {
  var corpo = {
    message: mensagem,
    content: Utilities.base64Encode(texto, Utilities.Charset.UTF_8),
    branch: cfg.branch,
  };
  if (sha) corpo.sha = sha;
  if (cfg.autorEmail) {
    corpo.author = { name: NOME_AUTOR_COMMIT, email: cfg.autorEmail };
    corpo.committer = { name: NOME_AUTOR_COMMIT, email: cfg.autorEmail };
  }
  var r = chamarGitHub_(cfg, 'put', urlDoArquivo_(cfg, caminho), corpo);
  if (r.codigo !== 200 && r.codigo !== 201 && r.codigo !== 409) {
    // O corpo de erro do GitHub não contém o token; ajuda a diagnosticar permissão e ruleset.
    console.error('PUT %s: %s %s', caminho, r.codigo, r.texto.slice(0, 500));
  }
  return r.codigo;
}
