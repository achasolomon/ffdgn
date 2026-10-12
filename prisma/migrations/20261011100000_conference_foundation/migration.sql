-- AlterTable
ALTER TABLE `event_registrations` ADD COLUMN `attendee_id` VARCHAR(191) NULL,
    ADD COLUMN `guest_category` VARCHAR(32) NOT NULL DEFAULT 'General',
    ADD COLUMN `invitation_source` VARCHAR(255) NULL,
    MODIFY `user_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `conference_config` (
    `event_id` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `public_registration_enabled` BOOLEAN NOT NULL DEFAULT false,
    `require_accepted_rsvp` BOOLEAN NOT NULL DEFAULT false,
    `capacity` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`event_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conference_attendees` (
    `id` VARCHAR(191) NOT NULL,
    `full_name` VARCHAR(192) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `organization` VARCHAR(192) NULL,
    `job_title` VARCHAR(192) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `conference_attendees_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conference_staff_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `role` ENUM('Manager', 'RegistrationOfficer', 'ReportingOfficer') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `conference_staff_assignments_user_id_idx`(`user_id`),
    UNIQUE INDEX `conference_staff_assignments_event_id_user_id_key`(`event_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conference_imports` (
    `id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `actor_id` VARCHAR(191) NOT NULL,
    `state` ENUM('Preview', 'Committed') NOT NULL DEFAULT 'Preview',
    `rows` JSON NULL,
    `result` JSON NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `conference_imports_event_id_created_at_idx`(`event_id`, `created_at`),
    INDEX `conference_imports_state_expires_at_idx`(`state`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `event_registrations_attendee_id_event_id_key` ON `event_registrations`(`attendee_id`, `event_id`);

-- AddForeignKey
ALTER TABLE `event_registrations` ADD CONSTRAINT `event_registrations_attendee_id_fkey` FOREIGN KEY (`attendee_id`) REFERENCES `conference_attendees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conference_config` ADD CONSTRAINT `conference_config_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conference_staff_assignments` ADD CONSTRAINT `conference_staff_assignments_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conference_staff_assignments` ADD CONSTRAINT `conference_staff_assignments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conference_imports` ADD CONSTRAINT `conference_imports_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conference_imports` ADD CONSTRAINT `conference_imports_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
