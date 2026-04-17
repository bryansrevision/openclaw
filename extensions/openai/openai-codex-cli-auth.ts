import fs from "node:fs";
import path from "node:path";
import type { AuthProfileStore, OAuthCredential } from "openclaw/plugin-sdk/provider-auth";
import { resolveRequiredHomeDir } from "openclaw/plugin-sdk/provider-auth";
import { createSubsystemLogger } from "openclaw/plugin-sdk/runtime-env";
import {
  resolveCodexAccessTokenExpiry,
  resolveCodexAuthIdentity,
} from "./openai-codex-auth-identity.js";
import { trimNonEmptyString } from "./openai-codex-shared.js";

const PROVIDER_ID = "openai-codex";
const log = createSubsystemLogger("openai/codex-cli-auth");

export const CODEX_CLI_PROFILE_ID = `${PROVIDER_ID}:codex-cli`;
export const OPENAI_CODEX_DEFAULT_PROFILE_ID = `${PROVIDER_ID}:default`;

type CodexCliAuthFile = {
  auth_mode?: unknown;
  tokens?: {
    access_token?: unknown;
    refresh_token?: unknown;
    account_id?: unknown;
  };
};

function resolveCodexCliHome(env: NodeJS.ProcessEnv): string {
  const configured = trimNonEmptyString(env.CODEX_HOME);
  if (!configured) {
    return path.join(resolveRequiredHomeDir(), ".codex");
  }
  if (configured === "~") {
    return resolveRequiredHomeDir();
  }
  if (configured.startsWith("~/")) {
    return path.join(resolveRequiredHomeDir(), configured.slice(2));
  }
  return path.resolve(configured);
}

function readCodexCliAuthFile(env: NodeJS.ProcessEnv): CodexCliAuthFile | null {
  try {
    const authPath = path.join(resolveCodexCliHome(env), "auth.json");
    const raw = fs.readFileSync(authPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as CodexCliAuthFile) : null;
  } catch (error) {
    const code =
      error instanceof SyntaxError
        ? "INVALID_JSON"
        : error instanceof Error && "code" in error
          ? (error as NodeJS.ErrnoException).code
          : undefined;
    if (code === "ENOENT") {
      return null;
    }
    log.debug(
      `Failed to read Codex CLI auth file (code=${typeof code === "string" ? code : "UNKNOWN"})`,
    );
    return null;
  }
}

function oauthCredentialMatches(a: OAuthCredential, b: OAuthCredential): boolean {
  return (
    a.type === b.type &&
    a.provider === b.provider &&
    a.access === b.access &&
    a.refresh === b.refresh &&
    a.clientId === b.clientId &&
    a.email === b.email &&
    a.displayName === b.displayName &&
    a.enterpriseUrl === b.enterpriseUrl &&
    a.projectId === b.projectId &&
    a.accountId === b.accountId
  );
}

function normalizeIdentityToken(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeEmailToken(value: string | undefined): string | undefined {
  return normalizeIdentityToken(value)?.toLowerCase();
}

function hasIdentityContinuity(existing: unknown, incoming: OAuthCredential): boolean {
  if (
    !existing ||
    typeof existing !== "object" ||
    existing === null ||
    !("type" in existing) ||
    !("provider" in existing) ||
    existing.type !== "oauth" ||
    existing.provider !== PROVIDER_ID
  ) {
    return true;
  }
  if (oauthCredentialMatches(existing, incoming)) {
    return true;
  }

  const existingAccountId = normalizeIdentityToken(existing.accountId);
  const incomingAccountId = normalizeIdentityToken(incoming.accountId);
  if (existingAccountId !== undefined && incomingAccountId !== undefined) {
    return existingAccountId === incomingAccountId;
  }

  const existingEmail = normalizeEmailToken(existing.email);
  const incomingEmail = normalizeEmailToken(incoming.email);
  if (existingEmail !== undefined && incomingEmail !== undefined) {
    return existingEmail === incomingEmail;
  }

  return false;
}

function hasUsableStoredOpenAICodexCredential(
  credential: unknown,
  now = Date.now(),
): credential is OAuthCredential {
  return Boolean(
    credential &&
    typeof credential === "object" &&
    credential !== null &&
    "type" in credential &&
    "provider" in credential &&
    "access" in credential &&
    "expires" in credential &&
    credential.type === "oauth" &&
    credential.provider === PROVIDER_ID &&
    typeof credential.access === "string" &&
    credential.access.trim().length > 0 &&
    typeof credential.expires === "number" &&
    Number.isFinite(credential.expires) &&
    now < credential.expires,
  );
}

export function readOpenAICodexCliOAuthProfile(params: {
  env?: NodeJS.ProcessEnv;
  store: AuthProfileStore;
}): { profileId: string; credential: OAuthCredential } | null {
  const authFile = readCodexCliAuthFile(params.env ?? process.env);
  if (!authFile || authFile.auth_mode !== "chatgpt") {
    return null;
  }

  const access = trimNonEmptyString(authFile.tokens?.access_token);
  const refresh = trimNonEmptyString(authFile.tokens?.refresh_token);
  if (!access || !refresh) {
    return null;
  }

  const accountId = trimNonEmptyString(authFile.tokens?.account_id);
  const identity = resolveCodexAuthIdentity({ accessToken: access });
  const credential: OAuthCredential = {
    type: "oauth",
    provider: PROVIDER_ID,
    access,
    refresh,
    expires: resolveCodexAccessTokenExpiry(access) ?? 0,
    ...(accountId ? { accountId } : {}),
    ...(identity.email ? { email: identity.email } : {}),
    ...(identity.profileName ? { displayName: identity.profileName } : {}),
  };
  const existing = params.store.profiles[OPENAI_CODEX_DEFAULT_PROFILE_ID];
  const existingOAuth =
    existing?.type === "oauth" && existing.provider === PROVIDER_ID ? existing : undefined;
  if (existing && !existingOAuth) {
    return null;
  }
  if (!hasIdentityContinuity(existingOAuth, credential)) {
    return null;
  }
  if (
    hasUsableStoredOpenAICodexCredential(existingOAuth) &&
    !oauthCredentialMatches(existingOAuth, credential)
  ) {
    return null;
  }

  return {
    profileId: OPENAI_CODEX_DEFAULT_PROFILE_ID,
    credential,
  };
}
