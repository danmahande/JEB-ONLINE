-- AlterTable
ALTER TABLE "OrderProcessing" ADD COLUMN     "freightSource" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN     "operatorMinCharge" DOUBLE PRECISION,
ADD COLUMN     "operatorName" TEXT,
ADD COLUMN     "operatorRatePerKg" DOUBLE PRECISION,
ADD COLUMN     "receiverName" TEXT,
ADD COLUMN     "receiverPhone" TEXT;

-- AlterTable
ALTER TABLE "RegionConfig" ADD COLUMN     "etaDaysMax" INTEGER,
ADD COLUMN     "etaDaysMin" INTEGER;

-- CreateTable
CREATE TABLE "BusOperator" (
    "id" TEXT NOT NULL,
    "regionCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cargoRatePerKg" DOUBLE PRECISION NOT NULL,
    "minCharge" DOUBLE PRECISION NOT NULL,
    "transitDaysMin" INTEGER NOT NULL,
    "transitDaysMax" INTEGER NOT NULL,
    "bookingNote" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusOperator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusOperator_regionCode_isActive_idx" ON "BusOperator"("regionCode", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BusOperator_regionCode_name_key" ON "BusOperator"("regionCode", "name");

-- AddForeignKey
ALTER TABLE "BusOperator" ADD CONSTRAINT "BusOperator_regionCode_fkey" FOREIGN KEY ("regionCode") REFERENCES "RegionConfig"("region") ON DELETE RESTRICT ON UPDATE CASCADE;
