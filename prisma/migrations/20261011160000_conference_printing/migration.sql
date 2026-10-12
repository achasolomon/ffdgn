-- CreateTable
CREATE TABLE `conference_badge_prints` (
    `id` VARCHAR(191) NOT NULL,
    `registration_id` VARCHAR(191) NOT NULL,
    `actor_id` VARCHAR(191) NOT NULL,
    `request_key` VARCHAR(191) NOT NULL,
    `fingerprint` CHAR(64) NOT NULL,
    `state` ENUM('Prepared', 'Confirmed', 'Cancelled') NOT NULL DEFAULT 'Prepared',
    `snapshot` JSON NOT NULL,
    `reprint_reason` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `conference_badge_prints_request_key_key`(`request_key`),
    INDEX `conference_badge_prints_registration_id_created_at_idx`(`registration_id`, `created_at`),
    INDEX `conference_badge_prints_state_idx`(`state`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conference_badge_print_actions` (
    `id` VARCHAR(191) NOT NULL,
    `print_id` VARCHAR(191) NOT NULL,
    `actor_id` VARCHAR(191) NOT NULL,
    `previous` ENUM('Prepared', 'Confirmed', 'Cancelled') NOT NULL,
    `state` ENUM('Prepared', 'Confirmed', 'Cancelled') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `conference_badge_print_actions_print_id_created_at_idx`(`print_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `conference_badge_prints` ADD CONSTRAINT `conference_badge_prints_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `event_registrations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conference_badge_prints` ADD CONSTRAINT `conference_badge_prints_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conference_badge_print_actions` ADD CONSTRAINT `conference_badge_print_actions_print_id_fkey` FOREIGN KEY (`print_id`) REFERENCES `conference_badge_prints`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conference_badge_print_actions` ADD CONSTRAINT `conference_badge_print_actions_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
