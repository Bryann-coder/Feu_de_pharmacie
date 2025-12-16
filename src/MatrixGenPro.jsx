import React, { useState, useEffect, useRef } from 'react';

const MatrixGenPro = () => {
  // --- ÉTATS (STATE) ---
  const [numRows, setNumRows] = useState(8);
  const [numCols, setNumCols] = useState(32);
  
  const createEmptyGrid = (r, c) => Array.from({ length: r }, () => Array(c).fill(0));

  const [frames, setFrames] = useState([createEmptyGrid(8, 32)]); 
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(false);         
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [fps, setFps] = useState(5); 

  const handleSizeChange = (newR, newC) => {
    const r = parseInt(newR, 10) || 8;
    const c = parseInt(newC, 10) || 8;
    setNumRows(r);
    setNumCols(c);
    setFrames([createEmptyGrid(r, c)]);
    setCurrentFrameIdx(0);
    setIsPlaying(false);
  };

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

  const addFrame = () => {
    const newGrid = frames[currentFrameIdx].map(row => [...row]); 
    const newFrames = [...frames];
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
    if (window.confirm("Voulez-vous vraiment tout effacer ?")) {
      setFrames([createEmptyGrid(numRows, numCols)]);
      setCurrentFrameIdx(0);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    let interval;
    if (isPlaying) {
      const intervalMs = 1000 / fps;
      interval = setInterval(() => {
        setCurrentFrameIdx(prev => (prev + 1) % frames.length);
      }, intervalMs); 
    }
    return () => clearInterval(interval);
  }, [isPlaying, frames.length, fps]);

  // ==========================================================
  // NOUVELLE LOGIQUE : GÉNÉRATION BINAIRE FIXE (8192 OCTETS)
  // ==========================================================
  const generateBinary = () => {
    // On crée un buffer de la taille exacte de l'EEPROM 27C64 (8 Kio)
    // Par défaut, il est rempli de 0x00 (Noir)
    const fullBuffer = new Uint8Array(8192);
    let index = 0;

    // --- MODE 1 : RUBAN HORIZONTAL (8x32) ---
    if (numRows === 8 && numCols === 32) {
       frames.forEach((frame) => {
         if (index + 32 > 8192) return; // Sécurité anti-débordement
         
         // Matrice 1 (Colonnes 0 à 7)
         for (let r = 0; r < 8; r++) {
           let byte = 0;
           for (let c = 0; c < 8; c++) byte |= (frame[r][c] ? (1 << c) : 0);
           fullBuffer[index++] = byte;
         }
         // Matrice 2 (Colonnes 8 à 15)
         for (let r = 0; r < 8; r++) {
           let byte = 0;
           for (let c = 0; c < 8; c++) byte |= (frame[r][c+8] ? (1 << c) : 0);
           fullBuffer[index++] = byte;
         }
         // Matrice 3 (Colonnes 16 à 23)
         for (let r = 0; r < 8; r++) {
           let byte = 0;
           for (let c = 0; c < 8; c++) byte |= (frame[r][c+16] ? (1 << c) : 0);
           fullBuffer[index++] = byte;
         }
         // Matrice 4 (Colonnes 24 à 31)
         for (let r = 0; r < 8; r++) {
           let byte = 0;
           for (let c = 0; c < 8; c++) byte |= (frame[r][c+24] ? (1 << c) : 0);
           fullBuffer[index++] = byte;
         }
       });
    }
    
    // --- MODE 2 : CARRÉ TILED (16x16) ---
    else if (numRows === 16 && numCols === 16) {
      frames.forEach((frame) => {
        if (index + 32 > 8192) return;
        // Bloc HG, HD, BG, BD
        for (let r = 0; r < 8; r++) { let byte = 0; for (let c = 0; c < 8; c++) byte |= (frame[r][c] ? (1 << c) : 0); fullBuffer[index++] = byte; }
        for (let r = 0; r < 8; r++) { let byte = 0; for (let c = 0; c < 8; c++) byte |= (frame[r][c+8] ? (1 << c) : 0); fullBuffer[index++] = byte; }
        for (let r = 8; r < 16; r++) { let byte = 0; for (let c = 0; c < 8; c++) byte |= (frame[r][c] ? (1 << c) : 0); fullBuffer[index++] = byte; }
        for (let r = 8; r < 16; r++) { let byte = 0; for (let c = 0; c < 8; c++) byte |= (frame[r][c+8] ? (1 << c) : 0); fullBuffer[index++] = byte; }
      });
    }

    // --- MODE 3 : STANDARD (8x8) ---
    else if (numRows === 8 && numCols === 8) {
      frames.forEach((frame) => {
        if (index + 8 > 8192) return;
        for (let c = 0; c < 8; c++) { 
          let byte = 0;
          for (let r = 0; r < 8; r++) { if(frame[r][c]) byte |= (1 << (7-r)); }
          fullBuffer[index++] = byte;
        }
      });
    }

    return fullBuffer;
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

  const styles = {
    container: { fontFamily: "'Segoe UI', sans-serif", backgroundColor: '#121212', color: '#e0e0e0', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' },
    header: { textAlign: 'center', marginBottom: '20px' },
    title: { color: '#61dafb', margin: '0 0 10px 0', fontSize: '2rem' },
    controlPanel: { display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', alignItems: 'center', background: '#1e1e1e', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', marginBottom: '20px', width: '100%', maxWidth: '900px' },
    group: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' },
    input: { background: '#333', border: '1px solid #555', color: '#fff', padding: '5px', borderRadius: '4px', width: '60px', textAlign: 'center' },
    gridContainer: { display: 'grid', gridTemplateColumns: `repeat(${numCols}, min(25px, 3vw))`, gap: '1px', background: '#333', padding: '10px', border: '4px solid #444', borderRadius: '8px', marginBottom: '20px', touchAction: 'none' },
    pixel: (isOn, r, c) => ({ width: '100%', aspectRatio: '1/1', backgroundColor: isOn ? '#ff3333' : '#222', borderRadius: '15%', cursor: 'pointer', marginRight: (numCols === 32 && (c+1)%8 === 0) ? '4px' : '0' }),
    timelineContainer: { display: 'flex', gap: '10px', overflowX: 'auto', maxWidth: '90vw', padding: '10px', background: '#1e1e1e', borderRadius: '8px', marginBottom: '20px' },
    framePreview: (isActive) => ({ minWidth: '80px', height: '40px', border: isActive ? '3px solid #61dafb' : '1px solid #444', background: '#000', display: 'grid', gridTemplateColumns: `repeat(${numCols}, 1fr)`, cursor: 'pointer', position: 'relative' }),
    miniPixel: (isOn) => ({ backgroundColor: isOn ? '#ff3333' : '#222' }),
    mainBtn: { padding: '10px 20px', fontSize: '16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    actionBtn: { padding: '8px 12px', background: '#444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    dangerBtn: { background: '#d9534f', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }
  };

  return (
    <div style={styles.container} onMouseUp={handleMouseUp}>
      <div style={styles.header}>
        <h1 style={styles.title}>Générateur Matrice LED Studio</h1>
        <div style={{color:'#aaa', fontSize:'0.9rem'}}>Sortie fixe : 8192 octets (EEPROM 27C64)</div>
      </div>

      <div style={styles.controlPanel}>
        <div style={styles.group}>
          <label style={{fontSize:'0.8rem', color:'#aaa'}}>Taille (R x C)</label>
          <div style={{display:'flex', gap:'5px', alignItems:'center'}}>
             <input type="number" style={styles.input} value={numRows} onChange={(e)=>handleSizeChange(e.target.value, numCols)} />
             <span>x</span>
             <input type="number" style={styles.input} value={numCols} onChange={(e)=>handleSizeChange(numRows, e.target.value)} />
          </div>
        </div>
        <div style={styles.group}>
             <button onClick={() => setIsPlaying(!isPlaying)} style={{...styles.mainBtn, background: isPlaying ? '#e0a800' : '#007bff'}}>
                {isPlaying ? '⏸ PAUSE' : '▶ LECTURE'}
             </button>
        </div>
        <div style={styles.group}>
            <label style={{fontSize:'0.8rem', color:'#aaa'}}>Vitesse: {fps} FPS</label>
            <input type="range" min="1" max="30" value={fps} onChange={(e) => setFps(Number(e.target.value))} />
        </div>
        <div style={styles.group}>
            <div style={{display:'flex', gap:'5px'}}>
                <button onClick={addFrame} style={styles.actionBtn}>+ Copier</button>
                <button onClick={clearCurrentFrame} style={styles.actionBtn}>Gomme</button>
                <button onClick={deleteFrame} style={styles.dangerBtn}>Suppr</button>
            </div>
        </div>
        <button onClick={resetAll} style={{...styles.dangerBtn, background:'#c0392b'}}>RESET ALL</button>
      </div>

      <div style={styles.gridContainer}>
        {frames[currentFrameIdx].map((row, r) => (
            row.map((pixel, c) => (
            <div key={`${r}-${c}`} onMouseDown={() => handleMouseDown(r, c)} onMouseEnter={() => handleMouseEnter(r, c)} style={styles.pixel(pixel, r, c)} />
            ))
        ))}
      </div>

      <div style={styles.timelineContainer}>
          {frames.map((frame, idx) => (
              <div key={idx} style={styles.framePreview(idx === currentFrameIdx)} onClick={() => { setCurrentFrameIdx(idx); setIsPlaying(false); }}>
                  {frame.map((row, r) => row.map((px, c) => <div key={`${r}-${c}`} style={styles.miniPixel(px)} />))}
                  <div style={{position:'absolute', bottom:0, right:0, background:'rgba(0,0,0,0.7)', color:'white', fontSize:'10px', padding:'2px'}}>{idx+1}</div>
              </div>
          ))}
          <button onClick={addFrame} style={{minWidth:'40px', background:'#333', border:'1px dashed #666', color:'#666', fontSize:'20px'}}>+</button>
      </div>

      <button onClick={handleDownload} style={styles.mainBtn}>💾 TÉLÉCHARGER LE .BIN (8192 octets)</button>
    </div>
  );
};

export default MatrixGenPro;