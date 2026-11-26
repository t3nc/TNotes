export interface AppBindings {
  DB: D1Database;
  ASSETS: Fetcher;
  SETUP_TOKEN?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
}

export interface AppVariables {
  sessionId: string;
}

export type AppEnv = {
  Bindings: AppBindings;
  Variables: AppVariables;
};
