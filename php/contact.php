<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$action = $_POST['action'] ?? $_GET['action'] ?? 'envoyer';

switch ($action) {
    case 'envoyer':  envoyerMessage(); break;
    case 'liste':    listeMessages();  break;
    case 'marquer_lu': marquerLu();   break;
    default: repondreJSON(['erreur' => 'Action inconnue'], 400);
}

function envoyerMessage() {
    $nom     = trim($_POST['nom'] ?? '');
    $email   = trim($_POST['email'] ?? '');
    $tel     = trim($_POST['telephone'] ?? '');
    $message = trim($_POST['message'] ?? '');

    if (!$nom || !$message) {
        repondreJSON(['erreur' => 'Nom et message sont obligatoires.'], 400);
    }

    $db   = getDB();
    $stmt = $db->prepare("INSERT INTO messages_contact (nom, email, telephone, message) VALUES (?,?,?,?)");
    $stmt->execute([$nom, $email ?: null, $tel ?: null, $message]);

    repondreJSON([
        'succes'  => true,
        'message' => 'Votre message a été envoyé ! Nous vous répondrons dans les plus brefs délais.'
    ]);
}

function listeMessages() {
    if (!estAdmin()) repondreJSON(['erreur' => 'Accès refusé'], 403);
    $db   = getDB();
    $stmt = $db->query("SELECT * FROM messages_contact ORDER BY date_envoi DESC");
    repondreJSON($stmt->fetchAll());
}

function marquerLu() {
    if (!estAdmin()) repondreJSON(['erreur' => 'Accès refusé'], 403);
    $id = (int)($_POST['id'] ?? 0);
    if (!$id) repondreJSON(['erreur' => 'ID manquant'], 400);
    $db = getDB();
    $db->prepare("UPDATE messages_contact SET lu = 1 WHERE id = ?")->execute([$id]);
    repondreJSON(['succes' => true]);
}
?>
