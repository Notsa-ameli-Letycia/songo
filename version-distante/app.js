// ==========================================================================
// MOTEUR DE JEU SONGO DISTANT - ARCHITECTURE APP.JS (V2 COMPLÈTE RÉSEAU)
// ==========================================================================

// 1. Éléments du DOM (Variables Globales)
const ecranAccueil = document.getElementById('ecran-accueil');
const ecranJeu = document.getElementById('ecran-jeu');
const ecranFin = document.getElementById('ecran-fin');

const menuChoixMode = document.getElementById('menu-choix-mode');
const sousMenuEnLigne = document.getElementById('sous-menu-enligne');
const zoneAffichageCode = document.getElementById('zone-affichage-code');
const codeGenereText = document.getElementById('code-genere');

const btnModeIA = document.getElementById('btn-mode-ia');
const btnModeLigne = document.getElementById('btn-mode-ligne');
const btnRetourAccueil = document.getElementById('btn-retour-accueil');
const btnCreerPartie = document.getElementById('btn-creer-partie');
const btnRejoindrePartie = document.getElementById('btn-rejoindre-partie');
const inputCodeSalon = document.getElementById('input-code-salon');

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

let modeJeu = "";          // "IA" ou "EN_LIGNE"
let roleReseau = "";       // "HOTE" ou "INVITE"
let codePartieActuel = ""; // Code unique de session
let intervalleSynchro = null; // Boucle de rafraîchissement réseau

// ==========================================================================
// FONCTIONS RÉSEAU (AJAX / FETCH)
// ==========================================================================

// Boucle réseau de synchronisation (Vérifie toutes les 2 secondes si l'adversaire a joué)
function lancerSynchronisation() {
    if (intervalleSynchro) clearInterval(intervalleSynchro);
    
    intervalleSynchro = setInterval(() => {
        if (modeJeu !== "EN_LIGNE" || !codePartieActuel) return;
        
        // Si c'est déjà à mon tour de jouer localement, inutile d'interroger le serveur
        if (tourJoueur === "MOI") return;

        fetch(`jouer.php?action=lire&code=${codePartieActuel}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === "success") {
                    let etatDistant = JSON.parse(data.etat_jeu);
                    
                    // Vérification : est-ce que le tour enregistré sur MySQL correspond à mon rôle ?
                    let prochainTourLocal = (etatDistant.tour === roleReseau) ? "MOI" : "ADVERSAIRE";
                    
                    if (prochainTourLocal === "MOI") {
                        plateau = etatDistant.plateau;
                        scoreSud = etatDistant.scoreSud;
                        scoreNord = etatDistant.scoreNord;
                        tourJoueur = "MOI";
                        
                        txtScoreSud.textContent = scoreSud;
                        txtScoreNord.textContent = scoreNord;
                        indicateurTour.textContent = "L'adversaire a joué ! C'est à TOI de jouer !";
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

    fetch(`jouer.php?action=jouer&code=${codePartieActuel}&etat=${encodeURIComponent(JSON.stringify(etatAEnvoyer))}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                console.log("Coup enregistré sur MySQL !");
            }
        }).catch(err => console.error("Erreur de transmission réseau."));
}

// ==========================================================================
// AIGUILLAGE & LIENS DES MENUS
// ==========================================================================

// Bouton Mode IA
btnModeIA.addEventListener('click', () => {
    modeJeu = "IA";
    if (intervalleSynchro) clearInterval(intervalleSynchro);
    ecranAccueil.classList.remove('active');
    ecranJeu.classList.add('active');
    btnPartieEnCours.disabled = false;
    initialiserPartie();
});

// Bouton Mode En Ligne -> Affiche le sous-menu
btnModeLigne.addEventListener('click', () => {
    menuChoixMode.style.display = 'none';
    sousMenuEnLigne.style.display = 'block';
});

// Bouton Retour sous-menu
btnRetourAccueil.addEventListener('click', () => {
    sousMenuEnLigne.style.display = 'none';
    zoneAffichageCode.style.display = 'none';
    menuChoixMode.style.display = 'flex';
});

