// ==========================================================================
// MOTEUR DE JEU SONGO DISTANT - ARCHITECTURE APP.JS (V2 COMPLÈTE RÉSEAU)
// ==========================================================================

// 1. Éléments du DOM (Variables Globales)
const ecranAccueil = document.getElementById('ecran-accueil');
const ecranJeu = document.getElementById('ecran-jeu');
const ecranFin = document.getElementById('ecran-fin');

const menuChoixMode = document.getElementById('menu-choix-mode');
const sousMenuIA = document.getElementById('sous-menu-ia');
const sousMenuEnLigne = document.getElementById('sous-menu-enligne');
const btnRetourAccueilIA = document.getElementById('btn-retour-accueil-ia');
const zoneAffichageCode = document.getElementById('zone-affichage-code');
const codeGenereText = document.getElementById('code-genere');
const cleGenereeText = document.getElementById('cle-generee');
const statutSalonHote = document.getElementById('statut-salon-hote');
const btnAnnulerSalon = document.getElementById('btn-annuler-salon');
const inputCleSalon = document.getElementById('input-cle-salon');
const listeSalonsDisponibles = document.getElementById('liste-salons-disponibles');
const salonsOuverts = document.getElementById('salons-ouverts');
const btnRafraichirSalons = document.getElementById('btn-rafraichir-salons');

const btnModeIA = document.getElementById('btn-mode-ia');
const btnModeLigne = document.getElementById('btn-mode-ligne');
const btnRetourAccueil = document.getElementById('btn-retour-accueil');
const btnCreerPartie = document.getElementById('btn-creer-partie');
const btnRejoindrePartie = document.getElementById('btn-rejoindre-partie');
const inputCodeSalon = document.getElementById('input-code-salon');
const inputPseudoJoueur = document.getElementById('input-pseudo-joueur');
const nomJoueurNord = document.getElementById('nom-joueur-nord');
const nomJoueurSud = document.getElementById('nom-joueur-sud');

const btnPartieEnCours = document.getElementById('btn-partie-en-cours');
const btnRecommencer = document.getElementById('btn-recommencer'); // Capituler
const btnInitialiser = document.getElementById('btn-initialiser');

const btnRejouerOui = document.getElementById('btn-rejouer-oui');
const btnRejouerNon = document.getElementById('btn-rejouer-non');
const titreVictoire = document.getElementById('titre-victoire');
const messageVictoire = document.getElementById('message-victoire');

const zoneTablier = document.getElementById('zone-tablier');
const btnRegles = document.getElementById('btn-regles');
const texteRegles = document.getElementById('texte-regles');
const indicateurTour = document.getElementById('indicateur-tour');

const txtScoreSud = document.getElementById('score-txt-sud');
const txtScoreNord = document.getElementById('score-txt-nord');

// 2. Variables d'État Globale (Moteur + Réseau)
let plateau = Array(14).fill(0); 
let scoreSud = 0; 
let scoreNord = 0; 
let tourJoueur = "MOI"; 
let jeuDistribue = false; 
let compteurCoupsSansCapture = 0;
let animationEnCours = false;

const DUREE_VOL_GRaine = 320;
const PAUSE_ENTRE_GRAINES = 90;

let modeJeu = "";          // "IA" ou "EN_LIGNE"
let niveauIA = 10;         // 1 (facile) à 20 (expert)
let roleReseau = "";       // "HOTE" ou "INVITE"
let codePartieActuel = "";
let cleAccesActuelle = "";
let intervalleSynchro = null;
let intervalleAttenteInvite = null;
let monPseudo = "";
let pseudoHote = "";
let pseudoInvite = "";

const API_SALONS = '/api/salons';

// ==========================================================================
// PSEUDOS & AFFICHAGE JOUEURS
// ==========================================================================
function lirePseudoSaisi() {
    const pseudo = (inputPseudoJoueur?.value || "").trim();
    if (pseudo.length < 2) {
        alert("Entre un pseudo d'au moins 2 caractères.");
        return null;
    }
    if (pseudo.length > 20) {
        alert("Le pseudo ne peut pas dépasser 20 caractères.");
        return null;
    }
    return pseudo;
}

function appliquerPseudosDepuisServeur(joueurs) {
    if (!joueurs) return;
    if (joueurs.hote) pseudoHote = joueurs.hote;
    if (joueurs.invite) pseudoInvite = joueurs.invite;
    majAffichagePseudos();
}

function reinitialiserPseudos() {
    monPseudo = "";
    pseudoHote = "";
    pseudoInvite = "";
    majAffichagePseudos();
}

function getMonPseudo() {
    if (modeJeu === "EN_LIGNE") {
        return roleReseau === "HOTE" ? pseudoHote : pseudoInvite;
    }
    return monPseudo || "Moi";
}

function getPseudoAdversaire() {
    if (modeJeu === "IA") return "Intelligence Artificielle";
    if (modeJeu === "EN_LIGNE") {
        return roleReseau === "HOTE" ? (pseudoInvite || "Adversaire") : (pseudoHote || "Adversaire");
    }
    return "Adversaire";
}

function getPseudoCampSud() {
    if (modeJeu === "EN_LIGNE") return pseudoHote || "Hôte";
    if (modeJeu === "IA") return monPseudo || "Moi";
    return "Moi";
}

function getPseudoCampNord() {
    if (modeJeu === "EN_LIGNE") return pseudoInvite || "Invité";
    if (modeJeu === "IA") return "Intelligence Artificielle";
    return "Adversaire";
}

function msgTourMoi() {
    return `C'est au tour de ${getMonPseudo()} !`;
}

function msgTourAdversaire() {
    if (modeJeu === "EN_LIGNE") {
        return `C'est au tour de ${getPseudoAdversaire()} — transmission...`;
    }
    return `C'est au tour de ${getPseudoAdversaire()} !`;
}

function msgAdversaireAJoue() {
    return `${getPseudoAdversaire()} a joué ! C'est au tour de ${getMonPseudo()} !`;
}

function majAffichagePseudos() {
    if (!nomJoueurNord || !nomJoueurSud) return;

    nomJoueurNord.textContent = getPseudoCampNord();
    nomJoueurSud.textContent = getPseudoCampSud();

    const moiAuNord = modeJeu === "EN_LIGNE" && roleReseau === "INVITE";
    const moiAuSud = modeJeu !== "EN_LIGNE" || roleReseau === "HOTE";

    nomJoueurNord.classList.toggle('nom-moi', moiAuNord);
    nomJoueurSud.classList.toggle('nom-moi', moiAuSud);
}

