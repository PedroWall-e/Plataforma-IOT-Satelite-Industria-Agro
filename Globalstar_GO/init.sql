CREATE DATABASE IF NOT EXISTS globalstar_db;
USE globalstar_db;

-- 1. Tabela de Utilizadores
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'master', 'admin', 'support', 'user'
    full_name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2)
);

-- 2. Tabela de Dispositivos (Satélites/IoT)
CREATE TABLE IF NOT EXISTS devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    esn VARCHAR(50) NOT NULL UNIQUE, -- Identificador único do Globalstar
    name VARCHAR(100)                -- Apelido amigável (ex: "Trator 01")
);

-- 3. Tabela de Mensagens (Payloads)
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id INT NOT NULL,
    payload TEXT,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- 4. Tabela de Permissões (Vínculos Usuário <-> Dispositivo)
CREATE TABLE IF NOT EXISTS user_permissions (
    user_id INT NOT NULL,
    device_id INT NOT NULL,
    PRIMARY KEY (user_id, device_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- 5. Tabela de Auditoria (Logs de Segurança)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    username VARCHAR(50),
    action VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- --- DADOS INICIAIS (SEED) ---

-- Criar utilizador MASTER padrão
-- Login: admin
-- Senha: admin (Hash gerado com custo 14)
INSERT IGNORE INTO users (username, password_hash, role, full_name) 
VALUES ('admin', '$2a$14$2a9.u/y/x/w/v/u/t/s/r/q/p/o/n/m/l/k/j/i/h/g/f/e/d/c/b/a', 'master', 'Administrador do Sistema');
-- Nota: O hash acima é ilustrativo. Se não funcionar, use o script gerar_senha.go para criar um novo hash para "admin" e substitua aqui.