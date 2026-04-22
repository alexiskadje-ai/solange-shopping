# 🛍 SOLANGE SHOPPING - Guide d'installation

## Description
Application e-commerce pour SOLANGE SHOPPING, boutique de vêtements et chaussures à Akwa, Douala, Cameroun.

**Technologies utilisées :** HTML · CSS · JavaScript · PHP · MySQL

---

## ⚙️ INSTALLATION ÉTAPE PAR ÉTAPE

### Prérequis
- **XAMPP** installé sur votre ordinateur (télécharger sur https://www.apachefriends.org/fr/index.html)

---

### ÉTAPE 1 : Copier le projet

Copiez le dossier **solange-shopping** dans :

**Windows :**
```
C:\xampp\htdocs\solange-shopping\
```

**Mac/Linux :**
```
/opt/lampp/htdocs/solange-shopping/
```

---

### ÉTAPE 2 : Démarrer XAMPP

1. Ouvrez **XAMPP Control Panel**
2. Démarrez **Apache** (bouton Start)
3. Démarrez **MySQL** (bouton Start)

---

### ÉTAPE 3 : Créer la base de données

1. Ouvrez votre navigateur et allez sur : **http://localhost/phpmyadmin**
2. Cliquez sur **"Nouveau"** (ou "New") dans le menu de gauche
3. Cliquez sur l'onglet **"Importer"** en haut
4. Cliquez sur **"Parcourir"** et sélectionnez le fichier :
   `solange-shopping/database/solange_shopping.sql`
5. Cliquez sur **"Exécuter"** en bas de la page
6. ✅ La base de données est créée avec des données de test !

---

### ÉTAPE 4 : Ouvrir l'application

Ouvrez votre navigateur et allez sur :

```
http://localhost/solange-shopping/
```

---

## 🔑 Comptes de test

| Rôle       | Email                          | Mot de passe |
|------------|--------------------------------|--------------|
| **Admin**  | admin@solange-shopping.cm      | admin123     |
| **Client** | marie@email.com                | client123    |

---

## 📁 Structure du projet

```
solange-shopping/
├── index.html          ← Page d'accueil
├── produits.html       ← Catalogue produits
├── promotions.html     ← Offres promotionnelles
├── panier.html         ← Panier & commande
├── commandes.html      ← Suivi des commandes
├── auth.html           ← Connexion / Inscription
├── contact.html        ← Contact boutique
├── css/
│   └── style.css       ← Styles CSS
├── js/
│   └── main.js         ← JavaScript principal
├── php/
│   ├── config.php      ← Configuration base de données
│   ├── auth.php        ← Authentification
│   ├── produits.php    ← API Produits
│   ├── panier.php      ← API Panier & Commandes
│   └── contact.php     ← API Messages contact
├── admin/
│   └── index.html      ← Panneau d'administration
└── database/
    └── solange_shopping.sql  ← Script SQL
```

---

## 🌟 Fonctionnalités

### Côté Client
- ✅ Inscription et connexion des utilisateurs
- ✅ Catalogue de produits avec filtres par catégorie
- ✅ Recherche de produits
- ✅ Consultation de la disponibilité (stock)
- ✅ Panier d'achat (ajouter, modifier, supprimer)
- ✅ Commande avec confirmation
- ✅ Paiement MTN Mobile Money
- ✅ Paiement Orange Money
- ✅ Paiement en boutique
- ✅ Suivi des commandes
- ✅ Page de contact avec formulaire
- ✅ Lien WhatsApp direct
- ✅ Page des promotions

### Côté Administrateur
- ✅ Dashboard avec statistiques
- ✅ Gestion des produits (ajouter, modifier, supprimer)
- ✅ Gestion des commandes (changer le statut)
- ✅ Lecture des messages clients

---

## ⚠️ Dépannage

**Erreur "Connexion BD échouée"**
→ Vérifiez que MySQL est bien démarré dans XAMPP

**Page blanche**
→ Vérifiez que Apache est démarré

**Erreur "Base de données introuvable"**
→ Refaites l'étape 3 (import SQL)

**Les produits ne s'affichent pas**
→ Vérifiez l'URL : http://localhost/solange-shopping/ (avec le dossier dans htdocs)

---

## 📞 Boutique
**SOLANGE SHOPPING**
Akwa, Douala, Cameroun
📱 +237 691 487 229

---

*Projet BAC Terminale TI - 2024*
