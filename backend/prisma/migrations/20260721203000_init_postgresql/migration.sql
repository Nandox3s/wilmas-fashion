CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_PROCESSING', 'PAID', 'PAYMENT_FAILED', 'INVOICE_PENDING', 'INVOICED', 'CANCELLED', 'REFUNDED', 'EXPIRED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED', 'ERROR');
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PROCESSING', 'AUTHORIZED', 'REJECTED', 'ERROR', 'PENDING_RETRY', 'CANCELLED');
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'CONFIRMED', 'RELEASED', 'EXPIRED');

CREATE TABLE "User" ("id" SERIAL NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "password" TEXT NOT NULL, "role" "Role" NOT NULL DEFAULT 'USER', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "User_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Product" ("id" SERIAL NOT NULL, "name" TEXT NOT NULL, "sku" TEXT NOT NULL, "brand" TEXT NOT NULL, "category" TEXT NOT NULL, "sizes" JSONB NOT NULL DEFAULT '[]', "color" TEXT NOT NULL, "price" DECIMAL(12,2) NOT NULL, "discount" DECIMAL(5,2) NOT NULL DEFAULT 0, "onOffer" BOOLEAN NOT NULL DEFAULT false, "stock" INTEGER NOT NULL, "image" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "createdById" INTEGER, "updatedById" INTEGER, CONSTRAINT "Product_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Sale" ("id" SERIAL NOT NULL, "userId" INTEGER NOT NULL, "productId" INTEGER NOT NULL, "quantity" INTEGER NOT NULL, "total" DECIMAL(12,2) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Sale_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Order" ("id" SERIAL NOT NULL, "reference" TEXT NOT NULL, "userId" INTEGER, "customerName" TEXT NOT NULL, "customerEmail" TEXT NOT NULL, "identificationType" TEXT NOT NULL, "identificationNumber" TEXT NOT NULL, "address" TEXT NOT NULL, "city" TEXT NOT NULL, "phone" TEXT NOT NULL, "subtotal" DECIMAL(12,2) NOT NULL, "discount" DECIMAL(12,2) NOT NULL, "tax" DECIMAL(12,2) NOT NULL, "shipping" DECIMAL(12,2) NOT NULL, "total" DECIMAL(12,2) NOT NULL, "currency" TEXT NOT NULL DEFAULT 'USD', "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT', "stockCommittedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Order_pkey" PRIMARY KEY ("id"));
CREATE TABLE "OrderItem" ("id" SERIAL NOT NULL, "orderId" INTEGER NOT NULL, "productId" INTEGER, "sku" TEXT NOT NULL, "name" TEXT NOT NULL, "brand" TEXT NOT NULL, "category" TEXT NOT NULL, "size" TEXT NOT NULL, "color" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "unitPrice" DECIMAL(12,2) NOT NULL, "discount" DECIMAL(12,2) NOT NULL, "tax" DECIMAL(12,2) NOT NULL, "total" DECIMAL(12,2) NOT NULL, CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"));
CREATE TABLE "InventoryReservation" ("id" SERIAL NOT NULL, "orderId" INTEGER NOT NULL, "productId" INTEGER NOT NULL, "quantity" INTEGER NOT NULL, "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE', "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Payment" ("id" SERIAL NOT NULL, "orderId" INTEGER NOT NULL, "provider" TEXT NOT NULL, "providerTransactionId" TEXT, "clientTransactionId" TEXT, "idempotencyKey" TEXT NOT NULL, "amount" DECIMAL(12,2) NOT NULL, "currency" TEXT NOT NULL DEFAULT 'USD', "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING', "sanitizedResponse" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"));
CREATE TABLE "PaymentEvent" ("id" SERIAL NOT NULL, "paymentId" INTEGER NOT NULL, "provider" TEXT NOT NULL, "eventType" TEXT NOT NULL, "externalEventId" TEXT NOT NULL, "payloadHash" TEXT NOT NULL, "payload" JSONB, "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Invoice" ("id" SERIAL NOT NULL, "orderId" INTEGER NOT NULL, "provider" TEXT NOT NULL, "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING', "accessKey" TEXT, "authorizationNumber" TEXT, "xmlS3Key" TEXT, "rideS3Key" TEXT, "providerResponse" JSONB, "issuedAt" TIMESTAMP(3), "authorizedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id"));
CREATE TABLE "InvoiceEvent" ("id" SERIAL NOT NULL, "invoiceId" INTEGER NOT NULL, "eventType" TEXT NOT NULL, "providerEventId" TEXT, "message" TEXT, "payload" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "InvoiceEvent_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE UNIQUE INDEX "Order_reference_key" ON "Order"("reference");
CREATE UNIQUE INDEX "InventoryReservation_orderId_productId_key" ON "InventoryReservation"("orderId", "productId");
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE UNIQUE INDEX "PaymentEvent_provider_externalEventId_key" ON "PaymentEvent"("provider", "externalEventId");
CREATE UNIQUE INDEX "Invoice_orderId_key" ON "Invoice"("orderId");
CREATE UNIQUE INDEX "InvoiceEvent_providerEventId_key" ON "InvoiceEvent"("providerEventId");

ALTER TABLE "Product" ADD CONSTRAINT "Product_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceEvent" ADD CONSTRAINT "InvoiceEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
