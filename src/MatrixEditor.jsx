import React, { useState, useEffect } from 'react';

// --- CONFIGURATION 16x16 (4 Matrices 8x8) ---
const ROWS = 16;         
const COLS = 16; 

const Matrix16x16Gen = () => {
  // Crée une grille vide 16x16
  const createEmptyGrid = () => 
    Array.from({ length: ROWS }, () => Array(COLS).fill(0));

  const [frames, setFrames] = useState([createEmptyGrid()]); 
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(false);         
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [speed, setSpeed] = useState(200);

  // --- INTERACTION SOURIS ---
  const paintPixel = (r, c, forceOn = null) => {
    const newFrames = [...frames];
    // Copie profonde de la grille actuelle
    const currentGrid = newFrames[currentFrameIdx].map(row => [...row]);
    
    if (forceOn !== null) {
      currentGrid[r][c] = forceOn;
    } else {
      currentGrid[r][c] = currentGrid[r][c] ? 0 : 1;
    }
    newFrames[currentFrameIdx] = currentGrid;
    setFrames(newFrames);
  };

  const handleMouseDown = (r, c) => { setIsMouseDown(true); paintPixel(r, c); };
  const handleMouseEnter = (r, c) => { if (isMouseDown) paintPixel(r, c, 1); };
  const handleMouseUp = () => setIsMouseDown(false);

  // --- GESTION FRAMES ---
  const addFrame = () => {
    // Copie la frame précédente pour faciliter l'animation
    const newGrid = frames[currentFrameIdx].map(row => [...row]); 
    setFrames([...frames, newGrid]);
    setCurrentFrameIdx(frames.length); 
  };

  const deleteFrame = () => {
    if (frames.length <= 1) return;
    const newFrames = frames.filter((_, idx) => idx !== currentFrameIdx);
    setFrames(newFrames);
    setCurrentFrameIdx(Math.max(0, currentFrameIdx - 1));
  };

  const clearFrame = () => {
    const newFrames = [...frames];
    newFrames[currentFrameIdx] = createEmptyGrid();
    setFrames(newFrames);
  }

  // --- PLAYBACK ---
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentFrameIdx(prev => (prev + 1) % frames.length);
      }, speed); 
    }
    return () => clearInterval(interval);
  }, [isPlaying, frames.length, speed]);


  // ==========================================================
  // CŒUR DU SYSTÈME : GÉNÉRATION DU BINAIRE 16x16 "TILED"
  // ==========================================================
  
  const generateBinary = () => {
    // Taille : 32 octets par frame (4 matrices * 8 lignes)
    const bufferSize = frames.length * 32;
    const buffer = new Uint8Array(bufferSize);
    let index = 0;

    frames.forEach((frame) => {
      // Pour respecter l'adressage de nos décodeurs (A3, A4),
      // il faut écrire les données bloc par bloc.
      
      // BLOC 1 : Haut-Gauche (Lignes 0-7, Cols 0-7) - Adresse Offset 0
      for (let r = 0; r < 8; r++) {
        let byte = 0;
        for (let c = 0; c < 8; c++) {
          if (frame[r][c]) byte |= (1 << c); // D0=Col0, D7=Col7
        }
        buffer[index++] = byte;
      }

      // BLOC 2 : Haut-Droite (Lignes 0-7, Cols 8-15) - Adresse Offset 8
      for (let r = 0; r < 8; r++) {
        let byte = 0;
        for (let c = 0; c < 8; c++) {
          if (frame[r][c+8]) byte |= (1 << c);
        }
        buffer[index++] = byte;
      }

      // BLOC 3 : Bas-Gauche (Lignes 8-15, Cols 0-7) - Adresse Offset 16
      for (let r = 8; r < 16; r++) {
        let byte = 0;
        for (let c = 0; c < 8; c++) {
          if (frame[r][c]) byte |= (1 << c);
        }
        buffer[index++] = byte;
      }

      // BLOC 4 : Bas-Droite (Lignes 8-15, Cols 8-15) - Adresse Offset 24
      for (let r = 8; r < 16; r++) {
        let byte = 0;
        for (let c = 0; c < 8; c++) {
          if (frame[r][c+8]) byte |= (1 << c);
        }
        buffer[index++] = byte;
      }
    });

    return buffer;
  };

  const handleDownload = () => {
    const dataBin = generateBinary();
    const blob = new Blob([dataBin], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "IMAGE_16x16.BIN";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div onMouseUp={handleMouseUp} style={{ fontFamily: 'Segoe UI, sans-serif', padding: '20px', textAlign: 'center', backgroundColor: '#1e1e1e', color: '#fff', minHeight:'100vh' }}>
      <h1 style={{color:'#61dafb'}}>Générateur 16x16 (4 Tuiles)</h1>
      <p style={{color:'#aaa'}}>Configuration: 1 Mémoire | 4 Matrices | Balayage 32 lignes</p>
      
      <div style={{display:'flex', justifyContent:'center', gap:'10px', marginBottom:'20px'}}>
        <button onClick={() => setIsPlaying(!isPlaying)} style={btnStyle}>
          {isPlaying ? '⏸ Stop' : '▶ Lecture Animation'}
        </button>
        <button onClick={addFrame} style={btnStyle}>+ Nouvelle Frame</button>
        <button onClick={deleteFrame} style={{...btnStyle, background:'#d9534f'}}>Suppr Frame</button>
        <button onClick={clearFrame} style={{...btnStyle, background:'#f0ad4e'}}>Effacer Dessin</button>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Frame {currentFrameIdx + 1} / {frames.length}</strong>
        <br/>
        <label style={{fontSize:'0.8em'}}>Vitesse Anim: </label>
        <input type="range" min="50" max="1000" value={speed} onChange={(e)=>setSpeed(Number(e.target.value))} />
      </div>

      {/* GRILLE 16x16 */}
      <div style={{
        display: 'inline-grid',
        gridTemplateColumns: `repeat(${COLS}, 25px)`,
        gap: '2px',
        background: '#000',
        padding: '10px',
        border: '5px solid #444',
        borderRadius: '10px'
      }}>
        {frames[currentFrameIdx].map((row, r) => (
            row.map((pixel, c) => {
              // Calcul des bordures pour visualiser les 4 matrices
              let borderStyle = {};
              if (c === 7) borderStyle.marginRight = '5px'; // Séparation verticale
              if (r === 7) borderStyle.marginBottom = '5px'; // Séparation horizontale

              return (
                <div
                  key={`${r}-${c}`}
                  onMouseDown={() => handleMouseDown(r, c)}
                  onMouseEnter={() => handleMouseEnter(r, c)}
                  style={{
                    width: '25px', height: '25px',
                    backgroundColor: pixel ? '#ff3333' : '#333', // Rouge pour LED Matrix standard
                    borderRadius: '50%',
                    cursor: 'pointer',
                    ...borderStyle
                  }}
                  title={`Ligne ${r}, Col ${c}`}
                />
              )
            })
        ))}
      </div>

      <div style={{ marginTop: '30px', padding:'15px', border:'1px solid #444', display:'inline-block', borderRadius:'8px' }}>
        <button onClick={handleDownload} style={bigBtnStyle}>
          💾 TÉLÉCHARGER LE .BIN UNIQUE
        </button>
        <div style={{textAlign:'left', marginTop:'15px', fontSize:'0.9em', color:'#ccc'}}>
            <strong>Instruction de câblage pour ce binaire :</strong>
            <ul>
                <li><strong>Mémoire D0-D7 :</strong> Connectez aux ANODES (Colonnes) des 4 matrices.</li>
                <li><strong>Décodeurs :</strong> Connectez aux CATHODES (Lignes).</li>
                <li><strong>Bit Order :</strong> D0 = Colonne de Gauche, D7 = Colonne de Droite (dans chaque bloc de 8).</li>
            </ul>
        </div>
      </div>
    </div>
  );
};

const btnStyle = { padding: '8px 15px', cursor: 'pointer', background: '#337ab7', color: 'white', border: 'none', borderRadius: '4px', fontWeight:'bold' };
const bigBtnStyle = { ...btnStyle, background: '#28a745', fontSize: '18px', padding: '15px 30px', boxShadow: '0 4px 0 #1e7e34' };

export default Matrix16x16Gen;