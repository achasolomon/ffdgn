-- Committee cards have an image slot in the public template, but until now the
-- only thing that could fill it was the chair's member portrait. These columns
-- let an editor set a committee's own image.
--
-- DDL only: the app user is granted CREATE/ALTER but not UPDATE, so no data
-- statements belong in a migration (see scripts/harden-db.ts).
--
-- Nullable and with no backfill on purpose. The public page falls back to the
-- chair portrait, then to the numbered badge, so existing rows render exactly
-- as they do today.
ALTER TABLE `committees`
  ADD COLUMN `image_url` VARCHAR(500) NULL,
  ADD COLUMN `image_alt` VARCHAR(300) NULL;
