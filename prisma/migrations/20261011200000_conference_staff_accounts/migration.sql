-- Append enum values without changing existing roles or assignments.
ALTER TABLE users MODIFY role ENUM('super_admin','secretariat_admin','membership_admin','content_editor','events_manager','knowledge_manager','committee_manager','communications_officer','auditor','member','associate','guest_desk') NOT NULL DEFAULT 'member';
ALTER TABLE conference_staff_assignments MODIFY role ENUM('Manager','RegistrationOfficer','ReportingOfficer','GateOfficer') NOT NULL;
