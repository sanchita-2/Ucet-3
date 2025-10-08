-- Create database
CREATE DATABASE IF NOT EXISTS ucet_db;
USE ucet_db;

-- Users table (central for all roles)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,  -- Hashed password
    role ENUM('student', 'alumni', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB;

-- Students table (role-specific details)
CREATE TABLE students (
    user_id INT PRIMARY KEY,
    enrollment_year YEAR NOT NULL,
    graduation_year YEAR,
    major VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Alumni table (role-specific details)
CREATE TABLE alumni (
    user_id INT PRIMARY KEY,
    graduation_year YEAR NOT NULL,
    current_job VARCHAR(100),
    company VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Admins table (role-specific details - minimal)
CREATE TABLE admins (
    user_id INT PRIMARY KEY,
    department VARCHAR(100),
    permissions JSON,  -- e.g., {"canManageUsers": true, "canManageNews": true}
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- News table
CREATE TABLE news (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB;

-- Resources table
CREATE TABLE resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    link VARCHAR(500) NOT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_created_by (created_by)
) ENGINE=InnoDB;

-- Insert default admin (you can run this manually or let backend seed it)
-- Password hash for 'admin123' (generated via bcrypt in backend)
INSERT INTO users (username, email, password, role) VALUES 
('admin', 'admin@ucet.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON DUPLICATE KEY UPDATE username = username;  -- Avoid duplicates

INSERT INTO admins (user_id, department) VALUES 
((SELECT id FROM users WHERE email = 'admin@ucet.com'), 'IT Department')
ON DUPLICATE KEY UPDATE department = department;