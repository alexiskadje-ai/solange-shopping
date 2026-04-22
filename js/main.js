// ============================================
// SOLANGE SHOPPING - JS v2
// Mobile-First · Autocomplete · Wishlist · Guest Checkout
// ============================================
const BASE = 'php/';

let utilisateurCourant = null;
let panierCount = 0;
let wishlist = JSON.parse(localStorage.getItem('ss_wishlist') || '[]');
let guestCart  = JSON.parse(localStorage.getItem('ss_guest_cart') || '[]');
let autocompleteTimeout = null;

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
    verifierSession();
    maj_badge_panier();
    menuMobile();
    highlightNavActif();
    initAutocomplete();
    updateWishlistBtns();
});

// ================================================================
// NAVIGATION
// ================================================================
function menuMobile() {
    const btn = document.getElementById('menu-toggle');
    const nav = document.getElementById('nav-links');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => {
        nav.classList.toggle('ouvrir');
        btn.textContent = nav.classList.contains('ouvrir') ? '✕' : '☰';
    });
    document.addEventListener('click', e => {
        if (!nav.contains(e.target) && !btn.contains(e.target)) {
            nav.classList.remove('ouvrir');
            btn.textContent = '☰';
        }
    });
}

function highlightNavActif() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(a => {
        if (a.getAttribute('href') === page) a.classList.add('actif');
    });
}

// ================================================================
// SESSION
// ================================================================
async function verifierSession() {
    try {
        const data = await apiFetch('auth.php?action=verifier');
        if (data?.connecte) { utilisateurCourant = data.utilisateur; afficherUtilisateurNav(); }
    } catch(e){}
    maj_badge_panier();
}

function afficherUtilisateurNav() {
    const zone = document.getElementById('zone-user');
    if (!zone || !utilisateurCourant) return;
    zone.innerHTML = `
        <a href="profile.html" style="font-weight:600;color:var(--primaire);font-size:.85rem;white-space:nowrap;">
            👤 ${escapeHtml(utilisateurCourant.prenom)}
        </a>
        ${utilisateurCourant.role === 'admin' ? '<a href="admin/index.html" class="btn btn-sm btn-violet">⚙ Admin</a>' : ''}
        <button onclick="deconnexion()" class="btn btn-sm" style="border:2px solid var(--gris);">Sortir</button>
    `;
}

async function deconnexion() {
    await fetch(BASE + 'auth.php', { method:'POST', body: new URLSearchParams({ action:'deconnexion' }) });
    utilisateurCourant = null;
    notifier('Vous avez été déconnecté.', 'info');
    setTimeout(() => location.href = 'index.html', 900);
}

// ================================================================
// AUTOCOMPLETE SEARCH
// ================================================================
function initAutocomplete() {
    const input = document.getElementById('input-recherche');
    if (!input) return;
    const list = document.getElementById('autocomplete-list');
    if (!list) return;

    input.addEventListener('input', () => {
        clearTimeout(autocompleteTimeout);
        const q = input.value.trim();
        if (q.length < 2) { list.innerHTML = ''; list.style.display = 'none'; return; }
        autocompleteTimeout = setTimeout(() => fetchAutocomplete(q), 250);
    });

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { list.style.display = 'none'; rechercherProduits(); }
        if (e.key === 'Escape') { list.innerHTML = ''; list.style.display = 'none'; }
    });

    document.addEventListener('click', e => {
        if (!input.contains(e.target)) { list.innerHTML = ''; list.style.display = 'none'; }
    });
}

async function fetchAutocomplete(q) {
    const list = document.getElementById('autocomplete-list');
    if (!list) return;
    const data = await apiFetch(`produits.php?action=liste&recherche=${encodeURIComponent(q)}&autocomplete=1&limit=6`);
    if (!data || !data.length) { list.style.display = 'none'; return; }
    const emojis = { 1:'👗', 2:'👔', 3:'👠', 4:'👞' };
    list.innerHTML = data.map(p => `
        <div class="autocomplete-item" onclick="selectAutocomplete(${p.id}, '${escapeHtml(p.nom).replace(/'/g,"\\'")}')">
            <span class="ac-icon">${emojis[p.categorie_id] || '🛍'}</span>
            <div>
                <div class="ac-nom">${highlight(escapeHtml(p.nom), document.getElementById('input-recherche').value)}</div>
                <div class="ac-cat">${escapeHtml(p.categorie_nom || '')}</div>
            </div>
            <div class="ac-prix">${formatPrix(p.en_promotion && p.prix_promo ? p.prix_promo : p.prix)}</div>
        </div>
    `).join('');
    list.style.display = 'block';
}

