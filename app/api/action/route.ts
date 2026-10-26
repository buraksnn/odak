import { ZodError } from "zod";
import { mutate } from "@/lib/db";
import { applyAction } from "@/lib/service";
import { localRequest } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    localRequest(request, true);
    const text = await request.text();
    if (Buffer.byteLength(text) > 12000000)
      throw Error("Dosya 12 MB sınırını aşıyor.");
    return Response.json(mutate((b) => applyAction(b, JSON.parse(text))));
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof ZodError
            ? e.issues
                .map((i) => `${i.path.join(" → ")}: ${i.message}`)
                .join("; ")
            : e instanceof Error
              ? e.message
              : "İşlem başarısız.",
      },
      { status: 400 },
    );
  }
}
