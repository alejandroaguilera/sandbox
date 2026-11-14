import datos from "@/content/curso-ia.json";

export type TipoMomento = "demo" | "ejercicio" | "participa" | "info";
export type Accion =
  | { tipo: "votacion"; votacionId: string }
  | { tipo: "prompt"; promptId: string }
  | { tipo: "practicar"; modo: "chat" | "constructor" }
  | { tipo: "mellevo"; seccion: string }
  | { tipo: "semaforo" }
  | { tipo: "chatgpt" }
  | null;
export interface Momento { id: string; bloque: string; tipo: TipoMomento; titulo: string; instruccion: string; accion: Accion; lamina: number }
export interface Prompt { id: string; bloque: string; titulo: string; texto: string; truco?: string; nota?: string; ejemplo?: string; soloApp?: string; soloCopiar?: boolean }
export interface Votacion {
  id: string; tipo: "sino" | "palabra" | "unica" | "texto"; titulo: string; lamina: number; max?: number; frase?: string; remate?: string;
  preguntas?: { id: string; texto: string; color?: string }[]; opciones?: string[]; ia?: { palabra: string; pct: number }[];
}
export interface CasoSemaforo { id: string; caso: string; respuesta: "verde" | "amarillo" | "rojo"; explicacion: string }
export interface Contenido {
  curso: string;
  bloques: { id: string; nombre: string; hora: string }[];
  momentos: Momento[];
  grupos: { id: string; nombre: string }[];
  prompts: Prompt[];
  repreguntas: string[];
  truco: string;
  constructor: { pasos: { id: string; nombre: string; pregunta: string; ejemplo: string }[]; chipsComo: string[]; ideas: string[] };
  votaciones: Votacion[];
  semaforo: CasoSemaforo[];
  entrenamiento: { verificado: string; apps: { app: string; pasos: string[] }[] };
  reto: { dia: number; titulo: string; instruccion: string }[];
  material: { id: string; titulo: string; descripcion: string; archivo: string; pagina?: string }[];
  evaluacion: { intereses: string[] };
}

export const CONTENIDO = datos as unknown as Contenido;
export const CLAVES_VOTACION = CONTENIDO.votaciones.map((v) => v.id);
export const votacionDe = (clave: string) => CONTENIDO.votaciones.find((v) => v.id === clave);
