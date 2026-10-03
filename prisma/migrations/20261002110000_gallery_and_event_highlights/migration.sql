-- Gallery opt-out + capture year on media, and a long-form highlights field on events
ALTER TABLE `events` ADD COLUMN `highlights` LONGTEXT NULL;

ALTER TABLE `media_assets` ADD COLUMN `capture_year` INTEGER NULL,
    ADD COLUMN `in_gallery` BOOLEAN NOT NULL DEFAULT true;