import {
  readCodexCliCredentialsCached,
  readMiniMaxCliCredentialsCached,
} from "../cli-credentials.js";
import {
  EXTERNAL_CLI_SYNC_TTL_MS,
  MINIMAX_CLI_PROFILE_ID,
  OPENAI_CODEX_DEFAULT_PROFILE_ID,
} from "./constants.js";
import { log } from "./constants.js";
import {
  areOAuthCredentialsEquivalent,
  hasUsableOAuthCredential,
  isSafeToOverwriteStoredOAuthIdentity,
  shouldBootstrapFromExternalCliCredential,
  shouldReplaceStoredOAuthCredential,
} from "./oauth-manager.js";
import type { AuthProfileStore, OAuthCredential } from "./types.js";

export {
  areOAuthCredentialsEquivalent,
  hasUsableOAuthCredential,
  isSafeToOverwriteStoredOAuthIdentity,
  shouldBootstrapFromExternalCliCredential,
  shouldReplaceStoredOAuthCredential,
} from "./oauth-manager.js";

export type ExternalCliResolvedProfile = {
  profileId: string;
  credential: OAuthCredential;
};

type ExternalCliSyncProvider = {
  profileId: string;
  provider: string;
  readCredentials: () => OAuthCredential | null;
};

const EXTERNAL_CLI_SYNC_PROVIDERS: ExternalCliSyncProvider[] = [
  {
    profileId: MINIMAX_CLI_PROFILE_ID,
    provider: "minimax-portal",
    readCredentials: () => readMiniMaxCliCredentialsCached({ ttlMs: EXTERNAL_CLI_SYNC_TTL_MS }),
  },
  {
    profileId: OPENAI_CODEX_DEFAULT_PROFILE_ID,
    provider: "openai-codex",
    readCredentials: () => readCodexCliCredentialsCached({ ttlMs: EXTERNAL_CLI_SYNC_TTL_MS }),
  },
];

function resolveExternalCliSyncProvider(params: {
  profileId: string;
  credential?: OAuthCredential;
}): ExternalCliSyncProvider | null {
  const provider = EXTERNAL_CLI_SYNC_PROVIDERS.find(
    (entry) => entry.profileId === params.profileId,
  );
  if (!provider) {
    return null;
  }
  if (params.credential && provider.provider !== params.credential.provider) {
    return null;
  }
  return provider;
}

export function readExternalCliBootstrapCredential(params: {
  profileId: string;
  credential: OAuthCredential;
}): OAuthCredential | null {
  const provider = resolveExternalCliSyncProvider(params);
  if (!provider) {
    return null;
  }
  return provider.readCredentials();
}

export const readManagedExternalCliCredential = readExternalCliBootstrapCredential;

export function resolveExternalCliAuthProfiles(
  store: AuthProfileStore,
): ExternalCliResolvedProfile[] {
  const profiles: ExternalCliResolvedProfile[] = [];
  const now = Date.now();
  for (const providerConfig of EXTERNAL_CLI_SYNC_PROVIDERS) {
    const creds = providerConfig.readCredentials();
    if (!creds) {
      continue;
    }
    const existing = store.profiles[providerConfig.profileId];
    const existingOAuth = existing?.type === "oauth" ? existing : undefined;
    if (
      existingOAuth &&
      !isSafeToOverwriteStoredOAuthIdentity(existingOAuth, creds) &&
      !areOAuthCredentialsEquivalent(existingOAuth, creds)
    ) {
      log.warn("refused external cli oauth bootstrap: identity mismatch or missing binding", {
        profileId: providerConfig.profileId,
        provider: providerConfig.provider,
      });
      continue;
    }
    if (
      !shouldBootstrapFromExternalCliCredential({
        existing: existingOAuth,
        imported: creds,
        now,
      })
    ) {
      if (existingOAuth) {
        log.debug("kept usable local oauth over external cli bootstrap", {
          profileId: providerConfig.profileId,
          provider: providerConfig.provider,
          localExpires: existingOAuth.expires,
          externalExpires: creds.expires,
        });
      }
      continue;
    }
    log.debug("used external cli oauth bootstrap because local oauth was missing or unusable", {
      profileId: providerConfig.profileId,
      provider: providerConfig.provider,
      localExpires: existingOAuth?.expires,
      externalExpires: creds.expires,
    });
    profiles.push({
      profileId: providerConfig.profileId,
      credential: creds,
    });
  }
  return profiles;
}
