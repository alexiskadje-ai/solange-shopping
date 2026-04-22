<?php
// ============================================
// CONFIGURATION BASE DE DONNÉES
// Modifier ces valeurs selon votre XAMPP
// ============================================

define('DB_HOST', 'localhost');
define('DB_USER', 'root');       // Utilisateur MySQL XAMPP
define('DB_PASS', '');           // Mot de passe (vide par défaut sur XAMPP)
define('DB_NAME', 'solange_shopping');

// Connexion PDO
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['erreur' => 'Connexion BD échouée: ' . $e->getMessage()]);
            exit;
        }
    }
    return $pdo;
}

// Démarrer la session si pas déjà démarrée
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Réponse JSON helper
function repondreJSON($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Vérifier si l'utilisateur est connecté
function estConnecte() {
    return isset($_SESSION['utilisateur_id']);
}

// Vérifier si admin
function estAdmin() {
    return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}
?>
