ALTER TABLE audit_log
    ADD COLUMN business_id INT(11) DEFAULT NULL AFTER user_id,
    ADD KEY idx_audit_business_created (business_id, created_at),
    ADD CONSTRAINT audit_log_ibfk_2
        FOREIGN KEY (business_id) REFERENCES businesses (id)
        ON DELETE SET NULL;