function messageFinPourScores() {
    const gagnantSud = scoreSud > scoreNord;
    const nomSud = getPseudoCampSud();
    const nomNord = getPseudoCampNord();
    const moiGagne = modeJeu === "EN_LIGNE"
        ? (roleReseau === "HOTE" ? gagnantSud : !gagnantSud)
        : gagnantSud;

    if (scoreSud === scoreNord) {
        return { titre: "🤝 Match Nul !", message: `Égalité entre ${nomSud} et ${nomNord}.` };
    }

    const gagnant = gagnantSud ? nomSud : nomNord;
    const perdant = gagnantSud ? nomNord : nomSud;
    const scoreGagnant = gagnantSud ? scoreSud : scoreNord;
    const scorePerdant = gagnantSud ? scoreNord : scoreSud;

    if (moiGagne) {
        return {
            titre: "🏆 Victoire !",
            message: `${gagnant} remporte la partie (${scoreGagnant} à ${scorePerdant}) !`,
        };
    }
    return {
        titre: "👑 Défaite",
        message: `${perdant} s'incline. ${gagnant} gagne (${scoreGagnant} à ${scorePerdant}).`,
    };
}

// ==========================================================================
// FONCTIONS RÉSEAU (FETCH → API Node / Express)
// ==========================================================================

// Boucle réseau de synchronisation (Vérifie toutes les 2 secondes si l'adversaire a joué)
function lancerSynchronisation() {
    if (intervalleSynchro) clearInterval(intervalleSynchro);
    
    intervalleSynchro = setInterval(() => {
        if (modeJeu !== "EN_LIGNE" || !codePartieActuel) return;
        
        // Si c'est déjà à mon tour de jouer localement, inutile d'interroger le serveur
        if (tourJoueur === "MOI") return;

        fetch(`${API_SALONS}/${codePartieActuel}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === "success") {
                    let etatDistant = data.etat;
                    
                    // Vérification : est-ce que le tour enregistré sur MySQL correspond à mon rôle ?
                    let prochainTourLocal = (etatDistant.tour === roleReseau) ? "MOI" : "ADVERSAIRE";
                    
                    if (prochainTourLocal === "MOI") {
                        plateau = etatDistant.plateau;
                        scoreSud = etatDistant.scoreSud;
                        scoreNord = etatDistant.scoreNord;
                        tourJoueur = "MOI";
                        
                        if (data.joueurs) appliquerPseudosDepuisServeur(data.joueurs);
                        txtScoreSud.textContent = scoreSud;
                        txtScoreNord.textContent = scoreNord;
                        indicateurTour.textContent = msgAdversaireAJoue();
                        dessinerTablier();
                        verifierFinDePartie();
                    }
                }
            }).catch(err => console.log("Attente de la réponse du serveur..."));
    }, 2000);
}

// Fonction pour sauvegarder mon coup sur la base de données distante
function sauvegarderCoupDistant() {
    if (modeJeu !== "EN_LIGNE") return;

    // Si je suis HOTE, le prochain tour sur le serveur appartiendra à l'INVITE, et vice-versa
    let prochainTourDistant = (roleReseau === "HOTE") ? "INVITE" : "HOTE";

    let etatAEnvoyer = {
        plateau: plateau,
        scoreSud: scoreSud,
        scoreNord: scoreNord,
        tour: prochainTourDistant,
        distribue: jeuDistribue
    };

    fetch(`${API_SALONS}/${codePartieActuel}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(etatAEnvoyer)
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                console.log("Coup enregistré sur le serveur.");
            }
        }).catch(err => console.error("Erreur de transmission réseau."));
}

// ==========================================================================
// AIGUILLAGE & LIENS DES MENUS
// ==========================================================================

const inputNiveauIA = document.getElementById('input-niveau-ia');
const valeurNiveauIA = document.getElementById('valeur-niveau-ia');
const profondeurNiveauIA = document.getElementById('profondeur-niveau-ia');
const descriptionNiveauIA = document.getElementById('description-niveau-ia');
const btnDemarrerIA = document.getElementById('btn-demarrer-ia');

function bornerNiveauIA(niveau) {
    return Math.max(1, Math.min(20, Number(niveau) || 10));
}

function getParametresIA(niveau) {
    const n = bornerNiveauIA(niveau);
    const ratio = (n - 1) / 19;

    let profondeurMinimax = 0;
    if (n >= 7) profondeurMinimax = 1;
    if (n >= 10) profondeurMinimax = 2;
    if (n >= 13) profondeurMinimax = 3;
    if (n >= 16) profondeurMinimax = 4;
    if (n >= 19) profondeurMinimax = 5;

    return {
        niveau: n,
        intelligence: ratio,
        profondeurMinimax,
        tauxErreur: Math.max(0.02, 0.5 - ratio * 0.48),
        prudence: Math.min(1, ratio * 1.1),
        prioriteCapture: Math.min(1, 0.05 + ratio * 0.9),
        delai: Math.round(1150 - ratio * 750),
    };
}

function getTitreNiveauIA(niveau) {
    const n = bornerNiveauIA(niveau);
    if (n <= 3) return 'Découverte';
    if (n <= 6) return 'Apprenti';
    if (n <= 9) return 'Initié';
    if (n <= 12) return 'Confirmé';
    if (n <= 15) return 'Avancé';
    if (n <= 18) return 'Expert';
    return 'Maître';
}

function getLibelleReflexion(niveau) {
    const n = bornerNiveauIA(niveau);
    if (n <= 3) return 'Réflexion : minimale';
    if (n <= 6) return 'Réflexion : légère';
    if (n <= 9) return 'Réflexion : modeste';
    if (n <= 12) return 'Réflexion : correcte';
    if (n <= 15) return 'Réflexion : poussée';
    if (n <= 18) return 'Réflexion : profonde';
    return 'Réflexion : maximale';
}

function getDescriptionNiveauIA(niveau) {
    const n = bornerNiveauIA(niveau);
    const p = getParametresIA(n);
    const titre = getTitreNiveauIA(n);

    if (n <= 3) {
        return `${titre} — l'IA joue surtout au feeling, sans vraie stratégie.`;
    }
    if (n <= 6) {
        return `${titre} — elle évite déjà les erreurs les plus grossières.`;
    }
    if (n <= 9) {
        return `${titre} — elle repère les captures et choisit un peu mieux ses coups.`;
    }
    if (n <= 12) {
        return `${titre} — elle compare les options et se montre plus prudente.`;
    }
    if (n <= 15) {
        return `${titre} — elle anticipe environ ${p.profondeurMinimax} coup${p.profondeurMinimax > 1 ? 's' : ''} à l'avance.`;
    }
    if (n <= 18) {
        return `${titre} — stratégie solide, avec ${p.profondeurMinimax} coups d'anticipation.`;
    }
    return `${titre} — adversaire redoutable, réflexion poussée au maximum (${p.profondeurMinimax} coups).`;
}

