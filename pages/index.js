import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// ─── NEON PERFORMANCE THEME ──────────────────────────────────────────────────
const TH = {
  bg:'#0B1020',
  card:'#171D2E',
  cardAlt:'#12182A',
  input:'#1A2033',
  text:'#F4F6FA',
  textSec:'#A6B0C3',
  textMuted:'#6F7B91',
  accent:'#EC7487',
  success:'#4DD4FF',
  border:'rgba(77,212,255,0.12)',
  borderMed:'rgba(77,212,255,0.25)',
  borderGlow:'rgba(77,212,255,0.35)',
  shadow:'0 0 16px rgba(77,212,255,0.06), 0 8px 32px rgba(0,0,0,0.35)',
  shadowSm:'0 0 8px rgba(77,212,255,0.04), 0 2px 12px rgba(0,0,0,0.25)',
  glow:'0 0 8px rgba(77,212,255,0.08), inset 0 1px 0 rgba(255,255,255,0.03)',
  radius:18,
  radiusSm:14,
  heading:"'Satoshi', sans-serif",
  cyan:'#4DD4FF',
  purple:'#8B5CF6',
  pink:'#EC7487',
};

// ─── WORKOUT TYPES (Delts ↔ Rowing colors swapped) ─────────────────────────
const WORKOUT_TYPES = [
  { key:'L',label:'Legs',color:'#EC7480',textColor:'#6B1D25',hasIntensity:true },
  { key:'B',label:'Back & Biceps',color:'#FFB069',textColor:'#5A3010',hasIntensity:true },
  { key:'C',label:'Chest & Triceps',color:'#FFF296',textColor:'#6B5A00',hasIntensity:true },
  { key:'D',label:'Delts',color:'#85D2FF',textColor:'#0C3A6B',hasIntensity:true },
  { key:'R',label:'Rowing',color:'#9EF0DE',textColor:'#0A4A3A',hasIntensity:false },
  { key:'KB',label:'KB',color:'#9884E8',textColor:'#2A1F6B',hasIntensity:false },
  { key:'KBR',label:'KB + Rowing',color:'#9884E8',textColor:'#FFFFFF',hasIntensity:false,isSplit:true,color2:'#9EF0DE' },
];

const DEFAULT_EXERCISES = {
  L:['Squats','Smith Squats','Leg Extensions','Single Leg KB Squats','KB Lunges','Lying Ham Curl','Seated Leg Curl'],
  B:['Lying EZ Rows','Wide Grip Pulldowns','Seated Cable Row','Close Grip Pulldowns','Dbell Rows','Fixed Pulldowns','Assisted Pull Ups','Dbell Curls','Standing EZ Curls','EZ Preacher Curls','Preacher Dbell Curls','Cable Curls','Single Cable Curls','21s'],
  C:['Incline Bench Press','Incline Dbell Press','Pec Dec','Incline Smith Press','Flye Machine','Flat Dbell Press','Cable Cross Overs','Bench Dips','Dbell Raises','KB Kick Back','DB Kick Backs','Cable Pushdowns','Tri Bar Push Downs','Close Grip Bench'],
  D:['Dbell Press','Side Raises','Leaning Side Raises','Bar Raises','KB Swings','B.O Dbell Rows','Single Arm B.O Rows','EZ Rear Rows'],
  R:[],KB:[],KBR:[],
};

const HEAT = {
  green1:'#34D399',green1Text:'#022C22',
  green2:'#10B981',green2Text:'#022C22',
  amber:'#F59E0B',amberText:'#1C1103',
  red:'#EF4444',redText:'#FFF0F0',
  none:'#12182A',noneText:'#6F7B91',
};
const DW_SUBJECTS = { A:'Ozzy Wizzpop',B:'Reading',C:'Magic study' };
const DW_COLORS = { A:'#34D399',B:'#4DD4FF',C:'#C084FC' };

function getDaysInMonth(y,m) { return new Date(y,m+1,0).getDate(); }
function getFirstDayOfMonth(y,m) { return new Date(y,m,1).getDay(); }
function getMondayOffset(y,m) { const fd=getFirstDayOfMonth(y,m); return fd===0?6:fd-1; }
function pad(n) { return String(n).padStart(2,'0'); }
function toDateStr(y,m,d) { return `${y}-${pad(m+1)}-${pad(d)}`; }
function todayStr() { const n=new Date(); return `${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())}`; }
function fmtDate(str) { if(!str) return ''; const [y,m,d]=str.split('-'); return new Date(y,m-1,d).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}); }