function highlight(text, q) {
    if (!q) return text;
    const r = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
    return text.replace(r, '<mark style="background:var(--accent);padding:0 2px;border-radius:3px;">$1</mark>');
}

function selectAutocomplete(id, nom) {
    const input = document.getElementById('input-recherche');
    if (input) input.value = nom;
    const list = document.getElementById('autocomplete-list');
    if (list) { list.innerHTML = ''; list.style.display = 'none'; }
    voirProduit(id);
}

// ================================================================
// PRODUITS
// ================================================================
async function chargerProduits(params = {}) {
    const conteneur = document.getElementById('produits-grid');
    if (!conteneur) return;
    conteneur.innerHTML = '<div class="loader"><div class="spinner"></div></div>';

    const q = new URLSearchParams({ action: 'liste', ...params });
    const data = await apiFetch('produits.php?' + q.toString());

    if (!data || data.erreur) { conteneur.innerHTML = videHTML('😕','Erreur','Impossible de charger les produits.'); return; }
    if (!data.length) { conteneur.innerHTML = videHTML('🛍','Aucun résultat','Essayez d\'autres filtres ou mots-clés.',`<button onclick="resetFiltres()" class="btn btn-violet btn-sm">Réinitialiser</button>`); return; }

    const sortEl = document.getElementById('sort-count');
    if (sortEl) sortEl.textContent = `${data.length} produit(s)`;

    conteneur.innerHTML = data.map(p => produitHTML(p)).join('');
    updateWishlistBtns();
}

function produitHTML(p) {
    const prix  = p.en_promotion && p.prix_promo ? p.prix_promo : p.prix;
    const emoji = p.categorie_id <= 2 ? '👗' : '👟';
    const stars = '★'.repeat(4) + '☆'; // demo rating
    const inWl  = wishlist.includes(p.id);
    return `
    <div class="produit-card">
        <div class="produit-image" onclick="voirProduit(${p.id})">
            ${p.image && p.image !== 'images/default.jpg' ? `<img src="${p.image}" alt="${escapeHtml(p.nom)}" loading="lazy">` : `<span>${emoji}</span>`}
            ${p.en_promotion ? '<span class="badge-promo">🏷 PROMO</span>' : ''}
            ${p.stock > 0 && p.stock <= 3 ? '<span class="badge-stock-bas">⚠ Dernières pièces</span>' : ''}
            ${p.stock === 0 ? '<span class="badge-stock-bas" style="background:#666">Rupture</span>' : ''}
            <button class="btn-wishlist ${inWl ? 'actif' : ''}" data-id="${p.id}" onclick="event.stopPropagation();toggleWishlist(${p.id},this)" title="${inWl ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
                ${inWl ? '❤️' : '🤍'}
            </button>
        </div>
        <div class="produit-info">
            <p class="categorie">${escapeHtml(p.categorie_nom || '')}</p>
            <h3 title="${escapeHtml(p.nom)}">${escapeHtml(p.nom)}</h3>
            <div class="rating"><span class="stars">${stars}</span><span class="rating-count">(${Math.floor(Math.random()*40+5)})</span></div>
            <div class="prix-container">
                <span class="prix-actuel">${formatPrix(prix)}</span>
                ${p.en_promotion && p.prix_promo ? `<span class="prix-barre">${formatPrix(p.prix)}</span>` : ''}
            </div>
            <p class="tailles">📏 ${escapeHtml(p.taille || 'Taille unique')}</p>
            <div class="produit-actions">
                <button onclick="voirProduit(${p.id})" class="btn btn-sm btn-outline" style="flex:1">👁 Détails</button>
                ${p.stock > 0
                    ? `<button onclick="ajouterPanier(${p.id})" class="btn btn-sm btn-violet" style="flex:1">🛒</button>`
                    : `<button class="btn btn-sm" style="background:#eee;color:#aaa;cursor:not-allowed;flex:1" disabled>Rupture</button>`}
            </div>
        </div>
    </div>`;
}

