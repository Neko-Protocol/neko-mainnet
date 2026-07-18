import { buildTransactionServer } from "@/lib/helpers/stellar/swap-kit/server";
import type { BuildRequest } from "@/lib/helpers/stellar/swap-kit";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as BuildRequest;
    return Response.json(await buildTransactionServer(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 400 });
  }
}
