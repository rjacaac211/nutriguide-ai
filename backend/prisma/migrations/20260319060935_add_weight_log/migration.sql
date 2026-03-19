-- CreateTable
CREATE TABLE "weight_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "weight_kg" DECIMAL(5,2) NOT NULL,
    "date" DATE NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "weight_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weight_log_user_id_date_idx" ON "weight_log"("user_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "weight_log_user_id_date_key" ON "weight_log"("user_id", "date");

-- AddForeignKey
ALTER TABLE "weight_log" ADD CONSTRAINT "weight_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
