CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

INSERT INTO customers (name, email) VALUES
  ('Ana Souza', 'ana@example.com'),
  ('Bruno Lima', 'bruno@example.com'),
  ('Carla Mendes', 'carla@example.com');

INSERT INTO orders (customer_id, total, status) VALUES
  (1, 150.00, 'paid'),
  (1, 89.90, 'pending'),
  (2, 230.50, 'paid'),
  (3, 45.00, 'canceled');
