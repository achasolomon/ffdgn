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
  PRIMARY KEY (`id`),
  CONSTRAINT `institutional_sections_page_id_fkey` FOREIGN KEY (`page_id`) REFERENCES `institutional_pages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- DDL only, deliberately. The app user is granted CREATE/ALTER but not UPDATE
-- (`scripts/harden-db.ts` withholds it so audit_log stays append-only), so this
-- migration must not contain data statements.
--
-- Governance previously stored its layers in `institutional_pages.body` as
-- "Title|Description" lines that the page split on `|`. Those layers are now
-- rows here, seeded by `prisma/seed.ts`, which owns content and runs on every
-- environment. The legacy blob is cleared there too.
