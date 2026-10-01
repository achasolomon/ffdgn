-- AlterTable
ALTER TABLE `news` ADD COLUMN `event_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `news_docs` (
    `id` VARCHAR(191) NOT NULL,
    `news_id` VARCHAR(191) NOT NULL,
    `doc_id` VARCHAR(191) NOT NULL,

    INDEX `news_docs_doc_id_idx`(`doc_id`),
    UNIQUE INDEX `news_docs_news_id_doc_id_key`(`news_id`, `doc_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partnership_cooperation` (
    `id` VARCHAR(191) NOT NULL,
    `partnership_id` VARCHAR(191) NOT NULL,
    `area` VARCHAR(255) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    INDEX `partnership_cooperation_partnership_id_position_idx`(`partnership_id`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partnership_events` (
    `id` VARCHAR(191) NOT NULL,
    `partnership_id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,

    INDEX `partnership_events_event_id_idx`(`event_id`),
    UNIQUE INDEX `partnership_events_partnership_id_event_id_key`(`partnership_id`, `event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_settings` (
    `key` VARCHAR(128) NOT NULL,
    `value` TEXT NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(64) NOT NULL,
    `value` VARCHAR(32) NOT NULL,
    `label` VARCHAR(128) NOT NULL,
    `href` VARCHAR(255) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `site_metrics_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `focus_areas` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `title` VARCHAR(128) NOT NULL,
    `text` TEXT NOT NULL,
    `href` VARCHAR(255) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `focus_areas_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `timeline_entries` (
    `id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `summary` TEXT NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `timeline_links` (
    `id` VARCHAR(191) NOT NULL,
    `entry_id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(128) NOT NULL,
    `href` VARCHAR(255) NOT NULL,

    INDEX `timeline_links_entry_id_idx`(`entry_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leadership_seats` (
    `id` VARCHAR(191) NOT NULL,
    `role` VARCHAR(128) NOT NULL,
    `tier` INTEGER NOT NULL DEFAULT 2,
    `member_slug` VARCHAR(128) NOT NULL,
    `remit` TEXT NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_speakers` (
    `id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    INDEX `event_speakers_member_id_idx`(`member_id`),
    UNIQUE INDEX `event_speakers_event_id_member_id_key`(`event_id`, `member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `member_events` (
    `id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,

    INDEX `member_events_event_id_idx`(`event_id`),
    UNIQUE INDEX `member_events_member_id_event_id_key`(`member_id`, `event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `member_publications` (
    `id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NOT NULL,
    `doc_id` VARCHAR(191) NOT NULL,

    INDEX `member_publications_doc_id_idx`(`doc_id`),
    UNIQUE INDEX `member_publications_member_id_doc_id_key`(`member_id`, `doc_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `news` ADD CONSTRAINT `news_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `news_docs` ADD CONSTRAINT `news_docs_news_id_fkey` FOREIGN KEY (`news_id`) REFERENCES `news`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `news_docs` ADD CONSTRAINT `news_docs_doc_id_fkey` FOREIGN KEY (`doc_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partnership_cooperation` ADD CONSTRAINT `partnership_cooperation_partnership_id_fkey` FOREIGN KEY (`partnership_id`) REFERENCES `partnerships`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partnership_events` ADD CONSTRAINT `partnership_events_partnership_id_fkey` FOREIGN KEY (`partnership_id`) REFERENCES `partnerships`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partnership_events` ADD CONSTRAINT `partnership_events_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timeline_links` ADD CONSTRAINT `timeline_links_entry_id_fkey` FOREIGN KEY (`entry_id`) REFERENCES `timeline_entries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_speakers` ADD CONSTRAINT `event_speakers_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_speakers` ADD CONSTRAINT `event_speakers_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_events` ADD CONSTRAINT `member_events_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_events` ADD CONSTRAINT `member_events_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_publications` ADD CONSTRAINT `member_publications_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_publications` ADD CONSTRAINT `member_publications_doc_id_fkey` FOREIGN KEY (`doc_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
