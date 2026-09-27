// Filtro básico: si coincide, la respuesta se guarda con oculto=true.
const PALABRAS = [
  "pendej", "chinga", "chingu", "verga", "puta", "puto", "cabron", "cabrón", "culero", "mamad",
  "mierda", "joto", "pinche", "ojete", "culo", "coño", "idiota", "imbecil", "imbécil", "estupid",
  "estúpid", "naco", "zorra", "perra", "marica", "huevon", "huevón", "güey", "wey", "fuck", "shit",
  "bitch", "nalg", "panocha", "pito", "vergu", "mamón", "mamon", "jodid", "joder",
];

function normaliza(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!]/g, "i")
    .replace(/0/g, "o")
    .replace(/\$/g, "s");
}

export function tieneGroserias(texto: string) {
  const t = normaliza(texto);
  const plano = t.replace(/[^a-zñ]/g, "");
  return PALABRAS.some((p) => {
    const n = normaliza(p);
    // "wey" y "culo" son cortas: exige palabra completa para no marcar "cálculo".
    if (n.length <= 4) return new RegExp(`(^|[^a-z])${n}([^a-z]|$)`).test(t);
    return t.includes(n) || plano.includes(n);
  });
}
