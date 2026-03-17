-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile" (
    "user_id" TEXT NOT NULL,
    "name" TEXT,
    "gender" TEXT,
    "birth_date" TIMESTAMP(3),
    "age" INTEGER,
    "height_cm" DECIMAL(5,2),
    "weight_kg" DECIMAL(5,2),
    "goal_weight_kg" DECIMAL(5,2),
    "goal" TEXT NOT NULL DEFAULT 'maintain',
    "activity_level" TEXT NOT NULL DEFAULT 'moderate',
    "speed_kg_per_week" DECIMAL(4,2),
    "dietary_restrictions" JSONB DEFAULT '[]',
    "preferences" JSONB DEFAULT '[]',
    "challenges" JSONB DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "food_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meal_type" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "total_cal" DECIMAL(10,2),
    "total_protein" DECIMAL(10,2),
    "total_carbs" DECIMAL(10,2),
    "total_fat" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "food_log_user_id_logged_at_idx" ON "food_log"("user_id", "logged_at" DESC);

-- AddForeignKey
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_log" ADD CONSTRAINT "food_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
