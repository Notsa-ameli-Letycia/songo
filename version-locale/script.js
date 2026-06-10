// ==========================================================================
// MOTEUR DE JEU SONGO - LOCAL SIDEBAR EXPERT
// ==========================================================================

const ecranAccueil = document.getElementById('ecran-accueil');
const ecranJeu = document.getElementById('ecran-jeu');
const ecranFin = document.getElementById('ecran-fin');

const btnNouvellePartie = document.getElementById('btn-nouvelle-partie');
const btnPartieEnCours = document.getElementById('btn-partie-en-cours');
const btnRecommencer = document.getElementById('btn-recommencer'); // DEVIENT LE BOUTON CAPITULER
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

let plateau = Array(14).fill(0); 
let scoreSud = 0;
let scoreNord = 0;
let tourJoueur = "MOI"; // Remplacement de "SUD" par "MOI"
let jeuDistribue = false; 
let compteurCoupsSansCapture = 0;

// Navigation
btnNouvellePartie.addEventListener('click', () => {
    ecranAccueil.classList.remove('active');
    ecranJeu.classList.add('active');
    btnPartieEnCours.disabled = false;
    initialiserPartie();
});

// ACTION DU BOUTON CAPITULER
btnRecommencer.addEventListener('click', () => {
    if (!jeuDistribue) {
        initialiserPartie();
        return;
    }
    
    // Si "Moi" capitule pendant son tour ou le tour adverse, l'Adversaire gagne par forfait !
    if (tourJoueur === "MOI") {
        afficherEcranFin("🏳️ Forfait !", "Tu as capitulé ! Victoire de l'Adversaire.");
    } else {
        afficherEcranFin("🏆 Victoire par Forfait !", "L'Adversaire a capitulé ! Tu gagnes la partie.");
    }
});

btnRejouerOui.addEventListener('click', () => {
    ecranFin.classList.remove('active');
    ecranJeu.classList.add('active');
    initialiserPartie();
    btnInitialiser.click(); 
});

btnRejouerNon.addEventListener('click', () => {
    ecranFin.classList.remove('active');
    ecranAccueil.classList.add('active');
});

btnRegles.addEventListener('click', () => {
    texteRegles.style.display = (texteRegles.style.display === 'none' || texteRegles.style.display === '') ? 'block' : 'none';
    btnRegles.textContent = texteRegles.style.display === 'block' ? '💡 Masquer les Règles' : '💡 Règles du Jeu';
});

btnInitialiser.addEventListener('click', () => {
    plateau = Array(14).fill(5); 
    scoreSud = 0;
    scoreNord = 0;
    compteurCoupsSansCapture = 0;
    txtScoreSud.textContent = scoreSud;
    txtScoreNord.textContent = scoreNord;
    tourJoueur = "MOI"; 
    jeuDistribue = true;
    indicateurTour.textContent = "C'est à TOI de commencer !";
    dessinerTablier();
});

function initialiserPartie() {
    plateau = Array(14).fill(0); 
    scoreSud = 0;
    scoreNord = 0;
    jeuDistribue = false;
    compteurCoupsSansCapture = 0;
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

    for (let i = 0; i < 7; i++) {
        creerCaseFosse(rangeeNord, i, plateau[i]);
    }
    for (let i = 13; i >= 7; i--) {
        creerCaseFosse(rangeeSud, i, plateau[i]);
    }

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
            alert("Veuillez d'abord cliquer sur le bouton 'Distribuer les Graines' !");
            return;
        }
        gererClicCase(index);
    });

    parent.appendChild(fosse);
}

function genererGrainesVisuelles(conteneur, nbrGraines) {
    const zoneGraines = document.createElement('div');
    zoneGraines.style.position = 'relative';
    zoneGraines.style.width = '100%';
    zoneGraines.style.height = '100%';
    conteneur.appendChild(zoneGraines);

    for (let g = 0; g < nbrGraines; g++) {
        const graine = document.createElement('div');
        graine.classList.add('graine-pion');
        
        const randomX = Math.floor(Math.random() * 25) + 15;
        const randomY = Math.floor(Math.random() * 25) + 20;
        
        graine.style.position = 'absolute';
        graine.style.left = `${randomX}px`;
        graine.style.top = `${randomY}px`;
        
        zoneGraines.appendChild(graine);
    }
}

function gererClicCase(index) {
    if (tourJoueur === "MOI" && (index < 7 || index > 13)) return; 
    if (tourJoueur === "ADVERSAIRE" && (index < 0 || index > 6)) return; 
    
    let grainesADistribuer = plateau[index];
    if (grainesADistribuer === 0) return; 

    // SOLIDARITÉ
    let adversaireAffame = verifierCampVide(tourJoueur === "MOI" ? "ADVERSAIRE" : "MOI");
    if (adversaireAffame) {
        let coupNourrit = verifierSiCoupNourrit(index, grainesADistribuer);
        let peutNourrirAutrement = verifierSiPeutNourrir(tourJoueur);
        
        if (peutNourrirAutrement && !coupNourrit) {
            alert("Solidarité obligatoire ! Vous devez nourrir l'autre joueur.");
            return;
        }
    }

    plateau[index] = 0;
    let indexCourant = index;

    while (grainesADistribuer > 0) {
        indexCourant = (indexCourant + 1) % 14;
        if (indexCourant === index) continue; 

        plateau[indexCourant]++;
        grainesADistribuer--;
    }

    let ancienScoreSud = scoreSud;
    let ancienScoreNord = scoreNord;

    verifierCaptures(indexCourant);
    dessinerTablier();

    if (scoreSud > ancienScoreSud || scoreNord > ancienScoreNord) {
        compteurCoupsSansCapture = 0; 
    } else {
        compteurCoupsSansCapture++; 
    }

    if (verifierFinDePartie()) return;

    // Changement de tour (Moi <-> Adversaire)
    tourJoueur = (tourJoueur === "MOI") ? "ADVERSAIRE" : "MOI";
    indicateurTour.textContent = tourJoueur === "MOI" ? "C'est à TOI de jouer !" : "C'est au tour de l'ADVERSAIRE !";

    if (!verifierSiPeutJouer(tourJoueur)) {
        gererFamineIrreversible();
    }
}

