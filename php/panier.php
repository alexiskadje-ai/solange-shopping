<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'ajouter':      ajouterAuPanier();     break;
    case 'liste':        listePanier();         break;
    case 'modifier':     modifierQuantite();    break;
    case 'supprimer':    supprimerDuPanier();   break;
    case 'vider':        viderPanier();         break;
    case 'commander':    passerCommande();      break;
    case 'mes_commandes': mesCommandes();       break;
    case 'toutes_commandes': toutesCommandes(); break;
    case 'maj_statut':   majStatutCommande();   break;
    default: repondreJSON(['erreur' => 'Action inconnue'], 400);
}

// -----------------------------------------------
function ajouterAuPanier() {
    if (!estConnecte()) repondreJSON(['erreur' => 'Vous devez être connecté.'], 401);
    $uid   = $_SESSION['utilisateur_id'];
    $pid   = (int)($_POST['produit_id'] ?? 0);
    $qte   = max(1, (int)($_POST['quantite'] ?? 1));

    if (!$pid) repondreJSON(['erreur' => 'Produit invalide'], 400);

    $db = getDB();
    // Vérifier stock
    $s = $db->prepare("SELECT stock FROM produits WHERE id = ?");
    $s->execute([$pid]);
    $prod = $s->fetch();
    if (!$prod || $prod['stock'] < 1) repondreJSON(['erreur' => 'Produit en rupture de stock.'], 400);

    // Vérifier si déjà dans le panier
    $s = $db->prepare("SELECT id, quantite FROM panier WHERE utilisateur_id = ? AND produit_id = ?");
    $s->execute([$uid, $pid]);
    $exist = $s->fetch();

    if ($exist) {
        $db->prepare("UPDATE panier SET quantite = quantite + ? WHERE id = ?")->execute([$qte, $exist['id']]);
    } else {
        $db->prepare("INSERT INTO panier (utilisateur_id, produit_id, quantite) VALUES (?,?,?)")->execute([$uid, $pid, $qte]);
    }
    repondreJSON(['succes' => true, 'message' => 'Produit ajouté au panier !']);
}

