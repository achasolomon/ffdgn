-- CreateTable
CREATE TABLE `conference_admissions` (
    `id` VARCHAR(191) NOT NULL,
    `registration_id` VARCHAR(191) NOT NULL,
    `actor_id` VARCHAR(191) NOT NULL,
    `actor_name` VARCHAR(192) NOT NULL,
    `method` VARCHAR(16) NOT NULL,
    `reason` VARCHAR(500) NULL,
    `invitation_generation` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `conference_admissions_registration_id_key`(`registration_id`),
    INDEX `conference_admissions_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `conference_admissions` ADD CONSTRAINT `conference_admissions_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `event_registrations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conference_admissions` ADD CONSTRAINT `conference_admissions_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
