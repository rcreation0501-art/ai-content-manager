/*
  # Add Payment and Subscription Columns to Profiles

  1. Changes to profiles table
    - Add `tenant_id` (uuid) - for multi-tenant support
    - Add `plan_tier` (text, default: 'free') - subscription tier
    - Add `points_balance` (integer, default: 0) - points/credits balance
    - Add `credits` (integer, default: 20) - AI generation credits
    - Add `is_subscribed` (boolean, default: false) - subscription status
    - Add `subscription_expiry` (timestamptz, nullable) - when subscription expires
    - Add `id` column if using user_id as primary key

  2. Ensures backward compatibility
    - Uses IF NOT EXISTS for all operations
    - Preserves existing data
    - Safe to run multiple times
*/

-- First, ensure tenants table exists
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'paused')),
  created_at timestamptz DEFAULT now()
);

-- Insert default tenant if it doesn't exist
INSERT INTO tenants (name, subscription_status) 
VALUES ('AI For Future', 'active')
ON CONFLICT (name) DO NOTHING;

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  created_at timestamptz DEFAULT now()
);

-- Add columns to profiles table if they don't exist
DO $$
BEGIN
  -- Add plan_tier column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'plan_tier'
  ) THEN
    ALTER TABLE profiles ADD COLUMN plan_tier text DEFAULT 'free';
  END IF;

  -- Add points_balance column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'points_balance'
  ) THEN
    ALTER TABLE profiles ADD COLUMN points_balance integer DEFAULT 0;
  END IF;

  -- Add credits column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'credits'
  ) THEN
    ALTER TABLE profiles ADD COLUMN credits integer DEFAULT 20;
  END IF;

  -- Add is_subscribed column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_subscribed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_subscribed boolean DEFAULT false;
  END IF;

  -- Add subscription_expiry column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_expiry'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_expiry timestamptz;
  END IF;

  -- Set default tenant_id for existing profiles if tenant_id is null
  UPDATE profiles 
  SET tenant_id = (SELECT id FROM tenants WHERE name = 'AI For Future' LIMIT 1)
  WHERE tenant_id IS NULL;
END $$;

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing profile policies if they exist
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- Users can read their own profile
CREATE POLICY "profiles_read_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);

-- Create or replace the trigger function for auto-profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_tenant_id uuid;
BEGIN
  -- Get the 'AI For Future' tenant ID
  SELECT id INTO default_tenant_id FROM public.tenants
  WHERE name = 'AI For Future'
  LIMIT 1;

  -- Create profile for new user with default values
  INSERT INTO public.profiles (user_id, tenant_id, role, credits, is_subscribed, plan_tier, points_balance)
  VALUES (NEW.id, default_tenant_id, 'member', 20, false, 'free', 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();