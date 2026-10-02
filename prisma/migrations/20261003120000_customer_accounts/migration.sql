CREATE TABLE "CustomerAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerLoginAttempt" (
    "id" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerLoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerAccount_email_key" ON "CustomerAccount"("email");

ALTER TABLE "OrderProcessing" ADD COLUMN "customerAccountId" TEXT;

CREATE INDEX "OrderProcessing_customerAccountId_createdAt_idx"
ON "OrderProcessing"("customerAccountId", "createdAt");

ALTER TABLE "OrderProcessing"
ADD CONSTRAINT "OrderProcessing_customerAccountId_fkey"
FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
