-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Oct 02, 2026 at 08:29 PM
-- Server version: 11.8.9-MariaDB-log
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u983421206_quotations`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_log`
--

CREATE TABLE `audit_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `business_id` int(11) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `table_name` varchar(50) NOT NULL,
  `record_id` int(11) DEFAULT NULL,
  `old_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_data`)),
  `new_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_data`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `businesses`
--

CREATE TABLE `businesses` (
  `id` int(11) NOT NULL,
  `business_name` varchar(150) NOT NULL,
  `legal_name` varchar(200) DEFAULT NULL,
  `nif_cif` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `country` varchar(50) DEFAULT 'España',
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  `primary_color` varchar(10) DEFAULT '#c8102e',
  `bank1_name` varchar(100) DEFAULT NULL,
  `bank1_iban` varchar(50) DEFAULT NULL,
  `bank2_name` varchar(100) DEFAULT NULL,
  `bank2_iban` varchar(50) DEFAULT NULL,
  `default_iva_percent` decimal(5,2) DEFAULT 21.00,
  `default_payment_method` varchar(50) DEFAULT 'CONTADO',
  `default_observations` text DEFAULT NULL,
  `subscription_status` enum('active','inactive','trial') DEFAULT 'trial',
  `subscription_expiry` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` int(11) NOT NULL,
  `business_id` int(11) NOT NULL,
  `customer_code` varchar(20) DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `nif_cif` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `country` varchar(50) DEFAULT 'España',
  `phone` varchar(30) DEFAULT NULL,
  `mobile` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` int(11) NOT NULL,
  `business_id` int(11) NOT NULL,
  `invoice_number` varchar(30) NOT NULL,
  `quotation_id` int(11) DEFAULT NULL,
  `customer_id` int(11) NOT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT 'CONTADO',
  `total_subtotal` decimal(12,2) DEFAULT 0.00,
  `total_discount` decimal(12,2) DEFAULT 0.00,
  `total_base` decimal(12,2) DEFAULT 0.00,
  `total_iva` decimal(12,2) DEFAULT 0.00,
  `grand_total` decimal(12,2) DEFAULT 0.00,
  `transport_charge` decimal(12,2) DEFAULT 0.00,
  `iva_21_base` decimal(12,2) DEFAULT 0.00,
  `iva_21_amount` decimal(12,2) DEFAULT 0.00,
  `iva_10_base` decimal(12,2) DEFAULT 0.00,
  `iva_10_amount` decimal(12,2) DEFAULT 0.00,
  `iva_4_base` decimal(12,2) DEFAULT 0.00,
  `iva_4_amount` decimal(12,2) DEFAULT 0.00,
  `payment_status` enum('unpaid','partial','paid') DEFAULT 'unpaid',
  `amount_paid` decimal(12,2) DEFAULT 0.00,
  `payment_date` date DEFAULT NULL,
  `bank_details` text DEFAULT NULL,
  `observations` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoice_items`
--

