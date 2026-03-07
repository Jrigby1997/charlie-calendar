-- Migrate existing color_theme values to the new 'glass' / 'pastel' system.
-- All legacy values (default, ocean, sunset, forest, lavender) map to 'glass'
-- since those were all variants of the animated gradient background.
UPDATE app_settings
SET color_theme = 'glass'
WHERE color_theme IN ('default', 'ocean', 'sunset', 'forest', 'lavender')
   OR color_theme IS NULL;
