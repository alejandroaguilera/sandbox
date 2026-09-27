import type { Metadata } from "next";
import FormSala from "./FormSala";

export const metadata: Metadata = { title: "¿Qué proceso te duele más? · Sandbox" };

export default function Sala() {
  return <FormSala />;
}
