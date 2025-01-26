CREATE DATABASE IF NOT EXISTS evenement;
USE evenement;

-- Création de la table Evenement
CREATE TABLE Evenement (
    id_evenement INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255),
    date DATE,
    localisation VARCHAR(255),
    description TEXT
);

-- Création de la table Participation_Evenement
CREATE TABLE Participation_Evenement (
    id_participation INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT,
    id_evenement INT,
    FOREIGN KEY (id_evenement) REFERENCES Evenement(id_evenement)
);
