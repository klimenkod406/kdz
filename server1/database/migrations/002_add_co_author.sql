-- Миграция: добавление поля co_author в таблицу tickets
-- Для серверов, которые уже запущены и имеют БД без этого поля

-- Server 1
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS co_author VARCHAR(255);
