import { read } from "@/lib/db";
import { localRequest } from "@/lib/http";
export const dynamic = "force-dynamic";
export function GET(req: Request) {
  try {
    localRequest(req);
    return Response.json(read(), {
      headers: {
        "Content-Disposition": 'attachment; filename="odak-yedek.json"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Erişim reddedildi.", { status: 403 });
  }
}
