-- MenoGlow MySQL schema (matches backend/app/main.py models exactly)
-- Run:  mysql -u root -p < database/schema.sql
CREATE DATABASE IF NOT EXISTS menoglow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE menoglow;

CREATE TABLE IF NOT EXISTS users (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(100) NOT NULL DEFAULT '',
  email     VARCHAR(150) NOT NULL,
  password  VARCHAR(200) NOT NULL,                       -- bcrypt hash
  role      ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  address   TEXT,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(150) NOT NULL,
  category     VARCHAR(60)  NOT NULL,
  price        DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock        INT NOT NULL DEFAULT 50 CHECK (stock >= 0),
  description  TEXT,
  ingredients  TEXT,
  tags         VARCHAR(200) NOT NULL DEFAULT '',          -- comma list used by the quiz
  image_url    VARCHAR(500) NOT NULL DEFAULT '',
  KEY ix_products_category (category),
  FULLTEXT KEY ft_products_search (name, description)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  items         JSON NOT NULL,                            -- [{"id":1,"qty":2}]
  total         DECIMAL(10,2) NOT NULL,
  address       TEXT NOT NULL,
  status        ENUM('Placed','Packed','Shipped','Delivered','Cancelled') NOT NULL DEFAULT 'Placed',
  paid          TINYINT(1) NOT NULL DEFAULT 0,
  rzp_order_id  VARCHAR(80) NOT NULL DEFAULT '',
  created       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_orders_user (user_id),
  KEY ix_orders_status (status),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reviews (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  product_id  INT NOT NULL,
  user_name   VARCHAR(100) NOT NULL,
  rating      TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text        TEXT,
  KEY ix_reviews_product (product_id),
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS coupons (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  code     VARCHAR(30) NOT NULL,
  percent  INT NOT NULL CHECK (percent BETWEEN 1 AND 90),
  UNIQUE KEY uq_coupons_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  UNIQUE KEY uq_sub_email (email)
) ENGINE=InnoDB;

-- Seed data ---------------------------------------------------------------
-- Admin login: admin@menoglow.com / admin123  (change after first login)
INSERT IGNORE INTO users (name, email, password, role) VALUES
 ('Admin','admin@menoglow.com','$2b$12$3F6Xi5BwIsFvvbk1oYS/7.Q01zl/2wBqNNY1YTRB871pL7CaQyT.2','admin');

INSERT IGNORE INTO coupons (code, percent) VALUES ('GLOW10', 10);

INSERT INTO products (name, category, price, stock, description, ingredients, tags)
SELECT * FROM (
 SELECT 'MenoGlow Cooling Mist','Mist',499.00,50,'Refreshing facial and body spray for moments of warmth.','Aloe vera, cucumber extract, glycerin, rose water','cooling,fragrance-free,hot' UNION ALL
 SELECT 'MenoGlow Hydrating Balm','Balm',649.00,50,'Intensive moisturising balm for dry, tight-feeling skin.','Shea butter, squalane, ceramides, vitamin E','dry,balm' UNION ALL
 SELECT 'MenoGlow Barrier Repair Cream','Cream',799.00,50,'Comforting moisturiser for sensitive skin.','Ceramide NP, niacinamide, panthenol, oat extract','sensitive,fragrance-free' UNION ALL
 SELECT 'MenoGlow Body Lotion','Body',549.00,50,'Daily hydration for dry skin from neck to toe.','Glycerin, jojoba oil, hyaluronic acid, allantoin','dry,body' UNION ALL
 SELECT 'MenoGlow Night Recovery Cream','Cream',899.00,50,'Overnight moisturising care that leaves skin soft by morning.','Squalane, peptides, shea butter, bisabolol','sleep,night,dry'
) s WHERE NOT EXISTS (SELECT 1 FROM products);

-- Handy admin queries -------------------------------------------------------
-- Revenue (paid):   SELECT COALESCE(SUM(total),0) FROM orders WHERE paid=1;
-- Low stock:        SELECT name, stock FROM products WHERE stock < 10;
-- Orders by status: SELECT status, COUNT(*) FROM orders GROUP BY status;