async function voirProduit(id) {
    const data = await apiFetch(`produits.php?action=detail&id=${id}`);
    if (!data || data.erreur) return;

    // Fetch related products
    const related = await apiFetch(`produits.php?action=liste&categorie=${data.categorie_id}&limit=6`);
    const autres = related ? related.filter(r => r.id !== data.id).slice(0,4) : [];

    const prix  = data.en_promotion && data.prix_promo ? data.prix_promo : data.prix;
    const emoji = data.categorie_id <= 2 ? '👗' : '👟';
    const inWl  = wishlist.includes(data.id);
    const tailles = data.taille ? data.taille.split(',').map(t => t.trim()) : [];

    ouvrirModal(`
        <button class="modal-fermer" onclick="fermerModal()">✕</button>
        <div class="produit-detail-grid">
            <div>
                <div class="zoom-container" onclick="zoomImage(this)" style="height:240px;background:linear-gradient(135deg,#f0e6ff,#ffe6f0);border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:4rem;">
                    ${data.image && data.image !== 'images/default.jpg'
                        ? `<img src="${data.image}" style="width:100%;height:100%;object-fit:cover" alt="${escapeHtml(data.nom)}">`
                        : emoji}
                </div>
                <p style="font-size:.75rem;color:#aaa;text-align:center;margin-top:6px">🔍 Cliquez pour zoomer</p>
            </div>
            <div>
                <p style="color:var(--primaire);font-weight:600;font-size:.82rem">${escapeHtml(data.categorie_nom || '')}</p>
                <h2 style="font-size:1.2rem;margin:6px 0 10px">${escapeHtml(data.nom)}</h2>
                <div class="rating"><span class="stars">★★★★☆</span><span class="rating-count">(${Math.floor(Math.random()*40+5)} avis)</span></div>
                <div class="prix-container" style="margin:10px 0">
                    <span class="prix-actuel" style="font-size:1.3rem">${formatPrix(prix)}</span>
                    ${data.en_promotion && data.prix_promo ? `<span class="prix-barre">${formatPrix(data.prix)}</span><span style="background:#ffe0ec;color:var(--secondaire);padding:2px 8px;border-radius:10px;font-size:.75rem;font-weight:700">-${Math.round((1-prix/data.prix)*100)}%</span>` : ''}
                </div>
                <p style="font-size:.86rem;color:#666;margin-bottom:12px;line-height:1.6">${escapeHtml(data.description || 'Produit de qualité Solange Shopping.')}</p>

                ${tailles.length ? `
                <div style="margin-bottom:12px">
                    <p style="font-size:.82rem;font-weight:700;margin-bottom:6px">📏 Taille :
                        <button class="size-guide-btn" onclick="afficherGuide()">Guide des tailles</button>
                    </p>
                    <div style="display:flex;flex-wrap:wrap;gap:6px">
                        ${tailles.map(t => `<button onclick="selectTaille(this)" class="chip" style="min-width:40px;justify-content:center">${escapeHtml(t)}</button>`).join('')}
                    </div>
                </div>` : ''}

                <p style="font-size:.84rem;margin-bottom:6px">🎨 <strong>Couleur:</strong> ${escapeHtml(data.couleur || '—')}</p>
                <p style="font-size:.84rem;margin-bottom:14px">📦 <strong>Stock:</strong>
                    ${data.stock > 5 ? `<span style="color:var(--succes)">✅ En stock (${data.stock})</span>`
                    : data.stock > 0 ? `<span style="color:orange">⚠ Dernières pièces (${data.stock})</span>`
                    : '<span style="color:var(--danger)">❌ Rupture de stock</span>'}
                </p>
                <div style="display:flex;gap:8px">
                    ${data.stock > 0
                        ? `<button onclick="ajouterPanier(${data.id});fermerModal();" class="btn btn-violet" style="flex:1">🛒 Ajouter au panier</button>`
                        : `<button class="btn" style="background:#eee;color:#aaa;cursor:not-allowed;flex:1" disabled>Rupture</button>`}
                    <button onclick="toggleWishlist(${data.id},this);this.textContent=wishlist.includes(${data.id})?'❤️':'🤍';" class="btn btn-outline" style="min-width:46px">${inWl ? '❤️' : '🤍'}</button>
                </div>
            </div>
        </div>
        ${autres.length ? `
        <div class="also-bought">
            <h4>👗 Vous aimerez aussi</h4>
            <div class="also-bought-grid">
                ${autres.map(r => {
                    const rp = r.en_promotion && r.prix_promo ? r.prix_promo : r.prix;
                    return `<div class="also-bought-item" onclick="fermerModal();setTimeout(()=>voirProduit(${r.id}),200)">
                        <div class="img">${r.categorie_id <= 2 ? '👗' : '👟'}</div>
                        <div class="nom">${escapeHtml(r.nom)}</div>
                        <div class="prix">${formatPrix(rp)}</div>
                    </div>`;
                }).join('')}
            </div>
        </div>` : ''}
    `);
}