// ─── SHARED COMPONENTS ──────────────────────────────────────────────────────
function Modal({ title,onClose,children }) {
  return (<div style={{ position:'fixed',inset:0,background:'rgba(4,8,20,0.85)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-start',justifyContent:'center',zIndex:1000,overflowY:'auto',padding:'1rem' }}>
    <div style={{ background:TH.card,borderRadius:TH.radius,padding:'1.5rem',width:360,maxWidth:'95vw',marginTop:'2rem',marginBottom:'2rem',boxShadow:`${TH.shadow}, 0 0 1px ${TH.borderGlow}`,border:`1px solid ${TH.borderMed}` }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem' }}>
        <span style={{ fontWeight:700,fontSize:17,fontFamily:TH.heading,color:TH.text }}>{title}</span>
        <button onClick={onClose} style={{ background:'rgba(77,212,255,0.08)',border:`1px solid ${TH.border}`,fontSize:18,color:TH.textSec,padding:'2px 8px',cursor:'pointer',borderRadius:8,lineHeight:'1.4' }}>×</button>
      </div>{children}</div></div>);
}
function StatCard({ label,value,sub }) {
  return (<div style={{ background:TH.card,borderRadius:TH.radiusSm,padding:'14px 16px',boxShadow:TH.shadowSm,border:`1px solid ${TH.border}`,position:'relative',overflow:'hidden' }}>
    <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg, transparent, ${TH.borderGlow}, transparent)` }} />
    <div style={{ fontSize:11,color:TH.textMuted,marginBottom:5,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em' }}>{label}</div>
    <div style={{ fontSize:24,fontWeight:800,fontFamily:TH.heading,color:TH.text }}>{value}</div>
    {sub && <div style={{ fontSize:11,color:TH.textMuted,marginTop:3 }}>{sub}</div>}</div>);
}
function Btn({ onClick,children,variant='primary',style={} }) {
  const base = { border:'none',borderRadius:TH.radiusSm,padding:'12px 18px',fontWeight:600,fontSize:14,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease' };
  const variants = {
    primary:{background:TH.pink,color:'#fff',boxShadow:'0 0 20px rgba(236,116,135,0.25)'},
    secondary:{background:'rgba(77,212,255,0.06)',border:`1px solid ${TH.borderMed}`,color:TH.textSec},
    danger:{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.3)',color:'#EF4444'},
    ghost:{background:'none',border:'none',color:TH.textSec,padding:'6px 10px'},
  };
  return <button onClick={onClick} style={{ ...base,...variants[variant],...style }}>{children}</button>;
}
function SplitIcon({ size=30,radius=8 }) {
  return (<span style={{ display:'inline-block',width:size,height:size,borderRadius:radius,overflow:'hidden',position:'relative',flexShrink:0,verticalAlign:'middle' }}>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position:'absolute',inset:0,width:'100%',height:'100%' }}>
      <polygon points="0,0 100,0 0,100" fill="#9884E8" /><polygon points="100,0 100,100 0,100" fill="#9EF0DE" /></svg></span>);
}
const TOP_SECTIONS = [{key:'gym',label:'GYM'},{key:'nutrition',label:'NUTRITION'},{key:'habits',label:'HABITS'}];

// ─── SHARED STYLES ──────────────────────────────────────────────────────────
const inputStyle = {
  padding:'9px',borderRadius:10,
  border:`1px solid ${TH.borderMed}`,
  background:TH.input,color:TH.text,fontSize:14,textAlign:'center',fontFamily:'inherit',
  boxShadow:TH.glow,width:'100%',minWidth:0,boxSizing:'border-box',
};
const cardStyle = {
  background:TH.card,borderRadius:TH.radiusSm,
  boxShadow:TH.shadowSm,border:`1px solid ${TH.border}`,
  position:'relative',overflow:'hidden',
};

function CalendarGrid({ year,month,getCellStyle,onDayClick }) {
  const [today,setToday] = useState('');
  useEffect(() => { setToday(todayStr()); }, []);
  const days = getDaysInMonth(year,month);
  return (<div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:5,marginBottom:'1.5rem' }}>
    {['M','T','W','T','F','S','S'].map((d,i) => (<div key={i} style={{ textAlign:'center',fontSize:11,color:TH.textMuted,paddingBottom:6,fontWeight:600 }}>{d}</div>))}
    {Array.from({ length:getMondayOffset(year,month) }).map((_,i) => <div key={`e${i}`} />)}
    {Array.from({ length:days },(_,i) => i+1).map(day => {
      const s = getCellStyle(day); const isSplit = !!s.splitBg;
      const isToday = today && toDateStr(year,month,day) === today;
      return (<div key={day} onClick={() => onDayClick(day)}
        style={{ aspectRatio:'1',borderRadius:s.borderRadius||TH.radiusSm,border:s.border||'none',background:isSplit?'transparent':(s.background||TH.cardAlt),display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:s.color||TH.textMuted,fontWeight:s.fontWeight||500,cursor:'pointer',position:'relative',transition:'transform 150ms ease',overflow:'hidden',boxShadow:isToday?`0 0 0 2px ${TH.cyan}, 0 0 12px rgba(77,212,255,0.35)`:'none' }}>
        {isSplit && (<svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position:'absolute',inset:0,width:'100%',height:'100%' }}>
          <polygon points="0,0 100,0 0,100" fill={s.splitBg[0]} /><polygon points="100,0 100,100 0,100" fill={s.splitBg[1]} /></svg>)}
        <span style={{ position:'relative',zIndex:1,textShadow:isSplit?'0 0 3px rgba(0,0,0,0.35)':'none' }}>{day}</span>
        {s.letter && <span style={{ position:'absolute',bottom:2,left:3,fontSize:8,fontWeight:700,color:s.color,opacity:0.85,zIndex:1,textShadow:isSplit?'0 0 3px rgba(0,0,0,0.35)':'none' }}>{s.letter}</span>}
        {s.intensity && <span style={{ position:'absolute',bottom:2,right:3,fontSize:8,fontWeight:700,color:s.color,opacity:0.85,zIndex:1 }}>{s.intensity}</span>}
        {s.bottomLabel && <span style={{ position:'absolute',bottom:2,fontSize:8,fontWeight:600,color:s.color,opacity:0.85,zIndex:1 }}>{s.bottomLabel}</span>}
      </div>);
    })}</div>);
}

// ─── GYM CALENDAR ───────────────────────────────────────────────────────────
function GymCalendar({ year,month }) {
  const [data,setData] = useState([]);
  const [logs,setLogs] = useState([]);
  const [modal,setModal] = useState(null);
  const [detailModal,setDetailModal] = useState(null);
  const [form,setForm] = useState({ type:'L' });
  const [editSession,setEditSession] = useState(null);
  const [editing,setEditing] = useState(false);
  const [moveMode,setMoveMode] = useState(false);
  const [moveDate,setMoveDate] = useState('');

  useEffect(() => { refreshData(); }, [year,month]);

  const byDate = {}; data.forEach(d => { byDate[d.date] = d; });
  const logByDate = {}; logs.forEach(l => { logByDate[l.date] = l; });

  function refreshData() {
    fetch(`/api/workouts?year=${year}&month=${month+1}`).then(r=>r.json()).then(setData);
    fetch('/api/exercise-log').then(r=>r.json()).then(setLogs);
  }

  async function save() {
    await fetch('/api/workouts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:modal,type:form.type,intensity:null})});
    setModal(null); refreshData();
  }
  async function remove() {
    await fetch('/api/workouts',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:modal})});
    setModal(null); refreshData();
  }

  async function moveWorkout(oldDate, newDate) {
    const entry = byDate[oldDate]; const log = logByDate[oldDate];
    if (!entry) return;
    await fetch('/api/workouts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:newDate,type:entry.type,intensity:entry.intensity||null})});
    if (log && !log.noData) { const newLog = {...log, date:newDate}; delete newLog._id; await fetch('/api/exercise-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(newLog)}); }
    if (log && log.noData) { await fetch('/api/exercise-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:newDate,workoutType:entry.type,noData:true,exercises:[]})}); }
    await fetch('/api/workouts',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:oldDate})});
    setModal(null); setDetailModal(null); setEditSession(null); setEditing(false); setMoveMode(false); setMoveDate(''); refreshData();
  }

  async function saveEditedSession() {
    if (!editSession) return;
    await fetch('/api/exercise-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...editSession,noData:false})});
    setDetailModal(null); setEditSession(null); setEditing(false);
    fetch('/api/exercise-log').then(r=>r.json()).then(setLogs);
  }
  function openDay(day) {
    const dateStr = toDateStr(year,month,day);
    const entry = byDate[dateStr]; const log = logByDate[dateStr];
    if (entry && log && !log.noData) { setEditSession(JSON.parse(JSON.stringify(log))); setDetailModal(dateStr); setMoveMode(false); setMoveDate(''); }
    else { setForm(entry ? {type:entry.type} : {type:'L'}); setModal(dateStr); setMoveMode(false); setMoveDate(''); }
  }
  function updateEditSet(exIdx,setIdx,field,value) { setEditSession(prev => ({...prev,exercises:prev.exercises.map((ex,i) => i!==exIdx?ex:{...ex,sets:ex.sets.map((s,j) => j!==setIdx?s:{...s,[field]:value})})})); }
  function addEditSet(exIdx) { setEditSession(prev => ({...prev,exercises:prev.exercises.map((ex,i) => i!==exIdx?ex:{...ex,sets:[...ex.sets,{weight:'',reps:''}]})})); }
  function startEditing() { setEditSession(prev => ({...prev,exercises:(prev.exercises||[]).map(ex => ({...ex,sets:(!ex.sets||ex.sets.length<3)?[...(ex.sets||[]),...Array.from({length:3-(ex.sets||[]).length},()=>({weight:'',reps:''}))]:ex.sets}))})); setEditing(true); }

  function closeModal() { setModal(null); setMoveMode(false); setMoveDate(''); }
  function closeDetailModal() { setDetailModal(null); setEditSession(null); setEditing(false); setMoveMode(false); setMoveDate(''); }

  return (<div>
    <CalendarGrid year={year} month={month}
      getCellStyle={day => {
        const entry = byDate[toDateStr(year,month,day)];
        if (!entry) return {border:`1px solid ${TH.border}`,color:TH.textMuted,borderRadius:TH.radiusSm};
        const wt = WORKOUT_TYPES.find(w => w.key===entry.type);
        if (wt?.isSplit) return {splitBg:[wt.color,wt.color2],color:'#FFFFFF',borderRadius:TH.radiusSm,fontWeight:600,letter:entry.type,intensity:entry.intensity||null};
        return {background:wt?.color||'#888',color:wt?.textColor||'#fff',borderRadius:TH.radiusSm,fontWeight:600,letter:entry.type,intensity:entry.intensity||null};
      }}
      onDayClick={day => openDay(day)}
    />
    <div style={{ display:'flex',flexWrap:'wrap',gap:12,marginBottom:'1.5rem' }}>
      {WORKOUT_TYPES.map(w => (<div key={w.key} style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:TH.textSec }}>
        {w.isSplit ? <SplitIcon size={12} radius={4} /> : <div style={{ width:12,height:12,borderRadius:4,background:w.color }} />}
        <span style={{ fontWeight:700,color:TH.text }}>{w.key}</span> {w.label}</div>))}
    </div>

    {modal && (<Modal title={`Log workout — ${fmtDate(modal)}`} onClose={closeModal}>
      <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
        {!moveMode ? (<>
          <div>
            <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:8,fontWeight:500 }}>Workout type</label>
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {WORKOUT_TYPES.map(w => (<button key={w.key} onClick={() => setForm(f => ({...f,type:w.key}))}
                style={{ display:'flex',alignItems:'center',gap:10,padding:'11px 14px',borderRadius:TH.radiusSm,border:`2px solid ${form.type===w.key?(w.isSplit?'#B0A0F0':w.color):TH.border}`,background:form.type===w.key?(w.isSplit?'rgba(152,132,232,0.12)':w.color+'20'):TH.cardAlt,textAlign:'left',cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease',boxShadow:form.type===w.key?`0 0 12px ${w.color}30`:'none' }}>
                {w.isSplit ? <SplitIcon size={30} radius={8} /> : <span style={{ width:30,height:30,borderRadius:8,background:w.color,display:'flex',alignItems:'center',justifyContent:'center',color:w.textColor,fontSize:12,fontWeight:700,flexShrink:0 }}>{w.key}</span>}
                <span style={{ fontSize:14,color:form.type===w.key?TH.text:TH.textSec,fontWeight:form.type===w.key?600:400 }}>{w.label}</span>
              </button>))}
            </div>
          </div>
          <Btn onClick={save}>Save</Btn>
          {byDate[modal] && <Btn onClick={() => {setMoveMode(true);setMoveDate(modal);}} variant="secondary">Move to different date</Btn>}
          {byDate[modal] && <Btn onClick={remove} variant="danger">Remove entry</Btn>}
        </>) : (<>
          <div>
            <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:8,fontWeight:500 }}>Move workout to new date</label>
            <input type="date" value={moveDate} onChange={e => setMoveDate(e.target.value)} style={{ width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:16,fontFamily:'inherit',boxShadow:TH.glow }} />
            {moveDate && moveDate!==modal && (<div style={{ fontSize:12,color:TH.textSec,marginTop:8 }}>
              Moving from {fmtDate(modal)} → {fmtDate(moveDate)}
              {logByDate[modal] && !logByDate[modal].noData && <div style={{ color:TH.cyan,marginTop:4 }}>Session data will also be moved</div>}
            </div>)}
          </div>
          <Btn onClick={() => {if(moveDate&&moveDate!==modal)moveWorkout(modal,moveDate);}} style={{ opacity:moveDate&&moveDate!==modal?1:0.4 }}>Confirm move</Btn>
          <Btn onClick={() => setMoveMode(false)} variant="secondary">Cancel</Btn>
        </>)}
      </div>
    </Modal>)}

    {detailModal && editSession && (<Modal title={`Session — ${fmtDate(detailModal)}`} onClose={closeDetailModal}>
      {(() => {
        const wt = WORKOUT_TYPES.find(w => w.key===editSession.workoutType);
        const isRowingType = editSession.workoutType==='R'||editSession.workoutType==='KBR';
        return (<div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:2 }}>
            {wt?.isSplit ? <SplitIcon size={30} radius={8} /> : <span style={{ background:wt?.color,color:wt?.textColor,borderRadius:8,fontSize:12,fontWeight:700,padding:'5px 12px' }}>{editSession.workoutType}</span>}
            <span style={{ fontWeight:700,fontSize:15,fontFamily:TH.heading,color:TH.text }}>{wt?.label}</span>
            {editSession.intensity && <span style={{ fontSize:12,color:TH.textSec }}>Intensity {editSession.intensity}</span>}
          </div>
          {!editing && !moveMode ? (<>
            {isRowingType && <div style={{ fontSize:14,color:TH.textSec,padding:'6px 0' }}>{editSession.rowingType==='time'?`${editSession.rowingValue} minutes`:`${editSession.rowingValue} metres`}</div>}
            {!isRowingType && (editSession.exercises||[]).map((ex,exIdx) => {
              const filledSets = ex.sets.filter(s=>s.reps||s.weight); if(filledSets.length===0) return null;
              return (<div key={exIdx} style={{ padding:'8px 0',borderBottom:`1px solid ${TH.border}` }}>
                <div style={{ fontWeight:600,fontSize:13,color:TH.text,marginBottom:5 }}>{ex.name}</div>
                <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>{filledSets.map((s,i) => <span key={i} style={{ background:TH.cardAlt,borderRadius:6,padding:'4px 10px',fontSize:12,color:TH.textSec,border:`1px solid ${TH.border}` }}>{s.reps} × {s.weight}kg</span>)}</div>
              </div>);
            })}
            {editSession.sessionNotes && (<div style={{ padding:'8px 0',borderTop:`1px solid ${TH.border}`,marginTop:2 }}>
              <div style={{ fontSize:11,color:TH.textMuted,marginBottom:3 }}>Notes</div>
              <div style={{ fontSize:13,color:TH.textSec }}>{editSession.sessionNotes}</div></div>)}
            <Btn onClick={startEditing} variant="secondary" style={{ marginTop:4 }}>Edit session</Btn>
            <Btn onClick={() => {setMoveMode(true);setMoveDate(detailModal);}} variant="secondary">Move to different date</Btn>
          </>) : moveMode ? (<>
            <div>
              <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:8,fontWeight:500 }}>Move workout to new date</label>
              <input type="date" value={moveDate} onChange={e => setMoveDate(e.target.value)} style={{ width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:16,fontFamily:'inherit',boxShadow:TH.glow }} />
              {moveDate && moveDate!==detailModal && (<div style={{ fontSize:12,color:TH.textSec,marginTop:8 }}>
                Moving from {fmtDate(detailModal)} → {fmtDate(moveDate)}
                <div style={{ color:TH.cyan,marginTop:4 }}>Session data will also be moved</div>
              </div>)}
            </div>
            <Btn onClick={() => {if(moveDate&&moveDate!==detailModal)moveWorkout(detailModal,moveDate);}} style={{ opacity:moveDate&&moveDate!==detailModal?1:0.4 }}>Confirm move</Btn>
            <Btn onClick={() => setMoveMode(false)} variant="secondary">Cancel</Btn>
          </>) : (<>
            {isRowingType && (<div>
              <div style={{ fontSize:12,color:TH.textSec,marginBottom:4 }}>{editSession.rowingType==='time'?'Time (minutes)':'Distance (metres)'}</div>
              <input type="number" value={editSession.rowingValue||''} onChange={e => setEditSession(prev => ({...prev,rowingValue:e.target.value}))} style={{ width:'100%',padding:'8px',borderRadius:10,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:14,fontFamily:'inherit',boxShadow:TH.glow }} />
            </div>)}
            {!isRowingType && (editSession.exercises||[]).map((ex,exIdx) => (<div key={exIdx} style={{ padding:'8px 0',borderBottom:`1px solid ${TH.border}` }}>
              <div style={{ fontWeight:600,fontSize:13,color:TH.text,marginBottom:6 }}>{ex.name}</div>
              {ex.sets.map((set,setIdx) => (<div key={setIdx} style={{ display:'flex',alignItems:'center',gap:6,marginBottom:5 }}>
                <span style={{ fontSize:11,color:TH.textMuted,width:22,flexShrink:0 }}>S{setIdx+1}</span>
                <input type="number" value={set.weight} onChange={e => updateEditSet(exIdx,setIdx,'weight',e.target.value)} style={{ width:52,padding:'5px 4px',borderRadius:8,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:13,textAlign:'center',fontFamily:'inherit',boxShadow:TH.glow }} />
                <span style={{ fontSize:11,color:TH.textMuted }}>kg ×</span>
                <input type="number" value={set.reps} onChange={e => updateEditSet(exIdx,setIdx,'reps',e.target.value)} style={{ width:44,padding:'5px 4px',borderRadius:8,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:13,textAlign:'center',fontFamily:'inherit',boxShadow:TH.glow }} />
                <span style={{ fontSize:11,color:TH.textMuted }}>reps</span>
              </div>))}
              <button onClick={() => addEditSet(exIdx)} style={{ fontSize:11,color:TH.textMuted,background:'none',border:`1px dashed ${TH.borderMed}`,borderRadius:8,padding:'5px 10px',cursor:'pointer',width:'100%',marginTop:3,fontFamily:'inherit' }}>+ Add set</button>
            </div>))}
            {editSession.sessionNotes!==undefined && (<div><div style={{ fontSize:11,color:TH.textMuted,marginBottom:3 }}>Notes</div>
              <textarea value={editSession.sessionNotes||''} onChange={e => setEditSession(prev => ({...prev,sessionNotes:e.target.value}))} rows={2} style={{ width:'100%',padding:'8px',borderRadius:10,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:13,fontFamily:'inherit',resize:'vertical',boxShadow:TH.glow }} /></div>)}
            <Btn onClick={saveEditedSession}>Save changes</Btn>
            <Btn onClick={() => setEditing(false)} variant="secondary">Cancel</Btn>
          </>)}
        </div>);
      })()}
    </Modal>)}
  </div>);
}

// ─── GYM LOG ────────────────────────────────────────────────────────────────
function GymLog() {
  const [workouts,setWorkouts] = useState([]); const [logged,setLogged] = useState([]); const [drafts,setDrafts] = useState([]);
  const [session,setSession] = useState(null); const [inactive,setInactive] = useState({}); const [exerciseOrder,setExerciseOrder] = useState({});
  const [showInactive,setShowInactive] = useState(false); const [inactiveBodyPart,setInactiveBodyPart] = useState(null);
  useEffect(() => { loadAll(); }, []);
  async function loadAll() {
    const now = new Date(); const y=now.getFullYear(),m=now.getMonth()+1;
    const [wRes,lRes,dRes,iRes,oRes] = await Promise.all([fetch(`/api/workouts?year=${y}&month=${m}`),fetch('/api/exercise-log'),fetch('/api/exercise-draft'),fetch('/api/inactive-exercises'),fetch('/api/exercise-order')]);
    const [w,l,d,i,o] = await Promise.all([wRes.json(),lRes.json(),dRes.json(),iRes.json(),oRes.json()]);
    setWorkouts(w); setLogged(l); setDrafts(d);
    const iMap = {}; i.forEach(x => { if(!iMap[x.bodyPart]) iMap[x.bodyPart]=[]; iMap[x.bodyPart].push(x); }); setInactive(iMap);
    const oMap = {}; o.forEach(x => { oMap[x.bodyPart] = x.exercises; }); setExerciseOrder(oMap);
  }
  const loggedDates = new Set(logged.map(l => l.date));
  const pending = workouts.filter(w => !loggedDates.has(w.date)).sort((a,b) => b.date.localeCompare(a.date));
  async function markNoData(workout) { await fetch('/api/exercise-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:workout.date,workoutType:workout.type,noData:true,exercises:[]})}); loadAll(); }
  function openSession(workout) {
    const draft = drafts.find(d => d.date===workout.date);
    if (draft) { setSession(draft); return; }
    const wt = WORKOUT_TYPES.find(w => w.key===workout.type);
    const inactiveList = inactive[workout.type]||[]; const inactiveNames = inactiveList.map(i => i.exercise);
    const savedOrder = exerciseOrder[workout.type]; const defaultList = DEFAULT_EXERCISES[workout.type]||[];
    let orderedList; if(savedOrder){const extras=defaultList.filter(ex=>!savedOrder.includes(ex));orderedList=[...savedOrder,...extras];}else{orderedList=defaultList;}
    const activeExercises = orderedList.filter(ex => !inactiveNames.includes(ex));
    setSession({date:workout.date,workoutType:workout.type,workoutLabel:wt?.label||workout.type,intensity:null,exercises:activeExercises.map(name=>({name,sets:[{weight:'',reps:''},{weight:'',reps:''},{weight:'',reps:''}]}))});
  }
  async function saveSession(sessionData,complete) {
    if(complete){
      await fetch('/api/exercise-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...sessionData,noData:false})});
      if(sessionData.intensity){await fetch('/api/workouts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:sessionData.date,type:sessionData.workoutType,intensity:sessionData.intensity})});}
      await fetch('/api/exercise-draft',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:sessionData.date})});
      setSession(null); loadAll();
    } else { await fetch('/api/exercise-draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sessionData)}); setSession(null); loadAll(); }
  }
  async function moveToInactive(bodyPart,exercise) { await fetch('/api/inactive-exercises',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bodyPart,exercise})}); loadAll(); }
  async function restoreFromInactive(id) { await fetch('/api/inactive-exercises',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}); loadAll(); }
  async function deleteInactive(id) { await fetch('/api/inactive-exercises',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,permanent:true})}); loadAll(); }

  if(session){return <SessionLogger session={session} onSave={saveSession} onMoveInactive={moveToInactive} inactive={inactive} allLogs={logged} />;}
  return (<div>
    <div style={{ fontSize:12,color:TH.textMuted,marginBottom:'1rem',fontWeight:500 }}>Workouts waiting to be logged</div>
    {pending.length===0 && <div style={{ textAlign:'center',padding:'2.5rem',color:TH.textMuted,fontSize:14 }}>No workouts waiting to be logged</div>}
    {pending.map(w => {
      const wt = WORKOUT_TYPES.find(x => x.key===w.type); const draft = drafts.find(d => d.date===w.date);
      return (<div key={w.date} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',background:TH.card,borderRadius:TH.radiusSm,marginBottom:8,boxShadow:TH.shadowSm,border:`1px solid ${TH.border}`,position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg, transparent, ${TH.borderGlow}, transparent)` }} />
        <div><div style={{ fontSize:13,fontWeight:600,color:TH.text }}>{fmtDate(w.date)}</div>
          <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:4 }}>
            {wt?.isSplit ? <SplitIcon size={20} radius={6} /> : <span style={{ background:wt?.color,color:wt?.textColor,borderRadius:6,fontSize:11,fontWeight:700,padding:'2px 7px' }}>{w.type}</span>}
            <span style={{ fontSize:12,color:TH.textSec }}>{wt?.label}</span>
            {draft && <span style={{ fontSize:11,color:TH.cyan,fontWeight:600 }}>● in progress</span>}</div></div>
        <div style={{ display:'flex',gap:8 }}>
          <Btn onClick={() => openSession(w)} style={{ padding:'8px 16px',fontSize:13 }}>Record</Btn>
          <Btn onClick={() => markNoData(w)} variant="secondary" style={{ padding:'8px 14px',fontSize:13 }}>No data</Btn></div>
      </div>);
    })}
    {showInactive && inactiveBodyPart && (<Modal title={`Inactive — ${WORKOUT_TYPES.find(w=>w.key===inactiveBodyPart)?.label}`} onClose={() => setShowInactive(false)}>
      <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
        {(inactive[inactiveBodyPart]||[]).length===0 && <div style={{ color:TH.textMuted,fontSize:13 }}>No inactive exercises</div>}
        {(inactive[inactiveBodyPart]||[]).map(ex => (<div key={ex._id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:TH.cardAlt,borderRadius:8 }}>
          <span style={{ fontSize:14,color:TH.text }}>{ex.exercise}</span>
          <div style={{ display:'flex',gap:8 }}>
            <Btn onClick={() => {restoreFromInactive(ex._id);setShowInactive(false);}} style={{ padding:'6px 12px',fontSize:12 }}>Add back</Btn>
            <Btn onClick={() => deleteInactive(ex._id)} variant="danger" style={{ padding:'6px 12px',fontSize:12 }}>Delete</Btn></div>
        </div>))}</div>
    </Modal>)}
  </div>);
}

