# Sandbox · sandbox.mrhapps.mx

Entorno de demos en vivo del workshop **"Tecnología que sí le sirve a tu negocio"** (Coparmex Nuevo Laredo).
Next.js (App Router) + Prisma 6 + Postgres, desplegado en Dokploy. n8n en `sandbox-n8n.mrhapps.mx`.

| Ruta | Para | Qué hace |
|---|---|---|
| `/` | Proyector | Hub con accesos a todo |
| `/sala` | Asistentes (QR) | "¿Qué proceso te duele más?" (anónimo) |
| `/sala/en-vivo` | Proyector | Resultados en vivo por dimensión (polling 3 s) |
| `/demo/compras` (+ `/solicitar`) | Proyector + voluntario | Demo 1: requisición → hoja → correo → aprobación → aviso |
| `/demo/gastos` (+ `/subir`) | Proyector + celular | Demo 2: fotos de tickets → IA → registro de gastos |
| `/demo/datos` | Proyector | Demo 3: preguntas en español sobre una empresa ficticia |
| `/material` | Asistentes (QR) | Captura de lead + descarga de PDFs |
| `/privacidad` | — | Aviso de privacidad simplificado |
| `/admin` | Alejandro | Leads + CSV, moderación de sala, reset de demos, modo de flujo |
| `/cursoIA` | Asistentes (QR) | Curso "IA desde cero": Ahora · Practicar · Instrucciones · Me llevo |
| `/cursoIA/control` | Alejandro (celular) | Momento actual, votaciones, proyector, pausa de IA, sesiones, CSV |
| `/cursoIA/en-vivo` | Proyector | QR, votaciones en vivo, semáforo y preguntas más votadas |

## Bot de Telegram (@agendaserviciosbot)

Agente con Grok (xAI) sobre la Demo 3 y la Demo 4: responde preguntas de los datos de la distribuidora (con gráfica en imagen),
consulta la agenda del taller (hoy, mañana, por cliente) y agenda servicios nuevos, que aparecen al instante en `/demo/agenda`.
Menú fijo con botones + comandos (`/datos`, `/agendar`, `/hoy`, `/manana`, `/cliente`, `/nueva`).

- Webhook: `POST /api/telegram`, validado con `TELEGRAM_WEBHOOK_SECRET`. El webhook y el menú se registran solos al arrancar.
- Código: `lib/telegram.ts` (Bot API), `lib/bot.ts` (menú, estado por chat), `lib/agente.ts` (Grok + herramientas), `lib/grafica-png.ts`.
- El historial de cada chat vive en memoria (45 min); se pierde al redeployar. `/nueva` lo borra a mano.

## Curso "IA desde cero" (`/cursoIA`)

Companion del curso en el celular de cada asistente. Vive aparte del hub (`/`) y de las demos: no comparte rutas ni tablas.

- **Contenido:** todo el texto (bloques, momentos, instrucciones, votaciones, semáforo, reto, rutas para desactivar el
  entrenamiento) está en `content/curso-ia.json`. Se edita ahí, sin tocar código; cada momento lleva su número de `lamina`.
- **Sesiones:** cada impartición es una sesión (cliente, fecha, código). Se crean y activan en `/cursoIA/control`
  (misma contraseña que `/admin`). Solo una está activa a la vez.
- **Asistente de IA:** `POST /api/curso/ia`, en streaming. No hay tabla de mensajes ni se registra el contenido: solo conteos
  (`CursoUsoIA`, `CursoGastoDia`). Límites: `CURSO_AI_MAX_MENSAJES` por celular, 6 por minuto, 4,000 caracteres, tope diario
  `CURSO_AI_TOPE_DIARIO_USD`. Un filtro bloquea tarjetas, CLABE y contraseñas antes de llamar al modelo.
- **Plan B:** en el control, "Pausar asistente de IA" y "Modo sin IA" dejan la biblioteca y el constructor solo con Copiar.
- **Material:** los PDF van en `public/curso/` (`presentacion.pdf`, `guia-de-bolsillo.pdf`). Si falta la guía en PDF,
  "Me llevo" enlaza a `/cursoIA/guia` (una página, imprimible).
- `/cursoia`, `/curso-ia` y `/curso` redirigen 308 a `/cursoIA` (`proxy.ts`).

## Operación

- **Cambiar el flujo de compras en vivo:** `/admin` → "Flujo de compras" → *Directo* o *n8n*. Se guarda en la tabla `Config` y
  tiene prioridad sobre `FLOW_MODE`. Si n8n no responde al recibir la solicitud, la app corre el flujo directo sola.
- **Resetear:** `/admin` → "Reiniciar demo de compras" (borra requisiciones, correos y eventos; el folio vuelve a 1001) y
  "Reiniciar gastos". No tocan leads ni la sala. "Vaciar sala" borra todas las respuestas de la dinámica.
- **Warm-up de la Demo 3:** ocurre solo al arrancar; también desde `/admin` → "Calentar Demo 3". `GET /api/salud` muestra el estado.
- **Plan B de IA:** si Anthropic falla, `/demo/datos` responde con las respuestas en caché o precalculadas, y `/demo/gastos`
  muestra el banner "Modo sin conexión" con 5 tickets de ejemplo.

## Desarrollo

```bash
cp .env.example .env   # y llenar valores
npm ci
npx prisma migrate deploy
npm run dev
```

El seed (`lib/seed.ts`) es determinístico e idempotente; corre al arrancar desde `instrumentation.ts`.
Las imágenes de tickets nunca se guardan: se procesan en memoria.

## n8n

`n8n/requisicion.json` es el workflow exportado. Al importarlo, reemplaza `__CRED_ID__` por el id de una credencial
*Header Auth* con nombre `x-sandbox-key` y el valor de `SANDBOX_SHARED_KEY` (la usan el webhook y todas las llamadas a la app).
