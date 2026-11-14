import { NextResponse } from "next/server";
import { ID, Query } from "appwrite";
import { z } from "zod";
import {
  getAppwriteAdminServices,
  getAuthenticatedAppwriteUser
} from "@/lib/appwrite/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createEscrowSchema = z.object({
  payeeUserId: z.string().min(1).max(64),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().min(1).max(5000),
  // Integer zatoshi avoids floating-point currency errors.
  amountZatoshi: z.number().int().positive().safe()
}).strict();

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

async function authenticate(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  try {
    return await getAuthenticatedAppwriteUser(match[1]);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const user = await authenticate(request);
  if (!user) return json({ error: "Authentication required." }, 401);

  try {
    const { tablesDB, databaseId, tableId } = getAppwriteAdminServices();
    const [payerRows, payeeRows] = await Promise.all([
      tablesDB.listRows({
        databaseId,
        tableId,
        queries: [Query.equal("payerUserId", user.$id), Query.orderDesc("$createdAt"), Query.limit(100)]
      }),
      tablesDB.listRows({
        databaseId,
        tableId,
        queries: [Query.equal("payeeUserId", user.$id), Query.orderDesc("$createdAt"), Query.limit(100)]
      })
    ]);

    const uniqueRows = new Map<string, unknown>();
    for (const row of [...payerRows.rows, ...payeeRows.rows]) {
      uniqueRows.set(row.$id, row);
    }

    return json({ rows: [...uniqueRows.values()] });
  } catch {
    return json({ error: "Unable to load escrow records. Check the Appwrite server configuration." }, 503);
  }
}

export async function POST(request: Request) {
  const user = await authenticate(request);
  if (!user) return json({ error: "Authentication required." }, 401);

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: "Cross-origin requests are not allowed." }, 403);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const parsed = createEscrowSchema.safeParse(rawBody);
  if (!parsed.success) {
    return json({ error: "Invalid escrow payload.", details: parsed.error.flatten() }, 400);
  }

  if (parsed.data.payeeUserId === user.$id) {
    return json({ error: "The payer and payee must be different accounts." }, 400);
  }

  try {
    const { tablesDB, databaseId, tableId } = getAppwriteAdminServices();
    const row = await tablesDB.createRow({
      databaseId,
      tableId,
      rowId: ID.unique(),
      data: {
        payerUserId: user.$id,
        payeeUserId: parsed.data.payeeUserId,
        title: parsed.data.title,
        description: parsed.data.description,
        amountZatoshi: parsed.data.amountZatoshi,
        status: "draft"
      }
    });

    return json({ row }, 201);
  } catch {
    return json({ error: "Unable to create escrow. Check the Appwrite table schema and server API key." }, 503);
  }
}
