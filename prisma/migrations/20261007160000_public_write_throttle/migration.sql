-- Fixed-window throttle for the two unauthenticated write endpoints that had no
-- limit: /api/subscribe (newsletter) and /api/restock-notify (NOTIFY ME).
-- Same shape as RegisterAttempt / AdminLoginAttempt; the id is an HMAC of the
-- caller's address under an endpoint-specific namespace, so no PII is stored.
CREATE TABLE "PublicWriteAttempt" (
    "id" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicWriteAttempt_pkey" PRIMARY KEY ("id")
);
