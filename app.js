async function loadData() {
  const res = await fetch('characters.json');
  const data = await res.json();
  
  function cleanObj(obj) {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (typeof obj[i] === 'string') obj[i] = obj[i].trim();
        else if (typeof obj[i] === 'object' && obj[i] !== null) cleanObj(obj[i]);
      }
    } else if (obj !== null && typeof obj === 'object') {
      const keys = Object.keys(obj);
      for (const key of keys) {
        const val = obj[key];
        const newKey = key.trim();
        
        if (typeof val === 'string') {
          obj[newKey] = val.trim();
        } else if (typeof val === 'object' && val !== null) {
          obj[newKey] = val;
          cleanObj(val);
        } else {
          obj[newKey] = val;
        }
        
        if (newKey !== key) delete obj[key];
      }
    }
  }
  cleanObj(data);
  return data;
}

function hexToHsl(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToCss(h, s, l) { return `hsl(${h} ${s}% ${l}%)`; }
function circHueDiff(a, b) { let d = Math.abs(a - b); return Math.min(d, 360 - d); }

function scoreMatch(targetHSL, gotHSL) {
  const hueErr = circHueDiff(targetHSL.h, gotHSL.h) / 180;
  const satErr = Math.abs(targetHSL.s - gotHSL.s) / 100;
  const lightErr = Math.abs(targetHSL.l - gotHSL.l) / 100;
  const weighted = 0.5 * hueErr + 0.3 * satErr + 0.2 * lightErr;
  const score = Math.max(0, Math.round(10 * (1 - weighted)));
  return { score, weighted };
}

function pickRandom(arr, n) {
  const copy = arr.slice();
  const out = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

document.addEventListener('DOMContentLoaded', async () => {
  const data = await loadData();
  const pool = data.characters; 
  
  let gameChars = pickRandom(pool, 5);
  let idx = 0, totalScore = 0;
  let currentRegion = null;
  let targetColorHex = ""; 

  const img = document.getElementById('char-image');
  const charCaption = document.getElementById('char-caption');
  const regionNameSpan = document.getElementById('region-name'); 
  
  const hue = document.getElementById('hue');
  const sat = document.getElementById('sat');
  const con = document.getElementById('con');
  const swatch = document.getElementById('swatch');
  const hueVal = document.getElementById('hueVal');
  const satVal = document.getElementById('satVal');
  const conVal = document.getElementById('conVal');
  
  const submitBtn = document.getElementById('submit');
  const nextBtn = document.getElementById('next');
  const restartBtn = document.getElementById('restart');
  const scoreDiv = document.getElementById('score');

  function updateSwatch() {
    const h = +hue.value, s = +sat.value, c = +con.value;
    const baseL = 50;
    const l = Math.min(100, Math.max(0, Math.round(baseL * (1 + c / 100))));
    swatch.style.background = hslToCss(h, s, l);
    hueVal.textContent = h;
    satVal.textContent = s + '%';
    conVal.textContent = c;
  }

  hue.addEventListener('input', updateSwatch);
  sat.addEventListener('input', updateSwatch);
  con.addEventListener('input', updateSwatch);

  function showCharacter(i) {
    const ch = gameChars[i];
    currentRegion = ch.regions[Math.floor(Math.random() * ch.regions.length)];
    targetColorHex = currentRegion.color; 
    
    regionNameSpan.textContent = `${ch.name} — ${currentRegion.name}`;
    
    img.classList.add('greyed-out');
    
    submitBtn.style.display = 'inline-block';
    nextBtn.style.display = 'none';
    restartBtn.style.display = 'none';
    
    hue.value = 180; sat.value = 50; con.value = 0;
    updateSwatch();

    img.src = ch.image.url;
    img.alt = ch.name;

    charCaption.textContent = ch.show;
    scoreDiv.textContent = `Score: — / 10  (${i + 1}/5)`;
  }

  submitBtn.addEventListener('click', () => {
    const targetHSL = hexToHsl(targetColorHex);
    const h = +hue.value, s = +sat.value;
    const baseL = 50;
    const l = Math.min(100, Math.max(0, Math.round(baseL * (1 + (+con.value) / 100))));
    const got = { h, s, l };
    const res = scoreMatch(targetHSL, got);
    totalScore += res.score;
    
    scoreDiv.textContent = `Score: ${res.score} / 10 (${idx + 1}/5)`;
    
    img.classList.remove('greyed-out');
    
    submitBtn.style.display = 'none';
    nextBtn.style.display = 'inline-block';
  });

  nextBtn.addEventListener('click', () => {
    idx++;
    if (idx < gameChars.length) {
      showCharacter(idx);
    } else {
      scoreDiv.textContent = `Final: ${totalScore} / ${gameChars.length * 10}`;
      charCaption.textContent = `Game complete! Total: ${totalScore} / ${gameChars.length * 10}`;
      regionNameSpan.textContent = "Game Over!";
      nextBtn.style.display = 'none';
      restartBtn.style.display = 'inline-block';
    }
  });

  restartBtn.addEventListener('click', () => {
    gameChars = pickRandom(pool, 5);
    idx = 0;
    totalScore = 0;
    showCharacter(0);
  });

  updateSwatch();
  showCharacter(0);
});
