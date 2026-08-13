const $=id=>document.getElementById(id);

const state = {
  applied:{rpm:12,target:45,radius:15,mass:68,time:120},
  pending:{rpm:12,target:45,radius:15,mass:68,time:120},
  running:true, elapsed:0, angle:-55, history:[]
};

function physics(c){
  const omega=c.rpm*2*Math.PI/60;
  const rim=omega*c.radius;
  const accel=omega*omega*c.radius;
  const gravity=accel/9.80665;
  // Coriolis magnitude for the selected payload and relative target velocity.
  const coriolis=2*c.mass*omega*Math.abs(c.target-rim)*0.02;
  return {omega,rim,accel,gravity,coriolis};
}
function fmt(n,d=2){return Number(n).toFixed(d)}

function updatePendingLabels(){
  const p=state.pending;
  $('rpmOut').value=fmt(p.rpm,1);
  $('targetOut').value=fmt(p.target,1);
  $('radiusOut').value=fmt(p.radius,1);
  $('massOut').value=fmt(p.mass,0);
  $('timeOut').value=fmt(p.time,0);
  const f=physics(p);
  $('omegaValue').innerHTML=fmt(f.omega,4)+' <i>rad/s</i>';
  $('rimValue').innerHTML=fmt(f.rim,3)+' <i>m/s</i>';
  $('gravityValue').innerHTML=fmt(f.gravity,3)+' <i>g</i>';
  $('coriolisValue').innerHTML=fmt(f.coriolis,2)+' <i>N</i>';
  $('accelValue').innerHTML=fmt(f.accel,3)+' <i>m/s²</i>';
  $('configState').textContent='● UNSAVED PARAMETER CHANGES';
  $('configState').style.color='var(--orange)';
}
function readPending(){
  state.pending={
    rpm:+$('rpm').value,target:+$('targetVelocity').value,
    radius:+$('radius').value,mass:+$('mass').value,time:+$('simulationTime').value
  };
  updatePendingLabels();
}
['rpm','targetVelocity','radius','mass','simulationTime'].forEach(id=>$(id).addEventListener('input',readPending));

function applyConfig(){
  state.applied={...state.pending};
  state.elapsed=0; state.history=[];
  state.angle=-55;
  updateAllFromApplied();
  $('configState').textContent='● CONFIGURATION APPLIED';
  $('configState').style.color='var(--green)';
  $('simStatus').textContent='Real-time dynamics — applied configuration is live';
  $('simBadge').textContent='● LIVE';
  $('simBadge').className='badge green';
}
$('applyConfig').onclick=applyConfig;

$('resetConfig').onclick=()=>{
  $('rpm').value=12;$('targetVelocity').value=45;$('radius').value=15;$('mass').value=68;$('simulationTime').value=120;
  readPending();
};

function updateAllFromApplied(){
  const c=state.applied,f=physics(c);
  $('simVelocity').innerHTML=fmt(f.rim,2)+' <i>m/s</i>';
  $('simRpm').innerHTML=fmt(c.rpm,1)+' <i>RPM</i>';
  $('simGravity').innerHTML=fmt(f.gravity,3)+' <i>g</i>';
  $('simCoriolis').innerHTML=fmt(f.coriolis,2)+' <i>N</i>';
  $('liveConfig').textContent=`${fmt(c.rpm,1)} RPM / ${fmt(c.radius,1)} m / ${fmt(c.mass,0)} kg`;
  $('govSlider').value=c.target;
  $('govTarget').innerHTML=fmt(c.target,1)+' <small>m/s</small>';
  $('flowTarget').textContent=fmt(c.target,1)+' m/s';
  $('flowCurrent').textContent=fmt(f.rim,2)+' m/s';
  $('govCurrent').innerHTML=fmt(f.rim,2)+' <i>m/s</i>';
  $('govError').innerHTML=fmt(c.target-f.rim,2)+' <i>m/s</i>';
  $('flowOutput').textContent=fmt(f.rim+(c.target-f.rim)*.72,2)+' m/s';

  $('dashRpm').innerHTML=fmt(c.rpm,1)+' <i>RPM</i>';
  $('dashGravity').innerHTML=fmt(f.gravity,2)+' <i>g</i>';
  $('dashRadius').innerHTML=fmt(c.radius,1)+' <i>m</i>';
  $('dashVelocity').innerHTML=fmt(f.rim,2)+' <i>m/s</i>';
  $('dashCoriolis').innerHTML=fmt(f.coriolis,2)+' <i>N</i>';
  $('dashInterlock').textContent='● '+fmt(f.coriolis,2)+' N';

  $('resRpm').innerHTML=fmt(c.rpm,1)+' <i>rpm</i>';
  $('resVelocity').innerHTML=fmt(f.rim,2)+' <i>m/s</i>';
  $('resGravity').innerHTML=fmt(f.gravity,3)+' <i>g</i>';
  $('resCoriolis').innerHTML=fmt(f.coriolis,2)+' <i>N</i>';

  updateVector();
  buildResultTable();
}

function updateVector(){
  const c=state.applied,f=physics(c);
  const targetDiff=Math.abs(c.target-f.rim);
  const deflection=Math.min(38, targetDiff/c.target*28 + f.coriolis/Math.max(1,c.mass)*4);
  const visualAngle=state.angle;
  $('simArm').style.transform=`rotate(${visualAngle}deg)`;
  const radialLen=Math.max(30,Math.min(115,f.rim*3.2));
  $('radialVector').style.width=radialLen+'px';
  $('radialVector').style.transform=`rotate(${visualAngle}deg)`;
  $('angleMarker').style.transform=`rotate(${visualAngle+90}deg)`;
  $('simAngle').innerHTML=fmt(deflection,1)+' <i>deg</i>';
  $('vectorReadout').textContent=`● DEFLECTION ${fmt(deflection,1)}°`;
}

