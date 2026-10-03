ALTER TABLE `events`
  ADD COLUMN `published` BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE `news`
  ADD COLUMN `status` ENUM('Draft', 'Published', 'Archived') NOT NULL DEFAULT 'Published';

ALTER TABLE `committees`
  ADD COLUMN `published` BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE `partnerships`
  ADD COLUMN `published` BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE `focus_areas`
  ADD COLUMN `published` BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE `timeline_entries`
  ADD COLUMN `published` BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE `leadership_seats`
  ADD COLUMN `published` BOOLEAN NOT NULL DEFAULT true;