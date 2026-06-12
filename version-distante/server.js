const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DOSSIER_SALONS = path.join(__dirname, 'parties');
const MAX_JOUEURS = 2;
const CARACTERES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

app.use(express.json({ limit: '16kb' }));
app.use(express.static(__dirname));

function repondreErreur(res, status, message) {
    return res.status(status).json({ status: 'error', message });
}

function genererIdentifiant(longueur) {
    let resultat = '';
    const octets = crypto.randomBytes(longueur);
    for (let i = 0; i < longueur; i++) {
        resultat += CARACTERES[octets[i] % CARACTERES.length];
    }
    return resultat;
}

function genererCodeSalonUnique() {
    assurerDossierSalons();
    let code;
    do {
        code = genererIdentifiant(5);
    } while (fs.existsSync(cheminSalon(code)));
    return code;
}

function validerCodeSalon(code) {
    return /^[A-Z0-9]{5}$/.test(code);
}

function validerCleAcces(cle) {
    return /^[A-Z0-9]{8}$/.test(cle);
}

function validerPseudo(pseudo) {
    const valeur = String(pseudo || '').trim();
    if (valeur.length < 2 || valeur.length > 20) return null;
    if (!/^[a-zA-Z0-9àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ\s._-]+$/.test(valeur)) {
        return null;
    }
    return valeur;
}

function cheminSalon(code) {
    return path.join(DOSSIER_SALONS, `${code}.json`);
}

function assurerDossierSalons() {
    if (!fs.existsSync(DOSSIER_SALONS)) {
        fs.mkdirSync(DOSSIER_SALONS, { recursive: true });
    }
}

function lireSalon(code) {
    const fichier = cheminSalon(code);
    if (!fs.existsSync(fichier)) return null;

    try {
        const salon = JSON.parse(fs.readFileSync(fichier, 'utf8'));
        return typeof salon === 'object' && salon !== null ? salon : null;
    } catch {
        return null;
    }
}

function ecrireSalon(code, salon) {
    assurerDossierSalons();
    try {
        fs.writeFileSync(cheminSalon(code), JSON.stringify(salon), 'utf8');
        return true;
    } catch {
        return false;
    }
}

function validerEtatJeu(etat) {
    if (!etat || typeof etat !== 'object') return false;
    if (!Array.isArray(etat.plateau) || etat.plateau.length !== 14) return false;
    if (!etat.plateau.every((c) => Number.isInteger(c) && c >= 0)) return false;
    if (
        !Number.isInteger(etat.scoreSud) ||
        !Number.isInteger(etat.scoreNord) ||
        typeof etat.distribue !== 'boolean' ||
        !['HOTE', 'INVITE'].includes(etat.tour)
    ) {
        return false;
    }
    return true;
}

function normaliserEtatJeu(etat) {
    return {
        plateau: etat.plateau.map(Number),
        scoreSud: Number(etat.scoreSud),
        scoreNord: Number(etat.scoreNord),
        tour: etat.tour,
        distribue: Boolean(etat.distribue),
    };
}

function compterJoueurs(salon) {
    let total = 0;
    if (salon.joueurs?.hote?.connecte) total++;
    if (salon.joueurs?.invite?.connecte) total++;
    return total;
}

function creerSalonVide(code, cleAcces, pseudoHote) {
    return {
        code,
        cleAcces,
        statut: 'en_attente',
        joueurs: {
            hote: {
                connecte: true,
                pseudo: pseudoHote,
                connecte_le: new Date().toISOString(),
            },
            invite: null,
        },
        cree_le: new Date().toISOString(),
        plateau: Array(14).fill(0),
        scoreSud: 0,
        scoreNord: 0,
        tour: 'HOTE',
        distribue: false,
    };
}

function demarrerPartie(salon) {
    salon.statut = 'en_cours';
    salon.plateau = Array(14).fill(5);
    salon.scoreSud = 0;
    salon.scoreNord = 0;
    salon.tour = 'HOTE';
    salon.distribue = true;
    salon.debut_le = new Date().toISOString();
    return salon;
}

function infosJoueurs(salon) {
    return {
        hote: salon.joueurs?.hote?.pseudo || null,
        invite: salon.joueurs?.invite?.pseudo || null,
    };
}

function infosSalonPublic(salon) {
    const nbJoueurs = compterJoueurs(salon);
    return {
        code: salon.code,
        statut: salon.statut,
        nbJoueurs,
        maxJoueurs: MAX_JOUEURS,
        complet: nbJoueurs >= MAX_JOUEURS,
        cree_le: salon.cree_le,
        joueurs: infosJoueurs(salon),
    };
}

function repondreAvecEtat(res, salon) {
    return res.json({
        status: 'success',
        salon: infosSalonPublic(salon),
        joueurs: infosJoueurs(salon),
        etat: normaliserEtatJeu(salon),
    });
}

assurerDossierSalons();

app.get('/api/salons', (req, res) => {
    assurerDossierSalons();
    const fichiers = fs.readdirSync(DOSSIER_SALONS).filter((f) => f.endsWith('.json'));
    const salons = [];

    for (const fichier of fichiers) {
        const salon = lireSalon(fichier.replace('.json', ''));
        if (!salon) continue;
        const infos = infosSalonPublic(salon);
        if (infos.statut === 'en_attente' && !infos.complet) {
            salons.push(infos);
        }
    }

    salons.sort((a, b) => new Date(b.cree_le) - new Date(a.cree_le));
    return res.json({ status: 'success', salons, total: salons.length });
});

