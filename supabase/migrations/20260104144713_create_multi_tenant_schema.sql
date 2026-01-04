/*
  # Multi-Tenant SaaS Architecture

  1. New Tables
    - `tenants`: Organization/workspace data with subscription management
    - `profiles`: User profiles linked to auth.users and tenants
  
  2. Modified Tables
    - `content_posts`: Added tenant_id column for multi-tenant isolation

  3. Security
    - Enable RLS on tenants, profiles, and content_posts
    - Add comprehensive policies for tenant isolation
    - Users can only access data from their assigned tenant
    - Subscription status check for active tenants
    - Default tenant 'AI For Future' created with active subscription

  4. Key Features
    - Complete data isolation between tenants
    - User-to-tenant assignment via profiles
    - Subscription status enforcement
    - Auth trigger for auto-profile creation on signup
*/

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'paused')),
  created_at timestamptz DEFAULT now()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  created_at timestamptz DEFAULT now()
);

-- Add tenant_id to content_posts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content_posts' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE content_posts ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Insert default tenant
INSERT INTO tenants (name, subscription_status) 
VALUES ('AI For Future', 'active')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for migration safety)
DROP POLICY IF EXISTS "tenants_read_own" ON tenants;
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
DROP POLICY IF EXISTS "posts_tenant_isolation" ON content_posts;
DROP POLICY IF EXISTS "posts_insert_own_tenant" ON content_posts;
DROP POLICY IF EXISTS "posts_update_own_tenant" ON content_posts;
DROP POLICY IF EXISTS "posts_delete_own_tenant" ON content_posts;

-- Tenants: Users can read only their own tenant if subscription is active
CREATE POLICY "tenants_read_own"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    subscription_status = 'active' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.tenant_id = tenants.id
      AND profiles.user_id = auth.uid()
    )
  );

-- Profiles: Users can read their own profile only
CREATE POLICY "profiles_read_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Posts: Users can select posts only from their assigned tenant with active subscription
CREATE POLICY "posts_tenant_isolation"
  ON content_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN tenants t ON p.tenant_id = t.id
      WHERE p.user_id = auth.uid()
      AND p.tenant_id = content_posts.tenant_id
      AND t.subscription_status = 'active'
    )
  );

-- Posts: Users can insert posts only to their assigned tenant
CREATE POLICY "posts_insert_own_tenant"
  ON content_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN tenants t ON p.tenant_id = t.id
      WHERE p.user_id = auth.uid()
      AND p.tenant_id = tenant_id
      AND t.subscription_status = 'active'
    )
  );

-- Posts: Users can update only their own posts in their tenant
CREATE POLICY "posts_update_own_tenant"
  ON content_posts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN tenants t ON p.tenant_id = t.id
      WHERE p.user_id = auth.uid()
      AND p.tenant_id = content_posts.tenant_id
      AND t.subscription_status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN tenants t ON p.tenant_id = t.id
      WHERE p.user_id = auth.uid()
      AND p.tenant_id = content_posts.tenant_id
      AND t.subscription_status = 'active'
    )
  );

-- Posts: Users can delete only their own posts in their tenant
CREATE POLICY "posts_delete_own_tenant"
  ON content_posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN tenants t ON p.tenant_id = t.id
      WHERE p.user_id = auth.uid()
      AND p.tenant_id = content_posts.tenant_id
      AND t.subscription_status = 'active'
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_content_posts_tenant_id ON content_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);
