-- CreateTable: Renewed Hope Agenda Peer Review Group membership roster
CREATE TABLE `peer_review_members` (
    `id` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `zone` VARCHAR(100) NOT NULL,
    `role` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(50) NULL,
    `email` VARCHAR(255) NULL,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `peer_review_members_position_idx`(`position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;