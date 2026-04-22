<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$action     = $_GET['action'] ?? 'liste';
$categorie  = $_GET['categorie'] ?? '';
$recherche  = $_GET['recherche'] ?? '';
$id         = (int)($_GET['id'] ?? 0);
$promo_only = $_GET['promo'] ?? '';

switch ($action) {
    case 'liste':        listeProduits();    break;
    case 'detail':       detailProduit($id); break;
    case 'categories':   listeCategories();  break;
    case 'promotions':   listePromotions();  break;
    case 'ajouter':      ajouterProduit();   break;
    case 'modifier':     modifierProduit($id); break;
    case 'supprimer':    supprimerProduit($id); break;
    default: repondreJSON(['erreur' => 'Action inconnue'], 400);
}

// -----------------------------------------------
function listeProduits() {
    global $categorie, $recherche, $promo_only;
    $db  = getDB();

    $prix_min  = isset($_GET['prix_min'])  ? (float)$_GET['prix_min']  : null;
    $prix_max  = isset($_GET['prix_max'])  ? (float)$_GET['prix_max']  : null;
    $taille    = trim($_GET['taille']    ?? '');
    $couleur   = trim($_GET['couleur']   ?? '');
    $tri       = $_GET['tri'] ?? 'defaut';
    $limit     = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
    $autocomplete = $_GET['autocomplete'] ?? '';

    $sql = "SELECT p.*, c.nom AS categorie_nom FROM produits p LEFT JOIN categories c ON p.categorie_id = c.id WHERE 1=1";
    $params = [];

    if ($categorie) { $sql .= " AND p.categorie_id = ?"; $params[] = (int)$categorie; }
    if ($recherche) {
        $sql .= " AND (p.nom LIKE ? OR p.description LIKE ? OR p.couleur LIKE ?)";
        $params[] = "%$recherche%"; $params[] = "%$recherche%"; $params[] = "%$recherche%";
    }
    if ($promo_only) { $sql .= " AND p.en_promotion = 1"; }
    if ($prix_min !== null) { $sql .= " AND IF(p.en_promotion AND p.prix_promo IS NOT NULL, p.prix_promo, p.prix) >= ?"; $params[] = $prix_min; }
    if ($prix_max !== null && $prix_max > 0) { $sql .= " AND IF(p.en_promotion AND p.prix_promo IS NOT NULL, p.prix_promo, p.prix) <= ?"; $params[] = $prix_max; }
    if ($taille)  { $sql .= " AND p.taille LIKE ?"; $params[] = "%$taille%"; }
    if ($couleur) { $sql .= " AND p.couleur LIKE ?"; $params[] = "%$couleur%"; }

    switch ($tri) {
        case 'prix_asc':   $sql .= " ORDER BY IF(p.en_promotion AND p.prix_promo IS NOT NULL, p.prix_promo, p.prix) ASC"; break;
        case 'prix_desc':  $sql .= " ORDER BY IF(p.en_promotion AND p.prix_promo IS NOT NULL, p.prix_promo, p.prix) DESC"; break;
        case 'nouveau':    $sql .= " ORDER BY p.date_ajout DESC"; break;
        case 'promo':      $sql .= " ORDER BY p.en_promotion DESC, p.date_ajout DESC"; break;
        default:           $sql .= " ORDER BY p.en_promotion DESC, p.date_ajout DESC";
    }

    $sql .= " LIMIT " . min($limit, 200);
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll();

    // For autocomplete — return minimal data
    if ($autocomplete) {
        $data = array_map(fn($p) => [
            'id' => $p['id'], 'nom' => $p['nom'],
            'prix' => $p['en_promotion'] && $p['prix_promo'] ? $p['prix_promo'] : $p['prix'],
            'en_promotion' => $p['en_promotion'], 'prix_promo' => $p['prix_promo'],
            'categorie_nom' => $p['categorie_nom'], 'categorie_id' => $p['categorie_id'],
        ], $data);
    }
    repondreJSON($data);
}

// -----------------------------------------------
function detailProduit($id) {
    if (!$id) repondreJSON(['erreur' => 'ID manquant'], 400);
    $db   = getDB();
    $stmt = $db->prepare("SELECT p.*, c.nom AS categorie_nom FROM produits p LEFT JOIN categories c ON p.categorie_id = c.id WHERE p.id = ?");
    $stmt->execute([$id]);
    $prod = $stmt->fetch();
    if (!$prod) repondreJSON(['erreur' => 'Produit introuvable'], 404);
    repondreJSON($prod);
}

// -----------------------------------------------
function listeCategories() {
    $db   = getDB();
    $stmt = $db->query("SELECT c.*, COUNT(p.id) AS nb_produits FROM categories c LEFT JOIN produits p ON p.categorie_id = c.id GROUP BY c.id");
    repondreJSON($stmt->fetchAll());
}

// -----------------------------------------------
function listePromotions() {
    $db   = getDB();
    $stmt = $db->query("SELECT p.*, c.nom AS categorie_nom FROM produits p LEFT JOIN categories c ON p.categorie_id = c.id WHERE p.en_promotion = 1 ORDER BY p.date_ajout DESC");
    repondreJSON($stmt->fetchAll());
}

// -----------------------------------------------
function ajouterProduit() {
    if (!estAdmin()) repondreJSON(['erreur' => 'Accès refusé'], 403);
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO produits (nom, description, prix, prix_promo, categorie_id, taille, couleur, stock, en_promotion) VALUES (?,?,?,?,?,?,?,?,?)");
    $stmt->execute([
        $_POST['nom'], $_POST['description'], $_POST['prix'],
        $_POST['prix_promo'] ?: null, $_POST['categorie_id'],
        $_POST['taille'], $_POST['couleur'], $_POST['stock'],
        isset($_POST['en_promotion']) ? 1 : 0
    ]);
    repondreJSON(['succes' => true, 'id' => $db->lastInsertId()]);
}

// -----------------------------------------------
function modifierProduit($id) {
    if (!estAdmin()) repondreJSON(['erreur' => 'Accès refusé'], 403);
    if (!$id) repondreJSON(['erreur' => 'ID manquant'], 400);
    $db = getDB();
    $stmt = $db->prepare("UPDATE produits SET nom=?, description=?, prix=?, prix_promo=?, categorie_id=?, taille=?, couleur=?, stock=?, en_promotion=? WHERE id=?");
    $stmt->execute([
        $_POST['nom'], $_POST['description'], $_POST['prix'],
        $_POST['prix_promo'] ?: null, $_POST['categorie_id'],
        $_POST['taille'], $_POST['couleur'], $_POST['stock'],
        isset($_POST['en_promotion']) ? 1 : 0, $id
    ]);
    repondreJSON(['succes' => true]);
}

// -----------------------------------------------
function supprimerProduit($id) {
    if (!estAdmin()) repondreJSON(['erreur' => 'Accès refusé'], 403);
    if (!$id) repondreJSON(['erreur' => 'ID manquant'], 400);
    $db   = getDB();
    $stmt = $db->prepare("DELETE FROM produits WHERE id = ?");
    $stmt->execute([$id]);
    repondreJSON(['succes' => true]);
}
?>