function zoomImage(container) {
    const img = container.querySelector('img');
    if (!img) return;
    let overlay = document.getElementById('zoom-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'zoom-overlay';
        overlay.className = 'zoom-overlay';
        overlay.innerHTML = `<img id="zoom-img" src="">`;
        overlay.addEventListener('click', () => overlay.classList.remove('active'));
        document.body.appendChild(overlay);
    }
    document.getElementById('zoom-img').src = img.src;
    overlay.classList.add('active');
}

function selectTaille(btn) {
    btn.closest('.produit-detail-grid, .modal').querySelectorAll('.chip').forEach(c => c.classList.remove('actif'));
    btn.classList.add('actif');
}

function afficherGuide() {
    ouvrirModal(`
        <button class="modal-fermer" onclick="fermerModal()">✕</button>
        <h3 style="margin-bottom:16px">📏 Guide des Tailles - SOLANGE SHOPPING</h3>
        <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:.85rem">
            <thead>
                <tr style="background:var(--gris-clair)">
                    <th style="padding:10px;text-align:left;border-bottom:2px solid var(--gris)">Taille</th>
                    <th style="padding:10px;border-bottom:2px solid var(--gris)">Tour de poitrine (cm)</th>
                    <th style="padding:10px;border-bottom:2px solid var(--gris)">Tour de taille (cm)</th>
                    <th style="padding:10px;border-bottom:2px solid var(--gris)">Tour de hanches (cm)</th>
                </tr>
            </thead>
            <tbody>
                ${[['XS','78-82','60-64','86-90'],['S','82-86','64-68','90-94'],['M','86-90','68-72','94-98'],
                   ['L','90-96','72-78','98-104'],['XL','96-102','78-84','104-110'],['XXL','102-110','84-92','110-118']]
                  .map(([t,a,b,c]) => `<tr><td style="padding:10px;font-weight:700;border-bottom:1px solid var(--gris)">${t}</td>
                    <td style="padding:10px;text-align:center;border-bottom:1px solid var(--gris)">${a}</td>
                    <td style="padding:10px;text-align:center;border-bottom:1px solid var(--gris)">${b}</td>
                    <td style="padding:10px;text-align:center;border-bottom:1px solid var(--gris)">${c}</td>
                  </tr>`).join('')}
            </tbody>
        </table>
        </div>
        <p style="font-size:.8rem;color:#888;margin-top:12px">💡 En cas de doute entre deux tailles, choisissez la plus grande.</p>
    `);
}

