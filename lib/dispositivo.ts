"use client";

// Id aleatorio por navegador para el rate limit (ver lib/http.ts). No identifica a la persona.
let id = "";
export function dispositivo(): Record<string, string> {
  if (!id) {
    try {
      id = localStorage.getItem("sbx_d") ?? "";
    } catch {}
    if (!/^[a-z0-9]{16,40}$/.test(id)) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join("") + Date.now().toString(36);
      try {
        localStorage.setItem("sbx_d", id);
      } catch {}
    }
  }
  return { "x-dispositivo": id };
}