// Action : Créer une partie en ligne (Hôte)
btnCreerPartie.addEventListener('click', () => {
    modeJeu = "EN_LIGNE";
    roleReseau = "HOTE";
    
    // Génération du code de salon unique
    codePartieActuel = Math.random().toString(36).substring(2, 7).toUpperCase();
    codeGenereText.textContent = codePartieActuel;
    zoneAffichageCode.style.display = 'block';
    
    let etatInitial = {
        plateau: Array(14).fill(5), // 5 graines par case au Songo
        scoreSud: 0,
        scoreNord: 0,
        tour: "HOTE", // L'hôte commence toujours (Sud)
        distribue: true
    };

    // Envoi AJAX pour initialiser la ligne dans la table MySQL
    fetch(`jouer.php?action=creer&code=${codePartieActuel}&etat=${encodeURIComponent(JSON.stringify(etatInitial))}`)
        .then(response => response.json())
        .then(data => {
            if(data.status === "success") {
                console.log(`Salon créé. Code: ${codePartieActuel}`);
                ecranAccueil.classList.remove('active');
                ecranJeu.classList.add('active');
                btnPartieEnCours.disabled = false;
                
                plateau = etatInitial.plateau;
                scoreSud = etatInitial.scoreSud;
                scoreNord = etatInitial.scoreNord;
                tourJoueur = "MOI"; 
                jeuDistribue = true;
                
                txtScoreSud.textContent = scoreSud;
                txtScoreNord.textContent = scoreNord;
                indicateurTour.textContent = "Salon créé ! Partage le code " + codePartieActuel + ". C'est à TOI de jouer !";
                dessinerTablier();
                
                // Lancement du guetteur réseau
                lancerSynchronisation();
            } else {
                alert("Erreur serveur lors de la réservation du salon.");
            }
        }).catch(err => alert("Erreur réseau de connexion au serveur."));
});