// -----------------------------------------------
function listePanier() {
    if (!estConnecte()) repondreJSON(['items' => [], 'total' => 0]);
    $uid = $_SESSION['utilisateur_id'];
    $db  = getDB();
    $stmt = $db->prepare("
        SELECT pa.id, pa.quantite, pr.id AS produit_id, pr.nom, pr.image,
               pr.prix, pr.prix_promo, pr.stock,
               IF(pr.en_promotion AND pr.prix_promo IS NOT NULL, pr.prix_promo, pr.prix) AS prix_effectif
        FROM panier pa
        JOIN produits pr ON pa.produit_id = pr.id
        WHERE pa.utilisateur_id = ?
    ");
    $stmt->execute([$uid]);
    $items = $stmt->fetchAll();

    $total = 0;
    foreach ($items as $i) $total += $i['prix_effectif'] * $i['quantite'];

    repondreJSON(['items' => $items, 'total' => $total, 'nb_items' => count($items)]);
}

// -----------------------------------------------
function modifierQuantite() {
    if (!estConnecte()) repondreJSON(['erreur' => 'Non connecté'], 401);
    $id  = (int)($_POST['panier_id'] ?? 0);
    $qte = max(1, (int)($_POST['quantite'] ?? 1));
    $db  = getDB();
    $db->prepare("UPDATE panier SET quantite = ? WHERE id = ? AND utilisateur_id = ?")
       ->execute([$qte, $id, $_SESSION['utilisateur_id']]);
    repondreJSON(['succes' => true]);
}

// -----------------------------------------------
function supprimerDuPanier() {
    if (!estConnecte()) repondreJSON(['erreur' => 'Non connecté'], 401);
    $id = (int)($_POST['panier_id'] ?? 0);
    $db = getDB();
    $db->prepare("DELETE FROM panier WHERE id = ? AND utilisateur_id = ?")
       ->execute([$id, $_SESSION['utilisateur_id']]);
    repondreJSON(['succes' => true]);
}

// -----------------------------------------------
function viderPanier() {
    if (!estConnecte()) repondreJSON(['erreur' => 'Non connecté'], 401);
    $db = getDB();
    $db->prepare("DELETE FROM panier WHERE utilisateur_id = ?")
       ->execute([$_SESSION['utilisateur_id']]);
    repondreJSON(['succes' => true]);
}

// -----------------------------------------------
function passerCommande() {
    $uid      = null;
    $guest    = false;

    if (estConnecte()) {
        $uid = $_SESSION['utilisateur_id'];
    } else {
        // Guest checkout
        $guest_nom   = trim($_POST['guest_nom']   ?? '');
        $guest_email = trim($_POST['guest_email'] ?? '');
        $guest_tel   = trim($_POST['guest_tel']   ?? '');
        if (!$guest_nom) { repondreJSON(['erreur' => 'Votre nom est requis pour la commande invité.'], 400); return; }
        $guest = true;
        // Create a temporary guest user or use session cart
    }

    $mode_pmt = $_POST['mode_paiement'] ?? '';
    $adresse  = trim($_POST['adresse'] ?? '');
    $num_tx   = trim($_POST['numero_transaction'] ?? '');

    $modes_valides = ['momo', 'orange_money', 'a_la_boutique', 'cash'];
    if (!in_array($mode_pmt, $modes_valides)) repondreJSON(['erreur' => 'Mode de paiement invalide.'], 400);

    $db = getDB();

    // For guest: create temporary account
    if ($guest) {
        $guest_nom   = $_POST['guest_nom'] ?? 'Invité';
        $guest_email = $_POST['guest_email'] ?? '';
        $guest_tel   = $_POST['guest_tel'] ?? '';
        // Insert guest user
        $stmt = $db->prepare("INSERT INTO utilisateurs (nom, prenom, email, telephone, mot_de_passe, role) VALUES (?, 'Invité', ?, ?, ?, 'client')");
        $stmt->execute([$guest_nom, $guest_email ?: null, $guest_tel ?: null, password_hash(uniqid(), PASSWORD_BCRYPT)]);
        $uid = $db->lastInsertId();
        // Use session cart items
        $items_session = $_POST['items'] ?? '';
        $cart_items = json_decode($items_session, true) ?? [];
        if (empty($cart_items)) repondreJSON(['erreur' => 'Votre panier est vide.'], 400);

        $total = 0;
        foreach ($cart_items as $item) {
            $s = $db->prepare("SELECT id, prix, prix_promo, en_promotion, stock FROM produits WHERE id = ?");
            $s->execute([$item['produit_id']]);
            $p = $s->fetch();
            if (!$p || $p['stock'] < $item['quantite']) { repondreJSON(['erreur' => 'Stock insuffisant.'], 400); return; }
            $prix_eff = $p['en_promotion'] && $p['prix_promo'] ? $p['prix_promo'] : $p['prix'];
            $total += $prix_eff * $item['quantite'];
            $item['prix_effectif'] = $prix_eff;
        }

        $db->beginTransaction();
        try {
            $stmt = $db->prepare("INSERT INTO commandes (utilisateur_id, total, mode_paiement, adresse_livraison, numero_transaction) VALUES (?,?,?,?,?)");
            $stmt->execute([$uid, $total, $mode_pmt, $adresse, $num_tx ?: null]);
            $cmd_id = $db->lastInsertId();
            foreach ($cart_items as $i) {
                $db->prepare("INSERT INTO commande_details (commande_id, produit_id, quantite, prix_unitaire) VALUES (?,?,?,?)")
                   ->execute([$cmd_id, $i['produit_id'], $i['quantite'], $i['prix_effectif']]);
                $db->prepare("UPDATE produits SET stock = stock - ? WHERE id = ?")->execute([$i['quantite'], $i['produit_id']]);
            }
            $db->commit();
            repondreJSON(['succes' => true, 'commande_id' => $cmd_id, 'total' => $total,
                'message' => "Commande #$cmd_id confirmée ! Total : " . number_format($total,0,',',' ') . " FCFA"]);
        } catch (Exception $e) {
            $db->rollBack();
            repondreJSON(['erreur' => 'Erreur: ' . $e->getMessage()], 500);
        }
        return;
    }

    // Logged-in user flow
    $stmt = $db->prepare("
        SELECT pa.produit_id, pa.quantite,
               IF(pr.en_promotion AND pr.prix_promo IS NOT NULL, pr.prix_promo, pr.prix) AS prix_effectif,
               pr.stock, pr.nom
        FROM panier pa JOIN produits pr ON pa.produit_id = pr.id
        WHERE pa.utilisateur_id = ?
    ");
    $stmt->execute([$uid]);
    $items = $stmt->fetchAll();
    if (!$items) repondreJSON(['erreur' => 'Votre panier est vide.'], 400);

    foreach ($items as $item) {
        if ($item['quantite'] > $item['stock']) repondreJSON(['erreur' => "Stock insuffisant : {$item['nom']}"], 400);
    }

    $total = 0;
    foreach ($items as $i) $total += $i['prix_effectif'] * $i['quantite'];

    $db->beginTransaction();
    try {
        $stmt = $db->prepare("INSERT INTO commandes (utilisateur_id, total, mode_paiement, adresse_livraison, numero_transaction) VALUES (?,?,?,?,?)");
        $stmt->execute([$uid, $total, $mode_pmt, $adresse, $num_tx ?: null]);
        $cmd_id = $db->lastInsertId();

        foreach ($items as $i) {
            $db->prepare("INSERT INTO commande_details (commande_id, produit_id, quantite, prix_unitaire) VALUES (?,?,?,?)")
               ->execute([$cmd_id, $i['produit_id'], $i['quantite'], $i['prix_effectif']]);
            $db->prepare("UPDATE produits SET stock = stock - ? WHERE id = ?")->execute([$i['quantite'], $i['produit_id']]);
        }

        $db->prepare("DELETE FROM panier WHERE utilisateur_id = ?")->execute([$uid]);
        $db->commit();

        repondreJSON([
            'succes'      => true,
            'commande_id' => $cmd_id,
            'total'       => $total,
            'message'     => "Commande #$cmd_id confirmée ! Total : " . number_format($total, 0, ',', ' ') . " FCFA"
        ]);
    } catch (Exception $e) {
        $db->rollBack();
        repondreJSON(['erreur' => 'Erreur lors de la commande: ' . $e->getMessage()], 500);
    }
}

// -----------------------------------------------
function mesCommandes() {
    if (!estConnecte()) repondreJSON(['erreur' => 'Non connecté'], 401);
    $db   = getDB();
    $stmt = $db->prepare("SELECT * FROM commandes WHERE utilisateur_id = ? ORDER BY date_commande DESC");
    $stmt->execute([$_SESSION['utilisateur_id']]);
    $commandes = $stmt->fetchAll();

    foreach ($commandes as &$cmd) {
        $s = $db->prepare("SELECT cd.*, p.nom AS produit_nom, p.image FROM commande_details cd JOIN produits p ON cd.produit_id = p.id WHERE cd.commande_id = ?");
        $s->execute([$cmd['id']]);
        $cmd['details'] = $s->fetchAll();
    }
    repondreJSON($commandes);
}

// -----------------------------------------------
function toutesCommandes() {
    if (!estAdmin()) repondreJSON(['erreur' => 'Accès refusé'], 403);
    $db   = getDB();
    $stmt = $db->query("SELECT c.*, u.nom, u.prenom, u.email, u.telephone FROM commandes c JOIN utilisateurs u ON c.utilisateur_id = u.id ORDER BY c.date_commande DESC");
    repondreJSON($stmt->fetchAll());
}

// -----------------------------------------------
function majStatutCommande() {
    if (!estAdmin()) repondreJSON(['erreur' => 'Accès refusé'], 403);
    $id     = (int)($_POST['commande_id'] ?? 0);
    $statut = $_POST['statut'] ?? '';
    $valides = ['en_attente','confirmee','expediee','livree','annulee'];
    if (!$id || !in_array($statut, $valides)) repondreJSON(['erreur' => 'Données invalides'], 400);
    $db = getDB();
    $db->prepare("UPDATE commandes SET statut = ? WHERE id = ?")->execute([$statut, $id]);
    repondreJSON(['succes' => true]);
}
?>