function getMessageDebutPartieIA(niveau) {
    const n = bornerNiveauIA(niveau);
    const titre = getTitreNiveauIA(n);

    if (n <= 3) {
        return `Partie contre l'IA · Niveau ${n}/20 (${titre}). Clique sur « Distribuer les Graines » pour commencer.`;
    }
    if (n <= 6) {
        return `Partie contre l'IA · Niveau ${n}/20 (${titre}). L'adversaire reste accessible — distribue les graines quand tu es prêt.`;
    }
    if (n <= 9) {
        return `Partie contre l'IA · Niveau ${n}/20 (${titre}). L'IA commence à réfléchir — lance la partie en distribuant les graines.`;
    }
    if (n <= 12) {
        return `Partie contre l'IA · Niveau ${n}/20 (${titre}). Un bon challenge t'attend — distribue les graines pour démarrer.`;
    }
    if (n <= 15) {
        return `Partie contre l'IA · Niveau ${n}/20 (${titre}). L'adversaire calcule ses coups — distribue les graines pour en découdre.`;
    }
    if (n <= 18) {
        return `Partie contre l'IA · Niveau ${n}/20 (${titre}). Gare aux pièges — distribue les graines et reste concentré.`;
    }
    return `Partie contre l'IA · Niveau ${n}/20 (${titre}). Le summum de l'IA — distribue les graines si tu te sens prêt.`;
}

function majAffichageSelecteurIA() {
    if (!inputNiveauIA) return;
    const n = bornerNiveauIA(inputNiveauIA.value);
    if (valeurNiveauIA) valeurNiveauIA.textContent = `Niveau ${n}`;
    if (profondeurNiveauIA) profondeurNiveauIA.textContent = getLibelleReflexion(n);
    if (descriptionNiveauIA) descriptionNiveauIA.textContent = getDescriptionNiveauIA(n);
}

function getDelaiIA() {
    return getParametresIA(niveauIA).delai;
}

function arreterAttenteInvite() {
    if (intervalleAttenteInvite) {
        clearInterval(intervalleAttenteInvite);
        intervalleAttenteInvite = null;
    }
}

function mettreAJourStatutSalonHote(salon) {
    if (!statutSalonHote || !salon) return;
    const nb = salon.nbJoueurs ?? 1;
    const max = salon.maxJoueurs ?? 2;
    if (nb >= max) {
        statutSalonHote.innerHTML = `Joueurs connectés : <strong>${nb}/${max}</strong> — adversaire connecté ! Lancement...`;
    } else {
        statutSalonHote.innerHTML = `Joueurs connectés : <strong>${nb}/${max}</strong> — en attente de l'adversaire...`;
    }
}

function entrerDansPartieEnLigne(etat, messageIndicateur, joueurs) {
    plateau = etat.plateau;
    scoreSud = etat.scoreSud;
    scoreNord = etat.scoreNord;
    jeuDistribue = etat.distribue;
    tourJoueur = (etat.tour === roleReseau) ? "MOI" : "ADVERSAIRE";

    if (joueurs) appliquerPseudosDepuisServeur(joueurs);

    ecranAccueil.classList.remove('active');
    ecranJeu.classList.add('active');
    btnPartieEnCours.disabled = false;
    zoneAffichageCode.hidden = true;

    txtScoreSud.textContent = scoreSud;
    txtScoreNord.textContent = scoreNord;
    majAffichagePseudos();
    indicateurTour.textContent = messageIndicateur;
    dessinerTablier();
    lancerSynchronisation();
}

function lancerAttenteInvite() {
    arreterAttenteInvite();
    intervalleAttenteInvite = setInterval(() => {
        if (modeJeu !== "EN_LIGNE" || roleReseau !== "HOTE" || !codePartieActuel) return;

        fetch(`${API_SALONS}/${codePartieActuel}`)
            .then((response) => response.json())
            .then((data) => {
                if (data.status !== "success") return;

                mettreAJourStatutSalonHote(data.salon);

                if (data.joueurs) appliquerPseudosDepuisServeur(data.joueurs);

                if (data.salon.complet || data.salon.statut === 'en_cours') {
                    arreterAttenteInvite();
                    const nomInvite = data.joueurs?.invite || "L'adversaire";
                    entrerDansPartieEnLigne(
                        data.etat,
                        `${nomInvite} a rejoint le salon ! ${msgTourMoi()}`,
                        data.joueurs
                    );
                }
            })
            .catch(() => {});
    }, 1500);
}

async function chargerSalonsDisponibles() {
    if (!listeSalonsDisponibles || !salonsOuverts) return;

    try {
        const response = await fetch(API_SALONS);
        const data = await response.json();

        if (data.status !== 'success') return;

        listeSalonsDisponibles.hidden = false;
        salonsOuverts.innerHTML = '';

        if (!data.salons.length) {
            salonsOuverts.innerHTML = '<li class="salons-vide">Aucun salon en attente pour le moment.</li>';
            return;
        }

        data.salons.forEach((salon) => {
            const li = document.createElement('li');
            li.className = 'salon-ouvert-item';
            const nomHote = salon.joueurs?.hote || 'Hôte';
            li.innerHTML = `
                <span class="salon-ouvert-code">${salon.code}</span>
                <span class="salon-ouvert-joueurs">${nomHote} — ${salon.nbJoueurs}/${salon.maxJoueurs}</span>
            `;
            li.title = 'Entre le code du salon et demande la clé d\'accès à l\'hôte.';
            li.addEventListener('click', () => {
                inputCodeSalon.value = salon.code;
                inputCleSalon.focus();
            });
            salonsOuverts.appendChild(li);
        });
    } catch {
        salonsOuverts.innerHTML = '<li class="salons-vide">Impossible de charger les salons.</li>';
    }
}

function afficherMenuPrincipal() {
    arreterAttenteInvite();
    menuChoixMode.style.display = 'flex';
    sousMenuIA.hidden = true;
    sousMenuEnLigne.hidden = true;
    zoneAffichageCode.hidden = true;
    if (listeSalonsDisponibles) listeSalonsDisponibles.hidden = true;
    reinitialiserPseudos();
}

