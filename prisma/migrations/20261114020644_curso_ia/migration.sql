-- CreateTable
CREATE TABLE "CursoSesion" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "wifi" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT false,
    "momentoId" TEXT,
    "iaPausada" BOOLEAN NOT NULL DEFAULT false,
    "sinIA" BOOLEAN NOT NULL DEFAULT false,
    "proyector" TEXT NOT NULL DEFAULT 'qr',
    "epoca" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CursoSesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CursoVotacion" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "abierta" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CursoVotacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CursoVoto" (
    "id" TEXT NOT NULL,
    "votacionId" TEXT NOT NULL,
    "dispositivo" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL DEFAULT '',
    "valor" VARCHAR(120) NOT NULL,
    "oculto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CursoVoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CursoPregunta" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "texto" VARCHAR(200) NOT NULL,
    "votos" INTEGER NOT NULL DEFAULT 0,
    "oculta" BOOLEAN NOT NULL DEFAULT false,
    "respondida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CursoPregunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CursoPreguntaVoto" (
    "preguntaId" TEXT NOT NULL,
    "dispositivo" TEXT NOT NULL,

    CONSTRAINT "CursoPreguntaVoto_pkey" PRIMARY KEY ("preguntaId","dispositivo")
);

-- CreateTable
CREATE TABLE "CursoSemaforo" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "dispositivo" TEXT NOT NULL,
    "tarjeta" TEXT NOT NULL,
    "acierto" BOOLEAN NOT NULL,

    CONSTRAINT "CursoSemaforo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CursoUsoIA" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "dispositivo" TEXT NOT NULL,
    "mensajes" INTEGER NOT NULL DEFAULT 0,
    "tokensEntrada" INTEGER NOT NULL DEFAULT 0,
    "tokensSalida" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CursoUsoIA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CursoGastoDia" (
    "dia" VARCHAR(10) NOT NULL,
    "mensajes" INTEGER NOT NULL DEFAULT 0,
    "tokensEntrada" INTEGER NOT NULL DEFAULT 0,
    "tokensSalida" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CursoGastoDia_pkey" PRIMARY KEY ("dia")
);

-- CreateTable
CREATE TABLE "CursoEvaluacion" (
    "id" TEXT NOT NULL,
    "sesionId" TEXT NOT NULL,
    "dispositivo" TEXT NOT NULL,
    "utilidad" INTEGER NOT NULL,
    "valioso" VARCHAR(300),
    "interes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CursoEvaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CursoSesion_codigo_key" ON "CursoSesion"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "CursoVotacion_sesionId_clave_key" ON "CursoVotacion"("sesionId", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "CursoVoto_votacionId_dispositivo_pregunta_key" ON "CursoVoto"("votacionId", "dispositivo", "pregunta");

-- CreateIndex
CREATE INDEX "CursoPregunta_sesionId_createdAt_idx" ON "CursoPregunta"("sesionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CursoSemaforo_sesionId_dispositivo_tarjeta_key" ON "CursoSemaforo"("sesionId", "dispositivo", "tarjeta");

-- CreateIndex
CREATE UNIQUE INDEX "CursoUsoIA_sesionId_dispositivo_key" ON "CursoUsoIA"("sesionId", "dispositivo");

-- CreateIndex
CREATE UNIQUE INDEX "CursoEvaluacion_sesionId_dispositivo_key" ON "CursoEvaluacion"("sesionId", "dispositivo");
