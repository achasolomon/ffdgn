-- AlterTable
ALTER TABLE `events` ADD COLUMN `cover_url` VARCHAR(512) NULL;

-- AlterTable
ALTER TABLE `news` ADD COLUMN `image_url` VARCHAR(512) NULL;

-- CreateTable
CREATE TABLE `media_assets` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `kind` ENUM('IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO') NOT NULL DEFAULT 'IMAGE',
    `category` VARCHAR(64) NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `thumbnail_url` VARCHAR(512) NULL,
    `provider` VARCHAR(16) NULL,
    `provider_id` VARCHAR(128) NULL,
    `duration_secs` INTEGER NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `photographer` VARCHAR(192) NULL,
    `copyright` VARCHAR(192) NULL,
    `alt_text` VARCHAR(255) NULL,
    `event_id` VARCHAR(191) NULL,
    `visibility` ENUM('PUBLIC', 'MEMBERS_ONLY', 'COMMITTEE_ONLY', 'SECRETARIAT_ONLY', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `media_assets_kind_category_idx`(`kind`, `category`),
    INDEX `media_assets_event_id_idx`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `media_assets` ADD CONSTRAINT `media_assets_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
