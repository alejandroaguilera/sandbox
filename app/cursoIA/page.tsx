import { existsSync } from "fs";
import path from "path";
import { CONTENIDO } from "@/lib/curso/contenido";
import App from "./App";

export default function CursoIA() {
  // Un PDF solo se ofrece si ya está en public/curso/.
  const material = Object.fromEntries(CONTENIDO.material.map((m) => [m.id, existsSync(path.join(process.cwd(), "public", m.archivo))]));
  return <App contenido={CONTENIDO} material={material} />;
}
