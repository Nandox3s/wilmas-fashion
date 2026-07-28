-- Extend enums for richer ecommerce lifecycle
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'CREATED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'INVOICING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'INVOICE_AUTHORIZED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PREPARING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'READY_TO_SHIP';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'SHIPPED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'IN_TRANSIT';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'OUT_FOR_DELIVERY';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'RETURN_REQUESTED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'RETURNED';

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CREATED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REVERSED';

ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'CREDIT_NOTE_ISSUED';

CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "ShippingStatus" AS ENUM ('PENDING', 'READY_FOR_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNED', 'CANCELLED');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END
$$;

ALTER TABLE "Payment"
  ADD COLUMN "externalTransactionId" TEXT,
  ADD COLUMN "authorizationCode" TEXT,
  ADD COLUMN "cardBrand" TEXT,
  ADD COLUMN "cardLastDigits" TEXT,
  ADD COLUMN "failureCode" TEXT,
  ADD COLUMN "failureMessage" TEXT,
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "reversedAt" TIMESTAMP(3),
  ADD COLUMN "refundedAt" TIMESTAMP(3);

ALTER TABLE "Invoice"
  ADD COLUMN "externalId" TEXT,
  ADD COLUMN "establishment" TEXT,
  ADD COLUMN "emissionPoint" TEXT,
  ADD COLUMN "sequential" TEXT,
  ADD COLUMN "pdfLocation" TEXT,
  ADD COLUMN "xmlLocation" TEXT,
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "Shipment" (
  "id" SERIAL NOT NULL,
  "orderId" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "carrierName" TEXT,
  "externalShipmentId" TEXT,
  "trackingNumber" TEXT,
  "trackingUrl" TEXT,
  "status" "ShippingStatus" NOT NULL DEFAULT 'PENDING',
  "shippingCost" DECIMAL(12,2),
  "estimatedDelivery" TIMESTAMP(3),
  "shippedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShipmentEvent" (
  "id" SERIAL NOT NULL,
  "shipmentId" INTEGER NOT NULL,
  "status" "ShippingStatus" NOT NULL,
  "description" TEXT,
  "location" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" SERIAL NOT NULL,
  "type" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "sentAt" TIMESTAMP(3),
  "lastError" TEXT,
  "orderId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Job" (
  "id" SERIAL NOT NULL,
  "type" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT,
  "lockedAt" TIMESTAMP(3),
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingProfile" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "identificationType" TEXT NOT NULL,
  "identificationNumber" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "billingEmail" TEXT NOT NULL,
  "phone" TEXT,
  "billingAddress" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Shipment_orderId_key" ON "Shipment"("orderId");
CREATE UNIQUE INDEX "Payment_clientTransactionId_key" ON "Payment"("clientTransactionId");
CREATE UNIQUE INDEX "Payment_externalTransactionId_key" ON "Payment"("externalTransactionId");
CREATE UNIQUE INDEX "Invoice_externalId_key" ON "Invoice"("externalId");
CREATE UNIQUE INDEX "Invoice_accessKey_key" ON "Invoice"("accessKey");
CREATE INDEX "Job_status_nextAttemptAt_idx" ON "Job"("status", "nextAttemptAt");

ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
