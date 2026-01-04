/*
  # Auth Trigger for Auto-Profile Creation

  1. Functionality
    - Automatically creates a profile when a new user signs up
    - Assigns user to 'AI For Future' tenant as 'member' role
    - Trigger fires on insert to auth.users table

  2. Key Features
    - Ensures every user has a profile
    - Default assignment to main tenant
    - Profile creation is atomic with user signup
*/

-- Create function for profile auto-creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_tenant_id uuid;
BEGIN
  -- Get the 'AI For Future' tenant ID
  SELECT id INTO default_tenant_id FROM public.tenants
  WHERE name = 'AI For Future'
  LIMIT 1;

  -- Create profile for new user
  INSERT INTO public.profiles (user_id, tenant_id, role)
  VALUES (NEW.id, default_tenant_id, 'member');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
