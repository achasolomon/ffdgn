-- Existing attendee addresses remain unchanged. MySQL permits multiple NULLs
-- in the unique index, allowing walk-ins who do not provide an email address.
ALTER TABLE conference_attendees MODIFY email VARCHAR(255) NULL;
