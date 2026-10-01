-- FFDGN institutional schema (MySQL production target, §27/§31).
-- Phase 1 runs on the typed domain layer in lib/ (1:1 with these tables);
-- apply this schema when promoting to managed MySQL.

CREATE TABLE IF NOT EXISTS states (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  region ENUM('North-Central','North-East','North-West','South-East','South-South','South-West') NOT NULL,
  INDEX idx_region (region)
);

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(48) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_role (role)
);

CREATE TABLE IF NOT EXISTS members (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  slug VARCHAR(128) NOT NULL UNIQUE,
  full_name VARCHAR(192) NOT NULL,
  category ENUM('Former','Serving') NOT NULL,
  status ENUM('Active','Associate','Honorary','Pending') NOT NULL DEFAULT 'Pending',
  state_id INT NOT NULL,
  photo_url VARCHAR(512) NULL,
  bio TEXT NULL,
  visibility ENUM('PUBLIC','MEMBERS_ONLY','COMMITTEE_ONLY','SECRETARIAT_ONLY','PRIVATE') NOT NULL DEFAULT 'PUBLIC',
  FOREIGN KEY (state_id) REFERENCES states(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FULLTEXT INDEX ft_member (full_name, bio)
);

CREATE TABLE IF NOT EXISTS service_history (
  id CHAR(36) PRIMARY KEY,
  member_id CHAR(36) NOT NULL,
  office VARCHAR(128) NOT NULL,
  state_id INT NOT NULL,
  start_year SMALLINT NOT NULL,
  end_year SMALLINT NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  INDEX idx_member (member_id)
);

CREATE TABLE IF NOT EXISTS events (
  id CHAR(36) PRIMARY KEY,
  slug VARCHAR(128) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  theme VARCHAR(255) NOT NULL,
  kind VARCHAR(64) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  venue VARCHAR(255) NOT NULL,
  city VARCHAR(128) NOT NULL,
  status ENUM('Upcoming','Ongoing','Past') NOT NULL,
  summary TEXT NOT NULL,
  INDEX idx_status_date (status, start_date)
);

CREATE TABLE IF NOT EXISTS documents (
  id CHAR(36) PRIMARY KEY,
  slug VARCHAR(128) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(64) NOT NULL,
  status ENUM('Draft','Editorial Review','Institutional Review','Approved','Published','Archived') NOT NULL DEFAULT 'Draft',
  published_on DATE NULL,
  author VARCHAR(192) NOT NULL,
  topic VARCHAR(128) NOT NULL,
  year SMALLINT NOT NULL,
  event_id CHAR(36) NULL,
  visibility ENUM('PUBLIC','MEMBERS_ONLY','COMMITTEE_ONLY','SECRETARIAT_ONLY','PRIVATE') NOT NULL,
  version INT NOT NULL DEFAULT 1,
  file_url VARCHAR(512) NULL,
  downloads INT NOT NULL DEFAULT 0,
  FULLTEXT INDEX ft_doc (title, topic),
  INDEX idx_status_vis (status, visibility)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id CHAR(36) PRIMARY KEY,
  actor_id CHAR(36) NOT NULL,
  action VARCHAR(128) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip VARCHAR(64) NOT NULL,
  previous_value TEXT NULL,
  new_value TEXT NULL,
  INDEX idx_actor_time (actor_id, created_at)
);
