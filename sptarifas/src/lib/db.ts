import { Pool, type PoolClient, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _viaductPool: Pool | undefined;
}

function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL_VIADUCT;
  if (!connectionString) {
    throw new Error("Falta la variable de entorno DATABASE_URL_VIADUCT.");
  }
  // ponytail: pool global reutilizado entre invocaciones serverless.
  if (!global._viaductPool) {
    global._viaductPool = new Pool({ connectionString, max: 3 });
  }
  return global._viaductPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const res = await getPool().query<T>(text, params as unknown[]);
  return res.rows;
}

export async function withTx<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