async function ajouterPanier(produit_id) {
    if (utilisateurCourant) {
        const data = await apiFetch('panier.php', { action:'ajouter', produit_id, quantite:1 }, 'POST');
        if (data?.succes) { notifier('✅ ' + data.message, 'succes'); await maj_badge_panier(); }
        else if (data) notifier(data.erreur, 'erreur');
    } else {
        // Guest: save to localStorage
        const idx = guestCart.findIndex(i => i.produit_id === produit_id);
        if (idx >= 0) guestCart[idx].quantite += 1;
        else guestCart.push({ produit_id, quantite: 1 });
        localStorage.setItem('ss_guest_cart', JSON.stringify(guestCart));
        const badge = document.getElementById('badge-panier');
        panierCount = guestCart.reduce((s,i) => s+i.quantite, 0);
        if (badge) { badge.textContent = panierCount; badge.style.display = panierCount > 0 ? 'flex' : 'none'; }
        notifier('🛒 Article ajouté au panier !', 'succes');
    }
}

async function chargerCategories() {
    const conteneur = document.getElementById('categories-grid');
    if (!conteneur) return;
    const data = await apiFetch('produits.php?action=categories');
    if (!data) return;
    const icones = { 1:'👗', 2:'👔', 3:'👠', 4:'👞' };
    conteneur.innerHTML = data.map(c => `
        <div class="categorie-card" onclick="filtrerCategorie(${c.id}, this)">
            <span class="icone">${icones[c.id] || '🛍'}</span>
            <h3>${escapeHtml(c.nom)}</h3>
            <p>${c.nb_produits} produit${c.nb_produits > 1 ? 's' : ''}</p>
        </div>
    `).join('');
}

function filtrerCategorie(id, el) {
    document.querySelectorAll('.categorie-card').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    chargerProduits({ categorie: id });
}

function rechercherProduits() {
    const q = document.getElementById('input-recherche')?.value || '';
    const list = document.getElementById('autocomplete-list');
    if (list) { list.innerHTML = ''; list.style.display = 'none'; }
    const params = {};
    if (q) params.recherche = q;

    // Collect filter values if they exist
    const tri = document.getElementById('select-tri')?.value;
    const prixMax = document.getElementById('range-prix')?.value;
    const taille = document.getElementById('select-taille')?.value;
    const couleur = document.getElementById('select-couleur')?.value;
    if (tri) params.tri = tri;
    if (prixMax && prixMax < 100000) params.prix_max = prixMax;
    if (taille) params.taille = taille;
    if (couleur) params.couleur = couleur;

    chargerProduits(params);
}

function appliquerFiltres() { rechercherProduits(); }

function resetFiltres() {
    const input = document.getElementById('input-recherche');
    if (input) input.value = '';
    const tri = document.getElementById('select-tri');
    if (tri) tri.value = 'defaut';
    const range = document.getElementById('range-prix');
    if (range) { range.value = range.max; majLabelPrix(range); }
    const taille = document.getElementById('select-taille');
    if (taille) taille.value = '';
    const couleur = document.getElementById('select-couleur');
    if (couleur) couleur.value = '';
    document.querySelectorAll('.filtre-btn, .chip').forEach(b => b.classList.remove('actif'));
    chargerProduits();
}

function majLabelPrix(el) {
    const label = document.getElementById('label-prix-max');
    if (label) label.textContent = formatPrix(el.value);
}

// ================================================================
// PANIER
// ================================================================
async function maj_badge_panier() {
    if (utilisateurCourant) {
        const data = await apiFetch('panier.php?action=liste');
        panierCount = data?.nb_items || 0;
    } else {
        panierCount = guestCart.reduce((s,i) => s+i.quantite, 0);
    }
    const badge = document.getElementById('badge-panier');
    if (badge) { badge.textContent = panierCount; badge.style.display = panierCount > 0 ? 'flex' : 'none'; }
}