app.post('/api/salons', (req, res) => {
    const pseudoHote = validerPseudo(req.body.pseudo);
    if (!pseudoHote) {
        return repondreErreur(res, 400, 'Pseudo invalide (2 à 20 caractères, lettres/chiffres).');
    }

    const code = genererCodeSalonUnique();
    const cleAcces = genererIdentifiant(8);
    const salon = creerSalonVide(code, cleAcces, pseudoHote);

    if (!ecrireSalon(code, salon)) {
        return repondreErreur(res, 500, 'Impossible de créer le salon.');
    }

    return res.json({
        status: 'success',
        message: 'Salon créé. En attente du 2e joueur (1/2).',
        code,
        cleAcces,
        salon: infosSalonPublic(salon),
        joueurs: infosJoueurs(salon),
    });
});

app.get('/api/salons/:code', (req, res) => {
    const code = String(req.params.code || '').toUpperCase().trim();

    if (!validerCodeSalon(code)) {
        return repondreErreur(res, 400, 'Code de salon invalide.');
    }

    const salon = lireSalon(code);
    if (!salon) {
        return repondreErreur(res, 404, 'Salon introuvable.');
    }

    return repondreAvecEtat(res, salon);
});

app.post('/api/salons/:code/rejoindre', (req, res) => {
    const code = String(req.params.code || '').toUpperCase().trim();
    const cleAcces = String(req.body.cleAcces || '').toUpperCase().trim();
    const pseudoInvite = validerPseudo(req.body.pseudo);

    if (!validerCodeSalon(code)) {
        return repondreErreur(res, 400, 'Code de salon invalide.');
    }

    if (!validerCleAcces(cleAcces)) {
        return repondreErreur(res, 400, 'Clé d\'accès invalide (8 caractères).');
    }

    if (!pseudoInvite) {
        return repondreErreur(res, 400, 'Pseudo invalide (2 à 20 caractères, lettres/chiffres).');
    }

    const salon = lireSalon(code);
    if (!salon) {
        return repondreErreur(res, 404, 'Salon introuvable.');
    }

    if (salon.cleAcces !== cleAcces) {
        return repondreErreur(res, 403, 'Clé d\'accès incorrecte.');
    }

    if (compterJoueurs(salon) >= MAX_JOUEURS) {
        return repondreErreur(res, 409, `Ce salon est complet (${MAX_JOUEURS}/${MAX_JOUEURS} joueurs).`);
    }

    if (pseudoInvite.toLowerCase() === salon.joueurs?.hote?.pseudo?.toLowerCase()) {
        return repondreErreur(res, 400, 'Ce pseudo est déjà utilisé par l\'hôte dans ce salon.');
    }

    salon.joueurs.invite = {
        connecte: true,
        pseudo: pseudoInvite,
        connecte_le: new Date().toISOString(),
    };
    demarrerPartie(salon);

    if (!ecrireSalon(code, salon)) {
        return repondreErreur(res, 500, 'Impossible de rejoindre le salon.');
    }

    return res.json({
        status: 'success',
        message: 'Bienvenue ! La partie commence (2/2).',
        salon: infosSalonPublic(salon),
        joueurs: infosJoueurs(salon),
        etat: normaliserEtatJeu(salon),
    });
});

app.put('/api/salons/:code', (req, res) => {
    const code = String(req.params.code || '').toUpperCase().trim();
    const etat = req.body;

    if (!validerCodeSalon(code)) {
        return repondreErreur(res, 400, 'Code de salon invalide.');
    }

    const salon = lireSalon(code);
    if (!salon) {
        return repondreErreur(res, 404, 'Salon introuvable.');
    }

    if (compterJoueurs(salon) < MAX_JOUEURS) {
        return repondreErreur(res, 403, 'La partie n\'a pas encore 2 joueurs connectés.');
    }

    if (salon.statut !== 'en_cours') {
        return repondreErreur(res, 403, 'La partie n\'est pas en cours.');
    }

    if (!validerEtatJeu(etat)) {
        return repondreErreur(res, 400, 'État de jeu invalide.');
    }

    const etatNormalise = normaliserEtatJeu(etat);
    Object.assign(salon, etatNormalise, { maj_le: new Date().toISOString() });

    if (!ecrireSalon(code, salon)) {
        return repondreErreur(res, 500, "Impossible d'enregistrer le coup.");
    }

    return res.json({ status: 'success', message: 'Coup enregistré' });
});

app.delete('/api/salons/:code', (req, res) => {
    const code = String(req.params.code || '').toUpperCase().trim();
    const cleAcces = String(req.body.cleAcces || '').toUpperCase().trim();

    if (!validerCodeSalon(code) || !validerCleAcces(cleAcces)) {
        return repondreErreur(res, 400, 'Code ou clé invalide.');
    }

    const salon = lireSalon(code);
    if (!salon) {
        return repondreErreur(res, 404, 'Salon introuvable.');
    }

    if (salon.cleAcces !== cleAcces) {
        return repondreErreur(res, 403, 'Clé d\'accès incorrecte.');
    }

    try {
        fs.unlinkSync(cheminSalon(code));
    } catch {
        return repondreErreur(res, 500, 'Impossible de fermer le salon.');
    }

    return res.json({ status: 'success', message: 'Salon fermé.' });
});

app.listen(PORT, () => {
    console.log(`Songo — serveur démarré sur http://localhost:${PORT}`);
    console.log(`Salons multiples actifs (max ${MAX_JOUEURS} joueurs par salon).`);
});
