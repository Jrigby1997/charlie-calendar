-- Fix recipes table by dropping old ingredients column
ALTER TABLE recipes DROP COLUMN IF EXISTS ingredients CASCADE;
