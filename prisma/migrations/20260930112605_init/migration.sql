-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `name` VARCHAR(192) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('super_admin', 'secretariat_admin', 'membership_admin', 'content_editor', 'events_manager', 'knowledge_manager', 'committee_manager', 'communications_officer', 'auditor', 'member', 'associate') NOT NULL DEFAULT 'member',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_login_at` DATETIME(3) NULL,
    `failed_logins` INTEGER NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `members` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `slug` VARCHAR(128) NOT NULL,
    `full_name` VARCHAR(192) NOT NULL,
    `title` VARCHAR(128) NOT NULL,
    `state` VARCHAR(64) NOT NULL,
    `region` VARCHAR(32) NOT NULL,
    `category` ENUM('Former', 'Serving') NOT NULL,
    `status` ENUM('Active', 'Associate', 'Honorary', 'Pending') NOT NULL DEFAULT 'Pending',
    `leadership_role` VARCHAR(128) NULL,
    `photo_url` VARCHAR(512) NULL,
    `bio` TEXT NULL,
    `visibility` ENUM('PUBLIC', 'MEMBERS_ONLY', 'COMMITTEE_ONLY', 'SECRETARIAT_ONLY', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `members_user_id_key`(`user_id`),
    UNIQUE INDEX `members_slug_key`(`slug`),
    INDEX `members_state_idx`(`state`),
    INDEX `members_category_status_idx`(`category`, `status`),
    FULLTEXT INDEX `members_full_name_bio_idx`(`full_name`, `bio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_history` (
    `id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NOT NULL,
    `office` VARCHAR(128) NOT NULL,
    `state` VARCHAR(64) NOT NULL,
    `start_year` INTEGER NOT NULL,
    `end_year` INTEGER NOT NULL,

    INDEX `service_history_member_id_idx`(`member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `events` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `theme` VARCHAR(255) NOT NULL,
    `kind` VARCHAR(64) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `venue` VARCHAR(255) NOT NULL,
    `city` VARCHAR(128) NOT NULL,
    `status` ENUM('Upcoming', 'Ongoing', 'Past') NOT NULL,
    `summary` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `events_slug_key`(`slug`),
    INDEX `events_status_start_date_idx`(`status`, `start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_programme` (
    `id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `slot_time` VARCHAR(16) NOT NULL,
    `session` VARCHAR(255) NOT NULL,
    `speaker` VARCHAR(192) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    INDEX `event_programme_event_id_position_idx`(`event_id`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `type` VARCHAR(64) NOT NULL,
    `status` ENUM('Draft', 'Editorial_Review', 'Institutional_Review', 'Approved', 'Published', 'Archived') NOT NULL DEFAULT 'Draft',
    `published_on` DATE NULL,
    `author` VARCHAR(192) NOT NULL,
    `topic` VARCHAR(128) NOT NULL,
    `year` INTEGER NOT NULL,
    `committee` VARCHAR(128) NULL,
    `event_id` VARCHAR(191) NULL,
    `pages` INTEGER NOT NULL DEFAULT 0,
    `size_label` VARCHAR(32) NOT NULL,
    `summary` TEXT NOT NULL,
    `visibility` ENUM('PUBLIC', 'MEMBERS_ONLY', 'COMMITTEE_ONLY', 'SECRETARIAT_ONLY', 'PRIVATE') NOT NULL DEFAULT 'SECRETARIAT_ONLY',
    `version` INTEGER NOT NULL DEFAULT 1,
    `file_url` VARCHAR(512) NULL,
    `downloads` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `documents_slug_key`(`slug`),
    INDEX `documents_status_visibility_idx`(`status`, `visibility`),
    INDEX `documents_year_idx`(`year`),
    FULLTEXT INDEX `documents_title_topic_idx`(`title`, `topic`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `news` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `category` VARCHAR(64) NOT NULL,
    `date` DATE NOT NULL,
    `location` VARCHAR(128) NOT NULL,
    `excerpt` TEXT NOT NULL,
    `body` LONGTEXT NOT NULL,
    `official` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `news_slug_key`(`slug`),
    INDEX `news_category_date_idx`(`category`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `committees` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `name` VARCHAR(192) NOT NULL,
    `mandate` TEXT NOT NULL,
    `chair_slug` VARCHAR(128) NOT NULL,
    `meetings` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(32) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `committees_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `committee_seats` (
    `id` VARCHAR(191) NOT NULL,
    `committee_id` VARCHAR(191) NOT NULL,
    `member_id` VARCHAR(191) NOT NULL,

    INDEX `committee_seats_member_id_idx`(`member_id`),
    UNIQUE INDEX `committee_seats_committee_id_member_id_key`(`committee_id`, `member_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partnerships` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `name` VARCHAR(192) NOT NULL,
    `type` VARCHAR(64) NOT NULL,
    `since` INTEGER NOT NULL,
    `purpose` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `partnerships_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_log` (
    `id` VARCHAR(191) NOT NULL,
    `actor_id` VARCHAR(191) NOT NULL,
    `actor_name` VARCHAR(192) NOT NULL,
    `action` VARCHAR(128) NOT NULL,
    `resource` VARCHAR(255) NOT NULL,
    `ip` VARCHAR(64) NOT NULL,
    `previous_value` TEXT NULL,
    `new_value` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_log_actor_id_created_at_idx`(`actor_id`, `created_at`),
    INDEX `audit_log_action_created_at_idx`(`action`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `members` ADD CONSTRAINT `members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_history` ADD CONSTRAINT `service_history_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_programme` ADD CONSTRAINT `event_programme_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `committee_seats` ADD CONSTRAINT `committee_seats_committee_id_fkey` FOREIGN KEY (`committee_id`) REFERENCES `committees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `committee_seats` ADD CONSTRAINT `committee_seats_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
