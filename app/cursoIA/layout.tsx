import type { Metadata } from "next";
import "./curso.css";

export const metadata: Metadata = {
  title: "Curso IA desde cero · MrHapps",
  description: "Tu acompañante del curso “Inteligencia artificial desde cero”: sigue el curso, practica y llévate todo.",
  robots: { index: false, follow: false },
};

export default function CursoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
