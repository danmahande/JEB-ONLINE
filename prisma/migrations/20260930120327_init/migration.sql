-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "productLabel" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "brand" TEXT,
    "variant" TEXT,
    "category" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL DEFAULT 'MCH-MRD-001',
    "merchantName" TEXT NOT NULL DEFAULT 'Meridian Supply Co.',
    "unit" TEXT NOT NULL,
    "weight" TEXT,
    "minStock" INTEGER NOT NULL DEFAULT 10,
    "unitCost" REAL NOT NULL,
    "unitSellingPrice" REAL NOT NULL,
    "commissionPercent" REAL NOT NULL DEFAULT 0,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "costingMethod" TEXT NOT NULL DEFAULT 'fifo',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "slug" TEXT NOT NULL,
    "image" TEXT,
    "hsCode" TEXT,
    "originCountry" TEXT NOT NULL DEFAULT 'UG',
    "variants" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "country" TEXT NOT NULL DEFAULT 'UG',
    "createdBy" TEXT,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalOrderValue" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrderProcessing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "orderDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerInfo" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new_order',
    "trackingNumber" TEXT,
    "invoiceGenerated" BOOLEAN NOT NULL DEFAULT false,
    "invoiceNumber" TEXT,
    "invoiceDate" DATETIME,
    "createdBy" TEXT NOT NULL DEFAULT 'STOREFRONT',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "fxRate" REAL NOT NULL DEFAULT 1,
    "region" TEXT NOT NULL DEFAULT 'INTL',
    "destination" TEXT,
    "dutyAmount" REAL NOT NULL DEFAULT 0,
    "vatAmount" REAL NOT NULL DEFAULT 0,
    "shippingAmount" REAL NOT NULL DEFAULT 0,
    "totalWeightKg" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrderLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "brand" TEXT,
    "variant" TEXT,
    "qty" INTEGER NOT NULL,
    "unitSellingPrice" REAL NOT NULL,
    "lineTotal" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderLineItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "OrderProcessing" ("orderId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegionConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "region" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "rateToUsd" REAL NOT NULL,
    "fxUpdatedAt" DATETIME,
    "dutyRate" REAL NOT NULL,
    "vatRate" REAL NOT NULL,
    "shippingBase" REAL NOT NULL,
    "shippingPerKg" REAL NOT NULL,
    "etaDays" TEXT NOT NULL,
    "isEac" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderEvent_orderNumber_fkey" FOREIGN KEY ("orderNumber") REFERENCES "OrderProcessing" ("orderNumber") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RestockNotify" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Counter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_productId_key" ON "Product"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerId_key" ON "Customer"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_contact_key" ON "Customer"("contact");

-- CreateIndex
CREATE UNIQUE INDEX "OrderProcessing_orderId_key" ON "OrderProcessing"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderProcessing_orderNumber_key" ON "OrderProcessing"("orderNumber");

-- CreateIndex
CREATE INDEX "OrderProcessing_customerId_idx" ON "OrderProcessing"("customerId");

-- CreateIndex
CREATE INDEX "OrderProcessing_status_idx" ON "OrderProcessing"("status");

-- CreateIndex
CREATE INDEX "OrderProcessing_orderDate_idx" ON "OrderProcessing"("orderDate");

-- CreateIndex
CREATE INDEX "OrderLineItem_orderId_idx" ON "OrderLineItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderLineItem_orderNumber_idx" ON "OrderLineItem"("orderNumber");

-- CreateIndex
CREATE INDEX "OrderLineItem_productId_idx" ON "OrderLineItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "RegionConfig_region_key" ON "RegionConfig"("region");

-- CreateIndex
CREATE INDEX "OrderEvent_orderNumber_idx" ON "OrderEvent"("orderNumber");

-- CreateIndex
CREATE INDEX "RestockNotify_productId_idx" ON "RestockNotify"("productId");

-- CreateIndex
CREATE INDEX "RestockNotify_status_idx" ON "RestockNotify"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RestockNotify_productId_email_key" ON "RestockNotify"("productId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Counter_name_key" ON "Counter"("name");
