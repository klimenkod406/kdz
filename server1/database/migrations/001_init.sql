-- Миграции для Server 1 (временное хранение заявок)

-- Таблица заявок (временная)
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_name VARCHAR(255) NOT NULL,
    employee_email VARCHAR(255),
    employee_phone VARCHAR(50),
    department VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_to_server2 BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE
);

-- Индекс для быстрого поиска несентых заявок
CREATE INDEX IF NOT EXISTS idx_tickets_not_sent ON tickets(sent_to_server2, created_at);

-- Таблица логов синхронизации
CREATE TABLE IF NOT EXISTS sync_logs (
    id SERIAL PRIMARY KEY,
    tickets_count INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
