CREATE DATABASE logistics;

CREATE TABLE logistics.warehouses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  city VARCHAR(80) NOT NULL
);

CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  referred_by INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referred_by) REFERENCES customers(id) ON DELETE SET NULL
);

CREATE TABLE customer_profiles (
  customer_id INT PRIMARY KEY,
  bio TEXT,
  preferences JSON,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  warehouse_id INT,
  total DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (warehouse_id) REFERENCES logistics.warehouses(id),
  INDEX orders_status_idx (status)
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(40) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  image BLOB
);

CREATE TABLE order_items (
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  PRIMARY KEY (order_id, product_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE audit_log (
  entry VARCHAR(200) NOT NULL,
  recorded_at DATETIME NOT NULL DEFAULT '2024-01-02 03:04:05'
);

CREATE VIEW paid_orders AS
  SELECT id, customer_id, total FROM orders WHERE status = 'paid';

INSERT INTO logistics.warehouses (city) VALUES ('Santos'), ('Curitiba');

INSERT INTO customers (name, email, referred_by) VALUES
  ('Ana Souza', 'ana@example.com', NULL),
  ('Bruno Lima', 'bruno@example.com', 1),
  ('Carla Mendes', 'carla@example.com', 1);

INSERT INTO customer_profiles (customer_id, bio) VALUES (1, 'Early adopter');

INSERT INTO orders (customer_id, warehouse_id, total, status) VALUES
  (1, 1, 150.00, 'paid'),
  (1, 2, 89.90, 'pending'),
  (2, 1, 230.50, 'paid'),
  (3, NULL, 45.00, 'canceled');

INSERT INTO products (sku, title, image) VALUES
  ('KB-01', 'Mechanical keyboard', x'deadbeef'),
  ('MS-02', 'Wireless mouse', NULL);

INSERT INTO order_items (order_id, product_id, quantity) VALUES
  (1, 1, 1),
  (1, 2, 2),
  (3, 1, 3);

INSERT INTO audit_log (entry) VALUES ('seeded');
