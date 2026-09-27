import type { Metadata } from "next";
import FormMaterial from "./FormMaterial";

export const metadata: Metadata = { title: "Material del workshop · Sandbox" };

export default function Material() {
  return <FormMaterial />;
}
