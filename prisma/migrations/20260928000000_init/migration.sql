-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Dimension" AS ENUM ('DIRECCION', 'COMERCIAL', 'OPERACION', 'ADMIN_FINANZAS', 'PERSONAS', 'EXPERIENCIA_DIGITAL');

-- CreateEnum
CREATE TYPE "Tamano" AS ENUM ('T1_10', 'T11_50', 'T51_250', 'T250_MAS');

-- CreateEnum
CREATE TYPE "EstadoReq" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "SalaRespuesta" (
    "id" TEXT NOT NULL,
    "dimension" "Dimension" NOT NULL,
    "tamano" "Tamano" NOT NULL,
    "proceso" VARCHAR(160) NOT NULL,
    "oculto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaRespuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "whatsapp" TEXT,
    "tamano" "Tamano" NOT NULL,
    "giro" TEXT,
    "procesoDoloroso" TEXT,
    "quiereDiagnostico" BOOLEAN NOT NULL DEFAULT false,
    "consentimiento" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requisicion" (
    "id" TEXT NOT NULL,
    "folio" INTEGER NOT NULL,
    "solicitante" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "articulo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "montoEstimado" DECIMAL(12,2) NOT NULL,
    "motivo" TEXT,
    "estado" "EstadoReq" NOT NULL DEFAULT 'PENDIENTE',
    "tokenAprobacion" TEXT NOT NULL,
    "resumeUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltaAt" TIMESTAMP(3),

    CONSTRAINT "Requisicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoFlujo" (
    "id" TEXT NOT NULL,
    "requisicionId" TEXT,
    "paso" TEXT NOT NULL,
    "detalle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoFlujo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Correo" (
    "id" TEXT NOT NULL,
    "para" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "accionAprobar" TEXT,
    "accionRechazar" TEXT,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Correo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3),
    "proveedor" TEXT,
    "rfc" TEXT,
    "subtotal" DECIMAL(12,2),
    "iva" DECIMAL(12,2),
    "total" DECIMAL(12,2),
    "categoria" TEXT NOT NULL,
    "confianza" DOUBLE PRECISION NOT NULL,
    "revisar" BOOLEAN NOT NULL,
    "origen" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "giro" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "costo" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnit" DECIMAL(12,2) NOT NULL,
    "costoUnit" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Factura" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "vence" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "pagadaAt" TIMESTAMP(3),

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalaRespuesta_createdAt_idx" ON "SalaRespuesta"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Requisicion_folio_key" ON "Requisicion"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "Requisicion_tokenAprobacion_key" ON "Requisicion"("tokenAprobacion");

-- CreateIndex
CREATE INDEX "EventoFlujo_createdAt_idx" ON "EventoFlujo"("createdAt");

-- CreateIndex
CREATE INDEX "Venta_fecha_idx" ON "Venta"("fecha");

-- CreateIndex
CREATE INDEX "Venta_clienteId_idx" ON "Venta"("clienteId");

-- CreateIndex
CREATE INDEX "Factura_clienteId_idx" ON "Factura"("clienteId");

-- AddForeignKey
ALTER TABLE "EventoFlujo" ADD CONSTRAINT "EventoFlujo_requisicionId_fkey" FOREIGN KEY ("requisicionId") REFERENCES "Requisicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