async function chargerPanier() {
    const conteneur = document.getElementById('panier-items');
    if (!conteneur) return;

    if (utilisateurCourant) {
        conteneur.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
        const data = await apiFetch('panier.php?action=liste');
        if (!data || data.erreur) { conteneur.innerHTML = 'Erreur.'; return; }
        if (!data.items.length) {
            conteneur.innerHTML = videHTML('🛒','Panier vide','Ajoutez des articles pour commencer.',`<a href="produits.html" class="btn btn-violet">🛍 Voir les produits</a>`);
            updateResume(0, 0); return;
        }
        conteneur.innerHTML = data.items.map(item => panierItemHTML(item, false)).join('');
        updateResume(data.total, data.items.length);
    } else {
        // Guest cart
        if (!guestCart.length) {
            conteneur.innerHTML = videHTML('🛒','Panier vide','Ajoutez des articles pour commencer.',`<a href="produits.html" class="btn btn-violet">🛍 Voir les produits</a>`);
            updateResume(0, 0); return;
        }
        // Fetch product details
        const ids = guestCart.map(i => i.produit_id);
        conteneur.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
        const prods = await Promise.all(ids.map(id => apiFetch(`produits.php?action=detail&id=${id}`)));
        let total = 0;
        const items = guestCart.map((c, idx) => {
            const p = prods[idx];
            if (!p) return null;
            const px = p.en_promotion && p.prix_promo ? p.prix_promo : p.prix;
            total += px * c.quantite;
            return { ...c, id: idx, nom: p.nom, prix_effectif: px, image: p.image, stock: p.stock };
        }).filter(Boolean);
        conteneur.innerHTML = items.map(item => panierItemHTML(item, true)).join('');
        updateResume(total, items.length);
    }
    await maj_badge_panier();
}

function panierItemHTML(item, isGuest) {
    const delFn = isGuest ? `supprimerGuestItem(${item.id})` : `supprimerItem(${item.id})`;
    const modFn = isGuest ? `modifGuestQte(${item.id},{delta})` : `modifQuantite(${item.id},{qte})`;
    return `
    <div class="panier-item" id="pitem-${item.id}">
        <div class="panier-item-img">${item.image && item.image !== 'images/default.jpg' ? `<img src="${item.image}" alt="">` : '🛍'}</div>
        <div class="panier-item-info">
            <h4>${escapeHtml(item.nom)}</h4>
            <p class="prix">${formatPrix(item.prix_effectif)}</p>
            <div class="quantite-ctrl">
                <button onclick="${isGuest ? `modifGuestQte(${item.id},-1)` : `modifQuantite(${item.id},${item.quantite-1})`}">−</button>
                <span>${item.quantite}</span>
                <button onclick="${isGuest ? `modifGuestQte(${item.id},1)` : `modifQuantite(${item.id},${item.quantite+1})`}">+</button>
            </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
            <p style="font-weight:700;color:var(--primaire);font-size:.9rem">${formatPrix(item.prix_effectif * item.quantite)}</p>
            <button onclick="${isGuest ? `supprimerGuestItem(${item.id})` : `supprimerItem(${item.id})`}" class="btn-suppr">🗑</button>
        </div>
    </div>`;
}

function updateResume(total, nb) {
    const tEl = document.getElementById('resume-total-val');
    const fEl = document.getElementById('resume-total-final');
    const nEl = document.getElementById('resume-nb-articles');
    if (tEl) tEl.textContent = formatPrix(total);
    if (fEl) fEl.textContent = formatPrix(total);
    if (nEl) nEl.textContent = nb + ' article(s)';
}

async function modifQuantite(panier_id, qte) {
    if (qte < 1) { supprimerItem(panier_id); return; }
    await apiFetch('panier.php', { action:'modifier', panier_id, quantite:qte }, 'POST');
    chargerPanier();
}

async function supprimerItem(panier_id) {
    await apiFetch('panier.php', { action:'supprimer', panier_id }, 'POST');
    notifier('Article retiré.', 'info'); chargerPanier();
}

function modifGuestQte(idx, delta) {
    guestCart[idx].quantite += delta;
    if (guestCart[idx].quantite < 1) { guestCart.splice(idx, 1); }
    localStorage.setItem('ss_guest_cart', JSON.stringify(guestCart));
    chargerPanier();
}

function supprimerGuestItem(idx) {
    guestCart.splice(idx, 1);
    localStorage.setItem('ss_guest_cart', JSON.stringify(guestCart));
    notifier('Article retiré.', 'info'); chargerPanier();
}

// ================================================================
// CHECKOUT (Guest + Logged)
// ================================================================
function basculerCheckout(type) {
    document.querySelectorAll('.checkout-tab').forEach(t => t.classList.remove('actif'));
    document.querySelectorAll('.checkout-form').forEach(f => f.style.display = 'none');
    document.querySelector(`.checkout-tab[data-type="${type}"]`)?.classList.add('actif');
    document.getElementById(`checkout-${type}`)?.style.setProperty('display','block');
}