CREATE TABLE `invoice_items` (
  `id` int(11) NOT NULL,
  `business_id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `item_order` int(11) DEFAULT 1,
  `article_code` varchar(50) DEFAULT NULL,
  `description` text NOT NULL,
  `unit_type` enum('hour','sqft','sqm','unit','contract','meter','kg','service') DEFAULT 'unit',
  `quantity` decimal(12,2) DEFAULT 1.00,
  `unit_price` decimal(12,2) DEFAULT 0.00,
  `subtotal` decimal(12,2) DEFAULT 0.00,
  `discount_percent` decimal(5,2) DEFAULT 0.00,
  `discount_amount` decimal(12,2) DEFAULT 0.00,
  `base_after_discount` decimal(12,2) DEFAULT 0.00,
  `iva_percent` decimal(5,2) DEFAULT 21.00,
  `iva_amount` decimal(12,2) DEFAULT 0.00,
  `line_total` decimal(12,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `number_sequences`
--

CREATE TABLE `number_sequences` (
  `id` int(11) NOT NULL,
  `business_id` int(11) NOT NULL,
  `sequence_type` enum('quotation','invoice','customer') NOT NULL,
  `year` int(11) NOT NULL,
  `last_number` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quotations`
--

CREATE TABLE `quotations` (
  `id` int(11) NOT NULL,
  `business_id` int(11) NOT NULL,
  `quotation_number` varchar(30) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `quotation_date` date NOT NULL,
  `valid_until` date NOT NULL,
  `payment_method` varchar(50) DEFAULT 'CONTADO',
  `reference_person` varchar(100) DEFAULT NULL,
  `total_subtotal` decimal(12,2) DEFAULT 0.00,
  `total_discount` decimal(12,2) DEFAULT 0.00,
  `total_base` decimal(12,2) DEFAULT 0.00,
  `total_iva` decimal(12,2) DEFAULT 0.00,
  `grand_total` decimal(12,2) DEFAULT 0.00,
  `transport_charge` decimal(12,2) DEFAULT 0.00,
  `iva_21_base` decimal(12,2) DEFAULT 0.00,
  `iva_21_amount` decimal(12,2) DEFAULT 0.00,
  `iva_10_base` decimal(12,2) DEFAULT 0.00,
  `iva_10_amount` decimal(12,2) DEFAULT 0.00,
  `iva_4_base` decimal(12,2) DEFAULT 0.00,
  `iva_4_amount` decimal(12,2) DEFAULT 0.00,
  `bank_details` text DEFAULT NULL,
  `observations` text DEFAULT NULL,
  `status` enum('draft','sent','accepted','rejected','invoiced') DEFAULT 'draft',
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quotation_items`
--

CREATE TABLE `quotation_items` (
  `id` int(11) NOT NULL,
  `business_id` int(11) NOT NULL,
  `quotation_id` int(11) NOT NULL,
  `item_order` int(11) DEFAULT 1,
  `article_code` varchar(50) DEFAULT NULL,
  `description` text NOT NULL,
  `unit_type` enum('hour','sqft','sqm','unit','contract','meter','kg','service') DEFAULT 'unit',
  `quantity` decimal(12,2) DEFAULT 1.00,
  `unit_price` decimal(12,2) DEFAULT 0.00,
  `subtotal` decimal(12,2) DEFAULT 0.00,
  `discount_percent` decimal(5,2) DEFAULT 0.00,
  `discount_amount` decimal(12,2) DEFAULT 0.00,
  `base_after_discount` decimal(12,2) DEFAULT 0.00,
  `iva_percent` decimal(5,2) DEFAULT 21.00,
  `iva_amount` decimal(12,2) DEFAULT 0.00,
  `line_total` decimal(12,2) DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `business_id` int(11) DEFAULT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('superadmin','owner','staff') DEFAULT 'staff',
  `is_active` tinyint(1) DEFAULT 1,
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `v_invoices`
--

CREATE ALGORITHM=UNDEFINED SQL SECURITY INVOKER VIEW `v_invoices` AS
SELECT `i`.`id` AS `id`,
       `i`.`invoice_number` AS `invoice_number`,
       `i`.`invoice_date` AS `invoice_date`,
       `c`.`name` AS `customer_name`,
       `c`.`nif_cif` AS `nif_cif`,
       `i`.`total_base` AS `base_price`,
       `i`.`total_iva` AS `iva_amount`,
       `i`.`grand_total` AS `total_amount`,
       `i`.`payment_status` AS `payment_status`,
       `i`.`amount_paid` AS `amount_paid`
FROM `invoices` `i`
JOIN `customers` `c` ON `i`.`customer_id` = `c`.`id`;

-- --------------------------------------------------------

--
-- Table structure for table `v_quotations`
--

CREATE ALGORITHM=UNDEFINED SQL SECURITY INVOKER VIEW `v_quotations` AS
SELECT `q`.`id` AS `id`,
       `q`.`quotation_number` AS `quotation_number`,
       `q`.`quotation_date` AS `quotation_date`,
       `q`.`valid_until` AS `valid_until`,
       `c`.`name` AS `customer_name`,
       `c`.`nif_cif` AS `nif_cif`,
       `q`.`total_base` AS `base_price`,
       `q`.`total_iva` AS `iva_amount`,
       `q`.`grand_total` AS `total_amount`,
       `q`.`status` AS `status`,
       `u`.`full_name` AS `created_by_name`
FROM `quotations` `q`
JOIN `customers` `c` ON `q`.`customer_id` = `c`.`id`
LEFT JOIN `users` `u` ON `q`.`created_by` = `u`.`id`;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_log`
--
ALTER TABLE `audit_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_table_record` (`table_name`,`record_id`),
  ADD KEY `idx_audit_business_created` (`business_id`,`created_at`);

--
-- Indexes for table `businesses`
--
ALTER TABLE `businesses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_business_name` (`business_name`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_customer_code` (`business_id`,`customer_code`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_nif` (`nif_cif`),
  ADD KEY `idx_phone` (`phone`),
  ADD KEY `idx_business` (`business_id`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_invoice_num` (`business_id`,`invoice_number`),
  ADD KEY `quotation_id` (`quotation_id`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_business` (`business_id`);

--
-- Indexes for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_invoice` (`invoice_id`),
  ADD KEY `idx_business` (`business_id`);

--
-- Indexes for table `number_sequences`
--
ALTER TABLE `number_sequences`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_seq` (`business_id`,`sequence_type`,`year`),
  ADD KEY `idx_business` (`business_id`);

--
-- Indexes for table `quotations`
--
ALTER TABLE `quotations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_quote_num` (`business_id`,`quotation_number`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_quotation_number` (`quotation_number`),
  ADD KEY `idx_customer` (`customer_id`),
  ADD KEY `idx_business` (`business_id`);

--
-- Indexes for table `quotation_items`
--
ALTER TABLE `quotation_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_quotation` (`quotation_id`),
  ADD KEY `idx_business` (`business_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_role` (`role`),
  ADD KEY `idx_business` (`business_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_log`
--
ALTER TABLE `audit_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `businesses`
--
ALTER TABLE `businesses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoice_items`
--
ALTER TABLE `invoice_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `number_sequences`
--
ALTER TABLE `number_sequences`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quotations`
--
ALTER TABLE `quotations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quotation_items`
--
ALTER TABLE `quotation_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_log`
--
ALTER TABLE `audit_log`
  ADD CONSTRAINT `audit_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `audit_log_ibfk_2` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_customers_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `fk_invoices_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `invoices_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  ADD CONSTRAINT `invoices_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD CONSTRAINT `invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `number_sequences`
--
ALTER TABLE `number_sequences`
  ADD CONSTRAINT `fk_seq_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `quotations`
--
ALTER TABLE `quotations`
  ADD CONSTRAINT `fk_quotations_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `quotations_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  ADD CONSTRAINT `quotations_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `quotation_items`
--
ALTER TABLE `quotation_items`
  ADD CONSTRAINT `quotation_items_ibfk_1` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_business` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