function verifierCaptures(dernierIndex) {
    if (tourJoueur === "MOI") {
        while (dernierIndex >= 0 && dernierIndex <= 6) {
            let nbr = plateau[dernierIndex];
            if (nbr === 2 || nbr === 3 || nbr === 4) {
                scoreSud += nbr;
                plateau[dernierIndex] = 0;
                txtScoreSud.textContent = scoreSud;
                dernierIndex--; 
            } else {
                break;
            }
        }
    } else {
        while (dernierIndex >= 7 && dernierIndex <= 13) {
            let nbr = plateau[dernierIndex];
            if (nbr === 2 || nbr === 3 || nbr === 4) {
                scoreNord += nbr;
                plateau[dernierIndex] = 0;
                txtScoreNord.textContent = scoreNord;
                dernierIndex++; 
            } else {
                break;
            }
        }
    }
}

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
    let rangeeAdverseDebut = (tourJoueur === "MOI") ? 0 : 7;
    let rangeeAdverseFin = (tourJoueur === "MOI") ? 6 : 13;

    while (nbrGraines > 0) {
        indexCourant = (indexCourant + 1) % 14;
        if (indexCourant === indexDepart) continue;
        nbrGraines--;
        if (indexCourant >= rangeeAdverseDebut && indexCourant <= rangeeAdverseFin) {
            return true; 
        }
    }
    return false;
}

function verifierSiPeutNourrir(joueur) {
    let debut = (joueur === "MOI") ? 7 : 0;
    let fin = (joueur === "MOI") ? 13 : 6;
    for (let i = debut; i <= fin; i++) {
        if (plateau[i] > 0 && verifierSiCoupNourrit(i, plateau[i])) {
            return true;
        }
    }
    return false;
}

function verifierSiPeutJouer(joueur) {
    let debut = (joueur === "MOI") ? 7 : 0;
    let fin = (joueur === "MOI") ? 13 : 6;
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
    txtScoreNord.textContent = scoreNord;
    txtScoreSud.textContent = scoreSud;
    dessinerTablier();
    verifierFinDePartie(true); 
}

function verifierFinDePartie(forceFin = false) {
    let totalGrainesTablier = plateau.reduce((a, b) => a + b, 0);

    if (scoreSud >= 40) {
        afficherEcranFin("🏆 Victoire Éclatante !", `Félicitations ! Tu remportes la partie avec ${scoreSud} graines !`);
        return true;
    }
    if (scoreNord >= 40) {
        afficherEcranFin("👑 Défaite !", `L'Adversaire remporte la partie avec ${scoreNord} graines !`);
        return true;
    }

    if (scoreSud > 35 && (scoreNord + totalGrainesTablier) < scoreSud) {
        afficherEcranFin("🏆 Victoire Tactique !", `Tu as une avance mathématique invincible (${scoreSud} contre ${scoreNord}) !`);
        return true;
    }
    if (scoreNord > 35 && (scoreSud + totalGrainesTablier) < scoreNord) {
        afficherEcranFin("👑 Défaite Tactique !", `L'Adversaire possède une avance invincible (${scoreNord} contre ${scoreSud}) !`);
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
        if (scoreSud > scoreNord) {
            afficherEcranFin("🏆 Victoire aux Points !", `Fin de partie. Tu gagnes avec ${scoreSud} contre ${scoreNord} !`);
            return true;
        } else if (scoreNord > scoreSud) {
            afficherEcranFin("👑 Défaite aux Points !", `Fin de partie. L'Adversaire gagne avec ${scoreNord} contre ${scoreSud} !`);
            return true;
        } else {
            afficherEcranFin("🤝 Match Nul !", `Égalité ! Les deux camps terminent avec ${scoreSud} graines.`);
            return true;
        }
    }
    return false;
}

function afficherEcranFin(titre, message) {
    ecranJeu.classList.remove('active');
    ecranFin.classList.add('active');
    titreVictoire.textContent = titre;
    messageVictoire.textContent = message;
    btnPartieEnCours.disabled = true; 
}

const styleGraine = document.createElement('style');
styleGraine.innerHTML = `
    .graine-pion {
        width: 15px;
        height: 15px;
        background: radial-gradient(circle at 4px 4px, #5a3825, #221208);
        border-radius: 50%;
        box-shadow: 2px 2px 3px rgba(0,0,0,0.6), inset -1px -1px 2px rgba(0,0,0,0.8);
    }
`;
document.head.appendChild(styleGraine);
// ==========================================================================
// 7. GESTION DU MASQUAGE DE LA BARRE LATÉRALE
// ==========================================================================
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const maBarreLaterale = document.getElementById('ma-barre-laterale');

btnToggleSidebar.addEventListener('click', () => {
    // On alterne la classe "cachee" sur la barre latérale
    maBarreLaterale.classList.toggle('cachee');
    
    // On change le texte du bouton pour que ce soit plus clair
    if (maBarreLaterale.classList.contains('cachee')) {
        btnToggleSidebar.textContent = "☰ Afficher le Menu";
    } else {
        btnToggleSidebar.textContent = "☰ Cacher le Menu";
    }
});