// ─── SESSION LOGGER (with + copy-set button) ────────────────────────────────
function SessionLogger({ session,onSave,onMoveInactive,inactive,allLogs }) {
  const [exercises,setExercises] = useState(session.exercises||[]);
  const [intensity,setIntensity] = useState(session.intensity||'3');
  const [showInactive,setShowInactive] = useState(false);
  const [previousData,setPreviousData] = useState({});
  const wt = WORKOUT_TYPES.find(w => w.key===session.workoutType);
  const isRowingType = session.workoutType==='R'||session.workoutType==='KBR';
  const [rowingType,setRowingType] = useState(session.rowingType||'time');
  const [rowingValue,setRowingValue] = useState(session.rowingValue||'');
  const [sessionNotes,setSessionNotes] = useState(session.sessionNotes||'');

  useEffect(() => {
    if(!allLogs||isRowingType) return;
    const sameBPLogs = allLogs.filter(l => l.workoutType===session.workoutType&&!l.noData&&l.date!==session.date).sort((a,b) => b.date.localeCompare(a.date));
    if(sameBPLogs.length===0) return;
    const prevMap = {}; (sameBPLogs[0].exercises||[]).forEach(ex => { prevMap[ex.name] = {sets:ex.sets,date:sameBPLogs[0].date}; });
    setPreviousData(prevMap);
  }, [allLogs,session.workoutType,session.date]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if(isFirstRender.current){isFirstRender.current=false;return;}
    const timer = setTimeout(() => {
      const draftData = {date:session.date,workoutType:session.workoutType,workoutLabel:session.workoutLabel,intensity:wt?.hasIntensity?intensity:null,exercises:isRowingType?[]:exercises,rowingType:isRowingType?rowingType:null,rowingValue:isRowingType?rowingValue:null,sessionNotes};
      fetch('/api/exercise-draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draftData)});
    }, 1500);
    return () => clearTimeout(timer);
  }, [exercises,intensity,rowingType,rowingValue,sessionNotes]);

  function updateSet(exIdx,setIdx,field,value) { setExercises(prev => prev.map((ex,i) => i!==exIdx?ex:{...ex,sets:ex.sets.map((s,j) => j!==setIdx?s:{...s,[field]:value})})); }
  function addSet(exIdx) { setExercises(prev => prev.map((ex,i) => i!==exIdx?ex:{...ex,sets:[...ex.sets,{weight:'',reps:''}]})); }
  function removeSet(exIdx,setIdx) { setExercises(prev => prev.map((ex,i) => i!==exIdx?ex:{...ex,sets:ex.sets.filter((_,j) => j!==setIdx)})); }

  // ── NEW: Copy current set's data to the next set ──
  function copySetToNext(exIdx,setIdx) {
    setExercises(prev => prev.map((ex,i) => {
      if(i!==exIdx) return ex;
      const currentSet = ex.sets[setIdx];
      const nextIdx = setIdx + 1;
      if(nextIdx < ex.sets.length) {
        // Copy into existing next set
        return {...ex, sets: ex.sets.map((s,j) => j===nextIdx ? {...s, weight:currentSet.weight, reps:currentSet.reps} : s)};
      } else {
        // Create a new set with copied values
        return {...ex, sets: [...ex.sets, {weight:currentSet.weight, reps:currentSet.reps}]};
      }
    }));
  }

  function moveToInactive(exIdx) { const ex=exercises[exIdx]; onMoveInactive(session.workoutType,ex.name); setExercises(prev => prev.filter((_,i) => i!==exIdx)); }
  function moveExercise(fromIdx,direction) {
    const toIdx=fromIdx+direction; if(toIdx<0||toIdx>=exercises.length) return;
    setExercises(prev => { const updated=[...prev]; [updated[fromIdx],updated[toIdx]]=[updated[toIdx],updated[fromIdx]];
      fetch('/api/exercise-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bodyPart:session.workoutType,exercises:updated.map(ex=>ex.name)})});
      return updated; });
  }
  function getSessionData() { return {date:session.date,workoutType:session.workoutType,workoutLabel:session.workoutLabel,intensity:wt?.hasIntensity?intensity:null,exercises:isRowingType?[]:exercises,rowingType:isRowingType?rowingType:null,rowingValue:isRowingType?rowingValue:null,sessionNotes}; }
  const inactiveList = inactive[session.workoutType]||[];

  return (<div>
    <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:'1.25rem' }}>
      {wt?.isSplit ? <SplitIcon size={34} radius={8} /> : <span style={{ background:wt?.color,color:wt?.textColor,borderRadius:8,fontSize:12,fontWeight:700,padding:'5px 12px' }}>{session.workoutType}</span>}
      <div><div style={{ fontWeight:700,fontSize:18,fontFamily:TH.heading,color:TH.text }}>{session.workoutLabel}</div>
        <div style={{ fontSize:12,color:TH.textMuted }}>{fmtDate(session.date)}</div></div></div>
    {wt?.hasIntensity && (<div style={{ marginBottom:'1.5rem' }}>
      <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:8,fontWeight:500 }}>Intensity</label>
      <div style={{ display:'flex',gap:8 }}>
        {['1','2','3'].map(n => (<button key={n} onClick={() => setIntensity(n)} style={{ flex:1,padding:'11px',borderRadius:TH.radiusSm,border:`2px solid ${intensity===n?TH.pink:TH.border}`,background:intensity===n?TH.pink:'transparent',fontWeight:700,fontSize:16,color:intensity===n?'#fff':TH.textMuted,cursor:'pointer',fontFamily:TH.heading,transition:'all 150ms ease',boxShadow:intensity===n?'0 0 16px rgba(236,116,135,0.3)':'none' }}>{n}</button>))}
      </div></div>)}
    {isRowingType && (<div style={{ marginBottom:'1.5rem' }}>
      <div style={{ display:'flex',gap:8,marginBottom:12 }}>
        {['time','distance'].map(t => (<button key={t} onClick={() => setRowingType(t)} style={{ flex:1,padding:'11px',borderRadius:TH.radiusSm,border:`2px solid ${rowingType===t?'#9EF0DE':TH.border}`,background:rowingType===t?'rgba(158,240,222,0.12)':'transparent',color:rowingType===t?'#9EF0DE':TH.textMuted,fontWeight:600,cursor:'pointer',fontFamily:'inherit',fontSize:14,transition:'all 150ms ease',boxShadow:rowingType===t?'0 0 12px rgba(158,240,222,0.15)':'none' }}>
          {t==='time'?'⏱ Time (mins)':'📏 Distance (m)'}</button>))}</div>
      <input type="number" value={rowingValue} onChange={e => setRowingValue(e.target.value)} placeholder={rowingType==='time'?'Minutes rowed':'Metres rowed'} style={{ width:'100%',padding:'12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:16,fontFamily:'inherit',boxShadow:TH.glow }} />
    </div>)}
    {!isRowingType && (<>
      {inactiveList.length>0 && (<button onClick={() => setShowInactive(!showInactive)} style={{ fontSize:12,color:TH.textMuted,background:TH.cardAlt,border:`1px solid ${TH.border}`,borderRadius:8,padding:'7px 14px',cursor:'pointer',marginBottom:'1rem',fontFamily:'inherit',fontWeight:500 }}>
        {showInactive?'Hide':'View'} INACTIVE exercises ({inactiveList.length})</button>)}
      {showInactive && (<div style={{ background:TH.card,border:`1px solid ${TH.border}`,borderRadius:TH.radiusSm,padding:'12px',marginBottom:'1rem' }}>
        <div style={{ fontSize:12,color:TH.textMuted,marginBottom:8,fontWeight:500 }}>Inactive exercises</div>
        {inactiveList.map(ex => (<div key={ex._id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:`1px solid ${TH.border}` }}>
          <span style={{ fontSize:13,color:TH.text }}>{ex.exercise}</span>
          <button onClick={() => {fetch('/api/inactive-exercises',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:ex._id})}).then(()=>{setExercises(prev=>[...prev,{name:ex.exercise,sets:[{weight:'',reps:''},{weight:'',reps:''},{weight:'',reps:''}]}]);setShowInactive(false);});}}
            style={{ fontSize:12,color:TH.cyan,background:'none',border:`1px solid ${TH.cyan}`,borderRadius:6,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit' }}>Add back</button>
        </div>))}</div>)}
      {exercises.length===0 && (<div style={{ textAlign:'center',padding:'2rem',color:TH.textMuted,fontSize:14 }}>No exercises added yet</div>)}
      {exercises.map((ex,exIdx) => {
        const prev = previousData[ex.name];
        return (<div key={exIdx} style={{ marginBottom:'1.25rem',background:TH.card,borderRadius:TH.radiusSm,padding:'12px',boxShadow:TH.shadowSm,border:`1px solid ${TH.border}`,position:'relative',overflow:'hidden' }}>
          <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg, transparent, ${TH.borderGlow}, transparent)` }} />
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem',gap:8 }}>
            <div style={{ display:'flex',alignItems:'center',gap:6,minWidth:0,flex:1 }}>
              <div style={{ display:'flex',flexDirection:'column',gap:2,flexShrink:0 }}>
                <button onClick={() => moveExercise(exIdx,-1)} disabled={exIdx===0} style={{ background:TH.cardAlt,border:`1px solid ${TH.border}`,borderRadius:4,padding:'4px 8px',fontSize:14,color:exIdx===0?TH.textMuted:TH.textSec,cursor:exIdx===0?'default':'pointer',lineHeight:'1' }}>▲</button>
                <button onClick={() => moveExercise(exIdx,1)} disabled={exIdx===exercises.length-1} style={{ background:TH.cardAlt,border:`1px solid ${TH.border}`,borderRadius:4,padding:'4px 8px',fontSize:14,color:exIdx===exercises.length-1?TH.textMuted:TH.textSec,cursor:exIdx===exercises.length-1?'default':'pointer',lineHeight:'1' }}>▼</button></div>
              <span style={{ fontWeight:600,fontSize:14,color:TH.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',minWidth:0 }}>{ex.name}</span></div>
            <button onClick={() => moveToInactive(exIdx)} style={{ fontSize:10,color:TH.textMuted,background:'none',border:`1px solid ${TH.border}`,borderRadius:6,padding:'4px 6px',cursor:'pointer',fontFamily:'inherit',flexShrink:0,whiteSpace:'nowrap' }}>Inactive</button></div>
          <div style={{ display:'grid',gridTemplateColumns:'26px 1fr 1fr 52px',gap:4,marginBottom:4 }}>
            <div /><div style={{ fontSize:10,color:TH.textMuted,textAlign:'center',fontWeight:500 }}>Weight (kg)</div><div style={{ fontSize:10,color:TH.textMuted,textAlign:'center',fontWeight:500 }}>Reps</div><div /></div>
          {ex.sets.map((set,setIdx) => (<div key={setIdx} style={{ display:'grid',gridTemplateColumns:'26px 1fr 1fr 52px',gap:4,marginBottom:5,alignItems:'center' }}>
            <div style={{ fontSize:11,color:TH.textMuted,textAlign:'center',fontWeight:500 }}>S{setIdx+1}</div>
            <input type="number" value={set.weight} onChange={e => updateSet(exIdx,setIdx,'weight',e.target.value)} placeholder="kg" style={{ ...inputStyle }} />
            <input type="number" value={set.reps} onChange={e => updateSet(exIdx,setIdx,'reps',e.target.value)} placeholder="reps" style={{ ...inputStyle }} />
            <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:2 }}>
              <button onClick={() => copySetToNext(exIdx,setIdx)} title="Copy to next set" style={{ background:'rgba(77,212,255,0.08)',border:`1px solid ${TH.borderMed}`,color:TH.cyan,fontSize:13,fontWeight:700,cursor:'pointer',padding:'4px 6px',borderRadius:6,lineHeight:'1',fontFamily:'inherit' }}>+</button>
              {ex.sets.length>1 && <button onClick={() => removeSet(exIdx,setIdx)} style={{ background:'none',border:'none',color:TH.textMuted,fontSize:15,cursor:'pointer',padding:'2px',lineHeight:'1' }}>×</button>}
            </div>
          </div>))}
          <button onClick={() => addSet(exIdx)} style={{ fontSize:12,color:TH.textMuted,background:'none',border:`1px dashed ${TH.borderMed}`,borderRadius:8,padding:'7px 12px',cursor:'pointer',width:'100%',marginTop:4,fontFamily:'inherit',fontWeight:500 }}>+ Add set</button>
          {prev && (<div style={{ marginTop:10,padding:'8px 10px',background:TH.cardAlt,borderRadius:8,border:`1px solid ${TH.border}` }}>
            <div style={{ fontSize:11,color:TH.textMuted,marginBottom:4 }}>Last session — {fmtDate(prev.date)}</div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>{prev.sets.filter(s=>s.reps||s.weight).map((s,i) => <span key={i} style={{ background:TH.input,border:`1px solid ${TH.border}`,borderRadius:5,padding:'3px 8px',fontSize:12,color:TH.textSec }}>{s.reps} × {s.weight}kg</span>)}</div>
          </div>)}
        </div>);
      })}
    </>)}
    <div style={{ marginTop:'1rem',marginBottom:'1rem' }}>
      <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:6,fontWeight:500 }}>Session notes</label>
      <textarea value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} placeholder="How did the session go?" rows={3} style={{ width:'100%',padding:'10px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:14,fontFamily:'inherit',resize:'vertical',boxShadow:TH.glow }} /></div>
    <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
      <Btn onClick={() => onSave(getSessionData(),true)}>Complete & save session</Btn>
      <Btn onClick={() => onSave(getSessionData(),false)} variant="secondary">Save progress & exit</Btn></div>
  </div>);
}

// ─── EXERCISE HISTORY ───────────────────────────────────────────────────────
function ExerciseHistory() {
  const [logs,setLogs] = useState([]); const [filterType,setFilterType] = useState('exercise');
  const [selectedBP,setSelectedBP] = useState('L'); const [selectedEx,setSelectedEx] = useState('');
  useEffect(() => { fetch('/api/exercise-log').then(r=>r.json()).then(data => { setLogs(data.filter(d => !d.noData).sort((a,b) => b.date.localeCompare(a.date))); }); }, []);
  const allExercises = [...new Set(logs.flatMap(l => (l.exercises||[]).map(e => e.name)))].sort();
  const filtered = filterType==='bodypart' ? logs.filter(l => l.workoutType===selectedBP) : logs.filter(l => (l.exercises||[]).some(e => e.name===selectedEx));
  function renderRow(log) {
    const rowCardStyle = {padding:'14px 16px',background:TH.card,borderRadius:TH.radiusSm,marginBottom:8,boxShadow:TH.shadowSm,border:`1px solid ${TH.border}`,position:'relative',overflow:'hidden'};
    const isRowingType = log.workoutType==='R'||log.workoutType==='KBR';
    if(filterType==='exercise'){const ex=(log.exercises||[]).find(e=>e.name===selectedEx);if(!ex)return null;return(<div key={log.date} style={rowCardStyle}><div style={{fontSize:12,color:TH.textMuted,marginBottom:6}}>{fmtDate(log.date)}</div><div style={{fontSize:13,fontWeight:600,marginBottom:6,color:TH.text}}>{ex.name}</div><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{ex.sets.filter(s=>s.reps||s.weight).map((s,i)=><span key={i} style={{background:TH.cardAlt,border:`1px solid ${TH.border}`,borderRadius:6,padding:'4px 10px',fontSize:13,color:TH.textSec}}>{s.reps} reps × {s.weight}kg</span>)}</div></div>);}
    if(isRowingType) return(<div key={log.date} style={rowCardStyle}><div style={{fontSize:12,color:TH.textMuted,marginBottom:4}}>{fmtDate(log.date)}</div><div style={{fontSize:13,color:TH.text}}>{log.rowingType==='time'?`${log.rowingValue} minutes`:`${log.rowingValue} metres`}</div></div>);
    return(<div key={log.date} style={rowCardStyle}><div style={{fontSize:12,color:TH.textMuted,marginBottom:8}}>{fmtDate(log.date)}</div>{(log.exercises||[]).map((ex,i)=>(<div key={i} style={{marginBottom:10}}><div style={{fontSize:13,fontWeight:600,marginBottom:4,color:TH.text}}>{ex.name}</div><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{ex.sets.filter(s=>s.reps||s.weight).map((s,si)=><span key={si} style={{background:TH.cardAlt,border:`1px solid ${TH.border}`,borderRadius:6,padding:'4px 10px',fontSize:12,color:TH.textSec}}>{s.reps} reps × {s.weight}kg</span>)}</div></div>))}</div>);
  }
  return (<div>
    <div style={{display:'flex',gap:8,marginBottom:'1rem'}}>
      {[['exercise','By exercise'],['bodypart','By body part']].map(([k,l])=>(<button key={k} onClick={()=>setFilterType(k)} style={{flex:1,padding:'11px',borderRadius:TH.radiusSm,border:`2px solid ${filterType===k?TH.cyan:TH.border}`,background:filterType===k?'rgba(77,212,255,0.08)':'transparent',color:filterType===k?TH.cyan:TH.textMuted,fontWeight:600,cursor:'pointer',fontFamily:'inherit',fontSize:13,transition:'all 150ms ease'}}>{l}</button>))}
    </div>
    {filterType==='bodypart' && (<div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:'1rem'}}>
      {WORKOUT_TYPES.map(w=>(<button key={w.key} onClick={()=>setSelectedBP(w.key)} style={{padding:'8px 12px',borderRadius:8,border:`2px solid ${selectedBP===w.key?(w.isSplit?'#B0A0F0':w.color):TH.border}`,background:selectedBP===w.key?(w.isSplit?'rgba(152,132,232,0.12)':w.color+'20'):'transparent',color:selectedBP===w.key?(w.isSplit?'#B0A0F0':w.color):TH.textMuted,fontSize:13,fontWeight:selectedBP===w.key?600:400,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease'}}>{w.key} — {w.label}</button>))}</div>)}
    {filterType==='exercise' && (<div style={{marginBottom:'1rem'}}><select value={selectedEx} onChange={e=>setSelectedEx(e.target.value)} style={{width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:14,fontFamily:'inherit',boxShadow:TH.glow}}><option value="">Select an exercise...</option>{allExercises.map(ex=><option key={ex} value={ex}>{ex}</option>)}</select></div>)}
    {filtered.length===0 && <div style={{textAlign:'center',padding:'2.5rem',color:TH.textMuted,fontSize:14}}>No data yet</div>}
    {filtered.map(log=>renderRow(log))}
  </div>);
}

// ─── WEIGHT TAB ─────────────────────────────────────────────────────────────
function WeightTab({ year,month }) {
  const [data,setData]=useState([]); const [allData,setAllData]=useState([]); const [modal,setModal]=useState(null); const [input,setInput]=useState('');
  useEffect(()=>{fetchData();},[year,month]);
  async function fetchData() {
    const res=await fetch(`/api/weight?year=${year}&month=${month+1}`); const monthData=await res.json(); setData(monthData);
    const prevMonth=month===0?12:month; const prevYear=month===0?year-1:year;
    const prevRes=await fetch(`/api/weight?year=${prevYear}&month=${prevMonth}`); const prevData=await prevRes.json();
    const combined=[...prevData,...monthData].sort((a,b)=>a.date.localeCompare(b.date)); setAllData(combined);
  }
  const sorted=[...allData].sort((a,b)=>a.date.localeCompare(b.date));
  const weightByDate={}; sorted.forEach(e=>{weightByDate[e.date]=e.weight;});
  const directionByDate={}; sorted.forEach((entry,i)=>{if(i===0){directionByDate[entry.date]='neutral';}else{const prev=sorted[i-1].weight;if(entry.weight<prev)directionByDate[entry.date]='down';else if(entry.weight>prev)directionByDate[entry.date]='up';else directionByDate[entry.date]='same';}});
  const monthSorted=[...data].sort((a,b)=>a.date.localeCompare(b.date));
  const latest=monthSorted.length>0?monthSorted[monthSorted.length-1].weight:null;
  const lowest=monthSorted.length>0?Math.min(...monthSorted.map(e=>e.weight)):null;
  const highest=monthSorted.length>0?Math.max(...monthSorted.map(e=>e.weight)):null;
  const change=monthSorted.length>=2?(monthSorted[monthSorted.length-1].weight-monthSorted[0].weight).toFixed(1):null;
  const days=getDaysInMonth(year,month); const labels=Array.from({length:days},(_,i)=>i+1);
  const chartData=labels.map(d=>{const dateStr=toDateStr(year,month,d);return weightByDate[dateStr]!==undefined?weightByDate[dateStr]:null;});
  function openModal(day){const dateStr=toDateStr(year,month,day);const existing=weightByDate[dateStr];setInput(existing!==undefined?String(existing):'');setModal(dateStr);}
  async function save(){if(!input||isNaN(parseFloat(input)))return;await fetch('/api/weight',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:modal,weight:parseFloat(input)})});setModal(null);setInput('');fetchData();}
  async function remove(){await fetch('/api/weight',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:modal})});setModal(null);setInput('');fetchData();}
  return (<div>
    {monthSorted.length>0&&(<div style={{display:'grid',gridTemplateColumns:change!==null?'repeat(4,1fr)':'repeat(3,1fr)',gap:10,marginBottom:'1.5rem'}}>
      <StatCard label="Latest" value={`${latest}`} sub="kg" />
      {change!==null&&(<StatCard label="Change" value={`${parseFloat(change)>0?'+':''}${change}`} sub={<span style={{color:parseFloat(change)<0?HEAT.green1:parseFloat(change)>0?HEAT.red:TH.textMuted}}>kg this month</span>} />)}
      <StatCard label="Lowest" value={`${lowest}`} sub="kg" />
      <StatCard label="Highest" value={`${highest}`} sub="kg" /></div>)}
    <CalendarGrid year={year} month={month}
      getCellStyle={day=>{const dateStr=toDateStr(year,month,day);const hasEntry=weightByDate[dateStr]!==undefined;if(!hasEntry)return{border:`1px solid ${TH.border}`,color:TH.textMuted,borderRadius:TH.radiusSm};const direction=directionByDate[dateStr];let bg=TH.cardAlt;let color=TH.textSec;if(direction==='down'){bg=HEAT.green1;color=HEAT.green1Text;}else if(direction==='up'){bg=HEAT.red;color=HEAT.redText;}else{bg=TH.cardAlt;color=TH.textSec;}return{background:bg,color,borderRadius:TH.radiusSm,fontWeight:600,bottomLabel:`${weightByDate[dateStr]}`};}}
      onDayClick={day=>openModal(day)} />
    <div style={{display:'flex',flexWrap:'wrap',gap:12,marginBottom:'1.5rem'}}>
      <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:TH.textSec}}><div style={{width:12,height:12,borderRadius:4,background:TH.cardAlt,border:`1px solid ${TH.border}`}}/>First / same</div>
      <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:TH.textSec}}><div style={{width:12,height:12,borderRadius:4,background:HEAT.green1}}/>Down</div>
      <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:TH.textSec}}><div style={{width:12,height:12,borderRadius:4,background:HEAT.red}}/>Up</div></div>
    {monthSorted.length>=2&&(<div><div style={{fontSize:12,color:TH.textMuted,marginBottom:8,fontWeight:500}}>Weight trend</div>
      <div style={{height:180}}><Line data={{labels,datasets:[{data:chartData,borderColor:TH.cyan,backgroundColor:'rgba(77,212,255,0.08)',borderWidth:2,pointRadius:4,pointBackgroundColor:TH.cyan,tension:0.35,fill:true,spanGaps:true}]}} options={darkChartOpts({yTicks:{callback:v=>`${v}kg`}})} /></div></div>)}
    {modal&&(<Modal title={`Log weight — ${fmtDate(modal)}`} onClose={()=>setModal(null)}>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div><label style={{fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500}}>Weight (kg)</label>
          <input type="number" step="0.1" value={input} onChange={e=>setInput(e.target.value)} placeholder="e.g. 82.5" autoFocus style={{width:'100%',padding:'12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:18,fontWeight:600,textAlign:'center',fontFamily:'inherit',boxShadow:TH.glow}} /></div>
        <Btn onClick={save}>{weightByDate[modal]!==undefined?'Update':'Save'}</Btn>
        {weightByDate[modal]!==undefined&&<Btn onClick={remove} variant="danger">Remove entry</Btn>}
      </div></Modal>)}
  </div>);
}

// ─── GYM SECTION ────────────────────────────────────────────────────────────
const GYM_TABS=[{key:'calendar',label:'Calendar'},{key:'log',label:'Log'},{key:'history',label:'History'},{key:'weight',label:'Weight'}];
function GymSection() {
  const now=new Date(); const [tab,setTab]=useState('calendar'); const [year,setYear]=useState(now.getFullYear()); const [month,setMonth]=useState(now.getMonth());
  function prevMonth(){if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}
  function nextMonth(){if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}
  const monthLabel=new Date(year,month).toLocaleString('default',{month:'long',year:'numeric'});
  return (<div>
    <div style={{display:'flex',gap:4,marginBottom:'1.5rem',background:TH.card,borderRadius:TH.radiusSm,padding:4,border:`1px solid ${TH.border}`}}>
      {GYM_TABS.map(t=>(<button key={t.key} onClick={()=>setTab(t.key)} style={{flex:1,padding:'10px 0',background:tab===t.key?TH.pink:'transparent',border:'none',borderRadius:10,color:tab===t.key?'#fff':TH.textMuted,fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease',boxShadow:tab===t.key?'0 0 12px rgba(236,116,135,0.3)':'none'}}>{t.label}</button>))}</div>
    {(tab==='calendar'||tab==='weight')&&(<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
      <button onClick={prevMonth} style={{background:TH.card,border:`1px solid ${TH.border}`,borderRadius:8,padding:'7px 16px',fontSize:16,color:TH.textSec,cursor:'pointer'}}>‹</button>
      <span style={{fontWeight:700,fontSize:15,fontFamily:TH.heading,color:TH.text}}>{monthLabel}</span>
      <button onClick={nextMonth} style={{background:TH.card,border:`1px solid ${TH.border}`,borderRadius:8,padding:'7px 16px',fontSize:16,color:TH.textSec,cursor:'pointer'}}>›</button></div>)}
    {tab==='calendar'&&<GymCalendar year={year} month={month} />}
    {tab==='log'&&<GymLog />}
    {tab==='history'&&<ExerciseHistory />}
    {tab==='weight'&&<WeightTab year={year} month={month} />}
  </div>);
}

// ─── CHART OPTIONS ──────────────────────────────────────────────────────────
function darkChartOpts(extra={}) {
  return {responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},...extra.plugins},
    scales:{x:{ticks:{color:TH.textMuted,font:{size:11}},grid:{color:'rgba(77,212,255,0.04)'}},y:{min:extra.yMin||0,max:extra.yMax||undefined,ticks:{color:TH.textMuted,font:{size:10},...(extra.yTicks||{})},grid:{color:'rgba(77,212,255,0.04)'}}}};
}

// ─── DEEP WORK TAB ──────────────────────────────────────────────────────────
function DeepWorkTab({ year,month }) {
  const [data,setData]=useState([]); const [modal,setModal]=useState(null); const [form,setForm]=useState({minutes:'60',subject:'A'});
  const [today,setToday]=useState(''); useEffect(()=>{setToday(todayStr());},[]);
  useEffect(()=>{fetchData();},[year,month]);
  async function fetchData(){const res=await fetch(`/api/deepwork?year=${year}&month=${month+1}`);setData(await res.json());}
  async function save(){const hours=parseFloat((parseInt(form.minutes)/60).toFixed(2));await fetch('/api/deepwork',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:modal,hours,subject:form.subject,replace:false})});setModal(null);fetchData();}
  async function clearDay(){await fetch('/api/deepwork',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:modal})});setModal(null);fetchData();}
  const byDate={};data.forEach(d=>{if(!byDate[d.date])byDate[d.date]=[];byDate[d.date].push(d);});
  function getDayTotals(dateStr){const sessions=byDate[dateStr]||[];const total=sessions.reduce((s,d)=>s+(d.hours||0),0);const subTotals={};sessions.forEach(s=>{subTotals[s.subject]=(subTotals[s.subject]||0)+s.hours;});return{total,sessions,subTotals};}
  function getHeatColor(total){if(!total)return{bg:HEAT.none,text:HEAT.noneText};if(total>=3)return{bg:HEAT.green2,text:HEAT.green2Text};if(total>=1.5)return{bg:HEAT.green1,text:HEAT.green1Text};return{bg:HEAT.amber,text:HEAT.amberText};}
  const allSessions=[...data].sort((a,b)=>b.date.localeCompare(a.date));
  const totalHours=data.reduce((s,d)=>s+(d.hours||0),0); const uniqueDays=Object.keys(byDate).length;
  const best=Object.values(byDate).reduce((m,sessions)=>{const t=sessions.reduce((s,d)=>s+d.hours,0);return t>m?t:m;},0);
  const days=getDaysInMonth(year,month); const labels=Array.from({length:days},(_,i)=>i+1);
  const chartData=labels.map(d=>{const{total}=getDayTotals(toDateStr(year,month,d));return total;});
  return (<div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:'1.5rem'}}>
      <StatCard label="Hours" value={`${totalHours.toFixed(1)}h`} sub="this month" />
      <StatCard label="Days" value={uniqueDays} sub="with deep work" />
      <StatCard label="Best day" value={`${best.toFixed(1)}h`} sub="this month" /></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:5,marginBottom:'1.5rem'}}>
      {['M','T','W','T','F','S','S'].map((d,i)=>(<div key={i} style={{textAlign:'center',fontSize:11,color:TH.textMuted,paddingBottom:6,fontWeight:600}}>{d}</div>))}
      {Array.from({length:getMondayOffset(year,month)}).map((_,i)=><div key={`e${i}`}/>)}
      {Array.from({length:days},(_,i)=>i+1).map(day=>{
        const dateStr=toDateStr(year,month,day);const{total,subTotals}=getDayTotals(dateStr);const{bg,text}=getHeatColor(total);const isToday=today&&dateStr===today;
        return(<div key={day} onClick={()=>{setForm({minutes:'60',subject:'A'});setModal(dateStr);}} style={{aspectRatio:'1',borderRadius:TH.radiusSm,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:text,position:'relative',cursor:'pointer',userSelect:'none',fontWeight:500,boxShadow:isToday?`0 0 0 2px ${TH.cyan}, 0 0 12px rgba(77,212,255,0.35)`:'none'}}>
          {day}{Object.keys(subTotals).length>0&&<span style={{position:'absolute',bottom:2,left:3,fontSize:8,fontWeight:700,color:text,opacity:0.85}}>{Object.keys(subTotals).sort().join('')}</span>}</div>);
      })}</div>
    <div style={{display:'flex',flexWrap:'wrap',gap:12,marginBottom:8}}>
      {[[HEAT.amber,'under 1.5h'],[HEAT.green1,'1.5–3h'],[HEAT.green2,'3h+']].map(([c,l])=>(<div key={l} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:TH.textSec}}><div style={{width:12,height:12,borderRadius:4,background:c}}/>{l}</div>))}</div>
    <div style={{display:'flex',flexWrap:'wrap',gap:12,marginBottom:'1.5rem'}}>
      {Object.entries(DW_SUBJECTS).map(([k,l])=>(<div key={k} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:TH.textSec}}><span style={{fontWeight:700,color:DW_COLORS[k],fontSize:13}}>{k}</span>{l}</div>))}</div>
    <div style={{display:'flex',flexDirection:'column',gap:'1.5rem',marginBottom:'1.5rem'}}>
      {[{label:'Overall',color:TH.text,data:chartData},{label:'A — Ozzy Wizzpop',color:DW_COLORS.A,data:labels.map(d=>{const s=(byDate[toDateStr(year,month,d)]||[]).filter(x=>x.subject==='A');return s.reduce((t,x)=>t+x.hours,0)||null;})},{label:'B — Reading',color:DW_COLORS.B,data:labels.map(d=>{const s=(byDate[toDateStr(year,month,d)]||[]).filter(x=>x.subject==='B');return s.reduce((t,x)=>t+x.hours,0)||null;})},{label:'C — Magic study',color:DW_COLORS.C,data:labels.map(d=>{const s=(byDate[toDateStr(year,month,d)]||[]).filter(x=>x.subject==='C');return s.reduce((t,x)=>t+x.hours,0)||null;})}].map(({label,color,data:d})=>(
        <div key={label}><div style={{fontSize:12,color:TH.textMuted,marginBottom:6,fontWeight:500}}>{label}</div>
          <div style={{height:120}}><Line data={{labels,datasets:[{data:d,borderColor:color,backgroundColor:color+'15',borderWidth:2,pointRadius:3,pointBackgroundColor:color,tension:0.35,fill:true,spanGaps:true}]}} options={darkChartOpts({yTicks:{callback:v=>v+'h'}})} /></div></div>))}</div>
    {allSessions.length>0&&(<div><div style={{fontSize:12,color:TH.textMuted,marginBottom:8,fontWeight:500}}>Session log</div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {allSessions.map((s,i)=>(<div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:TH.card,borderRadius:TH.radiusSm,border:`1px solid ${TH.border}`,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg, transparent, ${TH.borderGlow}, transparent)`}} />
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{width:26,height:26,borderRadius:7,background:DW_COLORS[s.subject]||'#888',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:700,boxShadow:`0 0 8px ${(DW_COLORS[s.subject]||'#888')}40`}}>{s.subject}</span>
            <div><div style={{fontSize:13,fontWeight:600,color:TH.text}}>{DW_SUBJECTS[s.subject]||s.subject}</div><div style={{fontSize:11,color:TH.textMuted}}>{s.date}</div></div></div>
          <div style={{fontSize:14,fontWeight:700,fontFamily:TH.heading,color:TH.text}}>{Math.round(s.hours*60)}m</div></div>))}</div></div>)}
    {modal&&(<Modal title={`Log deep work — ${modal}`} onClose={()=>setModal(null)}>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {byDate[modal]&&byDate[modal].length>0&&(<div style={{background:TH.cardAlt,borderRadius:TH.radiusSm,padding:'10px 12px',border:`1px solid ${TH.border}`}}>
          <div style={{fontSize:12,color:TH.textMuted,marginBottom:6}}>Already logged today:</div>
          {byDate[modal].map((s,i)=>(<div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13,marginBottom:4}}><span><strong style={{color:DW_COLORS[s.subject]}}>{s.subject}</strong> <span style={{color:TH.textSec}}>— {DW_SUBJECTS[s.subject]}</span></span><span style={{color:TH.text,fontWeight:600}}>{Math.round(s.hours*60)}m</span></div>))}
          <div style={{fontSize:12,color:TH.textMuted,marginTop:4,borderTop:`1px solid ${TH.border}`,paddingTop:4}}>Total: {Math.round(byDate[modal].reduce((s,d)=>s+d.hours,0)*60)}m ({byDate[modal].reduce((s,d)=>s+d.hours,0).toFixed(1)}h)</div></div>)}
        <div><label style={{fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500}}>Add minutes</label>
          <input type="number" min="1" max="480" value={form.minutes} onChange={e=>setForm(f=>({...f,minutes:e.target.value}))} placeholder="e.g. 45" style={{width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:16,fontFamily:'inherit',boxShadow:TH.glow}} />
          <div style={{fontSize:12,color:TH.textMuted,marginTop:4}}>= {(parseInt(form.minutes||0)/60).toFixed(1)} hours</div></div>
        <div><label style={{fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500}}>Subject</label>
          <div style={{display:'flex',gap:8}}>
            {Object.entries(DW_SUBJECTS).map(([k,l])=>(<button key={k} onClick={()=>setForm(f=>({...f,subject:k}))} style={{flex:1,padding:'8px 4px',borderRadius:TH.radiusSm,border:`2px solid ${form.subject===k?DW_COLORS[k]:TH.border}`,background:form.subject===k?DW_COLORS[k]+'20':'transparent',fontSize:12,color:form.subject===k?DW_COLORS[k]:TH.textMuted,fontWeight:form.subject===k?600:400,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease',boxShadow:form.subject===k?`0 0 10px ${DW_COLORS[k]}30`:'none'}}><span style={{fontWeight:700,display:'block',fontSize:16}}>{k}</span>{l}</button>))}</div></div>
        <Btn onClick={save}>Add session</Btn>
        {byDate[modal]&&byDate[modal].length>0&&<Btn onClick={clearDay} variant="danger">Clear all today's sessions</Btn>}
      </div></Modal>)}
  </div>);
}

// ─── SWITCH-OFF TAB ─────────────────────────────────────────────────────────
function SwitchOffTab({ year,month }) {
  const [data,setData]=useState([]); const [modal,setModal]=useState(null); const [time,setTime]=useState('19:00');
  useEffect(()=>{fetchData();},[year,month]);
  async function fetchData(){const res=await fetch(`/api/switchoff?year=${year}&month=${month+1}`);setData(await res.json());}
  async function save(){await fetch('/api/switchoff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:modal,time})});setModal(null);fetchData();}
  async function remove(){await fetch('/api/switchoff',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:modal})});setModal(null);fetchData();}
  const byDate={};data.forEach(d=>{byDate[d.date]=d;});
  function timeToMins(t){const[h,m]=t.split(':').map(Number);return h*60+m;}
  function getHeatColor(day){const entry=byDate[toDateStr(year,month,day)];if(!entry)return{bg:HEAT.none,text:HEAT.noneText};const mins=timeToMins(entry.time);if(mins<=19*60)return{bg:HEAT.green1,text:HEAT.green1Text};if(mins<=20*60)return{bg:HEAT.green1,text:HEAT.green1Text};if(mins<=21*60)return{bg:HEAT.amber,text:HEAT.amberText};return{bg:HEAT.red,text:HEAT.redText};}
  const hitTarget=data.filter(d=>timeToMins(d.time)<=19*60).length;
  const avgMins=data.length?Math.round(data.reduce((s,d)=>s+timeToMins(d.time),0)/data.length):null;
  const avgStr=avgMins?`${Math.floor(avgMins/60)}:${pad(avgMins%60)}pm`:'—';
  const days=getDaysInMonth(year,month);const labels=Array.from({length:days},(_,i)=>i+1);
  const chartData=labels.map(d=>{const e=byDate[toDateStr(year,month,d)];return e?parseFloat((timeToMins(e.time)/60).toFixed(2)):null;});
  return (<div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:'1.5rem'}}>
      <StatCard label="Avg switch-off" value={avgStr} sub="this month" />
      <StatCard label="Days hit target" value={hitTarget} sub={`of ${days} days`} />
      <StatCard label="Target" value="7:00pm" sub="goal to reach" /></div>
    <CalendarGrid year={year} month={month}
      getCellStyle={day=>{const{bg,text}=getHeatColor(day);return{background:bg,color:text,border:'none',borderRadius:TH.radiusSm,fontWeight:500};}}
      onDayClick={day=>{const e=byDate[toDateStr(year,month,day)];setTime(e?e.time:'19:00');setModal(toDateStr(year,month,day));}} />
    <div style={{display:'flex',flexWrap:'wrap',gap:12,marginBottom:'1.5rem'}}>
      {[[HEAT.green1,'Hit target (≤7pm)'],[HEAT.green1,'7–8pm'],[HEAT.amber,'8–9pm'],[HEAT.red,'After 9pm']].map(([c,l],i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:TH.textSec}}><div style={{width:12,height:12,borderRadius:4,background:c}}/>{l}</div>))}</div>
    <div style={{fontSize:12,color:TH.textMuted,marginBottom:8,fontWeight:500}}>Switch-off time — trend</div>
    <div style={{height:180}}>
      <Line data={{labels,datasets:[{data:chartData,borderColor:TH.pink,backgroundColor:'rgba(236,116,135,0.08)',borderWidth:2,pointRadius:3,tension:0.35,fill:true,spanGaps:true}]}}
        options={darkChartOpts({yMin:17,yMax:24,yTicks:{callback:v=>`${v}:00`},plugins:{tooltip:{callbacks:{label:(ctx)=>{const h=Math.floor(ctx.parsed.y);const m=Math.round((ctx.parsed.y-h)*60);return `${h}:${pad(m)}pm`;}}}}})} /></div>
    {modal&&(<Modal title={`Log switch-off — ${fmtDate(modal)}`} onClose={()=>setModal(null)}>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div><label style={{fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500}}>Time you switched off</label>
          <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={{width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:16,fontFamily:'inherit',boxShadow:TH.glow}} /></div>
        <Btn onClick={save}>Save</Btn>
        {byDate[modal]&&<Btn onClick={remove} variant="danger">Remove entry</Btn>}
      </div></Modal>)}
  </div>);
}

