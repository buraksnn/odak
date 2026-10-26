export function localRequest(request: Request, write = false) {
  const host = request.headers.get("host");
  if (!host || !/^((localhost|127\.0\.0\.1)(:\d+)?|\[::1\](:\d+)?)$/.test(host))
    throw Error("Yalnızca localhost erişimi destekleniyor.");
  if (write) {
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw Error("JSON bekleniyor.");
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== host)
      throw Error("Kaynak doğrulanamadı.");
  }
}
