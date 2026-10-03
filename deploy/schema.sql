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
    `password_changed_at` DATETIME(3) NULL,
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
    `category` ENUM('Former', 'Serving', 'Secretariat') NOT NULL,
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
    `published` BOOLEAN NOT NULL DEFAULT true,
    `summary` TEXT NOT NULL,
    `highlights` LONGTEXT NULL,
    `guest_list` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `cover_url` VARCHAR(512) NULL,

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
    `storage_key` VARCHAR(255) NULL,
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
    `status` ENUM('Draft', 'Published', 'Archived') NOT NULL DEFAULT 'Published',
    `image_url` VARCHAR(512) NULL,
    `event_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `news_slug_key`(`slug`),
    INDEX `news_category_date_idx`(`category`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
CREATE TABLE `committees` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(128) NOT NULL,
    `name` VARCHAR(192) NOT NULL,
    `mandate` TEXT NOT NULL,
    `chair_slug` VARCHAR(128) NOT NULL,
    `meetings` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(32) NOT NULL,
    `image_url` VARCHAR(500) NULL,
    `image_alt` VARCHAR(300) NULL,
    `published` BOOLEAN NOT NULL DEFAULT true,
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
    `published` BOOLEAN NOT NULL DEFAULT true,
    `logo_url` VARCHAR(512) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `partnerships_slug_key`(`slug`),
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
    `visibility` ENUM('PUBLIC', 'MEMBERS_ONLY', 'COMMITTEE_ONLY', 'SECRETARIAT_ONLY', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `position` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `speakers_slug_key`(`slug`),
    INDEX `speakers_event_id_position_idx`(`event_id`, `position`),
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

-- CreateTable
CREATE TABLE `institutional_sections` (
    `id` VARCHAR(191) NOT NULL,
    `page_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `image_url` VARCHAR(500) NULL,
    `image_alt` VARCHAR(300) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `published` BOOLEAN NOT NULL DEFAULT true,

    INDEX `institutional_sections_page_id_position_idx`(`page_id`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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
    `image_url` VARCHAR(512) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `published` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `focus_areas_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `timeline_entries` (
    `id` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `summary` TEXT NOT NULL,
    `image_url` VARCHAR(512) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `published` BOOLEAN NOT NULL DEFAULT true,

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
    `published` BOOLEAN NOT NULL DEFAULT true,

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
    `in_gallery` BOOLEAN NOT NULL DEFAULT true,
    `capture_year` INTEGER NULL,
    `visibility` ENUM('PUBLIC', 'MEMBERS_ONLY', 'COMMITTEE_ONLY', 'SECRETARIAT_ONLY', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `media_assets_kind_category_idx`(`kind`, `category`),
    INDEX `media_assets_event_id_idx`(`event_id`),
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

-- CreateTable
CREATE TABLE `contact_messages` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `ip` VARCHAR(64) NULL,
    `handled` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `contact_messages_handled_created_at_idx`(`handled`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_registrations` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `event_id` VARCHAR(191) NOT NULL,
    `status` ENUM('Registered', 'Cancelled') NOT NULL DEFAULT 'Registered',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `event_registrations_event_id_status_idx`(`event_id`, `status`),
    UNIQUE INDEX `event_registrations_user_id_event_id_key`(`user_id`, `event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `discussion_replies` (
    `id` VARCHAR(191) NOT NULL,
    `thread_id` VARCHAR(191) NOT NULL,
    `author_id` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `discussion_replies_thread_id_created_at_idx`(`thread_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(192) NOT NULL,
    `body` VARCHAR(512) NOT NULL,
    `href` VARCHAR(255) NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_read_at_created_at_idx`(`user_id`, `read_at`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
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
ALTER TABLE `news` ADD CONSTRAINT `news_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `news_docs` ADD CONSTRAINT `news_docs_news_id_fkey` FOREIGN KEY (`news_id`) REFERENCES `news`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `news_docs` ADD CONSTRAINT `news_docs_doc_id_fkey` FOREIGN KEY (`doc_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `committee_seats` ADD CONSTRAINT `committee_seats_committee_id_fkey` FOREIGN KEY (`committee_id`) REFERENCES `committees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `committee_seats` ADD CONSTRAINT `committee_seats_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partnership_cooperation` ADD CONSTRAINT `partnership_cooperation_partnership_id_fkey` FOREIGN KEY (`partnership_id`) REFERENCES `partnerships`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partnership_events` ADD CONSTRAINT `partnership_events_partnership_id_fkey` FOREIGN KEY (`partnership_id`) REFERENCES `partnerships`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partnership_events` ADD CONSTRAINT `partnership_events_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `speakers` ADD CONSTRAINT `speakers_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `institutional_sections` ADD CONSTRAINT `institutional_sections_page_id_fkey` FOREIGN KEY (`page_id`) REFERENCES `institutional_pages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE `media_assets` ADD CONSTRAINT `media_assets_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_registrations` ADD CONSTRAINT `event_registrations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_registrations` ADD CONSTRAINT `event_registrations_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discussion_threads` ADD CONSTRAINT `discussion_threads_committee_id_fkey` FOREIGN KEY (`committee_id`) REFERENCES `committees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discussion_threads` ADD CONSTRAINT `discussion_threads_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discussion_replies` ADD CONSTRAINT `discussion_replies_thread_id_fkey` FOREIGN KEY (`thread_id`) REFERENCES `discussion_threads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discussion_replies` ADD CONSTRAINT `discussion_replies_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `committee_meetings` ADD CONSTRAINT `committee_meetings_committee_id_fkey` FOREIGN KEY (`committee_id`) REFERENCES `committees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `committee_meetings` ADD CONSTRAINT `committee_meetings_organizer_id_fkey` FOREIGN KEY (`organizer_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `committee_recommendations` ADD CONSTRAINT `committee_recommendations_committee_id_fkey` FOREIGN KEY (`committee_id`) REFERENCES `committees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `committee_recommendations` ADD CONSTRAINT `committee_recommendations_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
