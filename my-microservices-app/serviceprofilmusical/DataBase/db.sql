CREATE DATABASE IF NOT EXISTS musicaux;
USE musicaux;

-- Table pour les utilisateur
CREATE TABLE IF NOT EXISTS musicaux (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT,
    genre_favoris VARCHAR(50),
    artistes_favoris VARCHAR(255),
    chansons_favoris VARCHAR(255),
    id_commentaire INT
)