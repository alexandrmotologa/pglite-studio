-- ==============================================================================
-- PGLite-Studio Demo: Relational E-Commerce Schema with Foreign Keys & Analytics
-- ==============================================================================

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL
);

-- Seed Customers
INSERT INTO customers (name, email, country) VALUES
('Elena Rostova', 'elena@techflow.io', 'DE'),
('Kenji Sato', 'kenji@datastack.dev', 'JP'),
('Sofia Chen', 'sofia@cloudbase.net', 'US'),
('Lucas Silva', 'lucas@vectorpulse.ai', 'BR')
ON CONFLICT DO NOTHING;

-- Seed Products
INSERT INTO products (name, sku, price, category, stock_quantity) VALUES
('Keychron Q1 Pro', 'KB-Q1-PRO', 199.00, 'Peripherals', 45),
('Dell UltraSharp 32', 'MON-U32-4K', 749.50, 'Monitors', 18),
('Logitech MX Master 3S', 'MSE-MX3S', 99.00, 'Peripherals', 120),
('Autonomous Standing Desk', 'DSK-STD-01', 499.00, 'Furniture', 12)
ON CONFLICT DO NOTHING;

-- Seed Orders
INSERT INTO orders (customer_id, total_amount, status) VALUES
(1, 948.50, 'completed'),
(2, 99.00, 'completed'),
(3, 499.00, 'pending'),
(4, 298.00, 'processing')
ON CONFLICT DO NOTHING;

-- Seed Order Items
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 199.00),
(1, 2, 1, 749.50),
(2, 3, 1, 99.00),
(3, 4, 1, 499.00),
(4, 1, 1, 199.00),
(4, 3, 1, 99.00)
ON CONFLICT DO NOTHING;

-- Complex Join & Window Aggregation Query
SELECT
  c.name AS customer_name,
  c.country,
  COUNT(DISTINCT o.id) AS total_orders,
  SUM(oi.quantity * oi.unit_price) AS total_spent,
  ROUND(AVG(o.total_amount), 2) AS average_order_value
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY c.id, c.name, c.country
ORDER BY total_spent DESC;
