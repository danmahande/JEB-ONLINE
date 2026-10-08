-- Round 31: payment recording + dispatch capture for orders.
--
-- This store takes no money on the site (payment is arranged by hand over
-- MoMo/M-Pesa/Airtel/bank/TT/COD), so the owner needs somewhere to record what
-- actually arrived. PaymentRecord is deliberately a separate table rather than
-- an OrderEvent, because order events render on the customer's PUBLIC tracking
-- page and a payment reference must not be exposed there.
--
-- OrderProcessing.paymentStatus / paidAmountUsd / paidAt are derived from
-- PaymentRecord rows inside the transaction that writes them.
--
-- Dispatch: the tracking number generated at checkout (TRK-<order>-<region>)
-- is a placeholder. trackingIsPlaceholder records whether the customer is
-- still looking at that placeholder, and dispatchedAt captures the real
-- dispatch time independently of updatedAt.
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentRecord_orderNumber_receivedAt_idx" ON "PaymentRecord"("orderNumber", "receivedAt");

ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_orderNumber_fkey" FOREIGN KEY ("orderNumber") REFERENCES "OrderProcessing"("orderNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderProcessing" ADD COLUMN "trackingIsPlaceholder" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "OrderProcessing" ADD COLUMN "dispatchedAt" TIMESTAMP(3);
ALTER TABLE "OrderProcessing" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE "OrderProcessing" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "OrderProcessing" ADD COLUMN "paidAmountUsd" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE INDEX "OrderProcessing_paymentStatus_idx" ON "OrderProcessing"("paymentStatus");
