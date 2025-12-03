# Rapport de Conception : Matrice à LED 16x16 (Architecture Tiled)

## 1. Objectif du Circuit
Réaliser un affichage de 16x16 pixels capable d'animations, en utilisant :
*   **4 Matrices 8x8** assemblées en carré.
*   **Une seule mémoire EEPROM (27C64)** pour stocker les images.
*   **Un système de double horloge** pour séparer la vitesse de balayage (Scan) de la vitesse d'animation.

---

## 2. Liste des Composants
*   **4x** MATRIX-8X8-RED (Type: Row Cathode)
*   **1x** 27C64 (EEPROM 8K)
*   **2x** 74LS93 (Compteurs Binaires 4 bits)
*   **4x** 74LS138 (Décodeurs 3 vers 8)
*   **1x** 74LS04 (Porte Inverseuse / NOT)
*   **2x** CLOCK (Générateurs d'horloge)
*   **1x** RESPACK-8 (Barre de 8 résistances, 220Ω)
*   **Terminaux :** POWER, GROUND, DEFAULT (Labels).

---

## 3. Étape par Étape : Le Câblage

### Étape 1 : Le Module d'Affichage (Les Matrices)
Nous disposons les 4 matrices pour former un carré.

1.  **Placement :**
    *   Placez 4 matrices : Haut-Gauche (**HG**), Haut-Droite (**HD**), Bas-Gauche (**BG**), Bas-Droite (**BD**).
2.  **Configuration Critique :**
    *   Clic droit sur chaque matrice $\rightarrow$ *Properties*.
    *   Réglez **Polarity** sur **"Row Cathode"**. (Sinon rien ne s'allumera).
3.  **Le Bus de Données (Anodes - Colonnes) :**
    *   Placez des terminaux (Labels) nommés **D0** à **D7** au-dessus de chaque matrice.
    *   Connectez D0 à la Pin 1, D1 à la Pin 2... jusqu'à D7 sur la Pin 8.
    *   **Répétez ceci pour les 4 matrices.** Elles partagent toutes le même bus de données.
4.  **Préparation des Cathodes (Lignes) :**
    *   Laissez les broches du bas (Lignes) libres pour l'instant. Elles seront connectées aux décodeurs à l'étape 4.

### Étape 2 : Le Cerveau (La Mémoire U5 - 27C64)
1.  **Contrôle (Activation) :**
    *   Reliez les broches **20 ($\overline{CE}$)** et **22 ($\overline{OE}$)** ensemble.
    *   Connectez-les impérativement à la **MASSE (GROUND)**. (Sans cela, la mémoire reste éteinte).
2.  **Bus d'Adresse (Entrées) :**
    *   Placez des labels sur les broches A0 à A7 de la mémoire.
    *   Nommez-les **A0, A1, A2, A3, A4, A5, A6, A7**.
3.  **Bus de Données (Sorties) :**
    *   Placez un **RESPACK-8** (220Ω) en sortie des broches D0-D7.
    *   À la sortie des résistances, placez des labels **D0** à **D7**.

### Étape 3 : La Génération d'Adresses (Les Compteurs)
C'est la partie la plus technique. Nous utilisons une architecture hybride.

#### Le Compteur CPT1 (Scan Rapide - Lignes)
*   **Composant :** 74LS93
*   **Horloge :** Connectez un générateur `DCLOCK` sur la broche **14 (CKA)**. Fréquence : **2000 Hz**.
*   **Pontage Interne :** Reliez la broche **12 (QA)** à la broche **1 (CKB)**.
*   **Sorties (Labels) :**
    *   Pin 12 (QA) $\rightarrow$ **A0**
    *   Pin 9 (QB) $\rightarrow$ **A1**
    *   Pin 8 (QC) $\rightarrow$ **A2**
    *   Pin 11 (QD) $\rightarrow$ **A3**
*   **Reset :** Connectez R0(1) et R0(2) à la Masse (ou état logique 0).

#### Le Compteur CPT2 (Scan Étendu + Animation)
Nous coupons ce compteur en deux fonctions distinctes.
*   **Entrée CKA (Pin 14) :** Connectez-y le label **A3** (venant de CPT1).
*   **Sortie QA (Pin 12) :** Nommez ce label **A4**.
    *   *Explication :* A4 devient le 5ème bit de balayage (pour sélectionner Gauche/Droite).
*   **Entrée CKB (Pin 1) :** Connectez une **NOUVELLE HORLOGE** (Lente). Fréquence : **2 Hz** à **5 Hz**.
*   **Sorties Animation :**
    *   Pin 9 (QB) $\rightarrow$ **A5**
    *   Pin 8 (QC) $\rightarrow$ **A6**
    *   Pin 11 (QD) $\rightarrow$ **A7**
*   **Reset :** Connectez R0(1) et R0(2) à la Masse.

### Étape 4 : La Sélection des Matrices (Les Décodeurs)
Nous utilisons 4 décodeurs **74LS138** pour activer une seule matrice à la fois.
*   **Entrées Communes :** Sur TOUS les décodeurs (U1, U2, U3, U4), connectez les entrées **A, B, C** aux labels **A0, A1, A2**.

#### Câblage des Enables (Sélection par Zone)

| Matrice / Décodeur | Position | Condition Logique | Câblage des Enables (E1, E2, E3) |
| :--- | :--- | :--- | :--- |
| **U3** | Haut-Gauche | A3=0, A4=0 | **E1:** +5V \| **E2:** A3 \| **E3:** A4 |
| **U4** | Haut-Droite | A3=1, A4=0 | **E1:** A3 \| **E2:** A4 \| **E3:** GND |
| **U2** | Bas-Gauche | A3=0, A4=1 | **E1:** A4 \| **E2:** A3 \| **E3:** GND |
| **U1** | Bas-Droite | A3=1, A4=1 | **E1:** A3 \| **E2:** Signal A4 inversé* \| **E3:** GND |

\* *Pour U1, insérez une porte NON (7404) entre le label A4 et l'entrée E2.*

#### Connexion aux Matrices
*   Reliez les sorties **Y0 à Y7** de chaque décodeur aux **Cathodes** (lignes du bas) de la matrice qui lui correspond physiquement sur le schéma.

---

## 4. La Logique de Fonctionnement (Résumé)

1.  **Le Balayage (Scan) :**
    *   L'horloge rapide fait tourner **CPT1**.
    *   **A0, A1, A2** changent très vite $\rightarrow$ Balayent les 8 lignes d'une matrice.
    *   Quand CPT1 déborde, **A3** change.
    *   Quand A3 a changé 2 fois, **A4** (sur CPT2) change.
    *   Cela couvre les adresses 0 à 31 (les 4 matrices).

2.  **L'Animation :**
    *   L'horloge lente attaque la deuxième moitié de **CPT2**.
    *   Elle fait bouger **A5, A6, A7**.
    *   Cela change le bloc de 32 octets lu dans la mémoire, créant l'animation.

---

## 5. Programmation de la Mémoire
Pour que l'image soit cohérente, le fichier binaire `.BIN` doit être généré avec la logique de "Tuiles" :
*   Octets 0-7 : Matrice HG
*   Octets 8-15 : Matrice HD
*   Octets 16-23 : Matrice BG
*   Octets 24-31 : Matrice BD

Utilisez le générateur fourni pour créer ce fichier, chargez-le dans U5, et lancez la simulation.