function selectionnerPaiement(mode, el) {
    document.querySelectorAll('.option-pmt').forEach(o => o.classList.remove('selectionne'));
    el.classList.add('selectionne');
    el.querySelector('input[type=radio]').checked = true;
    const champTx = document.getElementById('champ-transaction');
    const champAdr = document.getElementById('champ-adresse');
    if (champTx) {
        champTx.style.display = ['momo','orange_money'].includes(mode) ? 'block' : 'none';
        const lbl = document.getElementById('label-tx');
        if (lbl) lbl.textContent = mode === 'momo' ? '📱 Numéro MTN MOMO' : '🟠 Numéro Orange Money';
    }
    if (champAdr) champAdr.style.display = mode !== 'a_la_boutique' ? 'block' : 'none';
}

async function passerCommande() {
    const mode = document.querySelector('input[name="paiement"]:checked')?.value;
    if (!mode) { notifier('Veuillez choisir un mode de paiement.', 'erreur'); return; }
    const adresse = document.getElementById('input-adresse')?.value || '';
    const numTx   = document.getElementById('input-transaction')?.value || '';
    if (['momo','orange_money'].includes(mode) && !numTx) { notifier('Numéro de transaction requis.', 'erreur'); return; }

    const btn = document.getElementById('btn-commander');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Traitement...'; }

    let body = { action:'commander', mode_paiement:mode, adresse, numero_transaction:numTx };

    // If guest checkout
    if (!utilisateurCourant) {
        body.guest_nom   = document.getElementById('guest-nom')?.value || 'Invité';
        body.guest_email = document.getElementById('guest-email')?.value || '';
        body.guest_tel   = document.getElementById('guest-tel')?.value || '';
        body.items       = JSON.stringify(guestCart);
    }

    const data = await apiFetch('panier.php', body, 'POST');
    if (btn) { btn.disabled = false; btn.textContent = '✅ Confirmer la commande'; }

    if (data?.succes) {
        if (!utilisateurCourant) { guestCart = []; localStorage.removeItem('ss_guest_cart'); }
        ouvrirModal(`
            <div style="text-align:center;padding:16px">
                <div style="font-size:3.5rem;margin-bottom:12px">🎉</div>
                <h2 style="color:var(--succes);margin-bottom:8px">Commande confirmée !</h2>
                <p>Commande <strong>#${data.commande_id}</strong></p>
                <p style="font-size:1.2rem;font-weight:800;color:var(--primaire);margin:10px 0">${formatPrix(data.total)}</p>
                <p style="font-size:.88rem;color:#666;margin-bottom:18px">Vous recevrez une confirmation de SOLANGE SHOPPING.</p>
                <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
                    <a href="commandes.html" class="btn btn-violet">📋 Mes commandes</a>
                    <a href="index.html" class="btn btn-outline">🏠 Accueil</a>
                </div>
            </div>
        `);
        await maj_badge_panier();
    } else if (data) { notifier(data.erreur, 'erreur'); }
}

// ================================================================
// WISHLIST
// ================================================================
async function toggleWishlist(id, btn) {
    const idx = wishlist.indexOf(id);
    if (idx >= 0) {
        wishlist.splice(idx, 1);
        if (btn) { btn.textContent = '🤍'; btn.classList.remove('actif'); }
        notifier('Retiré des favoris.', 'info');
    } else {
        wishlist.push(id);
        if (btn) { btn.textContent = '❤️'; btn.classList.add('actif'); }
        notifier('❤️ Ajouté aux favoris !', 'succes');
    }
    localStorage.setItem('ss_wishlist', JSON.stringify(wishlist));
}

function updateWishlistBtns() {
    document.querySelectorAll('.btn-wishlist[data-id]').forEach(btn => {
        const id = parseInt(btn.dataset.id);
        const inWl = wishlist.includes(id);
        btn.textContent = inWl ? '❤️' : '🤍';
        btn.classList.toggle('actif', inWl);
    });
}

