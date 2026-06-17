import { appendFileSync } from "node:fs";
import { join } from "node:path";

const LOG_PATH = join(process.cwd(), "..", "debug-ce99ac.log");

export async function POST(req: Request) {
  try {
    const line = await req.text();
    appendFileSync(LOG_PATH, `${line.trim()}\n`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
