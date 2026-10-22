export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.DATABASE_URL) return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  // Registra el webhook y el menú del bot de Telegram (idempotente).
  import("./lib/telegram")
    .then((t) => t.configurarBot())
    .then((ok) => ok && console.log("[telegram] webhook y menú registrados"))
    .catch((e) => console.error("[telegram] configuración falló:", (e as Error).message));
  // Seed idempotente + warm-up de las 4 preguntas sugeridas, sin bloquear el arranque.
  (async () => {
    try {
      const { seed } = await import("./lib/seed");
      await seed();
      const { calentar } = await import("./lib/preguntar");
      const r = await calentar();
      console.log(`[warm-up] preguntas en caché: ${r.listas}/${r.total}`);
    } catch (e) {
      console.error("[arranque] seed/warm-up falló:", e);
    }
  })();
}
