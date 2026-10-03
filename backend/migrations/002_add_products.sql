CREATE TABLE products (
    id INT(11) NOT NULL AUTO_INCREMENT,
    business_id INT(11) NOT NULL,
    article_code VARCHAR(50) DEFAULT NULL,
    description TEXT NOT NULL,
    unit_type VARCHAR(20) NOT NULL DEFAULT 'unit',
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    iva_percent DECIMAL(5,2) NOT NULL DEFAULT 21.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_products_business (business_id),
    CONSTRAINT products_business_fk FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
