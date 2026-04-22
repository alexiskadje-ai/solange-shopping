<?php
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type');

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'inscription':
        inscrireUtilisateur();
        break;
    case 'connexion':
        connecterUtilisateur();
        break;
    case 'deconnexion':
        deconnecterUtilisateur();
        break;
    case 'verifier':
        verifierSession();
        break;
    default:
        repondreJSON(['erreur' => 'Action inconnue'], 400);
}

// -----------------------------------------------
function inscrireUtilisateur() {
    $nom    = trim($_POST['nom'] ?? '');
    $prenom = trim($_POST['prenom'] ?? '');
    $email  = trim($_POST['email'] ?? '');
    $tel    = trim($_POST['telephone'] ?? '');
    $mdp    = $_POST['mot_de_passe'] ?? '';

    if (!$nom || !$prenom || !$email || !$mdp) {
        repondreJSON(['erreur' => 'Tous les champs obligatoires doivent être remplis.'], 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        repondreJSON(['erreur' => 'Adresse email invalide.'], 400);
    }
    if (strlen($mdp) < 6) {
        repondreJSON(['erreur' => 'Le mot de passe doit avoir au moins 6 caractères.'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT id FROM utilisateurs WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        repondreJSON(['erreur' => 'Cet email est déjà utilisé.'], 409);
    }

    $hash = password_hash($mdp, PASSWORD_BCRYPT);
    $stmt = $db->prepare("INSERT INTO utilisateurs (nom, prenom, email, telephone, mot_de_passe) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$nom, $prenom, $email, $tel, $hash]);

    $id = $db->lastInsertId();
    $_SESSION['utilisateur_id'] = $id;
    $_SESSION['nom']  = $nom;
    $_SESSION['prenom'] = $prenom;
    $_SESSION['email'] = $email;
    $_SESSION['role'] = 'client';

    repondreJSON([
        'succes' => true,
        'message' => 'Inscription réussie ! Bienvenue ' . $prenom . ' !',
        'utilisateur' => ['id' => $id, 'nom' => $nom, 'prenom' => $prenom, 'email' => $email, 'role' => 'client']
    ]);
}

// -----------------------------------------------
function connecterUtilisateur() {
    $email = trim($_POST['email'] ?? '');
    $mdp   = $_POST['mot_de_passe'] ?? '';

    if (!$email || !$mdp) {
        repondreJSON(['erreur' => 'Email et mot de passe requis.'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM utilisateurs WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($mdp, $user['mot_de_passe'])) {
        repondreJSON(['erreur' => 'Email ou mot de passe incorrect.'], 401);
    }

    $_SESSION['utilisateur_id'] = $user['id'];
    $_SESSION['nom']    = $user['nom'];
    $_SESSION['prenom'] = $user['prenom'];
    $_SESSION['email']  = $user['email'];
    $_SESSION['role']   = $user['role'];

    repondreJSON([
        'succes' => true,
        'message' => 'Connexion réussie ! Bonjour ' . $user['prenom'] . ' !',
        'utilisateur' => [
            'id' => $user['id'],
            'nom' => $user['nom'],
            'prenom' => $user['prenom'],
            'email' => $user['email'],
            'role' => $user['role']
        ]
    ]);
}

// -----------------------------------------------
function deconnecterUtilisateur() {
    session_destroy();
    repondreJSON(['succes' => true, 'message' => 'Déconnexion réussie.']);
}

// -----------------------------------------------
function verifierSession() {
    if (estConnecte()) {
        repondreJSON([
            'connecte' => true,
            'utilisateur' => [
                'id'     => $_SESSION['utilisateur_id'],
                'nom'    => $_SESSION['nom'],
                'prenom' => $_SESSION['prenom'],
                'email'  => $_SESSION['email'],
                'role'   => $_SESSION['role']
            ]
        ]);
    } else {
        repondreJSON(['connecte' => false]);
    }
}
?>
