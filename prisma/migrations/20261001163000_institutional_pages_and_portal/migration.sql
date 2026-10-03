CREATE TABLE `institutional_pages` (
  `id` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `eyebrow` VARCHAR(128) NOT NULL,
  `lede` TEXT NOT NULL,
  `body` LONGTEXT NOT NULL,
  `published` BOOLEAN NOT NULL DEFAULT true,
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `institutional_pages_slug_key`(`slug`),
  INDEX `institutional_pages_published_slug_idx`(`published`, `slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `event_registrations` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `event_id` VARCHAR(191) NOT NULL,
  `status` ENUM('Registered', 'Cancelled') NOT NULL DEFAULT 'Registered',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `event_registrations_user_id_event_id_key`(`user_id`, `event_id`),
  INDEX `event_registrations_event_id_status_idx`(`event_id`, `status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `event_registrations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `event_registrations_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `discussion_threads` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `body` TEXT NOT NULL,
  `status` ENUM('Open', 'Locked', 'Archived') NOT NULL DEFAULT 'Open',
  `committee_id` VARCHAR(191) NULL,
  `author_id` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `discussion_threads_status_updated_at_idx`(`status`, `updated_at`),
  INDEX `discussion_threads_committee_id_created_at_idx`(`committee_id`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `discussion_threads_committee_id_fkey` FOREIGN KEY (`committee_id`) REFERENCES `committees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `discussion_threads_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `discussion_replies` (
  `id` VARCHAR(191) NOT NULL,
  `thread_id` VARCHAR(191) NOT NULL,
  `author_id` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `discussion_replies_thread_id_created_at_idx`(`thread_id`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `discussion_replies_thread_id_fkey` FOREIGN KEY (`thread_id`) REFERENCES `discussion_threads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `discussion_replies_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `notifications` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(192) NOT NULL,
  `body` VARCHAR(512) NOT NULL,
  `href` VARCHAR(255) NULL,
  `read_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `notifications_user_id_read_at_created_at_idx`(`user_id`, `read_at`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `committee_meetings` (
  `id` VARCHAR(191) NOT NULL,
  `committee_id` VARCHAR(191) NOT NULL,
  `organizer_id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `starts_at` DATETIME(3) NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  `agenda` TEXT NOT NULL,
  `minutes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `committee_meetings_committee_id_starts_at_idx`(`committee_id`, `starts_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `committee_meetings_committee_id_fkey` FOREIGN KEY (`committee_id`) REFERENCES `committees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `committee_meetings_organizer_id_fkey` FOREIGN KEY (`organizer_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `committee_recommendations` (
  `id` VARCHAR(191) NOT NULL,
  `committee_id` VARCHAR(191) NOT NULL,
  `author_id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `rationale` TEXT NOT NULL,
  `recommendation` LONGTEXT NOT NULL,
  `status` ENUM('Draft', 'Submitted', 'Under_Review', 'Approved', 'Rejected', 'Archived') NOT NULL DEFAULT 'Draft',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `committee_recommendations_committee_id_status_updated_at_idx`(`committee_id`, `status`, `updated_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `committee_recommendations_committee_id_fkey` FOREIGN KEY (`committee_id`) REFERENCES `committees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `committee_recommendations_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `documents`
  ADD COLUMN `storage_key` VARCHAR(255) NULL;