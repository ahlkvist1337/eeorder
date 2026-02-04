-- Step 1: Add new role values to app_role enum
-- These need to be committed before they can be used
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'utforare';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'produktion';