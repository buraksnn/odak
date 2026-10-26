import { test, expect } from "@playwright/test";
import { today, addDays, weekStart } from "../lib/domain";
test.beforeEach(async ({ request, page }) => {
  await request.post("/api/action", {
    data: { op: "reset", confirm: "TÜM VERİLERİ SİL" },
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Şimdilik hazır profille devam et" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("Plan, tamamlama, erteleme ve yeniden açılış", async ({
  page,
  request,
}) => {
  await page
    .getByRole("button", { name: "Haftalık plan öner", exact: true })
    .click();
  await expect(page.locator(".task")).not.toHaveCount(0);
  const first = page.locator(".task").first();
  await first.locator(".check").click();
  await expect(first).toContainText("Tamamlandı");
  const pending = page.locator(".task.planned").first();
  if (await pending.count()) {
    await pending.getByRole("button", { name: "Ertele", exact: true }).click();
    await expect(page.locator(".task.deferred")).toHaveCount(1);
  }
  await page.reload();
  await expect(page.locator(".task.done")).toHaveCount(1);
  const b = await (await request.get("/api/backup")).json();
  expect(
    b.tasks.filter((t: { status: string }) => t.status === "done"),
  ).toHaveLength(1);
  expect(b.exams).toHaveLength(0);
});
test("Deneme girişi, düzeltme, fark, CSV ve silme", async ({
  page,
  request,
}) => {
  await page.getByRole("button", { name: "Denemeler", exact: true }).click();
  for (let i = 0; i < 2; i++) {
    await page
      .getByRole("button", { name: "Deneme ekle", exact: true })
      .click();
    await page
      .getByLabel("Deneme adı", { exact: true })
      .fill(`Deneme ${i + 1}`);
    await page
      .getByLabel("Tarih", { exact: true })
      .fill(addDays(today(), i - 1));
    const names = [
      "Türkçe",
      "Sosyal Bilimler",
      "Temel Matematik",
      "Fen Bilimleri",
    ];
    for (let j = 0; j < 4; j++) {
      const correct = j === 0 ? 20 + i * 4 : 10;
      await page
        .getByLabel(`${names[j]} doğru`, { exact: true })
        .fill(String(correct));
      await page.getByLabel(`${names[j]} yanlış`, { exact: true }).fill("4");
      await page
        .getByLabel(`${names[j]} boş`, { exact: true })
        .fill(String([40, 20, 40, 20][j] - correct - 4));
    }
    await page.getByRole("button", { name: "Denemeyi kaydet" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await expect(page.locator(".chart-stats")).toContainText("+4");
  const backup = await (await request.get("/api/backup")).json();
  expect(backup.exams).toHaveLength(2);
  const csv = await request.get("/api/export");
  expect(await csv.text()).toContain("Deneme 2");
  await page
    .locator(".exam-list article")
    .first()
    .getByRole("button", { name: "Düzenle" })
    .click();
  await page
    .getByLabel("Deneme adı", { exact: true })
    .fill("Düzeltilmiş sonuç");
  await page.getByRole("button", { name: "Denemeyi kaydet" }).click();
  await expect(
    page.getByRole("heading", { name: "Düzeltilmiş sonuç" }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page
    .locator(".exam-list article")
    .first()
    .getByRole("button", { name: "Sil", exact: true })
    .click();
  await expect(page.locator(".exam-list article")).toHaveCount(1);
});
test("Ayarlar, yedek geri yükleme ve AI onayı", async ({ page, request }) => {
  await page.getByRole("button", { name: "Ayarlar", exact: true }).click();
  await page.getByLabel("Hedef sıralama", { exact: true }).fill("40000");
  await page.getByRole("button", { name: "Ayarları kaydet" }).click();
  await expect(page.locator(".target")).toContainText("40.000");
  const saved = await (await request.get("/api/backup")).json();
  await page.getByLabel("JSON yedeği seç").setInputFiles({
    name: "yedek.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        ...saved,
        settings: { ...saved.settings, rank: 45000 },
      }),
    ),
  });
  await page
    .getByRole("button", { name: "Onaylıyorum, verileri değiştir" })
    .click();
  await expect(page.locator(".target")).toContainText("45.000");
  await page.getByRole("button", { name: "Gelişim", exact: true }).click();
  await page
    .getByRole("button", { name: "Haftamı ChatGPT ile analiz et" })
    .click();
  await expect(
    page.getByLabel("1. Gerçek kayıtlarından oluşturulan prompt"),
  ).toHaveValue(/45000/);
  const d = addDays(weekStart(today()), 7);
  const raw = JSON.stringify({
    summary: "Kısa tekrar önerisi",
    tasks: [
      {
        date: d,
        start: "18:30",
        subject: "TYT Temel Matematik",
        topic: "Temel kavramlar",
        kind: "Tekrar",
        minutes: 20,
      },
    ],
  });
  await page
    .getByLabel("2. ChatGPT yanıtını yapıştır (JSON veya JSON kod bloğu)")
    .fill(raw);
  await page
    .getByRole("button", { name: "Önerileri doğrula ve önizle" })
    .click();
  expect((await (await request.get("/api/backup")).json()).tasks).toHaveLength(
    0,
  );
  await page.getByRole("button", { name: "Onaylıyorum, plana ekle" }).click();
  await expect(page.getByRole("status")).toContainText("Öneriler onayınla");
  expect((await (await request.get("/api/backup")).json()).tasks).toHaveLength(
    1,
  );
});
test("Boş durum, sunucu doğrulaması, güvenlik ve ekran genişliği", async ({
  page,
  request,
}) => {
  await page.getByRole("button", { name: "Denemeler", exact: true }).click();
  await expect(page.getByText("İlk denemen için yer hazır.")).toBeVisible();
  const invalid = await request.post("/api/action", {
    data: { op: "exam", value: { name: "bozuk" } },
  });
  expect(invalid.status()).toBe(400);
  const cross = await request.post("/api/action", {
    headers: { Origin: "https://example.com" },
    data: { op: "unavailable" },
  });
  expect(cross.status()).toBe(400);
  for (const name of ["Bugün", "Denemeler", "Gelişim", "Ayarlar"]) {
    await page.getByRole("button", { name, exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: `test-results/${test.info().project.name}-settings.png`,
    fullPage: true,
  });
});
