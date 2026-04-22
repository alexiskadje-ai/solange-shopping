-- ============================================
-- BASE DE DONNÉES : SOLANGE SHOPPING
-- Akwa, Douala - Cameroun
-- ============================================

CREATE DATABASE IF NOT EXISTS solange_shopping CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE solange_shopping;

-- -----------------------------------------------
-- TABLE : utilisateurs
-- -----------------------------------------------
CREATE TABLE utilisateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    telephone VARCHAR(20),
    mot_de_passe VARCHAR(255) NOT NULL,
    role ENUM('client','admin') DEFAULT 'client',
    date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------
-- TABLE : categories
-- -----------------------------------------------
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description TEXT
);

-- -----------------------------------------------
-- TABLE : produits
-- -----------------------------------------------
CREATE TABLE produits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(200) NOT NULL,
    description TEXT,
    prix DECIMAL(10,2) NOT NULL,
    prix_promo DECIMAL(10,2) DEFAULT NULL,
    categorie_id INT,
    taille VARCHAR(50),
    couleur VARCHAR(50),
    stock INT DEFAULT 0,
    image VARCHAR(255) DEFAULT 'images/default.jpg',
    en_promotion TINYINT(1) DEFAULT 0,
    date_ajout DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categorie_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- -----------------------------------------------
-- TABLE : panier
-- -----------------------------------------------
CREATE TABLE panier (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT NOT NULL,
    produit_id INT NOT NULL,
    quantite INT DEFAULT 1,
    date_ajout DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE
);

-- -----------------------------------------------
-- TABLE : commandes
-- -----------------------------------------------
CREATE TABLE commandes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    statut ENUM('en_attente','confirmee','expediee','livree','annulee') DEFAULT 'en_attente',
    mode_paiement ENUM('momo','orange_money','a_la_boutique') NOT NULL,
    adresse_livraison TEXT,
    numero_transaction VARCHAR(100),
    date_commande DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

-- -----------------------------------------------
-- TABLE : commande_details
-- -----------------------------------------------
CREATE TABLE commande_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    commande_id INT NOT NULL,
    produit_id INT NOT NULL,
    quantite INT NOT NULL,
    prix_unitaire DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (commande_id) REFERENCES commandes(id) ON DELETE CASCADE,
    FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE
);

-- -----------------------------------------------
-- TABLE : messages_contact
-- -----------------------------------------------
CREATE TABLE messages_contact (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    telephone VARCHAR(20),
    message TEXT NOT NULL,
    date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP,
    lu TINYINT(1) DEFAULT 0
);

-- -----------------------------------------------
-- DONNÉES DE TEST
-- -----------------------------------------------

INSERT INTO categories (nom, description) VALUES
('Vêtements Femme', 'Robes, tops, jupes et plus pour femmes'),
('Vêtements Homme', 'Chemises, pantalons, costumes pour hommes'),
('Chaussures Femme', 'Escarpins, sandales, baskets pour femmes'),
('Chaussures Homme', 'Mocassins, baskets, chaussures de ville');

INSERT INTO produits (nom, description, prix, prix_promo, categorie_id, taille, couleur, stock, en_promotion) VALUES
('Robe Africaine Élégante', 'Belle robe en tissu wax, motifs africains colorés', 15000, 12000, 1, 'M, L, XL', 'Multicolore', 10, 1),
('Top Brodé Premium', 'Top avec broderies fines, tissu de qualité', 8500, NULL, 1, 'S, M, L', 'Blanc', 15, 0),
('Jupe Longue Wax', 'Jupe longue en wax, tendance et moderne', 10000, 8000, 1, 'M, L, XL', 'Bleu/Jaune', 8, 1),
('Chemise Homme Slim', 'Chemise slim fit, parfaite pour les occasions formelles', 12000, NULL, 2, 'M, L, XL, XXL', 'Blanc', 20, 0),
('Pantalon Chino', 'Pantalon chino confortable et tendance', 13500, 11000, 2, '38, 40, 42, 44', 'Beige', 12, 1),
('Escarpins Femme', 'Escarpins élégants pour toutes occasions', 18000, NULL, 3, '37, 38, 39, 40, 41', 'Noir', 9, 0),
('Sandales Plates', 'Sandales confortables pour usage quotidien', 9500, 7500, 3, '36, 37, 38, 39, 40', 'Marron', 14, 1),
('Baskets Femme', 'Baskets tendance et confortables', 22000, NULL, 3, '37, 38, 39, 40', 'Blanc', 7, 0),
('Mocassins Homme', 'Mocassins élégants cuir véritable', 25000, 20000, 4, '40, 41, 42, 43, 44, 45', 'Marron', 6, 1),
('Baskets Homme Sport', 'Baskets sportives haute performance', 28000, NULL, 4, '40, 41, 42, 43, 44, 45', 'Noir/Rouge', 11, 0);

-- Compte administrateur (mot de passe: admin123)
INSERT INTO utilisateurs (nom, prenom, email, telephone, mot_de_passe, role) VALUES
('Solange', 'Admin', 'admin@solange-shopping.cm', '+237691487229', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Compte client test (mot de passe: client123)
INSERT INTO utilisateurs (nom, prenom, email, telephone, mot_de_passe, role) VALUES
('Dupont', 'Marie', 'marie@email.com', '+237677000001', '$2y$10$TKh8H1.PfuA2Pi9MRnrByO0Wn7d8J9J/8kEqFMzJFnHJoaNeHcr3a', 'client');
