import { AsyncLocalStorage } from "node:async_hooks";
import postgres from "postgres";

type DatabaseClient = ReturnType<typeof postgres>;

const transactionContext = new AsyncLocalStorage<DatabaseClient>();
let databaseClient: DatabaseClient | undefined;

function connectionString() {
  return process.env.POSTGRES_URL?.trim() || process.env.DATABASE_URL?.trim() || "";
}

export function usesPostgres() {
  return connectionString().length > 0;
}

export function getDatabaseClient() {
  const transaction = transactionContext.getStore();
  if (transaction) return transaction;

  if (!databaseClient) {
    const url = connectionString();
    if (!url) throw new Error("POSTGRES_URL 또는 DATABASE_URL이 설정되지 않았습니다.");
    databaseClient = postgres(url, {
      // A single connection keeps the parallel table reads made by one page
      // request ordered when Supabase's transaction pooler is in use.
      max: 1,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 15,
    });
  }

  return databaseClient;
}

export async function withDataWriteLock<T>(operation: () => Promise<T>) {
  if (!usesPostgres()) return operation();
  if (transactionContext.getStore()) return operation();

  return getDatabaseClient().begin(async (transaction) => {
    await transaction.unsafe("select pg_advisory_xact_lock(hashtext('bo9jeong-data-write'))");
    return transactionContext.run(transaction as unknown as DatabaseClient, operation);
  }) as Promise<T>;
}

