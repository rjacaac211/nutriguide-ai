-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "userId" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "FoodLog" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meal_type" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "total_cal" DECIMAL(10,2),
    "total_protein" DECIMAL(10,2),
    "total_carbs" DECIMAL(10,2),
    "total_fat" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FoodLog_user_id_logged_at_idx" ON "FoodLog"("user_id", "logged_at" DESC);

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodLog" ADD CONSTRAINT "FoodLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
