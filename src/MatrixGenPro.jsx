import React, { useState, useEffect, useRef } from 'react';

const MatrixGenPro = () => {
  // --- ÉTATS (STATE) ---
  const [numRows, setNumRows] = useState(8);
  const [numCols, setNumCols] = useState(32);
  
  // Fonction utilitaire pour créer une grille vide selon la taille actuelle
  const createEmptyGrid = (r, c) => Array.from({ length: r }, () => Array(c).fill(0));

  const [frames, setFrames] = useState([createEmptyGrid(8, 32)]); // Init en 8x32
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(false);         
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [fps, setFps] = useState(5); // Images par seconde

  // Référence pour gérer le redimensionnement sans boucle infinie
  const isFirstRun = useRef(true);

  // --- GESTION DU CHANGEMENT DE TAILLE ---
  const handleSizeChange = (newR, newC) => {
    // On convertit en nombres entiers
    const r = parseInt(newR, 10) || 8;
    const c = parseInt(newC, 10) || 8;
    setNumRows(r);
    setNumCols(c);
    // ATTENTION : Changer la taille réinitialise l'animation pour éviter les bugs
    setFrames([createEmptyGrid(r, c)]);
    setCurrentFrameIdx(0);
    setIsPlaying(false);
  };

  // --- INTERACTION SOURIS / DESSIN ---
  const paintPixel = (r, c, forceOn = null) => {
    const newFrames = [...frames];
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

  // --- GESTION DES FRAMES ---
  const addFrame = () => {
    const newGrid = frames[currentFrameIdx].map(row => [...row]); 
    const newFrames = [...frames];
    // On insère après la frame courante
    newFrames.splice(currentFrameIdx + 1, 0, newGrid);
    setFrames(newFrames);
    setCurrentFrameIdx(currentFrameIdx + 1);
  };

  const deleteFrame = () => {
    if (frames.length <= 1) return;
    const newFrames = frames.filter((_, idx) => idx !== currentFrameIdx);
    setFrames(newFrames);
    setCurrentFrameIdx(Math.max(0, currentFrameIdx - 1));
  };

  const clearCurrentFrame = () => {
    const newFrames = [...frames];
    newFrames[currentFrameIdx] = createEmptyGrid(numRows, numCols);
    setFrames(newFrames);
  };

  const resetAll = () => {
    if (window.confirm("Voulez-vous vraiment tout effacer et recommencer à zéro ?")) {
      setFrames([createEmptyGrid(numRows, numCols)]);
      setCurrentFrameIdx(0);
      setIsPlaying(false);
    }
  };

  // --- LECTURE (PLAYBACK) ---
  useEffect(() => {
    let interval;
    if (isPlaying) {
      // Conversion FPS vers ms intervalle
      const intervalMs = 1000 / fps;
      interval = setInterval(() => {
        setCurrentFrameIdx(prev => (prev + 1) % frames.length);
      }, intervalMs); 
    }
    return () => clearInterval(interval);
  }, [isPlaying, frames.length, fps]);

  // ==========================================================
  // LOGIQUE DE GÉNÉRATION BINAIRE (ADAPTATIVE)
  // ==========================================================
const generateBinary = () => {
    
    // --- MODE 1 : RUBAN HORIZONTAL (8x32) ---
    // C'est votre configuration actuelle (4 matrices alignées)
    if (numRows === 8 && numCols === 32) {
       const buffer = new Uint8Array(frames.length * 32);
       let index = 0;
       
       frames.forEach((frame) => {
         // Matrice 1 (Colonnes 0 à 7) -> Adresses 0-7
         for (let r = 0; r < 8; r++) {
           let byte = 0;
           for (let c = 0; c < 8; c++) byte |= (frame[r][c] ? (1 << c) : 0);
           buffer[index++] = byte;
         }
         // Matrice 2 (Colonnes 8 à 15) -> Adresses 8-15
         for (let r = 0; r < 8; r++) {
           let byte = 0;
           for (let c = 0; c < 8; c++) byte |= (frame[r][c+8] ? (1 << c) : 0);
           buffer[index++] = byte;
         }
         // Matrice 3 (Colonnes 16 à 23) -> Adresses 16-23
         for (let r = 0; r < 8; r++) {
           let byte = 0;
           for (let c = 0; c < 8; c++) byte |= (frame[r][c+16] ? (1 << c) : 0);
           buffer[index++] = byte;
         }
         // Matrice 4 (Colonnes 24 à 31) -> Adresses 24-31
         for (let r = 0; r < 8; r++) {
           let byte = 0;
           for (let c = 0; c < 8; c++) byte |= (frame[r][c+24] ? (1 << c) : 0);
           buffer[index++] = byte;
         }
       });
       return buffer;
    }
    
    // --- MODE 2 : CARRÉ TILED (16x16) ---
    // Pour votre ancien montage carré
    else if (numRows === 16 && numCols === 16) {
      const buffer = new Uint8Array(frames.length * 32);
      let index = 0;
      frames.forEach((frame) => {
        // Bloc Haut-Gauche
        for (let r = 0; r < 8; r++) { let byte = 0; for (let c = 0; c < 8; c++) byte |= (frame[r][c] ? (1 << c) : 0); buffer[index++] = byte; }
        // Bloc Haut-Droite
        for (let r = 0; r < 8; r++) { let byte = 0; for (let c = 0; c < 8; c++) byte |= (frame[r][c+8] ? (1 << c) : 0); buffer[index++] = byte; }
        // Bloc Bas-Gauche
        for (let r = 8; r < 16; r++) { let byte = 0; for (let c = 0; c < 8; c++) byte |= (frame[r][c] ? (1 << c) : 0); buffer[index++] = byte; }
        // Bloc Bas-Droite
        for (let r = 8; r < 16; r++) { let byte = 0; for (let c = 0; c < 8; c++) byte |= (frame[r][c+8] ? (1 << c) : 0); buffer[index++] = byte; }
      });
      return buffer;
    }

    // --- MODE 3 : STANDARD (8x8) ---
    // Pour une seule matrice simple
    else if (numRows === 8 && numCols === 8) {
      const buffer = new Uint8Array(frames.length * 8);
      let index = 0;
      frames.forEach((frame) => {
        for (let c = 0; c < 8; c++) { 
          let byte = 0;
          for (let r = 0; r < 8; r++) {
             // Inversion standard pour Anode/Cathode classique Proteus
             if(frame[r][c]) byte |= (1 << (7-r)); 
          }
          buffer[index++] = byte;
        }
      });
      return buffer;
    }

    // --- MODE 4 : GÉNÉRIQUE (Fallback) ---
    // Si vous mettez une taille bizarre (ex: 10x20)
    else {
      const buffer = new Uint8Array(frames.length * numRows);
      let index = 0;
      frames.forEach(frame => {
         for(let r=0; r<numRows; r++) {
             let byte = 0;
             for(let c=0; c<Math.min(numCols, 8); c++) {
                 if(frame[r][c]) byte |= (1 << c);
             }
             buffer[index++] = byte;
         }
      });
      return buffer;
    }
  };

  const handleDownload = () => {
    const dataBin = generateBinary();
    const blob = new Blob([dataBin], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ANIM_${numRows}x${numCols}.BIN`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- STYLES ---
  const styles = {
    container: {
      fontFamily: "'Segoe UI', Roboto, Helvetica, sans-serif",
      backgroundColor: '#121212',
      color: '#e0e0e0',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
    },
    header: {
      textAlign: 'center',
      marginBottom: '20px',
    },
    title: {
      color: '#61dafb',
      margin: '0 0 10px 0',
      fontSize: '2rem',
    },
    controlPanel: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '20px',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#1e1e1e',
      padding: '15px',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      marginBottom: '20px',
      width: '100%',
      maxWidth: '900px',
    },
    group: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '5px',
    },
    input: {
      background: '#333',
      border: '1px solid #555',
      color: '#fff',
      padding: '5px',
      borderRadius: '4px',
      width: '60px',
      textAlign: 'center',
    },
    gridContainer: {
      display: 'grid',
      // Responsive pixel size : 25px max, mais réduit si l'écran est petit
      gridTemplateColumns: `repeat(${numCols}, min(25px, 4vw))`, 
      gap: '1px',
      background: '#333',
      padding: '10px',
      border: '4px solid #444',
      borderRadius: '8px',
      marginBottom: '20px',
      touchAction: 'none', // Empêche le scroll sur mobile quand on dessine
    },
    pixel: (isOn, r, c) => ({
      width: '100%',
      aspectRatio: '1/1',
      backgroundColor: isOn ? '#ff3333' : '#222',
      borderRadius: '15%',
      cursor: 'pointer',
      // Petites bordures pour visualiser les blocs de 8x8 si on est en 16x16
      marginRight: (numCols === 16 && c === 7) ? '4px' : '0',
      marginBottom: (numRows === 16 && r === 7) ? '4px' : '0',
    }),
    timelineContainer: {
      display: 'flex',
      gap: '10px',
      overflowX: 'auto',
      maxWidth: '90vw',
      padding: '10px',
      background: '#1e1e1e',
      borderRadius: '8px',
      marginBottom: '20px',
      scrollbarWidth: 'thin',
    },
    framePreview: (isActive) => ({
      minWidth: '60px',
      height: '60px',
      border: isActive ? '3px solid #61dafb' : '1px solid #444',
      background: '#000',
      display: 'grid',
      gridTemplateColumns: `repeat(${numCols}, 1fr)`,
      gap: '0px',
      cursor: 'pointer',
      position: 'relative',
    }),
    miniPixel: (isOn) => ({
        backgroundColor: isOn ? '#ff3333' : '#222',
    }),
    mainBtn: {
        padding: '10px 20px',
        fontSize: '16px',
        background: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        boxShadow: '0 4px 0 #1e7e34',
        fontWeight: 'bold',
        transition: 'transform 0.1s',
    },
    actionBtn: {
        padding: '8px 12px',
        background: '#444',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
    },
    dangerBtn: {
        background: '#d9534f',
        color: 'white',
        padding: '8px 12px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    }
  };

  return (
    <div style={styles.container} onMouseUp={handleMouseUp}>
      <div style={styles.header}>
        <h1 style={styles.title}>Générateur Matrice LED Studio</h1>
        <div style={{color:'#aaa', fontSize:'0.9rem'}}>Configuration: 1 Mémoire EEPROM | Multiplexage</div>
      </div>

      {/* PANNEAU DE CONTRÔLE */}
      <div style={styles.controlPanel}>
        
        {/* TAILLE MATRICE */}
        <div style={styles.group}>
          <label style={{fontSize:'0.8rem', color:'#aaa'}}>Taille (R x C)</label>
          <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
             <input type="number" style={styles.input} value={numRows} onChange={(e)=>handleSizeChange(e.target.value, numCols)} />
             <span>x</span>
             <input type="number" style={styles.input} value={numCols} onChange={(e)=>handleSizeChange(numRows, e.target.value)} />
          </div>
        </div>

        {/* LECTURE */}
        <div style={styles.group}>
             <button 
                onClick={() => setIsPlaying(!isPlaying)} 
                style={{...styles.mainBtn, background: isPlaying ? '#e0a800' : '#007bff', boxShadow: 'none'}}
             >
                {isPlaying ? '⏸ PAUSE' : '▶ LECTURE'}
             </button>
        </div>

        {/* VITESSE */}
        <div style={styles.group}>
            <label style={{fontSize:'0.8rem', color:'#aaa'}}>Vitesse: {fps} FPS</label>
            <input 
                type="range" min="1" max="30" step="1" 
                value={fps} 
                onChange={(e) => setFps(Number(e.target.value))} 
                style={{width:'100px'}}
            />
        </div>

        {/* ACTIONS FRAMES */}
        <div style={styles.group}>
            <div style={{display:'flex', gap:'5px'}}>
                <button onClick={addFrame} style={styles.actionBtn} title="Dupliquer la frame">+ Copier</button>
                <button onClick={clearCurrentFrame} style={styles.actionBtn} title="Effacer le dessin">Gomme</button>
                <button onClick={deleteFrame} style={styles.dangerBtn} title="Supprimer la frame">Suppr</button>
            </div>
        </div>

        {/* RESET TOTAL */}
        <div style={styles.group}>
             <button onClick={resetAll} style={{...styles.dangerBtn, background:'#c0392b'}}>⚠ TOUT RESET</button>
        </div>

      </div>

      {/* ZONE DE DESSIN */}
      <div style={{position:'relative'}}>
          <div style={styles.gridContainer}>
            {frames[currentFrameIdx].map((row, r) => (
                row.map((pixel, c) => (
                <div
                    key={`${r}-${c}`}
                    onMouseDown={() => handleMouseDown(r, c)}
                    onMouseEnter={() => handleMouseEnter(r, c)}
                    style={styles.pixel(pixel, r, c)}
                    title={`R:${r} C:${c}`}
                />
                ))
            ))}
          </div>
          {/* Indicateur Frame Courante */}
          <div style={{textAlign:'center', marginBottom:'10px', color:'#61dafb', fontWeight:'bold'}}>
            FRAME {currentFrameIdx + 1} / {frames.length}
          </div>
      </div>

      {/* TIMELINE (PREVIEW) */}
      <div style={{width:'100%', maxWidth:'900px'}}>
        <label style={{color:'#aaa', fontSize:'0.8rem', marginLeft:'10px'}}>Chronologie (Cliquer pour éditer) :</label>
        <div style={styles.timelineContainer}>
            {frames.map((frame, idx) => (
                <div 
                    key={idx} 
                    style={styles.framePreview(idx === currentFrameIdx)}
                    onClick={() => { setCurrentFrameIdx(idx); setIsPlaying(false); }}
                >
                    {frame.map((row, r) => row.map((px, c) => (
                        <div key={`${r}-${c}`} style={styles.miniPixel(px)} />
                    )))}
                    <div style={{position:'absolute', bottom:0, right:0, background:'rgba(0,0,0,0.7)', color:'white', fontSize:'10px', padding:'2px'}}>
                        {idx+1}
                    </div>
                </div>
            ))}
            {/* Bouton Ajouter rapide au bout de la timeline */}
            <button 
                onClick={addFrame} 
                style={{minWidth:'40px', background:'#333', border:'1px dashed #666', color:'#666', cursor:'pointer', fontSize:'20px'}}
            >
                +
            </button>
        </div>
      </div>

      {/* TÉLÉCHARGEMENT */}
      <div style={{ marginTop: '20px' }}>
        <button onClick={handleDownload} style={styles.mainBtn}>
          💾 TÉLÉCHARGER LE BINAIRE (.BIN)
        </button>
        <p style={{fontSize:'0.8rem', color:'#666', marginTop:'10px'}}>
           {numRows === 16 && numCols === 16 
             ? "Mode Tiled 16x16 activé (Compatible montage 4 matrices)." 
             : "Mode Générique activé (Compatible montage simple)."}
        </p>
      </div>

    </div>
  );
};

export default MatrixGenPro;