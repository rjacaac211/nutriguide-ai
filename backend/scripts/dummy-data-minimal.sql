-- Minimal dummy data for quick local testing. 7 days, ~24 meals.
-- Run: psql -U postgres -d nutriguide -f backend/scripts/dummy-data-minimal.sql
-- Test user ID: 11111111-1111-1111-1111-111111111111
-- WARNING: Do not run in production.

DELETE FROM weight_log WHERE user_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM food_log WHERE user_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM profile WHERE user_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM users WHERE id = '11111111-1111-1111-1111-111111111111';

INSERT INTO users (id, created_at, updated_at)
VALUES ('11111111-1111-1111-1111-111111111111', NOW(), NOW());

INSERT INTO profile (user_id, name, gender, birth_date, age, height_cm, weight_kg, goal_weight_kg, goal, activity_level, speed_kg_per_week, dietary_restrictions, preferences, challenges, created_at, updated_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test User', 'male', '1990-05-15'::date, 34, 175.00, 80.00, 75.00, 'lose', 'moderate', 0.50, '[]'::jsonb, '["energy", "structure"]'::jsonb, '["consistency"]'::jsonb, NOW(), NOW());

INSERT INTO food_log (id, user_id, logged_at, meal_type, items, total_cal, total_protein, total_carbs, total_fat, created_at)
VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (CURRENT_DATE - 6) + TIME '08:00', 'breakfast', '[{"fdcId": 173410, "description": "Oatmeal, regular, cooked", "referenceGrams": 100, "grams": 234, "calories": 68, "protein": 2.4, "carbs": 12, "fat": 1.4}]'::jsonb, 159.12, 5.62, 28.08, 3.28, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (CURRENT_DATE - 6) + TIME '12:30', 'lunch', '[{"fdcId": 171705, "description": "Chicken, broiler, roasted", "referenceGrams": 100, "grams": 150, "calories": 239, "protein": 27.3, "carbs": 0, "fat": 14.1}]'::jsonb, 358.50, 40.95, 0, 21.15, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (CURRENT_DATE - 6) + TIME '19:00', 'dinner', '[{"fdcId": 169098, "description": "Rice, white, cooked", "referenceGrams": 100, "grams": 200, "calories": 130, "protein": 2.4, "carbs": 28.2, "fat": 0.3}]'::jsonb, 260.00, 4.80, 56.40, 0.60, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (CURRENT_DATE - 5) + TIME '08:00', 'breakfast', '[{"fdcId": 171688, "description": "Egg, whole, cooked, scrambled", "referenceGrams": 100, "grams": 120, "calories": 149, "protein": 10.1, "carbs": 1.6, "fat": 11.2}]'::jsonb, 178.80, 12.12, 1.92, 13.44, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (CURRENT_DATE - 5) + TIME '12:00', 'lunch', '[{"fdcId": 175168, "description": "Salmon, Atlantic, cooked", "referenceGrams": 100, "grams": 170, "calories": 208, "protein": 20.4, "carbs": 0, "fat": 13.4}]'::jsonb, 353.60, 34.68, 0, 22.78, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (CURRENT_DATE - 5) + TIME '19:00', 'dinner', '[{"fdcId": 171705, "description": "Chicken, broiler, roasted", "referenceGrams": 100, "grams": 100, "calories": 239, "protein": 27.3, "carbs": 0, "fat": 14.1},{"fdcId": 169098, "description": "Rice, white, cooked", "referenceGrams": 100, "grams": 150, "calories": 130, "protein": 2.4, "carbs": 28.2, "fat": 0.3}]'::jsonb, 434.00, 29.70, 42.30, 14.40, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (CURRENT_DATE - 4) + TIME '08:00', 'breakfast', '[{"fdcId": 174270, "description": "Greek yogurt, plain, nonfat", "referenceGrams": 100, "grams": 170, "calories": 59, "protein": 10.2, "carbs": 3.6, "fat": 0.7}]'::jsonb, 100.30, 17.34, 6.12, 1.19, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (CURRENT_DATE - 4) + TIME '12:30', 'lunch', '[{"fdcId": 169098, "description": "Rice, white, cooked", "referenceGrams": 100, "grams": 200, "calories": 130, "protein": 2.4, "carbs": 28.2, "fat": 0.3}]'::jsonb, 260.00, 4.80, 56.40, 0.60, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (CURRENT_DATE - 4) + TIME '19:00', 'dinner', '[{"fdcId": 171705, "description": "Chicken, broiler, roasted", "referenceGrams": 100, "grams": 180, "calories": 239, "protein": 27.3, "carbs": 0, "fat": 14.1}]'::jsonb, 430.20, 49.14, 0, 25.38, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (CURRENT_DATE - 3) + TIME '08:00', 'breakfast', '[{"fdcId": 173410, "description": "Oatmeal, regular, cooked", "referenceGrams": 100, "grams": 234, "calories": 68, "protein": 2.4, "carbs": 12, "fat": 1.4}]'::jsonb, 159.12, 5.62, 28.08, 3.28, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (CURRENT_DATE - 3) + TIME '12:00', 'lunch', '[{"fdcId": 175168, "description": "Salmon, Atlantic, cooked", "referenceGrams": 100, "grams": 150, "calories": 208, "protein": 20.4, "carbs": 0, "fat": 13.4}]'::jsonb, 312.00, 30.60, 0, 20.10, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (CURRENT_DATE - 3) + TIME '19:00', 'dinner', '[{"fdcId": 171705, "description": "Chicken, broiler, roasted", "referenceGrams": 100, "grams": 150, "calories": 239, "protein": 27.3, "carbs": 0, "fat": 14.1},{"fdcId": 169098, "description": "Rice, white, cooked", "referenceGrams": 100, "grams": 150, "calories": 130, "protein": 2.4, "carbs": 28.2, "fat": 0.3}]'::jsonb, 553.50, 44.55, 42.30, 21.60, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (CURRENT_DATE - 2) + TIME '08:00', 'breakfast', '[{"fdcId": 171688, "description": "Egg, whole, cooked, scrambled", "referenceGrams": 100, "grams": 120, "calories": 149, "protein": 10.1, "carbs": 1.6, "fat": 11.2}]'::jsonb, 178.80, 12.12, 1.92, 13.44, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (CURRENT_DATE - 2) + TIME '12:30', 'lunch', '[{"fdcId": 171705, "description": "Chicken, broiler, roasted", "referenceGrams": 100, "grams": 150, "calories": 239, "protein": 27.3, "carbs": 0, "fat": 14.1},{"fdcId": 169098, "description": "Rice, white, cooked", "referenceGrams": 100, "grams": 150, "calories": 130, "protein": 2.4, "carbs": 28.2, "fat": 0.3}]'::jsonb, 553.50, 44.55, 42.30, 21.60, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (CURRENT_DATE - 2) + TIME '19:00', 'dinner', '[{"fdcId": 175168, "description": "Salmon, Atlantic, cooked", "referenceGrams": 100, "grams": 170, "calories": 208, "protein": 20.4, "carbs": 0, "fat": 13.4}]'::jsonb, 353.60, 34.68, 0, 22.78, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (CURRENT_DATE - 1) + TIME '08:00', 'breakfast', '[{"fdcId": 173410, "description": "Oatmeal, regular, cooked", "referenceGrams": 100, "grams": 234, "calories": 68, "protein": 2.4, "carbs": 12, "fat": 1.4}]'::jsonb, 159.12, 5.62, 28.08, 3.28, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (CURRENT_DATE - 1) + TIME '12:00', 'lunch', '[{"fdcId": 169098, "description": "Rice, white, cooked", "referenceGrams": 100, "grams": 200, "calories": 130, "protein": 2.4, "carbs": 28.2, "fat": 0.3}]'::jsonb, 260.00, 4.80, 56.40, 0.60, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', (CURRENT_DATE - 1) + TIME '19:00', 'dinner', '[{"fdcId": 171705, "description": "Chicken, broiler, roasted", "referenceGrams": 100, "grams": 200, "calories": 239, "protein": 27.3, "carbs": 0, "fat": 14.1}]'::jsonb, 478.00, 54.60, 0, 28.20, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', CURRENT_DATE + TIME '08:00', 'breakfast', '[{"fdcId": 174270, "description": "Greek yogurt, plain, nonfat", "referenceGrams": 100, "grams": 170, "calories": 59, "protein": 10.2, "carbs": 3.6, "fat": 0.7}]'::jsonb, 100.30, 17.34, 6.12, 1.19, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', CURRENT_DATE + TIME '12:30', 'lunch', '[{"fdcId": 175168, "description": "Salmon, Atlantic, cooked", "referenceGrams": 100, "grams": 150, "calories": 208, "protein": 20.4, "carbs": 0, "fat": 13.4}]'::jsonb, 312.00, 30.60, 0, 20.10, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', CURRENT_DATE + TIME '16:00', 'snack', '[{"fdcId": 173944, "description": "Banana, raw", "referenceGrams": 100, "grams": 118, "calories": 89, "protein": 1.1, "carbs": 22.8, "fat": 0.3}]'::jsonb, 105.02, 1.30, 26.90, 0.35, NOW()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', CURRENT_DATE + TIME '19:00', 'dinner', '[{"fdcId": 171705, "description": "Chicken, broiler, roasted", "referenceGrams": 100, "grams": 150, "calories": 239, "protein": 27.3, "carbs": 0, "fat": 14.1},{"fdcId": 169098, "description": "Rice, white, cooked", "referenceGrams": 100, "grams": 150, "calories": 130, "protein": 2.4, "carbs": 28.2, "fat": 0.3}]'::jsonb, 553.50, 44.55, 42.30, 21.60, NOW());

INSERT INTO weight_log (id, user_id, weight_kg, date, logged_at, notes)
VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 81.00, CURRENT_DATE - 6, NOW(), NULL),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 80.85, CURRENT_DATE - 5, NOW(), NULL),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 80.70, CURRENT_DATE - 4, NOW(), NULL),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 80.55, CURRENT_DATE - 3, NOW(), NULL),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 80.40, CURRENT_DATE - 2, NOW(), NULL),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 80.25, CURRENT_DATE - 1, NOW(), NULL),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 80.00, CURRENT_DATE, NOW(), NULL);
