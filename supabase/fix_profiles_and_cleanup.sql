-- Script to fix missing phone numbers in profiles table and update the trigger

-- 1. Update existing profiles using data from auth.users
UPDATE public.profiles p
SET 
  phone = u.raw_user_meta_data->>'phone',
  phone_number = COALESCE(u.raw_user_meta_data->>'phone', u.raw_user_meta_data->>'phone_number', '')
FROM auth.users u
WHERE p.id = u.id 
  AND (p.phone IS NULL OR p.phone_number = '');

-- 2. Update the trigger function (if it exists) to properly map phone and phone_number
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, phone_number, role, mill_name)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    COALESCE(new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'phone_number', ''),
    new.raw_user_meta_data->>'role',
    new.raw_user_meta_data->>'mill_name'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    phone_number = EXCLUDED.phone_number,
    role = EXCLUDED.role,
    mill_name = EXCLUDED.mill_name;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure the trigger is attached to auth.users (re-creating it just to be safe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Clean up unused tables (OPTIONAL - uncomment if you want to delete them permanently)
-- DROP TABLE IF EXISTS public.farmers CASCADE;
-- DROP TABLE IF EXISTS public.harvest_batches CASCADE;
-- DROP TABLE IF EXISTS public.harvest_logs CASCADE;
-- DROP TABLE IF EXISTS public.sugarcane_plots CASCADE;
