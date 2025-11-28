import React, { useState, useEffect } from 'react';

// --- CONFIGURATION ---
const NUM_MATRICES = 4; // Nombre de modules 8x8 chainés
const ROWS = 8;         // Hauteur standard
const COLS_PER_MATRIX = 8; 
const TOTAL_COLS = NUM_MATRICES * COLS_PER_MATRIX; // 32 colonnes au total

const MatrixEditor = () => {
  // --- ETAT (STATE) ---
  
  // Fonction pour créer une grille vide (tous les pixels à 0)
  const createEmptyGrid = () => 
    Array.from({ length: ROWS }, () => Array(TOTAL_COLS).fill(0));

  const [frames, setFrames] = useState([createEmptyGrid()]); // Liste des frames (animation)
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0); // Frame affichée
  const [isPlaying, setIsPlaying] = useState(false);         // Lecture auto
  const [isMouseDown, setIsMouseDown] = useState(false);     // Pour dessiner en glissant

  // --- LOGIQUE DE DESSIN ---

  // Allumer/Eteindre un pixel
  const paintPixel = (r, c, forceOn = null) => {
    const newFrames = [...frames];
    // Copie profonde de la frame actuelle pour éviter les bugs de référence
    const currentGrid = newFrames[currentFrameIdx].map(row => [...row]);
    
    // Si forceOn est défini (pour le glisser-déposer), on l'utilise, sinon on inverse
    if (forceOn !== null) {
      currentGrid[r][c] = forceOn;
    } else {
      currentGrid[r][c] = currentGrid[r][c] ? 0 : 1;
    }

    newFrames[currentFrameIdx] = currentGrid;
    setFrames(newFrames);
  };

  // Gestion souris (click & drag)
  const handleMouseDown = (r, c) => {
    setIsMouseDown(true);
    paintPixel(r, c); // Dessine immédiatement au clic
  };
  
  const handleMouseEnter = (r, c) => {
    if (isMouseDown) {
      paintPixel(r, c, 1); // Si on glisse la souris, on allume (mode pinceau)
    }
  };

  const handleMouseUp = () => setIsMouseDown(false);

  // --- LOGIQUE D'ANIMATION ---

  const addFrame = () => {
    // On copie la frame précédente pour ne pas repartir de zéro
    const newGrid = frames[currentFrameIdx].map(row => [...row]);
    setFrames([...frames, newGrid]);
    setCurrentFrameIdx(frames.length); // Aller à la nouvelle frame
  };

  const deleteFrame = () => {
    if (frames.length <= 1) return;
    const newFrames = frames.filter((_, idx) => idx !== currentFrameIdx);
    setFrames(newFrames);
    setCurrentFrameIdx(Math.max(0, currentFrameIdx - 1));
  };

  // Boucle de lecture (Play)
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentFrameIdx(prev => (prev + 1) % frames.length);
      }, 150); // Vitesse : 150ms par image
    }
    return () => clearInterval(interval);
  }, [isPlaying, frames.length]);

  // --- LOGIQUE D'EXPORT BINAIRE (LE COEUR DU SUJET) ---

  const generateBinary = () => {
    // Calcul de la taille du buffer
    // Pour chaque frame : 4 matrices * 8 lignes = 32 octets par frame
    const bufferSize = frames.length * NUM_MATRICES * ROWS;
    const buffer = new Uint8Array(bufferSize);
    let index = 0;

    frames.forEach((frame) => {
      // On parcourt les matrices une par une (Module 0, Module 1, etc.)
      for (let m = 0; m < NUM_MATRICES; m++) {
        // On parcourt les 8 lignes de chaque matrice
        for (let r = 0; r < ROWS; r++) {
          let byte = 0;
          
          // On construit l'octet pour cette ligne (8 colonnes)
          for (let c = 0; c < 8; c++) {
            const globalCol = (m * 8) + c; // Index global de la colonne (0 à 31)
            const pixel = frame[r][globalCol];
            
            if (pixel === 1) {
              // Décalage de bits : MSB (Bit de poids fort) à gauche
              // Ex: Colonne 0 -> Bit 7, Colonne 7 -> Bit 0
              byte |= (1 << (7 - c));
            }
          }
          
          buffer[index] = byte;
          index++;
        }
      }
    });
    
    return buffer;
  };

  const downloadFile = () => {
    const data = generateBinary();
    const blob = new Blob([data], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = "animation.bin"; // Nom du fichier
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- RENDU GRAPHIQUE ---

  return (
    <div 
      onMouseUp={handleMouseUp} // Arrête de dessiner si on relâche n'importe où
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}
    >
      <h1>Générateur Matrice LED (Binaire)</h1>

      {/* Barre d'outils */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button onClick={() => setIsPlaying(!isPlaying)} style={btnStyle}>
          {isPlaying ? '⏸ Pause' : '▶ Lecture'}
        </button>
        
        <button onClick={addFrame} style={btnStyle}>+ Ajouter Frame</button>
        <button onClick={deleteFrame} style={{...btnStyle, backgroundColor: '#d9534f'}}>Supprimer Frame</button>
        
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '15px' }}>
           Frame: {currentFrameIdx + 1} / {frames.length}
        </div>
      </div>

      {/* La Grille de Dessin */}
      <div style={{
        display: 'grid',
        // On définit les colonnes. On ajoute un petit gap visuel.
        gridTemplateColumns: `repeat(${TOTAL_COLS}, 20px)`,
        backgroundColor: '#000',
        padding: '10px',
        border: '4px solid #333',
        gap: '2px',
        userSelect: 'none' // Empêche la sélection de texte
      }}>
        {frames[currentFrameIdx].map((row, r) => (
            row.map((pixel, c) => {
              // Calcul pour savoir si c'est la fin d'un bloc de 8 (pour espacer visuellement)
              const isEndOfMatrix = (c + 1) % 8 === 0 && c !== TOTAL_COLS - 1;
              
              return (
                <div
                  key={`${r}-${c}`}
                  onMouseDown={() => handleMouseDown(r, c)}
                  onMouseEnter={() => handleMouseEnter(r, c)}
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: pixel ? '#ff0000' : '#2a0000', // Rouge vif vs Rouge éteint
                    borderRadius: '50%',
                    cursor: 'pointer',
                    // Petit espace à droite tous les 8 pixels pour simuler les modules physiques
                    marginRight: isEndOfMatrix ? '10px' : '0' 
                  }}
                />
              );
            })
        ))}
      </div>

      {/* Bouton Export */}
      <div style={{ marginTop: '30px' }}>
        <button onClick={downloadFile} style={mainBtnStyle}>
          💾 TÉLÉCHARGER LE BINAIRE (.bin)
        </button>
      </div>

      <p style={{ color: '#666', marginTop: '10px' }}>
        Format : 1 bit par LED. Balayage Ligne par Ligne. MSB First.
      </p>
    </div>
  );
};

// Styles simples pour les boutons
const btnStyle = {
  padding: '8px 15px',
  cursor: 'pointer',
  fontSize: '14px',
  border: 'none',
  borderRadius: '4px',
  backgroundColor: '#444',
  color: 'white'
};

const mainBtnStyle = {
  ...btnStyle,
  backgroundColor: '#007bff',
  fontSize: '18px',
  padding: '15px 30px',
  fontWeight: 'bold'
};

export default MatrixEditor;