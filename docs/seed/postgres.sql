CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  total NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
