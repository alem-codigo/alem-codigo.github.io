/**
 * Login com a conta Google do aluno (D-34), pelo Google Identity Services no modelo de token:
 * o navegador recebe um token de acesso de ~1 hora, só com os escopos de leitura do Classroom,
 * sem backend e sem segredo (o client ID é público). O script do Google só é baixado quando o
 * aluno se aproxima do botão. O token fica no `sessionStorage` da aba (some ao fechar a aba) para
 * não pedir login a cada página; "Sair" o apaga.
 */
import { ESCOPOS_CLASSROOM } from './classroomApi';

interface RespostaToken {
  access_token?: string;
  expires_in?: number | string;
  error?: string;
}

interface ClienteToken {
  requestAccessToken(opcoes?: { prompt?: string }): void;
}

interface GoogleOAuth2 {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (r: RespostaToken) => void;
    error_callback?: (e: { type?: string }) => void;
  }): ClienteToken;
  hasGrantedAllScopes(r: RespostaToken, ...escopos: string[]): boolean;
}

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOAuth2 } };
  }
}

export type MotivoLogin = 'carregar' | 'bloqueado' | 'cancelado' | 'escopo' | 'negado';

export class ErroLogin extends Error {
  constructor(readonly motivo: MotivoLogin) {
    super(`login: ${motivo}`);
    this.name = 'ErroLogin';
  }
}

const SCRIPT_GOOGLE = 'https://accounts.google.com/gsi/client';
const CHAVE = 'portal-classroom-token';
/** Margem para não usar um token a poucos segundos de expirar. */
const MARGEM_MS = 60_000;

let carregamento: Promise<GoogleOAuth2> | undefined;

export const googleCarregado = (): boolean => Boolean(window.google?.accounts?.oauth2);

export function carregarGoogle(): Promise<GoogleOAuth2> {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google.accounts.oauth2);
  carregamento ??= new Promise<GoogleOAuth2>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_GOOGLE;
    script.async = true;
    script.onload = () => {
      const oauth2 = window.google?.accounts?.oauth2;
      if (oauth2) resolve(oauth2);
      else reject(new ErroLogin('carregar'));
    };
    script.onerror = () => {
      carregamento = undefined;
      script.remove();
      reject(new ErroLogin('carregar'));
    };
    document.head.append(script);
  });
  return carregamento;
}

/**
 * Abre o login do Google (janela própria). Precisa ser chamado no clique, com o script já
 * carregado: depois de um `await`, o navegador pode bloquear a janela.
 */
export function pedirToken(oauth2: GoogleOAuth2, clientId: string, trocarConta = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const cliente = oauth2.initTokenClient({
      client_id: clientId,
      scope: ESCOPOS_CLASSROOM.join(' '),
      callback: (r) => {
        if (r.error || !r.access_token) return reject(new ErroLogin('negado'));
        if (!oauth2.hasGrantedAllScopes(r, ...ESCOPOS_CLASSROOM)) return reject(new ErroLogin('escopo'));
        salvarToken(r.access_token, Number(r.expires_in) || 3600);
        resolve(r.access_token);
      },
      error_callback: (e) =>
        reject(new ErroLogin(e.type === 'popup_failed_to_open' ? 'bloqueado' : 'cancelado')),
    });
    cliente.requestAccessToken({ prompt: trocarConta ? 'select_account' : '' });
  });
}

function salvarToken(token: string, segundos: number): void {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify({ token, expira: Date.now() + segundos * 1000 }));
  } catch {
    // Sem sessionStorage (aba privada restrita): o login vale só até recarregar a página.
  }
}

export function tokenSalvo(): string | null {
  try {
    const salvo = JSON.parse(sessionStorage.getItem(CHAVE) ?? 'null') as { token?: string; expira?: number } | null;
    if (salvo?.token && typeof salvo.expira === 'number' && salvo.expira - MARGEM_MS > Date.now()) return salvo.token;
    esquecerToken();
  } catch {
    // Valor corrompido ou sem acesso ao storage.
  }
  return null;
}

export function esquecerToken(): void {
  try {
    sessionStorage.removeItem(CHAVE);
  } catch {
    // Nada a apagar.
  }
}
