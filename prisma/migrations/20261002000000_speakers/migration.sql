-- CreateTable: conference speakers (CMS-managed, own detail pages)
CREATE TABLE `speakers` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `name` VARCHAR(192) NOT NULL,
    `honorific` VARCHAR(64) NULL,
    `role` VARCHAR(128) NOT NULL,
    `keynote` BOOLEAN NOT NULL DEFAULT false,
    `org` VARCHAR(192) NULL,
    `bio` TEXT NULL,
    `photo_url` VARCHAR(512) NULL,
    `event_id` VARCHAR(191) NULL,
    `visibility` ENUM('PUBLIC','MEMBERS_ONLY','COMMITTEE_ONLY','SECRETARIAT_ONLY','PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `position` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `speakers_slug_key`(`slug`),
    INDEX `speakers_event_id_position_idx`(`event_id`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `speakers` ADD CONSTRAINT `speakers_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
