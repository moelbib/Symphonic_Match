CREATE DATABASE IF NOT EXISTS utilisateur;
USE utilisateur;

-- Table pour les utilisateur
CREATE TABLE IF NOT EXISTS utilisateur (
    id INT AUTO_INCREMENT PRIMARY KEY,
    genre VARCHAR(10) NOT NULL,
    nom VARCHAR(50) NOT NULL,
    prenom VARCHAR(50) NOT NULL,
    email VARCHAR(50) NOT NULL,
    bio VARCHAR(255) NOT NULL,
    date_inscription DATE NOT NULL,
    localisation VARCHAR(250)
)