// ─── HABITS SECTION ─────────────────────────────────────────────────────────
const HABITS_TABS=[{key:'deepwork',label:'Deep Work'},{key:'switchoff',label:'Switch-off'}];
function HabitsSection() {
  const now=new Date();const [tab,setTab]=useState('deepwork');const [year,setYear]=useState(now.getFullYear());const [month,setMonth]=useState(now.getMonth());
  function prevMonth(){if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}
  function nextMonth(){if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}
  const monthLabel=new Date(year,month).toLocaleString('default',{month:'long',year:'numeric'});
  return (<div>
    <div style={{display:'flex',gap:4,marginBottom:'1.5rem',background:TH.card,borderRadius:TH.radiusSm,padding:4,border:`1px solid ${TH.border}`}}>
      {HABITS_TABS.map(t=>(<button key={t.key} onClick={()=>setTab(t.key)} style={{flex:1,padding:'10px 0',background:tab===t.key?TH.pink:'transparent',border:'none',borderRadius:10,color:tab===t.key?'#fff':TH.textMuted,fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease',boxShadow:tab===t.key?'0 0 12px rgba(236,116,135,0.3)':'none'}}>{t.label}</button>))}</div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
      <button onClick={prevMonth} style={{background:TH.card,border:`1px solid ${TH.border}`,borderRadius:8,padding:'7px 16px',fontSize:16,color:TH.textSec,cursor:'pointer'}}>‹</button>
      <span style={{fontWeight:700,fontSize:15,fontFamily:TH.heading,color:TH.text}}>{monthLabel}</span>
      <button onClick={nextMonth} style={{background:TH.card,border:`1px solid ${TH.border}`,borderRadius:8,padding:'7px 16px',fontSize:16,color:TH.textSec,cursor:'pointer'}}>›</button></div>
    {tab==='deepwork'&&<DeepWorkTab year={year} month={month} />}
    {tab==='switchoff'&&<SwitchOffTab year={year} month={month} />}
  </div>);
}

// ─── NUTRITION SECTION — INTERMITTENT FASTING TRACKER ───────────────────────
const WINDOW_HOURS = 8;
const WINDOW_MINS = WINDOW_HOURS * 60;

function timeToMinsN(t) { const [h,m] = t.split(':').map(Number); return h * 60 + m; }
function minsToLabel(m) { const h=Math.floor(m/60); const mm=m%60; return `${h>12?h-12:h||12}:${pad(mm)}${h>=12?'pm':'am'}`; }

function FastingRing({ meals }) {
  const [now,setNow] = useState(new Date());
  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(iv); }, []);

  const sorted = [...meals].sort((a,b) => a.time.localeCompare(b.time));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const size = 220; const cx = size/2; const cy = size/2; const r = 88; const sw = 10;
  const circ = 2 * Math.PI * r;

  if (!first) {
    return (<div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'1rem 0 0.5rem'}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(77,212,255,0.06)" strokeWidth={sw} />
        <text x={cx} y={cy-8} textAnchor="middle" fill={TH.textSec} fontSize={15} fontWeight={600} fontFamily={TH.heading}>8h window</text>
        <text x={cx} y={cy+12} textAnchor="middle" fill={TH.textMuted} fontSize={12}>Log first meal to start</text>
      </svg>
    </div>);
  }

  const firstMins = timeToMinsN(first.time);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const elapsed = Math.max(nowMins - firstMins, 0);
  const progress = Math.min(elapsed / WINDOW_MINS, 1);
  const remaining = Math.max(WINDOW_MINS - elapsed, 0);
  const windowOpen = elapsed < WINDOW_MINS;
  const lastMins = timeToMinsN(last.time);
  const withinWindow = (lastMins - firstMins) <= WINDOW_MINS;

  let ringColor;
  if (!windowOpen) ringColor = withinWindow ? '#34D399' : '#EF4444';
  else if (progress < 0.6) ringColor = TH.cyan;
  else if (progress < 0.85) ringColor = TH.purple;
  else ringColor = TH.pink;

  const offset = circ * (1 - progress);

  const mealDots = sorted.map(meal => {
    const mealMins = timeToMinsN(meal.time);
    const mp = Math.min((mealMins - firstMins) / WINDOW_MINS, 1);
    const angle = mp * 2 * Math.PI - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), food: meal.food };
  });

  const rh = Math.floor(remaining / 60); const rm = remaining % 60;
  const windowEnd = firstMins + WINDOW_MINS;

  return (<div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'1rem 0 0.5rem'}}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(77,212,255,0.06)" strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={ringColor} strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} filter="url(#glow)" style={{transition:'stroke-dashoffset 1s ease, stroke 0.5s ease'}} />
      {mealDots.map((dot,i) => <circle key={i} cx={dot.x} cy={dot.y} r={4.5} fill={ringColor} filter="url(#glow)" />)}
      {windowOpen ? (<>
        <text x={cx} y={cy-12} textAnchor="middle" fill={TH.text} fontSize={28} fontWeight={800} fontFamily={TH.heading}>{rh}h {rm}m</text>
        <text x={cx} y={cy+10} textAnchor="middle" fill={TH.textSec} fontSize={12} fontWeight={500}>remaining</text>
        <text x={cx} y={cy+28} textAnchor="middle" fill={TH.textMuted} fontSize={11}>closes {minsToLabel(windowEnd)}</text>
      </>) : (<>
        <text x={cx} y={cy-8} textAnchor="middle" fill={ringColor} fontSize={20} fontWeight={800} fontFamily={TH.heading}>{withinWindow ? '✓ Done' : 'Over'}</text>
        <text x={cx} y={cy+12} textAnchor="middle" fill={TH.textSec} fontSize={12}>Window closed</text>
      </>)}
    </svg>
    <div style={{display:'flex',gap:20,marginTop:4}}>
      <div style={{textAlign:'center'}}><div style={{fontSize:11,color:TH.textMuted,marginBottom:2}}>Started</div><div style={{fontSize:14,fontWeight:700,color:TH.text,fontFamily:TH.heading}}>{minsToLabel(firstMins)}</div></div>
      <div style={{textAlign:'center'}}><div style={{fontSize:11,color:TH.textMuted,marginBottom:2}}>Ends</div><div style={{fontSize:14,fontWeight:700,color:TH.text,fontFamily:TH.heading}}>{minsToLabel(windowEnd)}</div></div>
      <div style={{textAlign:'center'}}><div style={{fontSize:11,color:TH.textMuted,marginBottom:2}}>Meals</div><div style={{fontSize:14,fontWeight:700,color:TH.text,fontFamily:TH.heading}}>{sorted.length}</div></div>
    </div>
  </div>);
}