function buildResultTable(){
  const c=state.applied,f=physics(c), tbody=$('resultTable'); tbody.innerHTML='';
  [0,.25,.5,.75,1].forEach((t,i)=>{
    const rpm=c.rpm*(.15+.85*t);
    const omega=rpm*2*Math.PI/60;
    const v=omega*c.radius;
    const g=omega*omega*c.radius/9.80665;
    const cor=2*c.mass*omega*Math.abs(c.target-v)*.02;
    tbody.insertAdjacentHTML('beforeend',`<tr><td>${fmt(c.time*t,1)} s</td><td>${fmt(rpm,2)}</td><td>${fmt(v,2)} m/s</td><td>${fmt(g,3)} g</td><td>${fmt(cor,2)} N</td></tr>`);
  });
}

function drawLineChart(canvasId, values, target=null, colors=['#12d8ff','#31e2a4']){
  const c=$(canvasId); if(!c)return;
  const ctx=c.getContext('2d'), rect=c.getBoundingClientRect(), dpr=devicePixelRatio||1;
  c.width=Math.max(300,rect.width)*dpr;c.height=Math.max(100,rect.height)*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  const w=rect.width,h=rect.height;ctx.clearRect(0,0,w,h);
  ctx.strokeStyle='#17304a';ctx.lineWidth=1;
  for(let y=10;y<h;y+=25){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  const all=target?[...values,target]:values, min=Math.min(...all)*.9,max=Math.max(...all)*1.1;
  const path=(arr,color)=>{
    ctx.beginPath();arr.forEach((v,i)=>{const x=i*(w-10)/Math.max(1,arr.length-1)+5,y=h-10-(v-min)/(max-min)*(h-20);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
  };
  path(values,colors[0]);
  if(target!==null) path(Array(values.length).fill(target),colors[1]);
}

function animationStep(){
  if(state.running){
    const c=state.applied,f=physics(c);
    state.elapsed+=.15;
    state.angle=(state.angle+c.rpm*.018)%360;
    const wave=Math.sin(state.elapsed*.9)*.05;
    const current=f.rim*(1+wave);
    state.history.push(current); if(state.history.length>80)state.history.shift();
    $('elapsed').textContent='ELAPSED TIME '+new Date(state.elapsed*1000).toISOString().substr(14,5);
    $('simStatus').textContent=`Real-time dynamics — ${fmt(state.elapsed,1)}s elapsed`;
    $('simVelocity').innerHTML=fmt(current,2)+' <i>m/s</i>';
    $('govCurrent').innerHTML=fmt(current,2)+' <i>m/s</i>';
    $('govError').innerHTML=fmt(c.target-current,2)+' <i>m/s</i>';
    $('flowCurrent').textContent=fmt(current,2)+' m/s';
    $('flowOutput').textContent=fmt(current+(c.target-current)*.72,2)+' m/s';
    updateVector();
  }
  drawLineChart('velocityChart',state.history.length?state.history:[physics(state.applied).rim],state.applied.target);
  drawLineChart('errorChart',state.history.map(v=>state.applied.target-v),0,['#ff6874','#17304a']);
  drawLineChart('outputChart',state.history.map(v=>v+(state.applied.target-v)*.72),null,['#12d8ff','#31e2a4']);
  const f=physics(state.applied);
  const vals=state.history.length?state.history: [f.rim];
  drawLineChart('resultVelocity',vals,state.applied.target);
  drawLineChart('resultAccel',vals.map(v=>f.accel*(v/f.rim)),null,['#12d8ff','#31e2a4']);
  requestAnimationFrame(animationStep);
}

$('pauseBtn').onclick=()=>{
  state.running=!state.running;
  $('pauseBtn').textContent=state.running?'Ⅱ PAUSE':'▶ RESUME';
  $('simBadge').textContent=state.running?'● LIVE':'● PAUSED';
};
$('resetSim').onclick=()=>{state.elapsed=0;state.history=[];state.angle=-55;state.running=true;$('pauseBtn').textContent='Ⅱ PAUSE';updateAllFromApplied()};
$('govSlider').oninput=e=>{
  const v=+e.target.value;$('govTarget').innerHTML=fmt(v,1)+' <small>m/s</small>';$('flowTarget').textContent=fmt(v,1)+' m/s';
  const current=physics(state.applied).rim;$('govError').innerHTML=fmt(v-current,2)+' <i>m/s</i>';
};

document.querySelectorAll('.nav-item').forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active');$(btn.dataset.page).classList.add('active');
});

$('exportCsv').onclick=()=>{
  const c=state.applied, f=physics(c);
  let csv='Time(s),RPM,Velocity(m/s),Gravity(g),Coriolis(N)\\n';
  for(let i=0;i<=10;i++){const t=i/10, rpm=c.rpm*(.15+.85*t),om=rpm*2*Math.PI/60,v=om*c.radius,g=om*om*c.radius/9.80665,co=2*c.mass*om*Math.abs(c.target-v)*.02;csv+=`${(c.time*t).toFixed(1)},${rpm.toFixed(2)},${v.toFixed(2)},${g.toFixed(3)},${co.toFixed(2)}\\n`}
  const blob=new Blob([csv],{type:'text/csv'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='centrifuge-results.csv';a.click();URL.revokeObjectURL(a.href);
};

readPending();applyConfig();animationStep();
