<?php
header('Content-Type: application/json');

// Récupération de l'action demandée par AJAX
$action = isset($_GET['action']) ? $_GET['action'] : '';
$fichier_sauvegarde = 'etat_jeu.json';

switch ($action) {
    case 'creer':
        // Création d'un nouvel état de jeu initialisé à vide
        $nouvel_etat = [
            'plateau' => array_fill(0, 14, 0),
            'scoreSud' => 0,
            'scoreNord' => 0,
            'tour' => 'MOI',
            'statut' => 'en_attente'
        ];
        file_put_contents($fichier_sauvegarde, json_ coasters_encode($nouvel_etat));
        echo json_encode(['status' => 'success', 'message' => 'Salon initialisé']);
        break;

    case 'lire':
        // Lecture de l'état actuel pour la synchronisation
        if (file_exists($fichier_sauvegarde)) {
            echo file_get_contents($fichier_sauvegarde);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Aucune partie en cours']);
        }
        break;

    default:
        echo json_encode(['status' => 'error', 'message' => 'Action inconnue']);
        break;
}