-- AlterTable
ALTER TABLE `event_registrations` ADD COLUMN `conference_rsvp` ENUM('Pending', 'Accepted', 'Declined') NOT NULL DEFAULT 'Pending';

-- CreateTable
CREATE TABLE `conference_invitations` (
    `id` VARCHAR(191) NOT NULL,
    `registration_id` VARCHAR(191) NOT NULL,
    `generation` INTEGER NOT NULL DEFAULT 1,
    `qr_hash` CHAR(64) NOT NULL,
    `rsvp_hash` CHAR(64) NOT NULL,
    `credential_envelope` TEXT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `conference_invitations_registration_id_key`(`registration_id`),
    UNIQUE INDEX `conference_invitations_qr_hash_key`(`qr_hash`),
    UNIQUE INDEX `conference_invitations_rsvp_hash_key`(`rsvp_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conference_dispatches` (
    `id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `actor_id` VARCHAR(191) NOT NULL,
    `request_key` VARCHAR(191) NOT NULL,
    `fingerprint` CHAR(64) NOT NULL,
    `result` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `conference_dispatches_request_key_key`(`request_key`),
    INDEX `conference_dispatches_event_id_created_at_idx`(`event_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conference_email_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `invitation_id` VARCHAR(191) NOT NULL,
    `generation` INTEGER NOT NULL,
    `state` ENUM('Queued', 'Processing', 'Accepted', 'Failed', 'Uncertain', 'Cancelled') NOT NULL DEFAULT 'Queued',
    `recipient` VARCHAR(255) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `available_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lease_owner` VARCHAR(64) NULL,
    `lease_until` DATETIME(3) NULL,
    `message_id` VARCHAR(255) NULL,
    `error_code` VARCHAR(64) NULL,
    `accepted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `conference_email_jobs_state_available_at_idx`(`state`, `available_at`),
    INDEX `conference_email_jobs_invitation_id_generation_state_idx`(`invitation_id`, `generation`, `state`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conference_email_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `job_id` VARCHAR(191) NOT NULL,
    `attempt` INTEGER NOT NULL,
    `state` ENUM('Queued', 'Processing', 'Accepted', 'Failed', 'Uncertain', 'Cancelled') NOT NULL,
    `error_code` VARCHAR(64) NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,

    UNIQUE INDEX `conference_email_attempts_job_id_attempt_key`(`job_id`, `attempt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conference_rsvp_actions` (
    `id` VARCHAR(191) NOT NULL,
    `registration_id` VARCHAR(191) NOT NULL,
    `previous` ENUM('Pending', 'Accepted', 'Declined') NOT NULL,
    `response` ENUM('Pending', 'Accepted', 'Declined') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `conference_rsvp_actions_registration_id_created_at_idx`(`registration_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `conference_invitations` ADD CONSTRAINT `conference_invitations_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `event_registrations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conference_dispatches` ADD CONSTRAINT `conference_dispatches_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conference_dispatches` ADD CONSTRAINT `conference_dispatches_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conference_email_jobs` ADD CONSTRAINT `conference_email_jobs_invitation_id_fkey` FOREIGN KEY (`invitation_id`) REFERENCES `conference_invitations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conference_email_attempts` ADD CONSTRAINT `conference_email_attempts_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `conference_email_jobs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conference_rsvp_actions` ADD CONSTRAINT `conference_rsvp_actions_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `event_registrations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