async function chargerWishlist() {
    const c = document.getElementById('wishlist-grid');
    if (!c) return;
    if (!wishlist.length) { c.innerHTML = videHTML('🤍','Aucun favori','Ajoutez des articles en cliquant sur ❤️',`<a href="produits.html" class="btn btn-violet">🛍 Explorer</a>`); return; }
    c.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    const prods = await Promise.all(wishlist.map(id => apiFetch(`produits.php?action=detail&id=${id}`)));
    c.innerHTML = prods.filter(Boolean).map(p => produitHTML(p)).join('');
    updateWishlistBtns();
}

// ================================================================
// AUTH
// ================================================================
async function connexion(e) {
    e.preventDefault();
    const data = await apiFetch('auth.php', { action:'connexion', email: e.target.email.value, mot_de_passe: e.target.mot_de_passe.value }, 'POST');
    if (data?.succes) {
        utilisateurCourant = data.utilisateur;
        notifier(data.message, 'succes');
        setTimeout(() => location.href = data.utilisateur.role === 'admin' ? 'admin/index.html' : 'index.html', 900);
    } else if (data) notifier(data.erreur, 'erreur');
}

async function inscription(e) {
    e.preventDefault();
    const form = e.target;
    if (form.mot_de_passe.value !== form.confirmation?.value) { notifier('Les mots de passe ne correspondent pas.', 'erreur'); return; }
    const body = new FormData(form);
    body.append('action','inscription');
    const res  = await fetch(BASE + 'auth.php', { method:'POST', body });
    const data = await res.json();
    if (data.succes) { utilisateurCourant = data.utilisateur; notifier(data.message,'succes'); setTimeout(()=>location.href='index.html',1100); }
    else notifier(data.erreur,'erreur');
}

// ================================================================
// CONTACT
// ================================================================
async function envoyerContact(e) {
    e.preventDefault();
    const body = new FormData(e.target);
    body.append('action','envoyer');
    const res  = await fetch(BASE + 'contact.php', { method:'POST', body });
    const data = await res.json();
    if (data.succes) { notifier(data.message,'succes'); e.target.reset(); }
    else notifier(data.erreur,'erreur');
}

// ================================================================
// UTILS
// ================================================================
async function apiFetch(url, body=null, method='GET') {
    try {
        const opts = { method };
        if (body && method === 'POST') {
            opts.body = new URLSearchParams(body);
            opts.headers = {'Content-Type':'application/x-www-form-urlencoded'};
        }
        const res = await fetch(BASE + url, opts);
        return await res.json();
    } catch(e) { console.error('API error:', e); return null; }
}

function notifier(msg, type='info') {
    const n = document.createElement('div');
    n.className = `notif notif-${type}`;
    const ico = { succes:'✅', erreur:'❌', info:'ℹ️' };
    n.innerHTML = `<span>${ico[type]||'ℹ️'}</span> ${escapeHtml(msg)}`;
    document.body.appendChild(n);
    setTimeout(() => { n.style.opacity='0'; n.style.transform='translateX(110%)'; }, 3000);
    setTimeout(() => n.remove(), 3500);
}

function ouvrirModal(html) {
    document.getElementById('modal-overlay')?.remove();
    const ov = document.createElement('div');
    ov.className = 'modal-overlay'; ov.id = 'modal-overlay';
    ov.innerHTML = `<div class="modal">${html}</div>`;
    ov.addEventListener('click', e => { if (e.target === ov) fermerModal(); });
    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';
}

function fermerModal() {
    document.getElementById('modal-overlay')?.remove();
    document.body.style.overflow = '';
}

function formatPrix(n) { return Number(n).toLocaleString('fr-FR') + ' FCFA'; }

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function videHTML(ico, titre, texte, extra='') {
    return `<div class="vide"><div class="vide-icone">${ico}</div><h3>${titre}</h3><p>${texte}</p><br>${extra}</div>`;
}

function basculerTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('actif'));
    document.querySelectorAll('.auth-form').forEach(f => f.style.display='none');
    document.querySelector(`.auth-tab[data-tab="${tab}"]`)?.classList.add('actif');
    document.getElementById(`form-${tab}`)?.style.setProperty('display','block');
}
