import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { esAdmin } from "@/lib/admin";
import { CONTENIDO } from "@/lib/curso/contenido";
import Control from "./Control";

export const metadata: Metadata = { title: "Control · Curso IA desde cero" };
export const dynamic = "force-dynamic";

export default async function Page() {
  if (!(await esAdmin())) redirect("/cursoIA/control/login");
  return <Control contenido={CONTENIDO} />;
}