function demarrerPartieIA(niveau) {
    niveauIA = bornerNiveauIA(niveau);
    modeJeu = "IA";
    if (intervalleSynchro) clearInterval(intervalleSynchro);
    ecranAccueil.classList.remove('active');
    ecranJeu.classList.add('active');
    btnPartieEnCours.disabled = false;
    initialiserPartie();
    indicateurTour.textContent = getMessageDebutPartieIA(niveauIA);
}

// Bouton Mode IA -> sous-menu des niveaux
btnModeIA.addEventListener('click', () => {
    menuChoixMode.style.display = 'none';
    sousMenuIA.hidden = false;
    majAffichageSelecteurIA();
});

if (inputNiveauIA) {
    inputNiveauIA.addEventListener('input', majAffichageSelecteurIA);
}

if (btnDemarrerIA) {
    btnDemarrerIA.addEventListener('click', () => {
        demarrerPartieIA(inputNiveauIA?.value || 10);
    });
}

btnRetourAccueilIA.addEventListener('click', afficherMenuPrincipal);

// Bouton Mode En Ligne -> Affiche le sous-menu
btnModeLigne.addEventListener('click', () => {
    menuChoixMode.style.display = 'none';
    sousMenuEnLigne.hidden = false;
    chargerSalonsDisponibles();
});

if (btnRafraichirSalons) {
    btnRafraichirSalons.addEventListener('click', chargerSalonsDisponibles);
}

// Bouton Retour sous-menu en ligne
btnRetourAccueil.addEventListener('click', afficherMenuPrincipal);

// Action : Créer une partie en ligne (Hôte)
btnCreerPartie.addEventListener('click', () => {
    const pseudo = lirePseudoSaisi();
    if (!pseudo) return;

    modeJeu = "EN_LIGNE";
    roleReseau = "HOTE";
    monPseudo = pseudo;
    pseudoHote = pseudo;
    pseudoInvite = "";
    majAffichagePseudos();

    fetch(API_SALONS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.status === "success") {
                codePartieActuel = data.code;
                cleAccesActuelle = data.cleAcces;
                if (data.joueurs) appliquerPseudosDepuisServeur(data.joueurs);

                codeGenereText.textContent = codePartieActuel;
                cleGenereeText.textContent = cleAccesActuelle;
                zoneAffichageCode.hidden = false;
                sousMenuEnLigne.hidden = true;
                mettreAJourStatutSalonHote(data.salon);

                lancerAttenteInvite();
            } else {
                alert(data.message || "Erreur lors de la création du salon.");
            }
        })
        .catch(() => alert("Erreur réseau : impossible de contacter le serveur."));
});

