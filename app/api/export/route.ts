import { read } from "@/lib/db";
import { net } from "@/lib/domain";
import { localRequest } from "@/lib/http";
export const dynamic = "force-dynamic";
export function GET(req: Request) {
  try {
    localRequest(req);
    const cell = (v: unknown) =>
      '"' +
      (typeof v === "string"
        ? v.replace(/^[=+@-]/, "'$&")
        : String(v ?? "")
      ).replaceAll('"', '""') +
      '"';
    const rows = [
      [
        "Ad",
        "Tarih",
        "Tür",
        "Ders",
        "Soru",
        "Doğru",
        "Yanlış",
        "Boş",
        "Net",
        "Sıralama",
        "Katılımcı",
        "Not",
      ],
      ...read().exams.flatMap((e) =>
        e.results.map((r) => [
          e.name,
          e.date,
          e.type,
          r.subject,
          r.questions,
          r.correct,
          r.wrong,
          r.blank,
          net(r),
          e.rank,
          e.participants,
          e.note,
        ]),
      ),
    ];
    return new Response(
      "\uFEFF" + rows.map((r) => r.map(cell).join(";")).join("\r\n"),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="odak-denemeler.csv"',
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return new Response("Erişim reddedildi.", { status: 403 });
  }
}