function NutritionSection() {
  const now = new Date();
  const [tab,setTab] = useState('today');
  const [year,setYear] = useState(now.getFullYear()); const [month,setMonth] = useState(now.getMonth());
  const [todayMeals,setTodayMeals] = useState([]);
  const [monthData,setMonthData] = useState([]);
  const [savedFoods,setSavedFoods] = useState([]);
  const [modal,setModal] = useState(null); // 'log' | 'addFood'
  const [form,setForm] = useState({food:'',time:'',remember:true,type:'meal'});
  const [search,setSearch] = useState('');
  const [addFoodForm,setAddFoodForm] = useState({name:'',type:'meal'});
  const [detailDay,setDetailDay] = useState(null);
  const [detailMeals,setDetailMeals] = useState([]);
  const [foodsFilter,setFoodsFilter] = useState('all'); // 'all' | 'meal' | 'snack'

  const todayDate = todayStr();

  useEffect(() => { loadToday(); loadSaved(); }, []);
  useEffect(() => { if(tab==='history') loadMonth(); }, [tab,year,month]);

  async function loadToday() { const res = await fetch(`/api/nutrition?date=${todayDate}`); setTodayMeals(await res.json()); }
  async function loadMonth() { const res = await fetch(`/api/nutrition?year=${year}&month=${month+1}`); setMonthData(await res.json()); }
  async function loadSaved() { const res = await fetch('/api/saved-foods'); setSavedFoods(await res.json()); }

  function openLogModal() {
    const n = new Date();
    setForm({food:'',time:`${pad(n.getHours())}:${pad(n.getMinutes())}`,remember:true,type:'meal'});
    setSearch(''); setModal('log');
  }

  async function saveEntry() {
    if(!form.food.trim()||!form.time) return;
    await fetch('/api/nutrition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:todayDate,time:form.time,food:form.food.trim(),type:form.type})});
    if(form.remember) { await fetch('/api/saved-foods',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:form.food.trim(),type:form.type})}); loadSaved(); }
    setModal(null); loadToday();
  }

  async function deleteEntry(id) {
    await fetch('/api/nutrition',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
    loadToday(); if(tab==='history') loadMonth();
  }

  async function deleteSavedFood(id) {
    await fetch('/api/saved-foods',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
    loadSaved();
  }

  async function addSavedFood() {
    if(!addFoodForm.name.trim()) return;
    await fetch('/api/saved-foods',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:addFoodForm.name.trim(),type:addFoodForm.type})});
    setAddFoodForm({name:'',type:addFoodForm.type}); setModal(null); loadSaved();
  }

  async function openDayDetail(dateStr) {
    const res = await fetch(`/api/nutrition?date=${dateStr}`);
    setDetailDay(dateStr); setDetailMeals(await res.json());
  }

  // Saved foods for selected type in log modal
  const modalFoods = savedFoods.filter(f => f.type===form.type && (!search || f.name.toLowerCase().includes(search.toLowerCase())));

  // Foods tab filtering
  const foodsMeals = savedFoods.filter(f => f.type==='meal');
  const foodsSnacks = savedFoods.filter(f => f.type==='snack');
  const displayFoods = foodsFilter==='meal' ? foodsMeals : foodsFilter==='snack' ? foodsSnacks : savedFoods;

  // History helpers
  const byDate = {}; monthData.forEach(m => { if(!byDate[m.date]) byDate[m.date]=[]; byDate[m.date].push(m); });
  function getDayStatus(dateStr) {
    const meals = byDate[dateStr];
    if(!meals||meals.length===0) return null;
    const sorted = [...meals].sort((a,b) => a.time.localeCompare(b.time));
    const span = timeToMinsN(sorted[sorted.length-1].time) - timeToMinsN(sorted[0].time);
    return { meals:sorted.length, span, withinWindow: span <= WINDOW_MINS, first:sorted[0].time, last:sorted[sorted.length-1].time };
  }
  function getHistHeatColor(dateStr) {
    const s = getDayStatus(dateStr);
    if(!s) return {bg:HEAT.none,text:HEAT.noneText};
    if(s.withinWindow) return {bg:HEAT.green1,text:HEAT.green1Text};
    if(s.span <= (WINDOW_HOURS+1)*60) return {bg:HEAT.amber,text:HEAT.amberText};
    return {bg:HEAT.red,text:HEAT.redText};
  }

  const daysInWindow = Object.keys(byDate).filter(d => getDayStatus(d)?.withinWindow).length;
  const totalLogged = Object.keys(byDate).length;

  function prevMonth(){if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}
  function nextMonth(){if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}
  const monthLabel=new Date(year,month).toLocaleString('default',{month:'long',year:'numeric'});

  const NUTR_TABS=[{key:'today',label:'Today'},{key:'foods',label:'Foods'},{key:'history',label:'History'}];

  return (<div>
    <div style={{display:'flex',gap:4,marginBottom:'1.5rem',background:TH.card,borderRadius:TH.radiusSm,padding:4,border:`1px solid ${TH.border}`}}>
      {NUTR_TABS.map(t=>(<button key={t.key} onClick={()=>setTab(t.key)} style={{flex:1,padding:'10px 0',background:tab===t.key?TH.pink:'transparent',border:'none',borderRadius:10,color:tab===t.key?'#fff':TH.textMuted,fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease',boxShadow:tab===t.key?'0 0 12px rgba(236,116,135,0.3)':'none'}}>{t.label}</button>))}</div>

    {/* ── TODAY TAB ── */}
    {tab==='today' && (<div>
      <FastingRing meals={todayMeals} />

      <Btn onClick={openLogModal} style={{width:'100%',fontSize:15,padding:'14px',marginTop:'1rem',marginBottom:'1.25rem'}}>+ Log food</Btn>

      {todayMeals.length===0 && <div style={{textAlign:'center',padding:'1.5rem',color:TH.textMuted,fontSize:14}}>No meals logged today</div>}
      {[...todayMeals].sort((a,b)=>a.time.localeCompare(b.time)).map((m,i) => (
        <div key={m._id||i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:TH.card,borderRadius:TH.radiusSm,marginBottom:6,border:`1px solid ${TH.border}`,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg, transparent, ${TH.borderGlow}, transparent)`}} />
          <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0,flex:1}}>
            <span style={{fontSize:13,fontWeight:700,color:TH.cyan,fontFamily:TH.heading,flexShrink:0}}>{minsToLabel(timeToMinsN(m.time))}</span>
            <span style={{fontSize:14,color:TH.text,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.food}</span>
            <span style={{fontSize:10,color:m.type==='snack'?TH.purple:TH.pink,fontWeight:600,flexShrink:0,textTransform:'uppercase',letterSpacing:'0.05em'}}>{m.type||'meal'}</span>
          </div>
          <button onClick={()=>deleteEntry(m._id)} style={{background:'none',border:'none',color:TH.textMuted,fontSize:16,cursor:'pointer',padding:'4px 6px',flexShrink:0}}>×</button>
        </div>
      ))}
    </div>)}

    {/* ── FOODS TAB ── */}
    {tab==='foods' && (<div>
      <div style={{display:'flex',gap:6,marginBottom:'1rem'}}>
        {[['all','All'],['meal','Meals'],['snack','Snacks']].map(([k,l])=>(<button key={k} onClick={()=>setFoodsFilter(k)} style={{flex:1,padding:'9px',borderRadius:10,border:`2px solid ${foodsFilter===k?TH.cyan:TH.border}`,background:foodsFilter===k?'rgba(77,212,255,0.08)':'transparent',color:foodsFilter===k?TH.cyan:TH.textMuted,fontWeight:600,cursor:'pointer',fontFamily:'inherit',fontSize:13,transition:'all 150ms ease'}}>{l}{k==='meal'?` (${foodsMeals.length})`:k==='snack'?` (${foodsSnacks.length})`:` (${savedFoods.length})`}</button>))}
      </div>

      {displayFoods.length===0 && <div style={{textAlign:'center',padding:'2rem',color:TH.textMuted,fontSize:14}}>
        {savedFoods.length===0 ? 'No saved foods yet — log a meal with "Remember" on, or add below' : `No ${foodsFilter}s saved`}
      </div>}

      {foodsFilter==='all' && foodsMeals.length>0 && (<div style={{marginBottom:'1.25rem'}}>
        <div style={{fontSize:12,color:TH.pink,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Meals ({foodsMeals.length})</div>
        {foodsMeals.map(f => (<div key={f._id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:TH.card,borderRadius:TH.radiusSm,marginBottom:4,border:`1px solid ${TH.border}`}}>
          <span style={{fontSize:14,color:TH.text}}>{f.name}</span>
          <button onClick={()=>deleteSavedFood(f._id)} style={{background:'none',border:'none',color:TH.textMuted,fontSize:16,cursor:'pointer',padding:'2px 6px'}}>×</button>
        </div>))}
      </div>)}

      {foodsFilter==='all' && foodsSnacks.length>0 && (<div style={{marginBottom:'1.25rem'}}>
        <div style={{fontSize:12,color:TH.purple,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Snacks ({foodsSnacks.length})</div>
        {foodsSnacks.map(f => (<div key={f._id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:TH.card,borderRadius:TH.radiusSm,marginBottom:4,border:`1px solid ${TH.border}`}}>
          <span style={{fontSize:14,color:TH.text}}>{f.name}</span>
          <button onClick={()=>deleteSavedFood(f._id)} style={{background:'none',border:'none',color:TH.textMuted,fontSize:16,cursor:'pointer',padding:'2px 6px'}}>×</button>
        </div>))}
      </div>)}

      {foodsFilter!=='all' && displayFoods.map(f => (<div key={f._id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:TH.card,borderRadius:TH.radiusSm,marginBottom:4,border:`1px solid ${TH.border}`}}>
        <span style={{fontSize:14,color:TH.text}}>{f.name}</span>
        <button onClick={()=>deleteSavedFood(f._id)} style={{background:'none',border:'none',color:TH.textMuted,fontSize:16,cursor:'pointer',padding:'2px 6px'}}>×</button>
      </div>))}

      <Btn onClick={()=>{setAddFoodForm({name:'',type:'meal'});setModal('addFood');}} variant="secondary" style={{width:'100%',marginTop:'0.5rem'}}>+ Add a food</Btn>
    </div>)}

    {/* ── HISTORY TAB ── */}
    {tab==='history' && (<div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
        <button onClick={prevMonth} style={{background:TH.card,border:`1px solid ${TH.border}`,borderRadius:8,padding:'7px 16px',fontSize:16,color:TH.textSec,cursor:'pointer'}}>‹</button>
        <span style={{fontWeight:700,fontSize:15,fontFamily:TH.heading,color:TH.text}}>{monthLabel}</span>
        <button onClick={nextMonth} style={{background:TH.card,border:`1px solid ${TH.border}`,borderRadius:8,padding:'7px 16px',fontSize:16,color:TH.textSec,cursor:'pointer'}}>›</button></div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:'1.5rem'}}>
        <StatCard label="Days logged" value={totalLogged} sub="this month" />
        <StatCard label="In window" value={daysInWindow} sub={`of ${totalLogged}`} />
        <StatCard label="Window" value={`${WINDOW_HOURS}h`} sub="target" /></div>

      <CalendarGrid year={year} month={month}
        getCellStyle={day=>{const dateStr=toDateStr(year,month,day);const{bg,text}=getHistHeatColor(dateStr);const s=getDayStatus(dateStr);return{background:bg,color:text,border:'none',borderRadius:TH.radiusSm,fontWeight:500,bottomLabel:s?`${s.meals}`:''};}}
        onDayClick={day=>openDayDetail(toDateStr(year,month,day))} />

      <div style={{display:'flex',flexWrap:'wrap',gap:12,marginBottom:'1.5rem'}}>
        {[[HEAT.green1,`≤ ${WINDOW_HOURS}h window`],[HEAT.amber,`${WINDOW_HOURS}–${WINDOW_HOURS+1}h`],[HEAT.red,`> ${WINDOW_HOURS+1}h`]].map(([c,l],i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:TH.textSec}}><div style={{width:12,height:12,borderRadius:4,background:c}}/>{l}</div>))}</div>

      {detailDay && (<div style={{background:TH.card,borderRadius:TH.radiusSm,padding:'14px',border:`1px solid ${TH.border}`,marginBottom:'1rem',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg, transparent, ${TH.borderGlow}, transparent)`}} />
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <span style={{fontWeight:700,fontSize:14,fontFamily:TH.heading,color:TH.text}}>{fmtDate(detailDay)}</span>
          <button onClick={()=>{setDetailDay(null);setDetailMeals([]);}} style={{background:'none',border:'none',color:TH.textMuted,fontSize:18,cursor:'pointer'}}>×</button></div>
        {detailMeals.length===0 && <div style={{color:TH.textMuted,fontSize:13}}>No meals logged</div>}
        {[...detailMeals].sort((a,b)=>a.time.localeCompare(b.time)).map((m,i) => (
          <div key={m._id||i} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:i<detailMeals.length-1?`1px solid ${TH.border}`:'none'}}>
            <span style={{fontSize:12,fontWeight:700,color:TH.cyan,fontFamily:TH.heading,flexShrink:0,width:60}}>{minsToLabel(timeToMinsN(m.time))}</span>
            <span style={{fontSize:13,color:TH.text,flex:1}}>{m.food}</span>
            <span style={{fontSize:10,color:m.type==='snack'?TH.purple:TH.pink,fontWeight:600,textTransform:'uppercase'}}>{m.type||'meal'}</span>
          </div>
        ))}
        {(() => { const s=getDayStatus(detailDay); if(!s) return null; return (<div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${TH.border}`,fontSize:12,color:TH.textMuted}}>
          Window: {minsToLabel(timeToMinsN(s.first))} – {minsToLabel(timeToMinsN(s.last))} ({Math.floor(s.span/60)}h {s.span%60}m)
          {s.withinWindow ? <span style={{color:HEAT.green1,marginLeft:8}}>✓ Within {WINDOW_HOURS}h</span> : <span style={{color:HEAT.red,marginLeft:8}}>Over by {Math.floor((s.span-WINDOW_MINS)/60)}h {(s.span-WINDOW_MINS)%60}m</span>}
        </div>); })()}
      </div>)}
    </div>)}

    {/* ── LOG FOOD MODAL ── */}
    {modal==='log' && (()=>{
      const isNewFood = form.food.trim() && !savedFoods.some(f => f.type===form.type && f.name.toLowerCase()===form.food.trim().toLowerCase());
      const isSavedPick = form.food.trim() && !isNewFood;
      return (<Modal title="Log food" onClose={()=>setModal(null)}>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>

        <div>
          <label style={{fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500}}>Time</label>
          <input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} style={{width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:16,fontFamily:'inherit',boxShadow:TH.glow}} /></div>

        <div>
          <label style={{fontSize:12,color:TH.textSec,display:'block',marginBottom:6,fontWeight:500}}>Pick from saved</label>
          <div style={{display:'flex',gap:8,marginBottom:8}}>
            {[['meal','🍽 Meal'],['snack','🥜 Snack']].map(([k,l])=>(<button key={k} onClick={()=>{setForm(f=>({...f,type:k,food:''}));setSearch('');}} style={{flex:1,padding:'12px',borderRadius:TH.radiusSm,border:`2px solid ${form.type===k?(k==='meal'?TH.pink:TH.purple):TH.border}`,background:form.type===k?(k==='meal'?'rgba(236,116,135,0.1)':'rgba(139,92,246,0.1)'):'transparent',color:form.type===k?(k==='meal'?TH.pink:TH.purple):TH.textMuted,fontWeight:600,cursor:'pointer',fontFamily:'inherit',fontSize:14,transition:'all 150ms ease'}}>{l}</button>))}
          </div>
          {modalFoods.length>0 ? (<>
            {savedFoods.filter(f=>f.type===form.type).length>6 && (<input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${form.type}s...`} style={{width:'100%',padding:'8px 12px',borderRadius:10,border:`1px solid ${TH.border}`,background:TH.input,color:TH.text,fontSize:13,fontFamily:'inherit',marginBottom:6,boxShadow:TH.glow}} />)}
            <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:180,overflowY:'auto'}}>
              {modalFoods.map(f => (<button key={f._id} onClick={()=>{setForm(fm=>({...fm,food:f.name,remember:false}));setSearch('');}} style={{display:'flex',alignItems:'center',padding:'10px 12px',borderRadius:10,border:`1px solid ${form.food===f.name?TH.cyan:TH.border}`,background:form.food===f.name?'rgba(77,212,255,0.1)':TH.cardAlt,color:form.food===f.name?TH.cyan:TH.textSec,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease',textAlign:'left'}}>{f.name}</button>))}
            </div>
          </>) : (<div style={{padding:'12px',textAlign:'center',color:TH.textMuted,fontSize:13,background:TH.cardAlt,borderRadius:10}}>No saved {form.type}s yet</div>)}
        </div>

        {isSavedPick && <Btn onClick={saveEntry}>Log {form.food}</Btn>}

        <div style={{display:'flex',alignItems:'center',gap:8,margin:'2px 0'}}>
          <div style={{flex:1,height:1,background:TH.border}} />
          <span style={{fontSize:11,color:TH.textMuted,flexShrink:0}}>or add something new</span>
          <div style={{flex:1,height:1,background:TH.border}} /></div>

        <input type="text" value={isNewFood?form.food:''} onChange={e=>{setForm(f=>({...f,food:e.target.value,remember:true}));setSearch('');}} placeholder="Type a new food..." style={{width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${isNewFood?TH.cyan:TH.borderMed}`,background:TH.input,color:TH.text,fontSize:14,fontFamily:'inherit',boxShadow:isNewFood?`0 0 8px rgba(77,212,255,0.12)`:TH.glow}} />

        {isNewFood && (<>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <button onClick={()=>setForm(f=>({...f,remember:!f.remember}))} style={{width:40,height:22,borderRadius:11,border:'none',background:form.remember?TH.cyan:'rgba(77,212,255,0.15)',cursor:'pointer',position:'relative',transition:'background 200ms ease'}}>
              <div style={{width:18,height:18,borderRadius:9,background:'#fff',position:'absolute',top:2,left:form.remember?20:2,transition:'left 200ms ease',boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}} /></button>
            <span style={{fontSize:13,color:form.remember?TH.text:TH.textMuted}}>Remember this</span>
          </div>
          {form.remember && (<div>
            <div style={{fontSize:11,color:TH.textMuted,marginBottom:4,fontWeight:500}}>Save as</div>
            <div style={{display:'flex',gap:6}}>
              {[['meal','Meal'],['snack','Snack']].map(([k,l])=>(<button key={k} onClick={()=>setForm(f=>({...f,type:k}))} style={{padding:'6px 16px',borderRadius:8,border:`1px solid ${form.type===k?(k==='meal'?TH.pink:TH.purple):TH.border}`,background:form.type===k?(k==='meal'?'rgba(236,116,135,0.1)':'rgba(139,92,246,0.1)'):'transparent',color:form.type===k?(k==='meal'?TH.pink:TH.purple):TH.textMuted,fontWeight:600,cursor:'pointer',fontFamily:'inherit',fontSize:12,transition:'all 150ms ease'}}>{l}</button>))}
            </div></div>)}
          <Btn onClick={saveEntry}>Log {form.type}</Btn>
        </>)}
      </div>
    </Modal>);})()}

    {/* ── ADD FOOD MODAL ── */}
    {modal==='addFood' && (<Modal title="Add a saved food" onClose={()=>setModal(null)}>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div>
          <label style={{fontSize:12,color:TH.textSec,display:'block',marginBottom:6,fontWeight:500}}>Type</label>
          <div style={{display:'flex',gap:8}}>
            {[['meal','🍽 Meal'],['snack','🥜 Snack']].map(([k,l])=>(<button key={k} onClick={()=>setAddFoodForm(f=>({...f,type:k}))} style={{flex:1,padding:'11px',borderRadius:TH.radiusSm,border:`2px solid ${addFoodForm.type===k?(k==='meal'?TH.pink:TH.purple):TH.border}`,background:addFoodForm.type===k?(k==='meal'?'rgba(236,116,135,0.1)':'rgba(139,92,246,0.1)'):'transparent',color:addFoodForm.type===k?(k==='meal'?TH.pink:TH.purple):TH.textMuted,fontWeight:600,cursor:'pointer',fontFamily:'inherit',fontSize:14,transition:'all 150ms ease'}}>{l}</button>))}
          </div></div>
        <div>
          <label style={{fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500}}>Food name</label>
          <input type="text" value={addFoodForm.name} onChange={e=>setAddFoodForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Chicken curry" autoFocus style={{width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:14,fontFamily:'inherit',boxShadow:TH.glow}} /></div>
        <Btn onClick={addSavedFood} style={{opacity:addFoodForm.name.trim()?1:0.4}}>Save {addFoodForm.type}</Btn>
      </div>
    </Modal>)}
  </div>);
}

// ─── APP SHELL ──────────────────────────────────────────────────────────────
export default function App() {
  const [section,setSection] = useState('gym');
  return (<>
    <Head><title>Chris's Dashboard</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
    <div style={{maxWidth:600,margin:'0 auto',padding:'0 0 4rem',minHeight:'100vh'}}>
      <div style={{padding:'1.5rem 1.25rem 0',marginBottom:'1.25rem'}}>
        <div style={{fontSize:12,fontWeight:600,letterSpacing:'0.18em',textTransform:'uppercase',color:TH.cyan,marginBottom:4,opacity:0.7}}>Personal dashboard</div>
        <div style={{fontSize:38,fontWeight:700,fontFamily:TH.heading,color:TH.text,letterSpacing:'-0.02em'}}>Chris</div></div>
      <div style={{display:'flex',gap:4,margin:'0 1.25rem 1.5rem',background:TH.card,borderRadius:TH.radiusSm,padding:4,border:`1px solid ${TH.border}`,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg, transparent, ${TH.borderGlow}, transparent)`}} />
        {TOP_SECTIONS.map(s=>(<button key={s.key} onClick={()=>setSection(s.key)} style={{flex:1,padding:'11px 4px',background:section===s.key?TH.pink:'transparent',border:'none',borderRadius:10,color:section===s.key?'#fff':TH.textMuted,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:TH.heading,letterSpacing:'-0.01em',transition:'all 150ms ease',textAlign:'center',boxShadow:section===s.key?'0 0 16px rgba(236,116,135,0.3)':'none'}}>{s.label}</button>))}</div>
      <div style={{padding:'0 1.25rem'}}>
        {section==='gym'&&<GymSection />}
        {section==='nutrition'&&<NutritionSection />}
        {section==='habits'&&<HabitsSection />}
      </div></div>
  </>);
}