// Action : Rejoindre une partie en ligne (Invité)
btnRejoindrePartie.addEventListener('click', () => {
    let codeTape = inputCodeSalon.value.trim().toUpperCase();
    if (codeTape.length < 5) {
        alert("Veuillez entrer un code de salon valide à 5 caractères.");
        return;
    }
    
    modeJeu = "EN_LIGNE";
    roleReseau = "INVITE";
    codePartieActuel = codeTape;
    
    // Connexion Ajax pour récupérer l'état actuel de la partie
    fetch(`jouer.php?action=rejoindre&code=${codePartieActuel}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                let etatDistant = JSON.parse(data.etat_jeu);
                plateau = etatDistant.plateau;
                scoreSud = etatDistant.scoreSud;
                scoreNord = etatDistant.scoreNord;
                
                tourJoueur = (etatDistant.tour === "INVITE") ? "MOI" : "ADVERSAIRE";
                jeuDistribue = etatDistant.distribue;
                
                ecranAccueil.classList.remove('active');
                ecranJeu.classList.add('active');
                btnPartieEnCours.disabled = false;
                
                txtScoreSud.textContent = scoreSud;
                txtScoreNord.textContent = scoreNord;
                indicateurTour.textContent = tourJoueur === "MOI" ? "C'est à TOI de jouer !" : "Attente du coup de l'adversaire...";
                dessinerTablier();
                
                // Lancement du guetteur réseau
                lancerSynchronisation();
            } else {
                alert("Code de salon introuvable.");
            }
        }).catch(err => alert("Erreur lors de la liaison au salon distant."));
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
        afficherEcranFin("🏳️ Forfait !", "Tu as capitulé ! Victoire de l'Adversaire.");
    } else {
        afficherEcranFin("🏆 Victoire par Forfait !", "L'Adversaire a capitulé ! Tu gagnes.");
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
    sousMenuEnLigne.style.display = 'none';
    zoneAffichageCode.style.display = 'none';
    menuChoixMode.style.display = 'flex';
    ecranAccueil.classList.add('active');
});

// Règles
btnRegles.addEventListener('click', () => {
    texteRegles.style.display = (texteRegles.style.display === 'none' || texteRegles.style.display === '') ? 'block' : 'none';
    btnRegles.textContent = texteRegles.style.display === 'block' ? '💡 Masquer les Règles' : '💡 Règles du Jeu';
});

// Bouton Distribuer les Graines (Mode local et IA)
btnInitialiser.addEventListener('click', () => {
    plateau = Array(14).fill(5); 
    scoreSud = 0; scoreNord = 0; compteurCoupsSansCapture = 0;
    txtScoreSud.textContent = scoreSud;
    txtScoreNord.textContent = scoreNord;
    tourJoueur = "MOI"; 
    jeuDistribue = true;
    indicateurTour.textContent = "C'est à TOI de commencer !";
    dessinerTablier();
});

// ==========================================================================
// 3. LOGIQUE INITIALISATION & MOTEUR GRAPHIQUE
// ==========================================================================
function initialiserPartie() {
    plateau = Array(14).fill(0); 
    scoreSud = 0; scoreNord = 0; jeuDistribue = false; compteurCoupsSansCapture = 0;
    txtScoreSud.textContent = scoreSud;
    txtScoreNord.textContent = scoreNord;
    indicateurTour.textContent = "Clique sur 'Distribuer les Graines' pour commencer !";
    dessinerTablier();
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
        if (!jeuDistribue) {
            alert("Veuillez d'abord distribuer les graines !");
            return;
        }
        gererClicCase(index);
    });

    parent.appendChild(fosse);
}

function genererGrainesVisuelles(conteneur, nbrGraines) {
    const zoneGraines = document.createElement('div');
    zoneGraines.style.position = 'relative';
    zoneGraines.style.width = '100%'; zoneGraines.style.height = '100%';
    conteneur.appendChild(zoneGraines);

    for (let g = 0; g < nbrGraines; g++) {
        const graine = document.createElement('div');
        graine.classList.add('graine-pion');
        const randomX = Math.floor(Math.random() * 25) + 15;
        const randomY = Math.floor(Math.random() * 25) + 20;
        graine.style.position = 'absolute';
        graine.style.left = `${randomX}px`; graine.style.top = `${randomY}px`;
        zoneGraines.appendChild(graine);
    }
}

// ==========================================================================
// 4. LOGIQUE DES COUPS, SEMIS ET SOLIDARITÉ (SENS ANTI-HORAIRE)
// ==========================================================================
function gererClicCase(index) {
    // Sécurité réseau : interdiction de cliquer si ce n'est pas mon tour
    if (tourJoueur !== "MOI") return;

    // Délimitation stricte des camps (Hôte au Sud 7-13, Invité au Nord 0-6)
    if (modeJeu === "EN_LIGNE") {
        if (roleReseau === "HOTE" && (index < 7 || index > 13)) return; 
        if (roleReseau === "INVITE" && (index < 0 || index > 6)) return;
    } else {
        if (tourJoueur === "MOI" && (index < 7 || index > 13)) return; 
        if (tourJoueur === "ADVERSAIRE" && (index < 0 || index > 6)) return; 
    }
    
    let grainesADistribuer = plateau[index];
    if (grainesADistribuer === 0) return; 

    let adversaireAffame = verifierCampVide(roleReseau === "HOTE" || modeJeu !== "EN_LIGNE" ? "ADVERSAIRE" : "MOI");
    if (adversaireAffame) {
        let coupNourrit = verifierSiCoupNourrit(index, grainesADistribuer);
        let peutNourrirAutrement = verifierSiPeutNourrir(modeJeu === "EN_LIGNE" ? roleReseau : tourJoueur);
        
        if (peutNourrirAutrement && !coupNourrit) {
            alert("Solidarité obligatoire ! Vous devez nourrir votre adversaire.");
            return;
        }
    }

    plateau[index] = 0;
    let indexCourant = index;

    // Semis dans le sens anti-horaire
    while (grainesADistribuer > 0) {
        indexCourant = (indexCourant - 1 + 14) % 14;
        if (indexCourant === index) continue; 
        plateau[indexCourant]++;
        grainesADistribuer--;
    }

    let ancienScoreSud = scoreSud;
    let ancienScoreNord = scoreNord;

    // Capture conditionnelle selon le rôle
    if (modeJeu === "EN_LIGNE") {
        tourJoueur = (roleReseau === "HOTE") ? "MOI" : "ADVERSAIRE";
        verifierCaptures(indexCourant);
    } else {
        verifierCaptures(indexCourant);
    }
    
    dessinerTablier();

    if (scoreSud > ancienScoreSud || scoreNord > ancienScoreNord) {
        compteurCoupsSansCapture = 0; 
    } else {
        compteurCoupsSansCapture++; 
    }

    if (verifierFinDePartie()) {
        if (modeJeu === "EN_LIGNE") sauvegarderCoupDistant();
        return;
    }

    // Bascule du tour en attente
    tourJoueur = "ADVERSAIRE";
    indicateurTour.textContent = "C'est au tour de l'ADVERSAIRE ! Transmission...";

    // Sauvegarde en ligne immédiate
    if (modeJeu === "EN_LIGNE") {
        sauvegarderCoupDistant();
    }

    // Exécution automatique de l'IA si activé
    if (modeJeu === "IA") {
        setTimeout(executerCoupIA, 800); 
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

    if (scoreSud >= 40) {
        afficherEcranFin("🏆 Victoire Éclatante !", `Le Joueur Sud gagne avec ${scoreSud} graines !`); return true;
    }
    if (scoreNord >= 40) {
        afficherEcranFin("👑 Défaite !", `Le Joueur Nord remporte la partie avec ${scoreNord} graines.`); return true;
    }
    if (scoreSud > 35 && (scoreNord + totalGrainesTablier) < scoreSud) {
        afficherEcranFin("🏆 Victoire Tactique !", `Avance invincible pour le Sud !`); return true;
    }
    if (scoreNord > 35 && (scoreSud + totalGrainesTablier) < scoreNord) {
        afficherEcranFin("👑 Défaite Tactique !", `Le Nord possède une avance invincible.`); return true;
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
        if (scoreSud > scoreNord) {
            afficherEcranFin("🏆 Victoire aux Points !", `Sud gagne aux points : ${scoreSud} à ${scoreNord} !`);
        } else if (scoreNord > scoreSud) {
            afficherEcranFin("👑 Défaite aux Points !", `Nord l'emporte : ${scoreNord} à ${scoreSud}.`);
        } else {
            afficherEcranFin("🤝 Match Nul !", `Égalité parfaite.`);
        }
        return true;
    }
    return false;
}

