import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// La ruta impresa en el QR es /cursoIA. Quien la escribe a mano suele ponerla en minúsculas o con guion:
// /cursoia, /curso-ia y /curso (con cualquier combinación de mayúsculas) redirigen 308 a /cursoIA.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // /curso solo redirige sin subruta: /curso/* son los archivos estáticos de public/curso/.
  const m = pathname.match(/^\/(cursoia|curso-ia)(\/.*)?$/i) ?? pathname.match(/^\/(curso)(\/)?$/i);
  if (!m || m[1] === "cursoIA") return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `/cursoIA${m[2] ?? ""}`;
  return NextResponse.redirect(url, 308);
}

export const config = { matcher: ["/curso", "/curso-ia", "/curso-ia/:path*", "/cursoia", "/cursoia/:path*", "/cursoIA", "/cursoIA/:path*", "/CursoIA", "/CURSOIA", "/Cursoia"] };
