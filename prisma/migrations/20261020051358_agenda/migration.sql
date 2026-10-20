-- CreateTable
CREATE TABLE "Reserva" (
    "id" TEXT NOT NULL,
    "folio" INTEGER,
    "fecha" VARCHAR(10) NOT NULL,
    "inicioMin" INTEGER NOT NULL,
    "finMin" INTEGER NOT NULL,
    "bahia" INTEGER NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "clienteNombre" VARCHAR(80) NOT NULL,
    "vehiculo" VARCHAR(80),
    "origen" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reserva_folio_key" ON "Reserva"("folio");

-- CreateIndex
CREATE INDEX "Reserva_fecha_idx" ON "Reserva"("fecha");
