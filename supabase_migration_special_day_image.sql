-- Special Day countdowns: optional photo shown instead of the emoji.
-- We store a direct image URL (a hotlinkable link), NOT the image bytes,
-- so this adds negligible storage. Google Photos *share* links won't render
-- as images — use a direct .jpg/.png URL.
ALTER TABLE special_days
  ADD COLUMN IF NOT EXISTS image_url TEXT;
