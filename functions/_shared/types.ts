export type Env = {
  DB?: D1Database;
  db?: D1Database;
  RECORDINGS: R2Bucket;
  SESSION_SECRET: string;
  ADMIN_PASSWORD?: string;
};

export function getDb(env: Env) {
  return env.DB ?? env.db;
}

export type User = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

export type RecordRow = {
  id: string;
  user_id: string;
  type: "daily" | "breath";
  question: string;
  category: string | null;
  question_type: string | null;
  question_type_title: string | null;
  duration_seconds: number;
  r2_key: string;
  mime_type: string;
  created_at: string;
};

export type D1Database = {
  prepare(query: string): D1PreparedStatement;
};

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
};

export type R2Bucket = {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
    options?: {
      httpMetadata?: {
        contentType?: string;
      };
    },
  ): Promise<unknown>;
  get(
    key: string,
    options?: {
      range?: {
        offset: number;
        length?: number;
      };
    },
  ): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
};

export type R2ObjectBody = {
  body: ReadableStream;
  size: number;
  httpMetadata?: {
    contentType?: string;
  };
  writeHttpMetadata(headers: Headers): void;
};

export type PagesContext<Params = Record<string, string>> = {
  request: Request;
  env: Env;
  params: Params;
};
