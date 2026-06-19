async function loadData(){
  const res = await fetch('characters.json');
  return res.json();
}

function hexToHsl(hex){
  hex = hex.replace('#','');
  const r = parseInt(hex.substring(0,2),16)/255;
  const g = parseInt(hex.substring(2,4),16)/255;
  const b = parseInt(hex.substring(4,6),16)/255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h=0,s=0,l=(max+min)/2;
  if(max!==min){
    const d=max-min;
    s = l>0.5? d/(2-max-min): d/(max+min);
    switch(max){
      case r: h=(g-b)/d + (g<b?6:0); break;
      case g: h=(b-r)/d + 2; break;
      case b: h=(r-g)/d + 4; break;
    }
    h/=6;
  }
  return {h:Math.round(h*360), s:Math.round(s*100), l:Math.round(l*100)};
}

function hslToCss(h,s,l){ return `hsl(${h} ${s}% ${l}%)`; }

function circHueDiff(a,b){ let d=Math.abs(a-b); return Math.min(d,360-d); }

function scoreMatch(targetHSL, gotHSL){
  const hueErr = circHueDiff(targetHSL.h, gotHSL.h)/180;
  const satErr = Math.abs(targetHSL.s - gotHSL.s)/100;
  const lightErr = Math.abs(targetHSL.l - gotHSL.l)/100;
  const weighted = 0.5*hueErr + 0.3*satErr + 0.2*lightErr;
  const score = Math.max(0, Math.round(10*(1-weighted)));
  return {score, weighted};
}

function pickRandom(arr,n){
  const copy = arr.slice();
  const out=[]; while(out.length<n && copy.length){
    const i=Math.floor(Math.random()*copy.length); out.push(copy.splice(i,1)[0]);
  }
  return out;
}

// Place the overlay exactly over the image pixels using the image's rendered bounds
function positionOverlay(overlay, img, region){
  const panelRect = img.parentElement.getBoundingClientRect();
  const imgRect = img.getBoundingClientRect();

  // Offset of the image inside the panel
  const offX = imgRect.left - panelRect.left;
  const offY = imgRect.top  - panelRect.top;
  const imgW  = imgRect.width;
  const imgH  = imgRect.height;

  overlay.style.left   = (offX + region.x / 100 * imgW) + 'px';
  overlay.style.top    = (offY + region.y / 100 * imgH) + 'px';
  overlay.style.width  = (region.w / 100 * imgW) + 'px';
  overlay.style.height = (region.h / 100 * imgH) + 'px';
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const data = await loadData();
  const pool = data.characters;
  const gameChars = pickRandom(pool, 5);
  let idx=0, totalScore=0;
  let currentRegion = null;

  const img        = document.getElementById('char-image');
  const overlay    = document.getElementById('overlay');
  const charCaption= document.getElementById('char-caption');
  const hue        = document.getElementById('hue');
  const sat        = document.getElementById('sat');
  const con        = document.getElementById('con');
  const swatch     = document.getElementById('swatch');
  const hueVal     = document.getElementById('hueVal');
  const satVal     = document.getElementById('satVal');
  const conVal     = document.getElementById('conVal');
  const submit     = document.getElementById('submit');
  const scoreDiv   = document.getElementById('score');

  function updateSwatch(){
    const h=+hue.value, s=+sat.value, c=+con.value;
    const baseL=50;
    const l = Math.min(100, Math.max(0, Math.round(baseL*(1 + c/100))));
    swatch.style.background = hslToCss(h,s,l);
    hueVal.textContent = h;
    satVal.textContent = s + '%';
    conVal.textContent = c;
  }

  hue.addEventListener('input', updateSwatch);
  sat.addEventListener('input', updateSwatch);
  con.addEventListener('input', updateSwatch);

  function showCharacter(i){
    const ch = gameChars[i];
    currentRegion = ch.regions[Math.floor(Math.random()*ch.regions.length)];

    overlay.style.background = 'rgba(128,128,128,0.75)';
    overlay.textContent = currentRegion.name;
    overlay.dataset.targetColor = currentRegion.color;

    // Load image; position overlay once it's rendered
    img.onload = () => {
      positionOverlay(overlay, img, currentRegion);
    };
    img.src = ch.image.url;
    img.alt = ch.name;

    // If the image was already cached it won't fire onload — trigger manually
    if(img.complete) positionOverlay(overlay, img, currentRegion);

    charCaption.textContent = `${ch.show} — ${ch.name}`;
    scoreDiv.textContent = `Score: — / 10  (${i+1}/5)`;
  }

  // Re-position overlay on window resize
  window.addEventListener('resize', ()=>{
    if(currentRegion) positionOverlay(overlay, img, currentRegion);
  });

  submit.addEventListener('click', ()=>{
    const targetHex = overlay.dataset.targetColor;
    const targetHSL = hexToHsl(targetHex);
    const h = +hue.value, s = +sat.value;
    const baseL=50;
    const l = Math.min(100, Math.max(0, Math.round(baseL*(1 + (+con.value)/100))));
    const got = {h,s,l};
    const res = scoreMatch(targetHSL, got);
    totalScore += res.score;
    scoreDiv.textContent = `Score: ${res.score} / 10  (${idx+1}/5)`;
    overlay.style.background = 'rgba(128,128,128,0.35)';
    idx++;
    if(idx < gameChars.length){
      setTimeout(()=>{ showCharacter(idx); }, 900);
    } else {
      setTimeout(()=>{
        scoreDiv.textContent = `Final: ${totalScore} / ${gameChars.length*10}`;
        charCaption.textContent = `Game complete! Total: ${totalScore} / ${gameChars.length*10}`;
      }, 900);
    }
  });

  updateSwatch();
  showCharacter(0);
});
