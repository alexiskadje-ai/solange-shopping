<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Wishlist stored in session (no extra table needed)
$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'ajouter':   ajouterWishlist();   break;
    case 'supprimer': supprimerWishlist(); break;
    case 'liste':     listeWishlist();     break;
    case 'toggle':    toggleWishlist();    break;
    default: repondreJSON(['erreur' => 'Action inconnue'], 400);
}

function ajouterWishlist() {
    $pid = (int)($_POST['produit_id'] ?? 0);
    if (!$pid) repondreJSON(['erreur' => 'Produit invalide'], 400);
    if (!isset($_SESSION['wishlist'])) $_SESSION['wishlist'] = [];
    if (!in_array($pid, $_SESSION['wishlist'])) $_SESSION['wishlist'][] = $pid;
    repondreJSON(['succes' => true, 'wishlist' => $_SESSION['wishlist']]);
}

function supprimerWishlist() {
    $pid = (int)($_POST['produit_id'] ?? 0);
    if (!isset($_SESSION['wishlist'])) { repondreJSON(['succes' => true]); return; }
    $_SESSION['wishlist'] = array_values(array_filter($_SESSION['wishlist'], fn($id) => $id !== $pid));
    repondreJSON(['succes' => true, 'wishlist' => $_SESSION['wishlist']]);
}

function toggleWishlist() {
    $pid = (int)($_POST['produit_id'] ?? 0);
    if (!$pid) repondreJSON(['erreur' => 'Produit invalide'], 400);
    if (!isset($_SESSION['wishlist'])) $_SESSION['wishlist'] = [];
    if (in_array($pid, $_SESSION['wishlist'])) {
        $_SESSION['wishlist'] = array_values(array_filter($_SESSION['wishlist'], fn($id) => $id !== $pid));
        repondreJSON(['succes' => true, 'dans_wishlist' => false, 'wishlist' => $_SESSION['wishlist']]);
    } else {
        $_SESSION['wishlist'][] = $pid;
        repondreJSON(['succes' => true, 'dans_wishlist' => true, 'wishlist' => $_SESSION['wishlist']]);
    }
}

function listeWishlist() {
    if (!isset($_SESSION['wishlist']) || empty($_SESSION['wishlist'])) {
        repondreJSON([]);
        return;
    }
    $db = getDB();
    $ids = implode(',', array_map('intval', $_SESSION['wishlist']));
    $stmt = $db->query("SELECT p.*, c.nom AS categorie_nom FROM produits p LEFT JOIN categories c ON p.categorie_id = c.id WHERE p.id IN ($ids)");
    repondreJSON($stmt->fetchAll());
}