function afficherEcranFin(titre, message) {
    if (intervalleSynchro) clearInterval(intervalleSynchro);
    ecranJeu.classList.remove('active');
    ecranFin.classList.add('active');
    titreVictoire.textContent = titre;
    messageVictoire.textContent = message;
    btnPartieEnCours.disabled = true; 
}

// ==========================================================================
// 6. ZONE INTELLIGENCE ARTIFICIELLE
// ==========================================================================
function executerCoupIA() {
    let casesValides = [];
    for (let i = 0; i < 7; i++) {
        if (plateau[i] > 0) casesValides.push(i);
    }
    if (casesValides.length === 0) return;
    let indexChoisi = casesValides[Math.floor(Math.random() * casesValides.length)];
    
    tourJoueur = "MOI"; 
    gererClicCase(indexChoisi);
}

// ==========================================================================
// 7. GESTION DU TOGGLE SIDEBAR & STYLE DES GRAINES
// ==========================================================================
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const maBarreLaterale = document.getElementById('ma-barre-laterale');

if(btnToggleSidebar && maBarreLaterale) {
    btnToggleSidebar.addEventListener('click', () => {
        maBarreLaterale.classList.toggle('cachee');
        btnToggleSidebar.textContent = maBarreLaterale.classList.contains('cachee') ? "☰ Afficher le Menu" : "☰ Cacher le Menu";
    });
}

const styleGraine = document.createElement('style');
styleGraine.innerHTML = `.graine-pion { width: 15px; height: 15px; background: radial-gradient(circle at 4px 4px, #5a3825, #221208); border-radius: 50%; box-shadow: 2px 2px 3px rgba(0,0,0,0.6), inset -1px -1px 2px rgba(0,0,0,0.8); }`;
document.head.appendChild(styleGraine);