if (btnAnnulerSalon) {
    btnAnnulerSalon.addEventListener('click', () => {
        if (!codePartieActuel || !cleAccesActuelle) {
            afficherMenuPrincipal();
            return;
        }

        fetch(`${API_SALONS}/${codePartieActuel}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cleAcces: cleAccesActuelle }),
        })
            .finally(() => {
                codePartieActuel = "";
                cleAccesActuelle = "";
                arreterAttenteInvite();
                afficherMenuPrincipal();
                sousMenuEnLigne.hidden = false;
            });
    });
}

// Action : Rejoindre une partie en ligne (Invité)
btnRejoindrePartie.addEventListener('click', () => {
    const codeTape = inputCodeSalon.value.trim().toUpperCase();
    const cleTapee = inputCleSalon.value.trim().toUpperCase();

    if (codeTape.length !== 5) {
        alert("Le code du salon doit contenir exactement 5 caractères.");
        return;
    }
    if (cleTapee.length !== 8) {
        alert("La clé d'accès doit contenir exactement 8 caractères.");
        return;
    }

    const pseudo = lirePseudoSaisi();
    if (!pseudo) return;

    modeJeu = "EN_LIGNE";
    roleReseau = "INVITE";
    codePartieActuel = codeTape;
    cleAccesActuelle = cleTapee;
    monPseudo = pseudo;
    pseudoInvite = pseudo;

    fetch(`${API_SALONS}/${codePartieActuel}/rejoindre`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cleAcces: cleTapee, pseudo }),
    })
        .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
            if (ok && data.status === "success") {
                const nomHote = data.joueurs?.hote || "L'hôte";
                const message = data.etat.tour === "INVITE"
                    ? `Bienvenue ${pseudo} ! ${msgTourMoi()}`
                    : `Connecté au salon de ${nomHote}. Attente de son premier coup...`;
                entrerDansPartieEnLigne(data.etat, message, data.joueurs);
            } else {
                alert(data.message || "Impossible de rejoindre ce salon.");
            }
        })
        .catch(() => alert("Erreur lors de la liaison au salon distant."));
});

// Retour au match via bouton d'accueil
btnPartieEnCours.addEventListener('click', () => {
    ecranAccueil.classList.remove('active');
    ecranJeu.classList.add('active');
});

// Capituler
btnRecommencer.addEventListener('click', () => {
    if (!jeuDistribue) {
        initialiserPartie();
        return;
    }
    if (tourJoueur === "MOI") {
        afficherEcranFin("🏳️ Forfait !", `${getMonPseudo()} a capitulé. Victoire de ${getPseudoAdversaire()}.`);
    } else {
        afficherEcranFin("🏆 Victoire par forfait !", `${getPseudoAdversaire()} a capitulé. ${getMonPseudo()} gagne.`);
    }
});

// Fin de Partie : Rejouer
btnRejouerOui.addEventListener('click', () => {
    ecranFin.classList.remove('active');
    ecranJeu.classList.add('active');
    initialiserPartie();
    btnInitialiser.click(); 
});

btnRejouerNon.addEventListener('click', () => {
    if (intervalleSynchro) clearInterval(intervalleSynchro);
    ecranFin.classList.remove('active');
    afficherMenuPrincipal();
    ecranAccueil.classList.add('active');
});

// Règles
btnRegles.addEventListener('click', () => {
    texteRegles.style.display = (texteRegles.style.display === 'none' || texteRegles.style.display === '') ? 'block' : 'none';
    btnRegles.textContent = texteRegles.style.display === 'block' ? '💡 Masquer les Règles' : '💡 Règles du Jeu';
});

// Bouton Distribuer les Graines (Mode local et IA)
btnInitialiser.addEventListener('click', async () => {
    if (animationEnCours) return;
    animationEnCours = true;
    bloquerTablier(true);

    scoreSud = 0;
    scoreNord = 0;
    compteurCoupsSansCapture = 0;
    plateau = Array(14).fill(0);
    tourJoueur = "MOI";
    jeuDistribue = true;
    indicateurTour.textContent = "Distribution des graines...";
    dessinerTablier();
    rafraichirGreniers();

    const ordreAntiHoraire = [6, 5, 4, 3, 2, 1, 0, 13, 12, 11, 10, 9, 8, 7];
    for (const idx of ordreAntiHoraire) {
        plateau[idx] = 5;
        rafraichirCase(idx);
        mettreEnSurbrillance(idx, 'case-semis');
        await attendre(75);
        getCaseElement(idx)?.classList.remove('case-semis');
    }

    retirerSurbrillances();
    indicateurTour.textContent = msgTourMoi();
    animationEnCours = false;
    bloquerTablier(false);
});

// ==========================================================================
// 3. LOGIQUE INITIALISATION & MOTEUR GRAPHIQUE
// ==========================================================================
function initialiserPartie() {
    plateau = Array(14).fill(0); 
    scoreSud = 0; scoreNord = 0; jeuDistribue = false; compteurCoupsSansCapture = 0;
    txtScoreSud.textContent = scoreSud;
    txtScoreNord.textContent = scoreNord;
    majAffichagePseudos();
    indicateurTour.textContent = "Clique sur 'Distribuer les Graines' pour commencer !";
    dessinerTablier();
}

function attendre(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function bloquerTablier(bloque) {
    const tablier = zoneTablier.querySelector('.tablier-bois');
    if (tablier) tablier.classList.toggle('tablier-bloque', bloque);
}

function getCaseElement(index) {
    return document.querySelector(`.case-fosse[data-index="${index}"]`);
}

function getCentreCase(index) {
    const el = getCaseElement(index);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function getCentreGrenier(cote) {
    const el = document.getElementById(cote === 'nord' ? 'grenier-gauche' : 'grenier-droit');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function mettreEnSurbrillance(index, classe) {
    const el = getCaseElement(index);
    if (el) el.classList.add(classe);
}

function retirerSurbrillances() {
    document.querySelectorAll('.case-fosse').forEach((fosse) => {
        fosse.classList.remove('case-depart', 'case-semis', 'case-capture');
    });
}

function creerElementGraine() {
    const graine = document.createElement('div');
    graine.classList.add('graine-pion');
    graine.style.left = `${Math.floor(Math.random() * 25) + 15}px`;
    graine.style.top = `${Math.floor(Math.random() * 25) + 20}px`;
    return graine;
}

function genererGrainesVisuelles(conteneur, nbrGraines, remplacer = true) {
    let zoneGraines = conteneur.querySelector('.zone-graines');
    if (!zoneGraines) {
        zoneGraines = document.createElement('div');
        zoneGraines.classList.add('zone-graines');
        conteneur.appendChild(zoneGraines);
    } else if (remplacer) {
        zoneGraines.innerHTML = '';
    }

    const limite = Math.min(nbrGraines, 24);
    for (let g = 0; g < limite; g++) {
        zoneGraines.appendChild(creerElementGraine());
    }
    if (nbrGraines > limite) {
        const surplus = document.createElement('span');
        surplus.className = 'graines-surplus';
        surplus.textContent = `+${nbrGraines - limite}`;
        zoneGraines.appendChild(surplus);
    }
}

function rafraichirCase(index) {
    const fosse = getCaseElement(index);
    if (!fosse) return;
    const nbr = plateau[index];
    fosse.querySelector('.chiffre-graines').textContent = nbr;
    genererGrainesVisuelles(fosse, nbr);
}

function rafraichirGreniers() {
    const grenierNord = document.getElementById('grenier-gauche');
    const grenierSud = document.getElementById('grenier-droit');
    if (grenierNord) genererGrainesVisuelles(grenierNord, scoreNord);
    if (grenierSud) genererGrainesVisuelles(grenierSud, scoreSud);
    txtScoreSud.textContent = scoreSud;
    txtScoreNord.textContent = scoreNord;
}

function dessinerTablier() {
    zoneTablier.innerHTML = `
        <div class="tablier-bois">
            <div class="grenier" id="grenier-gauche"></div>
            <div class="zone-centrale">
                <div class="rangee nord" id="rangee-nord"></div>
                <div class="separateur-central">AKÔNG</div>
                <div class="rangee sud" id="rangee-sud"></div>
            </div>
            <div class="grenier" id="grenier-droit"></div>
        </div>
    `;

    const rangeeNord = document.getElementById('rangee-nord');
    const rangeeSud = document.getElementById('rangee-sud');

    for (let i = 0; i < 7; i++) creerCaseFosse(rangeeNord, i, plateau[i]);
    for (let i = 13; i >= 7; i--) creerCaseFosse(rangeeSud, i, plateau[i]);

    genererGrainesVisuelles(document.getElementById('grenier-gauche'), scoreNord);
    genererGrainesVisuelles(document.getElementById('grenier-droit'), scoreSud);
}

function creerCaseFosse(parent, index, nbrGraines) {
    const fosse = document.createElement('div');
    fosse.classList.add('case-fosse');
    fosse.dataset.index = index;

    const indicateurChiffre = document.createElement('span');
    indicateurChiffre.classList.add('chiffre-graines');
    indicateurChiffre.textContent = nbrGraines;
    fosse.appendChild(indicateurChiffre);

    genererGrainesVisuelles(fosse, nbrGraines);

    fosse.addEventListener('click', () => {
        if (animationEnCours) return;
        if (!jeuDistribue) {
            alert("Veuillez d'abord distribuer les graines !");
            return;
        }
        gererClicCase(index);
    });

    parent.appendChild(fosse);
}

function calculerCheminSemis(indexDepart, nbrGraines) {
    const chemin = [];
    let indexCourant = indexDepart;
    let restant = nbrGraines;

    while (restant > 0) {
        indexCourant = (indexCourant - 1 + 14) % 14;
        if (indexCourant === indexDepart) continue;
        chemin.push(indexCourant);
        restant--;
    }
    return chemin;
}

async function animerGrainVolant(deIndex, versIndex) {
    const depart = getCentreCase(deIndex);
    const arrivee = getCentreCase(versIndex);
    if (!depart || !arrivee) return;

    const graine = document.createElement('div');
    graine.className = 'graine-volante';
    graine.style.left = `${depart.x}px`;
    graine.style.top = `${depart.y}px`;
    document.body.appendChild(graine);

    graine.getBoundingClientRect();
    graine.style.left = `${arrivee.x}px`;
    graine.style.top = `${arrivee.y}px`;

    await attendre(DUREE_VOL_GRaine);
    graine.remove();
}

async function animerGrainVersGrenier(indexCase, coteGrenier) {
    const depart = getCentreCase(indexCase);
    const arrivee = getCentreGrenier(coteGrenier);
    if (!depart || !arrivee) return;

    const graine = document.createElement('div');
    graine.className = 'graine-volante graine-capture';
    graine.style.left = `${depart.x}px`;
    graine.style.top = `${depart.y}px`;
    document.body.appendChild(graine);

    graine.getBoundingClientRect();
    graine.style.left = `${arrivee.x}px`;
    graine.style.top = `${arrivee.y}px`;

    await attendre(DUREE_VOL_GRaine + 80);
    graine.remove();
}

async function animerSemis(indexDepart, chemin) {
    plateau[indexDepart] = 0;
    rafraichirCase(indexDepart);
    mettreEnSurbrillance(indexDepart, 'case-depart');
    await attendre(120);

    let casePrecedente = indexDepart;
    for (const caseCible of chemin) {
        mettreEnSurbrillance(caseCible, 'case-semis');
        await animerGrainVolant(casePrecedente, caseCible);
        plateau[caseCible]++;
        rafraichirCase(caseCible);
        getCaseElement(caseCible)?.classList.remove('case-semis');
        casePrecedente = caseCible;
        await attendre(PAUSE_ENTRE_GRAINES);
    }

    retirerSurbrillances();
    return chemin.length ? chemin[chemin.length - 1] : indexDepart;
}

function previsualiserCaptures(dernierIndex, joueurCapture) {
    const captures = [];
    let idx = dernierIndex;

    if (joueurCapture === "MOI") {
        while (idx >= 0 && idx <= 6) {
            const nbr = plateau[idx];
            if (nbr === 2 || nbr === 3 || nbr === 4) {
                captures.push({ index: idx, nbr });
                idx--;
            } else break;
        }
    } else {
        while (idx >= 7 && idx <= 13) {
            const nbr = plateau[idx];
            if (nbr === 2 || nbr === 3 || nbr === 4) {
                captures.push({ index: idx, nbr });
                idx++;
            } else break;
        }
    }
    return captures;
}

async function animerCaptures(captures, joueurCapture) {
    if (!captures.length) return;

    const coteGrenier = joueurCapture === "MOI" ? 'sud' : 'nord';
    for (const capture of captures) {
        mettreEnSurbrillance(capture.index, 'case-capture');
        await animerGrainVersGrenier(capture.index, coteGrenier);
        getCaseElement(capture.index)?.classList.remove('case-capture');
        await attendre(60);
    }
    retirerSurbrillances();
}

// ==========================================================================
// 4. LOGIQUE DES COUPS, SEMIS ET SOLIDARITÉ (SENS ANTI-HORAIRE)
// ==========================================================================
function peutJouerCase(index, joueur) {
    if (modeJeu === "EN_LIGNE") {
        if (roleReseau === "HOTE") return index >= 7 && index <= 13;
        return index >= 0 && index <= 6;
    }
    if (joueur === "MOI") return index >= 7 && index <= 13;
    return index >= 0 && index <= 6;
}

function validerSolidarite(index, joueur) {
    let campAffame = (joueur === "MOI") ? "ADVERSAIRE" : "MOI";
    if (modeJeu === "EN_LIGNE") {
        campAffame = (roleReseau === "HOTE") ? "ADVERSAIRE" : "MOI";
    }

    if (!verifierCampVide(campAffame)) return true;

    let grainesADistribuer = plateau[index];
    let coupNourrit = verifierSiCoupNourrit(index, grainesADistribuer);
    let acteur = modeJeu === "EN_LIGNE" ? roleReseau : joueur;
    let peutNourrirAutrement = verifierSiPeutNourrir(acteur);

    if (peutNourrirAutrement && !coupNourrit) {
        alert("Solidarité obligatoire ! Vous devez nourrir votre adversaire.");
        return false;
    }
    return true;
}

function gererClicCase(index) {
    if (animationEnCours || tourJoueur !== "MOI") return;
    if (!peutJouerCase(index, "MOI")) return;
    if (plateau[index] === 0) return;
    if (!validerSolidarite(index, "MOI")) return;
    jouerCoup(index, "MOI");
}

async function jouerCoup(index, joueur = "MOI") {
    if (animationEnCours) return;
    animationEnCours = true;
    bloquerTablier(true);

    const grainesADistribuer = plateau[index];
    const chemin = calculerCheminSemis(index, grainesADistribuer);
    const ancienScoreSud = scoreSud;
    const ancienScoreNord = scoreNord;

    indicateurTour.textContent = "Distribution des graines...";

    const indexFinal = await animerSemis(index, chemin);

    const joueurCapture = modeJeu === "EN_LIGNE"
        ? (roleReseau === "HOTE" ? "MOI" : "ADVERSAIRE")
        : joueur;
    const captures = previsualiserCaptures(indexFinal, joueurCapture);

    if (captures.length) {
        indicateurTour.textContent = "Capture !";
        await animerCaptures(captures, joueurCapture);
    }

    tourJoueur = joueurCapture;
    verifierCaptures(indexFinal);
    for (let i = 0; i < 14; i++) rafraichirCase(i);
    rafraichirGreniers();

    if (scoreSud > ancienScoreSud || scoreNord > ancienScoreNord) {
        compteurCoupsSansCapture = 0;
    } else {
        compteurCoupsSansCapture++;
    }

    animationEnCours = false;
    bloquerTablier(false);

    if (verifierFinDePartie()) {
        if (modeJeu === "EN_LIGNE") sauvegarderCoupDistant();
        return;
    }

    if (joueur === "MOI") {
        tourJoueur = "ADVERSAIRE";
        indicateurTour.textContent = msgTourAdversaire();

        if (modeJeu === "EN_LIGNE") sauvegarderCoupDistant();
        if (modeJeu === "IA") setTimeout(executerCoupIA, getDelaiIA());
    } else {
        tourJoueur = "MOI";
        indicateurTour.textContent = msgTourMoi();
    }
}

function verifierCaptures(dernierIndex) {
    if (tourJoueur === "MOI") {
        while (dernierIndex >= 0 && dernierIndex <= 6) {
            let nbr = plateau[dernierIndex];
            if (nbr === 2 || nbr === 3 || nbr === 4) {
                scoreSud += nbr; plateau[dernierIndex] = 0;
                txtScoreSud.textContent = scoreSud;
                dernierIndex--; 
            } else break;
        }
    } else {
        while (dernierIndex >= 7 && dernierIndex <= 13) {
            let nbr = plateau[dernierIndex];
            if (nbr === 2 || nbr === 3 || nbr === 4) {
                scoreNord += nbr; plateau[dernierIndex] = 0;
                txtScoreNord.textContent = scoreNord;
                dernierIndex++; 
            } else break;
        }
    }
}

// ==========================================================================
// 5. FONCTIONS ALGORITHMIQUES DE VALIDATION
// ==========================================================================
function verifierCampVide(camp) {
    let debut = (camp === "ADVERSAIRE") ? 0 : 7;
    let fin = (camp === "ADVERSAIRE") ? 6 : 13;
    for (let i = debut; i <= fin; i++) {
        if (plateau[i] > 0) return false;
    }
    return true;
}

function verifierSiCoupNourrit(indexDepart, nbrGraines) {
    let indexCourant = indexDepart;
    let joueurActuel = (modeJeu === "EN_LIGNE") ? roleReseau : tourJoueur;
    let rangeeAdverseDebut = (joueurActuel === "MOI" || joueurActuel === "HOTE") ? 0 : 7;
    let rangeeAdverseFin = (joueurActuel === "MOI" || joueurActuel === "HOTE") ? 6 : 13;

    while (nbrGraines > 0) {
        indexCourant = (indexCourant - 1 + 14) % 14;
        if (indexCourant === indexDepart) continue;
        nbrGraines--;
        if (indexCourant >= rangeeAdverseDebut && indexCourant <= rangeeAdverseFin) return true;
    }
    return false;
}

function verifierSiPeutNourrir(joueur) {
    let debut = (joueur === "MOI" || joueur === "HOTE") ? 7 : 0;
    let fin = (joueur === "MOI" || joueur === "HOTE") ? 13 : 6;
    for (let i = debut; i <= fin; i++) {
        if (plateau[i] > 0 && verifierSiCoupNourrit(i, plateau[i])) return true;
    }
    return false;
}

function verifierSiPeutJouer(joueur) {
    let debut = (joueur === "MOI" || joueur === "HOTE") ? 7 : 0;
    let fin = (joueur === "MOI" || joueur === "HOTE") ? 13 : 6;
    for (let i = debut; i <= fin; i++) {
        if (plateau[i] > 0) return true;
    }
    return false;
}

function gererFamineIrreversible() {
    for (let i = 0; i < 14; i++) {
        if (i <= 6) scoreNord += plateau[i];
        else scoreSud += plateau[i];
        plateau[i] = 0;
    }
    txtScoreNord.textContent = scoreNord; txtScoreSud.textContent = scoreSud;
    dessinerTablier();
    verifierFinDePartie(true); 
}

function verifierFinDePartie(forceFin = false) {
    let totalGrainesTablier = plateau.reduce((a, b) => a + b, 0);
    const nomSud = getPseudoCampSud();
    const nomNord = getPseudoCampNord();
    const moiCampSud = modeJeu !== "EN_LIGNE" || roleReseau === "HOTE";

    if (scoreSud >= 40) {
        const fin = moiCampSud
            ? { titre: "🏆 Victoire éclatante !", message: `${nomSud} remporte la partie avec ${scoreSud} graines !` }
            : { titre: "👑 Défaite", message: `${nomSud} gagne avec ${scoreSud} graines.` };
        afficherEcranFin(fin.titre, fin.message);
        return true;
    }
    if (scoreNord >= 40) {
        const fin = !moiCampSud
            ? { titre: "🏆 Victoire éclatante !", message: `${nomNord} remporte la partie avec ${scoreNord} graines !` }
            : { titre: "👑 Défaite", message: `${nomNord} gagne avec ${scoreNord} graines.` };
        afficherEcranFin(fin.titre, fin.message);
        return true;
    }
    if (scoreSud > 35 && (scoreNord + totalGrainesTablier) < scoreSud) {
        afficherEcranFin(
            moiCampSud ? "🏆 Victoire tactique !" : "👑 Défaite tactique",
            `${nomSud} possède une avance invincible.`
        );
        return true;
    }
    if (scoreNord > 35 && (scoreSud + totalGrainesTablier) < scoreNord) {
        afficherEcranFin(
            !moiCampSud ? "🏆 Victoire tactique !" : "👑 Défaite tactique",
            `${nomNord} possède une avance invincible.`
        );
        return true;
    }

    if (compteurCoupsSansCapture >= 20) {
        forceFin = true;
        for (let i = 0; i < 14; i++) {
            if (i <= 6) scoreNord += plateau[i];
            else scoreSud += plateau[i];
            plateau[i] = 0;
        }
    }

    if (totalGrainesTablier === 0 || forceFin) {
        const fin = messageFinPourScores();
        afficherEcranFin(fin.titre, fin.message);
        return true;
    }
    return false;
}

function afficherEcranFin(titre, message) {
    if (intervalleSynchro) clearInterval(intervalleSynchro);
    arreterAttenteInvite();
    ecranJeu.classList.remove('active');
    ecranFin.classList.add('active');
    titreVictoire.textContent = titre;
    messageVictoire.textContent = message;
    btnPartieEnCours.disabled = true; 
}

// ==========================================================================
// 6. ZONE INTELLIGENCE ARTIFICIELLE (5 NIVEAUX)
// ==========================================================================
function getEtatJeu() {
    return {
        plateau: [...plateau],
        scoreSud,
        scoreNord,
    };
}

function simulerSemis(plateauSim, indexDepart, nbrGraines) {
    const plateauCopie = [...plateauSim];
    plateauCopie[indexDepart] = 0;
    let indexCourant = indexDepart;
    let restant = nbrGraines;

    while (restant > 0) {
        indexCourant = (indexCourant - 1 + 14) % 14;
        if (indexCourant === indexDepart) continue;
        plateauCopie[indexCourant]++;
        restant--;
    }
    return { plateau: plateauCopie, indexFinal: indexCourant };
}

function simulerCaptures(plateauSim, scoreSudSim, scoreNordSim, dernierIndex, joueur) {
    const plateauCopie = [...plateauSim];
    let sSud = scoreSudSim;
    let sNord = scoreNordSim;
    let idx = dernierIndex;

    if (joueur === "MOI") {
        while (idx >= 0 && idx <= 6) {
            const nbr = plateauCopie[idx];
            if (nbr === 2 || nbr === 3 || nbr === 4) {
                sSud += nbr;
                plateauCopie[idx] = 0;
                idx--;
            } else break;
        }
    } else {
        while (idx >= 7 && idx <= 13) {
            const nbr = plateauCopie[idx];
            if (nbr === 2 || nbr === 3 || nbr === 4) {
                sNord += nbr;
                plateauCopie[idx] = 0;
                idx++;
            } else break;
        }
    }
    return { plateau: plateauCopie, scoreSud: sSud, scoreNord: sNord };
}

function simulerCoupComplet(etat, index, joueur) {
    const graines = etat.plateau[index];
    if (!graines) return null;

    const apresSemis = simulerSemis(etat.plateau, index, graines);
    return simulerCaptures(
        apresSemis.plateau,
        etat.scoreSud,
        etat.scoreNord,
        apresSemis.indexFinal,
        joueur
    );
}

function getCoupsValidesNord(etat) {
    const coups = [];
    for (let i = 0; i < 7; i++) {
        if (etat.plateau[i] > 0) coups.push(i);
    }
    return coups;
}

function getCoupsValidesSud(etat) {
    const coups = [];
    for (let i = 7; i < 14; i++) {
        if (etat.plateau[i] > 0) coups.push(i);
    }
    return coups;
}

function evaluerPosition(etat) {
    const grainesNord = etat.plateau.slice(0, 7).reduce((a, b) => a + b, 0);
    const grainesSud = etat.plateau.slice(7, 14).reduce((a, b) => a + b, 0);
    let potentielCapture = 0;

    for (let i = 0; i < 7; i++) {
        const nbr = etat.plateau[i];
        if (nbr >= 2 && nbr <= 4) potentielCapture += 3 - Math.abs(nbr - 3);
    }

    return (etat.scoreNord - etat.scoreSud) * 12
        + grainesNord * 0.6
        - grainesSud * 0.45
        + potentielCapture * 1.5;
}

function evaluerCoupIA(etat, index) {
    const apres = simulerCoupComplet(etat, index, "ADVERSAIRE");
    if (!apres) return -Infinity;
    const gainCapture = apres.scoreNord - etat.scoreNord;
    return gainCapture * 25 + evaluerPosition(apres);
}

function coupOffreCaptureAuSud(etat, indexIA) {
    const apresIA = simulerCoupComplet(etat, indexIA, "ADVERSAIRE");
    if (!apresIA) return true;

    for (const coupSud of getCoupsValidesSud(apresIA)) {
        const apresSud = simulerCoupComplet(apresIA, coupSud, "MOI");
        if (apresSud && apresSud.scoreSud > apresIA.scoreSud) return true;
    }
    return false;
}

function choisirCoupAleatoire(coups) {
    return coups[Math.floor(Math.random() * coups.length)];
}

function choisirMeilleurCoup(coups, etat, evaluateur) {
    let meilleurCoup = coups[0];
    let meilleurScore = -Infinity;

    for (const coup of coups) {
        const score = evaluateur(etat, coup);
        if (score > meilleurScore) {
            meilleurScore = score;
            meilleurCoup = coup;
        }
    }
    return meilleurCoup;
}

function minimax(etat, profondeur, maximiserIA) {
    if (profondeur === 0 || etat.scoreNord >= 40 || etat.scoreSud >= 40) {
        return evaluerPosition(etat);
    }

    const coups = maximiserIA ? getCoupsValidesNord(etat) : getCoupsValidesSud(etat);
    if (!coups.length) return evaluerPosition(etat);

    if (maximiserIA) {
        let maxEval = -Infinity;
        for (const coup of coups) {
            const suivant = simulerCoupComplet(etat, coup, "ADVERSAIRE");
            if (!suivant) continue;
            maxEval = Math.max(maxEval, minimax(suivant, profondeur - 1, false));
        }
        return maxEval;
    }

    let minEval = Infinity;
    for (const coup of coups) {
        const suivant = simulerCoupComplet(etat, coup, "MOI");
        if (!suivant) continue;
        minEval = Math.min(minEval, minimax(suivant, profondeur - 1, true));
    }
    return minEval;
}

function choisirCoupMinimax(etat, profondeur) {
    const coups = getCoupsValidesNord(etat);
    if (!coups.length) return null;

    let meilleurCoup = coups[0];
    let meilleurScore = -Infinity;

    for (const coup of coups) {
        const suivant = simulerCoupComplet(etat, coup, "ADVERSAIRE");
        if (!suivant) continue;
        const score = minimax(suivant, profondeur - 1, false);
        if (score > meilleurScore) {
            meilleurScore = score;
            meilleurCoup = coup;
        }
    }
    return meilleurCoup;
}

function choisirCoupIA() {
    const etat = getEtatJeu();
    const coups = getCoupsValidesNord(etat);
    if (!coups.length) return null;

    const params = getParametresIA(niveauIA);

    if (Math.random() < params.tauxErreur) {
        return choisirCoupAleatoire(coups);
    }

    let candidats = coups;
    if (params.prudence > 0) {
        const coupsPrudents = coups.filter((coup) => !coupOffreCaptureAuSud(etat, coup));
        if (coupsPrudents.length && Math.random() < params.prudence) {
            candidats = coupsPrudents;
        }
    }

    if (Math.random() < params.prioriteCapture) {
        const coupsCapture = candidats.filter((coup) => {
            const apres = simulerCoupComplet(etat, coup, "ADVERSAIRE");
            return apres && apres.scoreNord > etat.scoreNord;
        });
        if (coupsCapture.length) candidats = coupsCapture;
    }

    if (params.profondeurMinimax > 0) {
        const coupMinimax = choisirCoupMinimax(etat, params.profondeurMinimax);
        if (coupMinimax !== null) return coupMinimax;
    }

    if (params.intelligence < 0.35) {
        return choisirCoupAleatoire(candidats);
    }

    return choisirMeilleurCoup(candidats, etat, evaluerCoupIA);
}

async function executerCoupIA() {
    if (modeJeu !== "IA" || tourJoueur !== "ADVERSAIRE" || animationEnCours) return;

    const indexChoisi = choisirCoupIA();
    if (indexChoisi === null) return;

    await jouerCoup(indexChoisi, "ADVERSAIRE");
}

// ==========================================================================
// 7. GESTION DU TOGGLE SIDEBAR
// ==========================================================================
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const maBarreLaterale = document.getElementById('ma-barre-laterale');

if(btnToggleSidebar && maBarreLaterale) {
    btnToggleSidebar.addEventListener('click', () => {
        maBarreLaterale.classList.toggle('cachee');
        btnToggleSidebar.textContent = maBarreLaterale.classList.contains('cachee') ? "☰ Afficher le Menu" : "☰ Cacher le Menu";
    });
}
