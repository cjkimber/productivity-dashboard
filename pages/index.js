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

// ─── WORKOUT TYPES ─────────────────────────────────────────────────────────
const WORKOUT_TYPES = [
  { key:'L',label:'Legs',color:'#EC7480',textColor:'#6B1D25' },
  { key:'B',label:'Back & Biceps',color:'#FFB069',textColor:'#5A3010' },
  { key:'C',label:'Chest & Triceps',color:'#FFF296',textColor:'#6B5A00' },
  { key:'D',label:'Delts',color:'#85D2FF',textColor:'#0C3A6B' },
  { key:'R',label:'Rowing',color:'#9EF0DE',textColor:'#0A4A3A' },
  { key:'KB',label:'KB',color:'#9884E8',textColor:'#2A1F6B' },
  { key:'XT',label:'X Trainer',color:'#4ADE80',textColor:'#0A3320' },
  { key:'INJ',label:'Injured',color:'#3A3F4B',textColor:'#FFFFFF',emoji:'🤕' },
];

// A day can hold at most one 'primary' (weight-training) session and one
// 'secondary' (cardio) session. Slot is always derived from type, mirroring
// the server-side logic in /api/workouts — never trust a stored slot alone.
const CARDIO_KEYS = ['R','KB','XT'];
function slotForType(type) { return CARDIO_KEYS.includes(type) ? 'secondary' : 'primary'; }

const DEFAULT_EXERCISES = {
  L:['Squats','Smith Squats','Leg Extensions','Single Leg KB Squats','KB Lunges','Lying Ham Curl','Seated Leg Curl'],
  B:['Lying EZ Rows','Wide Grip Pulldowns','Seated Cable Row','Close Grip Pulldowns','Dbell Rows','Fixed Pulldowns','Assisted Pull Ups','Dbell Curls','Standing EZ Curls','EZ Preacher Curls','Preacher Dbell Curls','Cable Curls','Single Cable Curls','21s'],
  C:['Incline Bench Press','Incline Dbell Press','Pec Dec','Incline Smith Press','Flye Machine','Flat Dbell Press','Cable Cross Overs','Bench Dips','Dbell Raises','KB Kick Back','DB Kick Backs','Cable Pushdowns','Tri Bar Push Downs','Close Grip Bench'],
  D:['Dbell Press','Side Raises','Leaning Side Raises','Bar Raises','KB Swings','B.O Dbell Rows','Single Arm B.O Rows','EZ Rear Rows'],
  R:[],KB:[],XT:[],INJ:[],
};

const HEAT = {
  green1:'#34D399',green1Text:'#022C22',
  green2:'#10B981',green2Text:'#022C22',
  amber:'#F59E0B',amberText:'#1C1103',
  red:'#EF4444',redText:'#FFF0F0',
  none:'#12182A',noneText:'#6F7B91',
};
function getDaysInMonth(y,m) { return new Date(y,m+1,0).getDate(); }
function getFirstDayOfMonth(y,m) { return new Date(y,m,1).getDay(); }
function getMondayOffset(y,m) { const fd=getFirstDayOfMonth(y,m); return fd===0?6:fd-1; }
function pad(n) { return String(n).padStart(2,'0'); }
function toDateStr(y,m,d) { return `${y}-${pad(m+1)}-${pad(d)}`; }
function todayStr() { const n=new Date(); return `${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())}`; }
function fmtDate(str) { if(!str) return ''; const [y,m,d]=str.split('-'); return new Date(y,m-1,d).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}); }

// ─── ROWING ─────────────────────────────────────────────────────────────────
const ROWING_CATEGORIES = [
  { key:'30 min row', label:'30 min', type:'time' },
  { key:'2k row', label:'2k', type:'distance' },
  { key:'5k row', label:'5k', type:'distance' },
  { key:'6k row', label:'6k', type:'distance' },
  { key:'10k row', label:'10k', type:'distance' },
];
function parseTimeToSeconds(str) {
  if(!str) return null;
  const parts = str.split(':').map(p=>parseFloat(p));
  if (parts.some(p=>isNaN(p))) return null;
  if (parts.length===2) return parts[0]*60+parts[1];
  if (parts.length===3) return parts[0]*3600+parts[1]*60+parts[2];
  return null;
}
function fmtMMSS(totalSeconds) {
  if (totalSeconds==null || isNaN(totalSeconds)) return '–';
  const s = Math.round(totalSeconds);
  const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const sec = s%60;
  return h>0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
function fmtPace(workTimeSeconds, workDistance) {
  if (!workTimeSeconds || !workDistance) return null;
  return fmtMMSS((workTimeSeconds/workDistance)*500);
}
function fmtRowDate(str) { if(!str) return ''; const [datePart]=str.split(' '); const [y,m,d]=datePart.split('-'); return new Date(y,m-1,d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}); }

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

const inputStyle = {
  padding:'9px',borderRadius:10,
  border:`1px solid ${TH.borderMed}`,
  background:TH.input,color:TH.text,fontSize:14,textAlign:'center',fontFamily:'inherit',
  boxShadow:TH.glow,width:'100%',minWidth:0,boxSizing:'border-box',
};

// ─── CALENDAR GRID — supports trophy overlay ─────────────────────────────────
function CalendarGrid({ year,month,getCellStyle,onDayClick }) {
  const [today,setToday] = useState('');
  useEffect(() => { setToday(todayStr()); }, []);
  const days = getDaysInMonth(year,month);
  const leadOffset = getMondayOffset(year,month);
  const prevMonth = month===0?11:month-1;
  const prevYear = month===0?year-1:year;
  const prevMonthDays = getDaysInMonth(prevYear,prevMonth);
  const nextMonth = month===11?0:month+1;
  const nextYear = month===11?year+1:year;
  const trailOffset = (7 - ((leadOffset + days) % 7)) % 7;

  function renderCell(key,day,dateStr,clickable) {
    const s = getCellStyle(day,dateStr) || {}; const isSplit = !!s.splitBg;
    const isToday = today && dateStr === today;
    return (<div key={key} onClick={() => onDayClick(dateStr)}
      style={{ aspectRatio:'1',borderRadius:s.borderRadius||TH.radiusSm,border:s.border||'none',background:isSplit?'transparent':(s.background||TH.cardAlt),display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:s.color||TH.textMuted,fontWeight:s.fontWeight||500,cursor:'pointer',position:'relative',transition:'transform 150ms ease',overflow:'hidden',opacity:clickable?1:0.55,boxShadow:isToday?`0 0 0 2px ${TH.cyan}, 0 0 12px rgba(77,212,255,0.35)`:'none' }}>
      {isSplit && (<svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position:'absolute',inset:0,width:'100%',height:'100%' }}>
        <polygon points="0,0 100,0 0,100" fill={s.splitBg[0]} /><polygon points="100,0 100,100 0,100" fill={s.splitBg[1]} /></svg>)}
      {s.overlayEmoji ? (
        <svg viewBox="0 0 100 100" style={{ position:'absolute',inset:0,width:'100%',height:'100%',zIndex:2 }}>
          <text x="50" y="52" textAnchor="middle" dominantBaseline="central" fontSize="88">{s.overlayEmoji}</text>
        </svg>
      ) : (
        <>
          <span style={{ position:'relative',zIndex:1,textShadow:isSplit?'0 0 3px rgba(0,0,0,0.35)':'none' }}>{day}</span>
          {s.letter && <span style={{ position:'absolute',bottom:2,left:3,fontSize:8,fontWeight:700,color:s.color,opacity:0.85,zIndex:1,textShadow:isSplit?'0 0 3px rgba(0,0,0,0.35)':'none' }}>{s.letter}</span>}
          {s.bottomLabel && <span style={{ position:'absolute',bottom:2,fontSize:8,fontWeight:600,color:s.color,opacity:0.85,zIndex:1 }}>{s.bottomLabel}</span>}
        </>
      )}
    </div>);
  }

  return (<div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:5,marginBottom:'1.5rem' }}>
    {['M','T','W','T','F','S','S'].map((d,i) => (<div key={i} style={{ textAlign:'center',fontSize:11,color:TH.textMuted,paddingBottom:6,fontWeight:600 }}>{d}</div>))}
    {Array.from({ length:leadOffset }).map((_,i) => {
      const day = prevMonthDays - leadOffset + i + 1;
      const dateStr = toDateStr(prevYear,prevMonth,day);
      return renderCell(`e${i}`,day,dateStr,false);
    })}
    {Array.from({ length:days },(_,i) => i+1).map(day => {
      const dateStr = toDateStr(year,month,day);
      return renderCell(day,day,dateStr,true);
    })}
    {Array.from({ length:trailOffset }).map((_,i) => {
      const day = i+1;
      const dateStr = toDateStr(nextYear,nextMonth,day);
      return renderCell(`t${i}`,day,dateStr,false);
    })}
    </div>);
}

// ─── GYM CALENDAR ───────────────────────────────────────────────────────────
function GymCalendar({ year,month,externalLogs }) {
  const [data,setData] = useState([]);
  const [logs,setLogs] = useState([]);
  const [modal,setModal] = useState(null);
  const [modalSlot,setModalSlot] = useState(null); // null = free choice (fresh day); 'primary'|'secondary' = restricted picker
  const [summaryModal,setSummaryModal] = useState(null); // dateStr — shown when the day already has ≥1 session
  const [detailModal,setDetailModal] = useState(null);
  const [detailSlot,setDetailSlot] = useState('primary');
  const [form,setForm] = useState({ type:'L' });
  const [editSession,setEditSession] = useState(null);
  const [editing,setEditing] = useState(false);
  const [moveMode,setMoveMode] = useState(false);
  const [moveDate,setMoveDate] = useState('');

  useEffect(() => { refreshData(); }, [year,month]);

  // byDate[date] = { primary: entry|undefined, secondary: entry|undefined }
  const byDate = {};
  data.forEach(d => { const slot = d.slot||slotForType(d.type); if(!byDate[d.date]) byDate[d.date]={}; byDate[d.date][slot]=d; });
  const logByDate = {};
  (externalLogs||logs).forEach(l => { const slot = l.sessionSlot||'primary'; if(!logByDate[l.date]) logByDate[l.date]={}; logByDate[l.date][slot]=l; });

  function refreshData() {
    const prevMonth0 = month===0?11:month-1; const prevYear = month===0?year-1:year;
    const nextMonth0 = month===11?0:month+1; const nextYear = month===11?year+1:year;
    Promise.all([
      fetch(`/api/workouts?year=${year}&month=${month+1}`).then(r=>r.json()),
      fetch(`/api/workouts?year=${prevYear}&month=${prevMonth0+1}`).then(r=>r.json()),
      fetch(`/api/workouts?year=${nextYear}&month=${nextMonth0+1}`).then(r=>r.json()),
    ]).then(([cur,prev,next]) => setData([...prev,...cur,...next]));
    fetch('/api/exercise-log').then(r=>r.json()).then(setLogs);
  }

  async function save() {
    await fetch('/api/workouts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:modal,type:form.type})});
    setModal(null); setModalSlot(null); setSummaryModal(null); refreshData();
  }
  async function remove() {
    const slot = modalSlot || slotForType(form.type);
    await fetch('/api/workouts',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:modal,slot})});
    setModal(null); setModalSlot(null); setSummaryModal(null); refreshData();
  }

  async function moveWorkout(oldDate, newDate, slot) {
    const entry = byDate[oldDate]?.[slot]; const log = logByDate[oldDate]?.[slot];
    if (!entry) return;
    await fetch('/api/workouts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:newDate,type:entry.type})});
    if (log && !log.noData) { const newLog = {...log, date:newDate, sessionSlot:slot}; delete newLog._id; await fetch('/api/exercise-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(newLog)}); }
    if (log && log.noData) { await fetch('/api/exercise-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:newDate,workoutType:entry.type,sessionSlot:slot,noData:true,exercises:[]})}); }
    await fetch('/api/workouts',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:oldDate,slot})});
    setModal(null); setModalSlot(null); setSummaryModal(null); setDetailModal(null); setEditSession(null); setEditing(false); setMoveMode(false); setMoveDate(''); refreshData();
  }

  async function saveEditedSession() {
    if (!editSession) return;
    await fetch('/api/exercise-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...editSession,noData:false})});
    setDetailModal(null); setEditSession(null); setEditing(false);
    fetch('/api/exercise-log').then(r=>r.json()).then(setLogs);
  }
  async function removeSession() {
    if (!detailModal) return;
    await fetch('/api/workouts',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:detailModal,slot:detailSlot})});
    setDetailModal(null); setEditSession(null); setEditing(false); refreshData();
  }
  function openDay(dateStr) {
    const entries = byDate[dateStr] || {};
    if (!entries.primary && !entries.secondary) {
      setForm({type:'L'}); setModalSlot(null); setModal(dateStr); setMoveMode(false); setMoveDate('');
      return;
    }
    setSummaryModal(dateStr);
  }
  function openTypePicker(dateStr, slot, defaultType) {
    setForm({type:defaultType}); setModalSlot(slot); setModal(dateStr); setSummaryModal(null); setMoveMode(false); setMoveDate('');
  }
  function openDetailForSlot(dateStr, slot) {
    const log = logByDate[dateStr]?.[slot];
    if (!log) return;
    setEditSession(JSON.parse(JSON.stringify(log))); setDetailSlot(slot); setDetailModal(dateStr);
    setSummaryModal(null); setMoveMode(false); setMoveDate('');
  }
  function updateEditSet(exIdx,setIdx,field,value) { setEditSession(prev => ({...prev,exercises:prev.exercises.map((ex,i) => i!==exIdx?ex:{...ex,sets:ex.sets.map((s,j) => j!==setIdx?s:{...s,[field]:value})})})); }
  function addEditSet(exIdx) { setEditSession(prev => ({...prev,exercises:prev.exercises.map((ex,i) => i!==exIdx?ex:{...ex,sets:[...ex.sets,{weight:'',reps:''}]})})); }
  function startEditing() { setEditSession(prev => ({...prev,exercises:(prev.exercises||[]).map(ex => ({...ex,sets:(!ex.sets||ex.sets.length<3)?[...(ex.sets||[]),...Array.from({length:3-(ex.sets||[]).length},()=>({weight:'',reps:''}))]:ex.sets}))})); setEditing(true); }
  function closeModal() { setModal(null); setModalSlot(null); setMoveMode(false); setMoveDate(''); }
  function closeSummaryModal() { setSummaryModal(null); }
  function closeDetailModal() { setDetailModal(null); setEditSession(null); setEditing(false); setMoveMode(false); setMoveDate(''); }

  const GYM_LABEL_KEYS = ['L','B','C','D','INJ'];

  return (<div>
    <CalendarGrid year={year} month={month}
      getCellStyle={(day,dateStr) => {
        const entries = byDate[dateStr] || {};
        const primary = entries.primary; const secondary = entries.secondary;
        if (!primary && !secondary) return {border:`1px solid ${TH.border}`,color:TH.textMuted,borderRadius:TH.radiusSm};
        const dayLogs = logByDate[dateStr] || {};
        const isAM = !!(dayLogs.primary?.am || dayLogs.secondary?.am);
        if (primary && secondary) {
          const wtP = WORKOUT_TYPES.find(w => w.key===primary.type);
          const wtS = WORKOUT_TYPES.find(w => w.key===secondary.type);
          return {splitBg:[wtP?.color||'#888',wtS?.color||'#888'],color:'#FFFFFF',borderRadius:TH.radiusSm,fontWeight:600,letter:`${primary.type}/${secondary.type}`,overlayEmoji:isAM?'🏅':null};
        }
        const entry = primary||secondary;
        const wt = WORKOUT_TYPES.find(w => w.key===entry.type);
        const overlayEmoji = wt?.emoji || (isAM ? '🏅' : null);
        return {background:wt?.color||'#888',color:wt?.textColor||'#fff',borderRadius:TH.radiusSm,fontWeight:600,letter:entry.type,overlayEmoji};
      }}
      onDayClick={dateStr => openDay(dateStr)}
    />
    <div style={{ display:'flex',flexWrap:'wrap',gap:12,marginBottom:'1.5rem' }}>
      {WORKOUT_TYPES.map(w => (<div key={w.key} style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:TH.textSec }}>
        {w.emoji ? <span style={{ fontSize:14,lineHeight:1 }}>{w.emoji}</span> : <div style={{ width:12,height:12,borderRadius:4,background:w.color }} />}
        <span style={{ fontWeight:700,color:TH.text }}>{w.key}</span> {w.label}</div>))}
      <div style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:TH.textSec }}><span>🏅</span> AM session</div>
    </div>

    {/* Day summary — shown when a day already has one or both sessions */}
    {summaryModal && (<Modal title={`${fmtDate(summaryModal)}`} onClose={closeSummaryModal}>
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        {['primary','secondary'].map(slot => {
          const entry = byDate[summaryModal]?.[slot];
          const log = logByDate[summaryModal]?.[slot];
          const otherEntry = byDate[summaryModal]?.[slot==='primary'?'secondary':'primary'];
          if (!entry) {
            const canAdd = slot==='secondary' ? (otherEntry && otherEntry.type!=='INJ') : (otherEntry && CARDIO_KEYS.includes(otherEntry.type));
            if (!canAdd) return null;
            return (<button key={slot} onClick={() => openTypePicker(summaryModal, slot, slot==='primary'?'L':'R')}
              style={{ fontSize:13,color:TH.cyan,background:'rgba(77,212,255,0.06)',border:`1px dashed ${TH.borderMed}`,borderRadius:TH.radiusSm,padding:'12px',cursor:'pointer',fontFamily:'inherit',fontWeight:600 }}>
              + Add {slot==='primary'?'weights':'cardio'} session
            </button>);
          }
          const wt = WORKOUT_TYPES.find(w => w.key===entry.type);
          const isRowingType = entry.type==='R'; const isXTType = entry.type==='XT';
          return (<div key={slot} style={{ background:TH.card,border:`1px solid ${TH.border}`,borderRadius:TH.radiusSm,padding:'12px' }}>
            <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>
              <span style={{ background:wt?.color,color:wt?.textColor,borderRadius:8,fontSize:12,fontWeight:700,padding:'5px 12px' }}>{wt?.emoji||entry.type}</span>
              <span style={{ fontWeight:700,fontSize:14,color:TH.text }}>{wt?.label}</span>
              {log?.am && <span style={{ fontSize:15 }}>🏅</span>}
            </div>
            {!log && (<>
              <div style={{ fontSize:13,color:TH.textMuted,marginBottom:10 }}>Pending — record it in the Log tab</div>
              <div style={{ display:'flex',gap:8 }}>
                <Btn onClick={() => openTypePicker(summaryModal, slot, entry.type)} variant="secondary" style={{ flex:1,padding:'8px',fontSize:13 }}>Change type</Btn>
                <Btn onClick={async () => { await fetch('/api/workouts',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:summaryModal,slot})}); setSummaryModal(null); refreshData(); }} variant="danger" style={{ flex:1,padding:'8px',fontSize:13 }}>Remove</Btn>
              </div>
            </>)}
            {log && log.noData && (<>
              <div style={{ fontSize:13,color:TH.textMuted,marginBottom:10 }}>Marked as no data</div>
              <Btn onClick={async () => { await fetch('/api/workouts',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:summaryModal,slot})}); setSummaryModal(null); refreshData(); }} variant="danger" style={{ padding:'8px',fontSize:13 }}>Remove entry</Btn>
            </>)}
            {log && !log.noData && (<>
              {isRowingType && <div style={{ fontSize:13,color:TH.textSec,marginBottom:8 }}>{log.am ? 'AM session' : 'Session logged'}</div>}
              {isXTType && <div style={{ fontSize:13,color:TH.textSec,marginBottom:8 }}>{log.xtDuration?`${log.xtDuration} min`:'Session logged'}{log.xtCalories?` • ${log.xtCalories} kcal`:''}</div>}
              {!isRowingType && !isXTType && (log.exercises||[]).filter(ex => (ex.sets||[]).some(s=>s.reps||s.weight)).length>0 && (
                <div style={{ fontSize:12,color:TH.textMuted,marginBottom:8 }}>{(log.exercises||[]).filter(ex => (ex.sets||[]).some(s=>s.reps||s.weight)).length} exercise(s) logged</div>
              )}
              <Btn onClick={() => openDetailForSlot(summaryModal, slot)} style={{ padding:'8px',fontSize:13 }}>View / edit session</Btn>
            </>)}
          </div>);
        })}
      </div>
    </Modal>)}

    {modal && (<Modal title={`${modalSlot==='secondary'?'Add cardio session':modalSlot==='primary'?'Add weights session':'Log workout'} — ${fmtDate(modal)}`} onClose={closeModal}>
      <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
        {!moveMode ? (<>
          <div>
            <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:8,fontWeight:500 }}>Workout type</label>
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {WORKOUT_TYPES.filter(w => !modalSlot || (modalSlot==='primary' ? GYM_LABEL_KEYS.includes(w.key) : CARDIO_KEYS.includes(w.key))).map(w => (<button key={w.key} onClick={() => setForm(f => ({...f,type:w.key}))}
                style={{ display:'flex',alignItems:'center',gap:10,padding:'11px 14px',borderRadius:TH.radiusSm,border:`2px solid ${form.type===w.key?w.color:TH.border}`,background:form.type===w.key?w.color+'20':TH.cardAlt,textAlign:'left',cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease',boxShadow:form.type===w.key?`0 0 12px ${w.color}30`:'none' }}>
                <span style={{ width:30,height:30,borderRadius:8,background:w.color,display:'flex',alignItems:'center',justifyContent:'center',color:w.textColor,fontSize:w.emoji?16:12,fontWeight:700,flexShrink:0 }}>{w.emoji||w.key}</span>
                <span style={{ fontSize:14,color:form.type===w.key?TH.text:TH.textSec,fontWeight:form.type===w.key?600:400 }}>{w.label}</span>
              </button>))}
            </div>
          </div>
          <Btn onClick={save}>Save</Btn>
          {modalSlot && byDate[modal]?.[modalSlot] && (<>
            <Btn onClick={() => {setMoveMode(true);setMoveDate(modal);}} variant="secondary">Move to different date</Btn>
            <Btn onClick={remove} variant="danger">Remove entry</Btn>
          </>)}
        </>) : (<>
          <div>
            <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:8,fontWeight:500 }}>Move workout to new date</label>
            <input type="date" value={moveDate} onChange={e => setMoveDate(e.target.value)} style={{ width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:16,fontFamily:'inherit',boxShadow:TH.glow }} />
            {moveDate && moveDate!==modal && (<div style={{ fontSize:12,color:TH.textSec,marginTop:8 }}>
              Moving from {fmtDate(modal)} to {fmtDate(moveDate)}
              {logByDate[modal]?.[modalSlot||slotForType(form.type)] && !logByDate[modal][modalSlot||slotForType(form.type)].noData && <div style={{ color:TH.cyan,marginTop:4 }}>Session data will also be moved</div>}
            </div>)}
          </div>
          <Btn onClick={() => {if(moveDate&&moveDate!==modal)moveWorkout(modal,moveDate,modalSlot||slotForType(form.type));}} style={{ opacity:moveDate&&moveDate!==modal?1:0.4 }}>Confirm move</Btn>
          <Btn onClick={() => setMoveMode(false)} variant="secondary">Cancel</Btn>
        </>)}
      </div>
    </Modal>)}
    {detailModal && editSession && (<Modal title={`Session — ${fmtDate(detailModal)}`} onClose={closeDetailModal}>
      {(() => {
        const wt = WORKOUT_TYPES.find(w => w.key===editSession.workoutType);
        const isRowingType = editSession.workoutType==='R';
        const isXTType = editSession.workoutType==='XT';
        return (<div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:2 }}>
            <span style={{ background:wt?.color,color:wt?.textColor,borderRadius:8,fontSize:12,fontWeight:700,padding:'5px 12px' }}>{wt?.emoji||editSession.workoutType}</span>
            <span style={{ fontWeight:700,fontSize:15,fontFamily:TH.heading,color:TH.text }}>{wt?.label}</span>
            {editSession.am && <span style={{ fontSize:16 }}>🏅</span>}
          </div>
          {!editing && !moveMode ? (<>
            {isRowingType && <div style={{ fontSize:14,color:TH.textSec,padding:'6px 0' }}>{editSession.am ? '🏅 AM session' : 'No AM data'}</div>}
            {isXTType && <div style={{ fontSize:14,color:TH.textSec,padding:'6px 0' }}>{editSession.xtDuration?`${editSession.xtDuration} min`:'No duration logged'}{editSession.xtCalories?` • ${editSession.xtCalories} kcal`:''}</div>}
            {!isRowingType && !isXTType && (editSession.exercises||[]).map((ex,exIdx) => {
              const filledSets = ex.sets.filter(s=>s.reps||s.weight); if(filledSets.length===0) return null;
              return (<div key={exIdx} style={{ padding:'8px 0',borderBottom:`1px solid ${TH.border}` }}>
                <div style={{ fontWeight:600,fontSize:13,color:TH.text,marginBottom:5 }}>{ex.name}</div>
                <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>{filledSets.map((s,i) => <span key={i} style={{ background:TH.cardAlt,borderRadius:6,padding:'4px 10px',fontSize:12,color:TH.textSec,border:`1px solid ${TH.border}` }}>{s.reps} x {s.weight}kg</span>)}</div>
              </div>);
            })}
            {editSession.sessionNotes && (<div style={{ padding:'8px 0',borderTop:`1px solid ${TH.border}`,marginTop:2 }}>
              <div style={{ fontSize:11,color:TH.textMuted,marginBottom:3 }}>Notes</div>
              <div style={{ fontSize:13,color:TH.textSec }}>{editSession.sessionNotes}</div></div>)}
            <Btn onClick={startEditing} variant="secondary" style={{ marginTop:4 }}>Edit session</Btn>
            <Btn onClick={() => {setMoveMode(true);setMoveDate(detailModal);}} variant="secondary">Move to different date</Btn>
            <Btn onClick={removeSession} variant="danger">Remove session</Btn>
          </>) : moveMode ? (<>
            <div>
              <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:8,fontWeight:500 }}>Move workout to new date</label>
              <input type="date" value={moveDate} onChange={e => setMoveDate(e.target.value)} style={{ width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:16,fontFamily:'inherit',boxShadow:TH.glow }} />
              {moveDate && moveDate!==detailModal && (<div style={{ fontSize:12,color:TH.textSec,marginTop:8 }}>
                Moving from {fmtDate(detailModal)} to {fmtDate(moveDate)}
                <div style={{ color:TH.cyan,marginTop:4 }}>Session data will also be moved</div>
              </div>)}
            </div>
            <Btn onClick={() => {if(moveDate&&moveDate!==detailModal)moveWorkout(detailModal,moveDate,detailSlot);}} style={{ opacity:moveDate&&moveDate!==detailModal?1:0.4 }}>Confirm move</Btn>
            <Btn onClick={() => setMoveMode(false)} variant="secondary">Cancel</Btn>
          </>) : (<>
            {isRowingType && (
              <div style={{ padding:'12px',background:TH.cardAlt,borderRadius:TH.radiusSm,border:`1px solid ${TH.border}` }}>
                <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:8,fontWeight:500 }}>AM session?</label>
                <button onClick={() => setEditSession(prev => ({...prev,am:!prev.am}))}
                  style={{ display:'flex',alignItems:'center',gap:10,width:'100%',padding:'12px 14px',borderRadius:TH.radiusSm,border:`2px solid ${editSession.am?'#FFD700':TH.border}`,background:editSession.am?'rgba(255,215,0,0.08)':TH.input,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease' }}>
                  <span style={{ fontSize:22 }}>{editSession.am?'🏅':'⬜'}</span>
                  <span style={{ fontSize:14,color:editSession.am?'#FFD700':TH.textMuted,fontWeight:editSession.am?600:400 }}>{editSession.am?'Yes — AM session':'No AM session'}</span>
                </button>
              </div>
            )}
            {isXTType && (
              <div style={{ padding:'12px',background:TH.cardAlt,borderRadius:TH.radiusSm,border:`1px solid ${TH.border}`,display:'flex',flexDirection:'column',gap:10 }}>
                <div><label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:6,fontWeight:500 }}>Duration (minutes)</label>
                  <input type="number" value={editSession.xtDuration||''} onChange={e => setEditSession(prev => ({...prev,xtDuration:e.target.value}))} style={{ ...inputStyle,width:'100%' }} /></div>
                <div><label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:6,fontWeight:500 }}>Calories burned</label>
                  <input type="number" value={editSession.xtCalories||''} onChange={e => setEditSession(prev => ({...prev,xtCalories:e.target.value}))} style={{ ...inputStyle,width:'100%' }} /></div>
              </div>
            )}
            {!isRowingType && !isXTType && (editSession.exercises||[]).map((ex,exIdx) => (<div key={exIdx} style={{ padding:'8px 0',borderBottom:`1px solid ${TH.border}` }}>
              <div style={{ fontWeight:600,fontSize:13,color:TH.text,marginBottom:6 }}>{ex.name}</div>
              {ex.sets.map((set,setIdx) => (<div key={setIdx} style={{ display:'flex',alignItems:'center',gap:6,marginBottom:5 }}>
                <span style={{ fontSize:11,color:TH.textMuted,width:22,flexShrink:0 }}>S{setIdx+1}</span>
                <input type="number" value={set.weight} onChange={e => updateEditSet(exIdx,setIdx,'weight',e.target.value)} style={{ width:52,padding:'5px 4px',borderRadius:8,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:13,textAlign:'center',fontFamily:'inherit',boxShadow:TH.glow }} />
                <span style={{ fontSize:11,color:TH.textMuted }}>kg x</span>
                <input type="number" value={set.reps} onChange={e => updateEditSet(exIdx,setIdx,'reps',e.target.value)} style={{ width:44,padding:'5px 4px',borderRadius:8,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:13,textAlign:'center',fontFamily:'inherit',boxShadow:TH.glow }} />
                <span style={{ fontSize:11,color:TH.textMuted }}>reps</span>
              </div>))}
              <button onClick={() => addEditSet(exIdx)} style={{ fontSize:11,color:TH.textMuted,background:'none',border:`1px dashed ${TH.borderMed}`,borderRadius:8,padding:'5px 10px',cursor:'pointer',width:'100%',marginTop:3,fontFamily:'inherit' }}>+ Add set</button>
            </div>))}
            {!isRowingType && editSession.sessionNotes!==undefined && (<div><div style={{ fontSize:11,color:TH.textMuted,marginBottom:3 }}>Notes</div>
              <textarea value={editSession.sessionNotes||''} onChange={e => setEditSession(prev => ({...prev,sessionNotes:e.target.value}))} rows={2} style={{ width:'100%',padding:'8px',borderRadius:10,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:13,fontFamily:'inherit',resize:'vertical',boxShadow:TH.glow }} /></div>)}
            {!isRowingType && (
              <div style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:TH.cardAlt,borderRadius:TH.radiusSm,border:`1px solid ${TH.border}` }}>
                <button onClick={() => setEditSession(prev => ({...prev,am:!prev.am}))}
                  style={{ display:'flex',alignItems:'center',gap:8,background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit' }}>
                  <span style={{ fontSize:20 }}>{editSession.am?'🏅':'⬜'}</span>
                  <span style={{ fontSize:13,color:editSession.am?'#FFD700':TH.textMuted,fontWeight:editSession.am?600:400 }}>AM session</span>
                </button>
              </div>
            )}
            <Btn onClick={saveEditedSession}>Save changes</Btn>
            <Btn onClick={() => setEditing(false)} variant="secondary">Cancel</Btn>
          </>)}
        </div>);
      })()}
    </Modal>)}
  </div>);
}

// ─── GYM LOG ────────────────────────────────────────────────────────────────
function GymLog({ onSessionSaved }) {
  const [workouts,setWorkouts] = useState([]); const [logged,setLogged] = useState([]); const [drafts,setDrafts] = useState([]);
  const [session,setSession] = useState(null); const [inactive,setInactive] = useState({}); const [exerciseOrder,setExerciseOrder] = useState({});
  const [customExercises,setCustomExercises] = useState({});
  const [showInactive,setShowInactive] = useState(false); const [inactiveBodyPart,setInactiveBodyPart] = useState(null);
  useEffect(() => { loadAll(); }, []);
  async function loadAll() {
    // No month filter — /api/workouts returns every entry, so workouts on ANY past date appear here
    const [wRes,lRes,dRes,iRes,oRes,cRes] = await Promise.all([fetch('/api/workouts'),fetch('/api/exercise-log'),fetch('/api/exercise-draft'),fetch('/api/inactive-exercises'),fetch('/api/exercise-order'),fetch('/api/custom-exercises')]);
    const [w,l,d,i,o,c] = await Promise.all([wRes.json(),lRes.json(),dRes.json(),iRes.json(),oRes.json(),cRes.json()]);
    setWorkouts(w); setLogged(l); setDrafts(d);
    const iMap = {}; i.forEach(x => { if(!iMap[x.bodyPart]) iMap[x.bodyPart]=[]; iMap[x.bodyPart].push(x); }); setInactive(iMap);
    const oMap = {}; o.forEach(x => { oMap[x.bodyPart] = x.exercises; }); setExerciseOrder(oMap);
    const cMap = {}; c.forEach(x => { if(!cMap[x.bodyPart]) cMap[x.bodyPart]=[]; cMap[x.bodyPart].push(x); }); setCustomExercises(cMap);
  }
  const loggedKeys = new Set(logged.map(l => `${l.date}|${l.sessionSlot||'primary'}`));
  const pending = workouts.filter(w => w.type!=='INJ' && !loggedKeys.has(`${w.date}|${w.slot||slotForType(w.type)}`)).sort((a,b) => b.date.localeCompare(a.date));

  async function markNoData(workout) {
    const slot = workout.slot||slotForType(workout.type);
    await fetch('/api/exercise-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:workout.date,workoutType:workout.type,sessionSlot:slot,noData:true,exercises:[]})});
    loadAll();
  }
  function openSession(workout) {
    const slot = workout.slot||slotForType(workout.type);
    const draft = drafts.find(d => d.date===workout.date && (d.sessionSlot||'primary')===slot);
    if (draft) { setSession(draft); return; }
    const wt = WORKOUT_TYPES.find(w => w.key===workout.type);
    const inactiveList = inactive[workout.type]||[]; const inactiveNames = inactiveList.map(i => i.exercise);
    const savedOrder = exerciseOrder[workout.type]; const defaultList = DEFAULT_EXERCISES[workout.type]||[];
    const customList = (customExercises[workout.type]||[]).map(c => c.exercise);
    const allExercises = [...defaultList, ...customList.filter(e => !defaultList.includes(e))];
    let orderedList; if(savedOrder){const extras=allExercises.filter(ex=>!savedOrder.includes(ex));orderedList=[...savedOrder,...extras];}else{orderedList=allExercises;}
    const activeExercises = orderedList.filter(ex => !inactiveNames.includes(ex));
    setSession({date:workout.date,workoutType:workout.type,workoutLabel:wt?.label||workout.type,sessionSlot:slot,am:false,exercises:activeExercises.map(name=>({name,sets:[{weight:'',reps:''},{weight:'',reps:''},{weight:'',reps:''}]}))});
  }
  async function saveSession(sessionData,complete) {
    if(complete){
      await fetch('/api/exercise-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...sessionData,noData:false})});
      await fetch('/api/exercise-draft',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:sessionData.date,sessionSlot:sessionData.sessionSlot||'primary'})});
      setSession(null); loadAll(); if(onSessionSaved) onSessionSaved();
    } else { await fetch('/api/exercise-draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sessionData)}); setSession(null); loadAll(); }
  }
  async function moveToInactive(bodyPart,exercise) { await fetch('/api/inactive-exercises',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bodyPart,exercise})}); loadAll(); }
  async function restoreFromInactive(id) { await fetch('/api/inactive-exercises',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}); loadAll(); }
  async function deleteInactive(id) { await fetch('/api/inactive-exercises',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,permanent:true})}); loadAll(); }
  async function deleteCustomExercise(customId) { await fetch('/api/custom-exercises',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:customId})}); loadAll(); }

  // Rename an inactive exercise. If it's one of Chris's own custom exercises, the
  // custom_exercises doc is renamed alongside it so everything stays in sync.
  // If it's a hardcoded default (e.g. "Squats"), the ORIGINAL default name is
  // re-blocked under a fresh inactive record (so the old default doesn't silently
  // reappear) and the new name is registered as a custom exercise going forward.
  async function renameInactive(item,newName) {
    const trimmed = (newName||'').trim();
    if(!trimmed || trimmed===item.exercise) return;
    const bodyPart = item.bodyPart;
    const isCustom = (customExercises[bodyPart]||[]).some(c => c.exercise===item.exercise);
    if (isCustom) {
      const customDoc = (customExercises[bodyPart]||[]).find(c => c.exercise===item.exercise);
      await fetch('/api/custom-exercises',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:customDoc._id,exercise:trimmed})});
      await fetch('/api/inactive-exercises',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item._id,exercise:trimmed})});
    } else {
      await fetch('/api/inactive-exercises',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item._id,exercise:trimmed})});
      await fetch('/api/custom-exercises',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bodyPart,exercise:trimmed})});
      await fetch('/api/inactive-exercises',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bodyPart,exercise:item.exercise})});
    }
    loadAll();
  }
  // Permanently delete an inactive exercise.
  // - Custom exercise (one Chris added himself): fully erased from both
  //   collections — nothing left behind.
  // - Hardcoded default (lives in DEFAULT_EXERCISES in code, not the database):
  //   there's no database row to erase, so instead its inactive record is
  //   flagged "deleted". It stays permanently blocked (so it can never silently
  //   reappear) but drops out of the Inactive exercises list — there's no
  //   "Add back" for it afterwards, matching the "No Data" no-undo rule.
  async function deleteInactiveExercise(item) {
    const bodyPart = item.bodyPart;
    const customDoc = (customExercises[bodyPart]||[]).find(c => c.exercise===item.exercise);
    if (customDoc) {
      await deleteInactive(item._id);
      await deleteCustomExercise(customDoc._id);
    } else {
      await fetch('/api/inactive-exercises',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item._id,deleted:true})});
      loadAll();
    }
  }

  if(session){return <SessionLogger session={session} onSave={saveSession} onMoveInactive={moveToInactive} onRenameInactive={renameInactive} onDeleteInactive={deleteInactiveExercise} inactive={inactive} allLogs={logged} customExercises={customExercises} onCustomExerciseAdded={loadAll} />;}
  return (<div>
    <div style={{ fontSize:12,color:TH.textMuted,marginBottom:'1rem',fontWeight:500 }}>Workouts waiting to be logged</div>
    {pending.length===0 && <div style={{ textAlign:'center',padding:'2.5rem',color:TH.textMuted,fontSize:14 }}>No workouts waiting to be logged</div>}
    {pending.map(w => {
      const wt = WORKOUT_TYPES.find(x => x.key===w.type);
      const slot = w.slot||slotForType(w.type);
      const draft = drafts.find(d => d.date===w.date && (d.sessionSlot||'primary')===slot);
      return (<div key={`${w.date}-${slot}`} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',background:TH.card,borderRadius:TH.radiusSm,marginBottom:8,boxShadow:TH.shadowSm,border:`1px solid ${TH.border}`,position:'relative',overflow:'hidden' }}>
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
        {(inactive[inactiveBodyPart]||[]).map(ex => {
          const isCustom = (customExercises[inactiveBodyPart]||[]).some(c => c.exercise===ex.exercise);
          const customDoc = isCustom ? (customExercises[inactiveBodyPart]||[]).find(c => c.exercise===ex.exercise) : null;
          return (<div key={ex._id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:TH.cardAlt,borderRadius:8 }}>
            <span style={{ fontSize:14,color:TH.text }}>{ex.exercise}</span>
            <div style={{ display:'flex',gap:8 }}>
              <Btn onClick={() => {restoreFromInactive(ex._id);setShowInactive(false);}} style={{ padding:'6px 12px',fontSize:12 }}>Add back</Btn>
              {isCustom && customDoc && <Btn onClick={async () => { await deleteInactive(ex._id); await deleteCustomExercise(customDoc._id); setShowInactive(false); }} variant="danger" style={{ padding:'6px 12px',fontSize:12 }}>Delete</Btn>}
            </div>
          </div>);
        })}
      </div>
    </Modal>)}
  </div>);
}

// ─── SESSION LOGGER ──────────────────────────────────────────────────────────
function SessionLogger({ session,onSave,onMoveInactive,onRenameInactive,onDeleteInactive,inactive,allLogs,customExercises,onCustomExerciseAdded }) {
  const [exercises,setExercises] = useState(session.exercises||[]);
  const [am,setAm] = useState(session.am||false);
  const [showInactive,setShowInactive] = useState(false);
  const [renamingId,setRenamingId] = useState(null);
  const [renameValue,setRenameValue] = useState('');
  const [previousData,setPreviousData] = useState({});
  const [showAddExercise,setShowAddExercise] = useState(false);
  const [newExerciseName,setNewExerciseName] = useState('');
  const [addingExercise,setAddingExercise] = useState(false);
  const wt = WORKOUT_TYPES.find(w => w.key===session.workoutType);
  const isRowingType = session.workoutType==='R';
  const isXTType = session.workoutType==='XT';
  const isCardioType = isRowingType || isXTType;
  const [rowingType,setRowingType] = useState(session.rowingType||'time');
  const [rowingValue,setRowingValue] = useState(session.rowingValue||'');
  const [xtDuration,setXtDuration] = useState(session.xtDuration||'');
  const [xtCalories,setXtCalories] = useState(session.xtCalories||'');
  const [sessionNotes,setSessionNotes] = useState(session.sessionNotes||'');

  useEffect(() => {
    if(!allLogs||isCardioType) return;
    const sameBPLogs = allLogs.filter(l => l.workoutType===session.workoutType&&!l.noData&&l.date!==session.date).sort((a,b) => b.date.localeCompare(a.date));
    const prevMap = {};
    sameBPLogs.forEach(log => {
      (log.exercises||[]).forEach(ex => {
        if(prevMap[ex.name]) return;
        const hasData = (ex.sets||[]).some(s => s.reps || s.weight);
        if(!hasData) return;
        prevMap[ex.name] = { sets: ex.sets, date: log.date };
      });
    });
    setPreviousData(prevMap);
  }, [allLogs,session.workoutType,session.date]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if(isFirstRender.current){isFirstRender.current=false;return;}
    const timer = setTimeout(() => {
      const draftData = {date:session.date,workoutType:session.workoutType,workoutLabel:session.workoutLabel,sessionSlot:session.sessionSlot||'primary',am,exercises:isCardioType?[]:exercises,rowingType:isRowingType?rowingType:null,rowingValue:isRowingType?rowingValue:null,xtDuration:isXTType?xtDuration:null,xtCalories:isXTType?xtCalories:null,sessionNotes};
      fetch('/api/exercise-draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draftData)});
    }, 1500);
    return () => clearTimeout(timer);
  }, [exercises,am,rowingType,rowingValue,xtDuration,xtCalories,sessionNotes]);

  function isExerciseCompleted(ex) {
    return ex.sets.some(s => (s.weight && s.weight !== '') || (s.reps && s.reps !== ''));
  }

  function updateSet(exIdx,setIdx,field,value) { setExercises(prev => prev.map((ex,i) => i!==exIdx?ex:{...ex,sets:ex.sets.map((s,j) => j!==setIdx?s:{...s,[field]:value})})); }
  function addSet(exIdx) { setExercises(prev => prev.map((ex,i) => i!==exIdx?ex:{...ex,sets:[...ex.sets,{weight:'',reps:''}]})); }
  function removeSet(exIdx,setIdx) { setExercises(prev => prev.map((ex,i) => i!==exIdx?ex:{...ex,sets:ex.sets.filter((_,j) => j!==setIdx)})); }

  function copySetToNext(exIdx,setIdx) {
    setExercises(prev => prev.map((ex,i) => {
      if(i!==exIdx) return ex;
      const currentSet = ex.sets[setIdx]; const nextIdx = setIdx+1;
      if(nextIdx < ex.sets.length) { return {...ex,sets:ex.sets.map((s,j) => j===nextIdx?{...s,weight:currentSet.weight,reps:currentSet.reps}:s)}; }
      else { return {...ex,sets:[...ex.sets,{weight:currentSet.weight,reps:currentSet.reps}]}; }
    }));
  }

  function moveToInactive(exIdx) { const ex=exercises[exIdx]; onMoveInactive(session.workoutType,ex.name); setExercises(prev => prev.filter((_,i) => i!==exIdx)); }
  function moveExercise(fromIdx,direction) {
    const toIdx=fromIdx+direction; if(toIdx<0||toIdx>=exercises.length) return;
    setExercises(prev => { const updated=[...prev]; [updated[fromIdx],updated[toIdx]]=[updated[toIdx],updated[fromIdx]];
      fetch('/api/exercise-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bodyPart:session.workoutType,exercises:updated.map(ex=>ex.name)})});
      return updated; });
  }

  function startRename(item) { setRenamingId(item._id); setRenameValue(item.exercise); }
  function cancelRename() { setRenamingId(null); setRenameValue(''); }
  async function confirmRename(item) {
    const trimmed = renameValue.trim();
    if(!trimmed || trimmed===item.exercise) { cancelRename(); return; }
    await onRenameInactive(item,trimmed);
    cancelRename();
  }
  function addBackFromInactive(item) {
    fetch('/api/inactive-exercises',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item._id})})
      .then(() => { setExercises(prev => [...prev,{name:item.exercise,sets:[{weight:'',reps:''},{weight:'',reps:''},{weight:'',reps:''}]}]); setShowInactive(false); if(onCustomExerciseAdded) onCustomExerciseAdded(); });
  }
  async function deleteInactiveItem(item) {
    await onDeleteInactive(item);
  }

  async function addCustomExercise() {
    const name = newExerciseName.trim();
    if(!name) return;
    setAddingExercise(true);
    await fetch('/api/custom-exercises',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bodyPart:session.workoutType,exercise:name})});
    const newEx = {name,sets:[{weight:'',reps:''},{weight:'',reps:''},{weight:'',reps:''}]};
    setExercises(prev => {
      const completed = prev.filter(ex => isExerciseCompleted(ex));
      const incomplete = prev.filter(ex => !isExerciseCompleted(ex));
      const reordered = [...completed, newEx, ...incomplete];
      const updatedNames = reordered.map(ex => ex.name);
      fetch('/api/exercise-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bodyPart:session.workoutType,exercises:updatedNames})});
      return reordered;
    });
    setNewExerciseName(''); setShowAddExercise(false); setAddingExercise(false);
    if(onCustomExerciseAdded) onCustomExerciseAdded();
  }

  function getSessionData() { return {date:session.date,workoutType:session.workoutType,workoutLabel:session.workoutLabel,sessionSlot:session.sessionSlot||'primary',am,exercises:isCardioType?[]:exercises,rowingType:isRowingType?rowingType:null,rowingValue:isRowingType?rowingValue:null,xtDuration:isXTType?xtDuration:null,xtCalories:isXTType?xtCalories:null,sessionNotes}; }
  // Permanently-deleted default exercises stay in the database (so the block
  // holds) but are filtered out of what Chris actually sees here.
  const inactiveList = (inactive[session.workoutType]||[]).filter(item => !item.deleted);

  return (<div>
    <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:'1.25rem' }}>
      {wt?.isSplit ? <SplitIcon size={34} radius={8} /> : <span style={{ background:wt?.color,color:wt?.textColor,borderRadius:8,fontSize:12,fontWeight:700,padding:'5px 12px' }}>{wt?.emoji||session.workoutType}</span>}
      <div><div style={{ fontWeight:700,fontSize:18,fontFamily:TH.heading,color:TH.text }}>{session.workoutLabel}</div>
        <div style={{ fontSize:12,color:TH.textMuted }}>{fmtDate(session.date)}</div></div></div>

    {/* AM checkbox — shown for ALL workout types */}
    <div style={{ marginBottom:'1.5rem',padding:'14px 16px',background:TH.card,borderRadius:TH.radiusSm,border:`2px solid ${am?'#FFD700':TH.border}`,boxShadow:am?'0 0 16px rgba(255,215,0,0.15)':'none',transition:'all 200ms ease' }}>
      <button onClick={() => setAm(a => !a)}
        style={{ display:'flex',alignItems:'center',gap:12,background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit',width:'100%' }}>
        <span style={{ fontSize:28,lineHeight:1,transition:'transform 200ms ease',transform:am?'scale(1.15)':'scale(1)' }}>{am?'🏅':'⬜'}</span>
        <div style={{ textAlign:'left' }}>
          <div style={{ fontSize:14,fontWeight:700,color:am?'#FFD700':TH.textSec }}>{am?'AM session — nice work!':'Mark as AM session'}</div>
          <div style={{ fontSize:11,color:TH.textMuted,marginTop:2 }}>Tap to toggle</div>
        </div>
      </button>
    </div>

    {/* Rowing: only AM checkbox, no time/distance */}
    {isRowingType && (
      <div style={{ padding:'16px',background:TH.cardAlt,borderRadius:TH.radiusSm,border:`1px solid ${TH.border}`,marginBottom:'1.5rem',textAlign:'center' }}>
        <div style={{ fontSize:13,color:TH.textMuted }}>Distance and time are tracked in your rowing app.</div>
        <div style={{ fontSize:12,color:TH.textMuted,marginTop:4 }}>Just mark AM above if it was a morning session.</div>
      </div>
    )}

    {/* X Trainer: duration + calories, no exercises */}
    {isXTType && (
      <div style={{ padding:'16px',background:TH.cardAlt,borderRadius:TH.radiusSm,border:`1px solid ${TH.border}`,marginBottom:'1.5rem' }}>
        <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:6,fontWeight:500 }}>Duration (minutes)</label>
        <input type="number" value={xtDuration} onChange={e => setXtDuration(e.target.value)} placeholder="e.g. 30" style={{ ...inputStyle,width:'100%',marginBottom:14,boxSizing:'border-box' }} />
        <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:6,fontWeight:500 }}>Calories burned</label>
        <input type="number" value={xtCalories} onChange={e => setXtCalories(e.target.value)} placeholder="e.g. 250" style={{ ...inputStyle,width:'100%',boxSizing:'border-box' }} />
      </div>
    )}

    {!isCardioType && (<>
      {inactiveList.length>0 && (<button onClick={() => setShowInactive(!showInactive)} style={{ fontSize:12,color:TH.textMuted,background:TH.cardAlt,border:`1px solid ${TH.border}`,borderRadius:8,padding:'7px 14px',cursor:'pointer',marginBottom:'1rem',fontFamily:'inherit',fontWeight:500 }}>
        {showInactive?'Hide':'View'} INACTIVE exercises ({inactiveList.length})</button>)}
      {showInactive && (<div style={{ background:TH.card,border:`1px solid ${TH.border}`,borderRadius:TH.radiusSm,padding:'12px',marginBottom:'1rem' }}>
        <div style={{ fontSize:12,color:TH.textMuted,marginBottom:8,fontWeight:500 }}>Inactive exercises</div>
        {inactiveList.map(item => {
          const isCustom = (customExercises[session.workoutType]||[]).some(c => c.exercise===item.exercise);
          const isRenaming = renamingId===item._id;
          return (<div key={item._id} style={{ padding:'7px 0',borderBottom:`1px solid ${TH.border}` }}>
            {isRenaming ? (
              <div style={{ display:'flex',gap:6,alignItems:'center' }}>
                <input type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => { if(e.key==='Enter') confirmRename(item); if(e.key==='Escape') cancelRename(); }}
                  autoFocus
                  style={{ flex:1,padding:'7px 9px',borderRadius:8,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:13,fontFamily:'inherit',boxSizing:'border-box' }} />
                <button onClick={() => confirmRename(item)} style={{ fontSize:12,color:TH.cyan,background:'none',border:`1px solid ${TH.cyan}`,borderRadius:6,padding:'6px 10px',cursor:'pointer',fontFamily:'inherit' }}>Save</button>
                <button onClick={cancelRename} style={{ fontSize:12,color:TH.textMuted,background:'none',border:`1px solid ${TH.border}`,borderRadius:6,padding:'6px 10px',cursor:'pointer',fontFamily:'inherit' }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',gap:8 }}>
                <span style={{ fontSize:13,color:TH.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',minWidth:0 }}>{item.exercise}</span>
                <div style={{ display:'flex',gap:6,flexShrink:0 }}>
                  <button onClick={() => startRename(item)} style={{ fontSize:11,color:TH.textMuted,background:'none',border:`1px solid ${TH.border}`,borderRadius:6,padding:'4px 8px',cursor:'pointer',fontFamily:'inherit' }}>Rename</button>
                  <button onClick={() => addBackFromInactive(item)} style={{ fontSize:12,color:TH.cyan,background:'none',border:`1px solid ${TH.cyan}`,borderRadius:6,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit' }}>Add back</button>
                  <button onClick={() => deleteInactiveItem(item)} title={isCustom?'':'Default exercise — this permanently hides it, with no way to add it back'} style={{ fontSize:11,color:'#EF4444',background:'none',border:'1px solid rgba(239,68,68,0.4)',borderRadius:6,padding:'4px 8px',cursor:'pointer',fontFamily:'inherit' }}>Delete</button>
                </div>
              </div>
            )}
          </div>);
        })}</div>)}
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
            <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
              <button onClick={() => copySetToNext(exIdx,setIdx)} title="Copy to next set" style={{ background:'rgba(77,212,255,0.08)',border:`1px solid ${TH.borderMed}`,color:TH.cyan,fontSize:13,fontWeight:700,cursor:'pointer',padding:'4px 6px',borderRadius:6,lineHeight:'1',fontFamily:'inherit' }}>+</button>
              {ex.sets.length>1 && <button onClick={() => removeSet(exIdx,setIdx)} style={{ background:'none',border:'none',color:TH.textMuted,fontSize:15,cursor:'pointer',padding:'2px',lineHeight:'1' }}>x</button>}
            </div>
          </div>))}
          <button onClick={() => addSet(exIdx)} style={{ fontSize:12,color:TH.textMuted,background:'none',border:`1px dashed ${TH.borderMed}`,borderRadius:8,padding:'7px 12px',cursor:'pointer',width:'100%',marginTop:4,fontFamily:'inherit',fontWeight:500 }}>+ Add set</button>
          {prev && (<div style={{ marginTop:10,padding:'8px 10px',background:TH.cardAlt,borderRadius:8,border:`1px solid ${TH.border}` }}>
            <div style={{ fontSize:11,color:TH.textMuted,marginBottom:4 }}>Last logged — {fmtDate(prev.date)}</div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>{prev.sets.filter(s=>s.reps||s.weight).map((s,i) => <span key={i} style={{ background:TH.input,border:`1px solid ${TH.border}`,borderRadius:5,padding:'3px 8px',fontSize:12,color:TH.textSec }}>{s.reps} x {s.weight}kg</span>)}</div>
          </div>)}
        </div>);
      })}
      {!showAddExercise ? (
        <button onClick={() => setShowAddExercise(true)} style={{ fontSize:13,color:TH.cyan,background:'rgba(77,212,255,0.06)',border:`1px dashed ${TH.borderMed}`,borderRadius:TH.radiusSm,padding:'12px',cursor:'pointer',width:'100%',marginBottom:'1rem',fontFamily:'inherit',fontWeight:600,transition:'all 150ms ease' }}>
          + Add exercise
        </button>
      ) : (
        <div style={{ background:TH.card,border:`1px solid ${TH.borderMed}`,borderRadius:TH.radiusSm,padding:'14px',marginBottom:'1rem' }}>
          <div style={{ fontSize:12,color:TH.textSec,marginBottom:8,fontWeight:500 }}>New exercise name</div>
          <input type="text" value={newExerciseName} onChange={e => setNewExerciseName(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter'&&newExerciseName.trim()) addCustomExercise(); if(e.key==='Escape'){setShowAddExercise(false);setNewExerciseName('');} }}
            placeholder="e.g. Cable Flyes" autoFocus
            style={{ width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:14,fontFamily:'inherit',boxShadow:TH.glow,marginBottom:10,boxSizing:'border-box' }} />
          <div style={{ display:'flex',gap:8 }}>
            <Btn onClick={addCustomExercise} style={{ flex:1,opacity:newExerciseName.trim()?1:0.4,padding:'10px' }}>{addingExercise?'Adding...':'Add'}</Btn>
            <Btn onClick={() => {setShowAddExercise(false);setNewExerciseName('');}} variant="secondary" style={{ flex:1,padding:'10px' }}>Cancel</Btn>
          </div>
        </div>
      )}
    </>)}
    {!isRowingType && (<div style={{ marginTop:'1rem',marginBottom:'1rem' }}>
      <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:6,fontWeight:500 }}>Session notes</label>
      <textarea value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} placeholder="How did the session go?" rows={3} style={{ width:'100%',padding:'10px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:14,fontFamily:'inherit',resize:'vertical',boxShadow:TH.glow }} /></div>)}
    <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
      <Btn onClick={() => onSave(getSessionData(),true)}>Complete & save session</Btn>
      <Btn onClick={() => onSave(getSessionData(),false)} variant="secondary">Save progress & exit</Btn></div>
  </div>);
}

// ─── EXERCISE HISTORY ───────────────────────────────────────────────────────
function shortDate(str) { if(!str) return ''; const [y,m,d]=str.split('-'); return new Date(y,m-1,d).toLocaleDateString('en-GB',{day:'numeric',month:'short'}); }
function ExerciseHistory() {
  const [logs,setLogs] = useState([]); const [filterType,setFilterType] = useState('exercise');
  const [selectedBP,setSelectedBP] = useState('L'); const [selectedEx,setSelectedEx] = useState('');
  useEffect(() => { fetch('/api/exercise-log').then(r=>r.json()).then(data => { setLogs(data.filter(d => !d.noData).sort((a,b) => b.date.localeCompare(a.date))); }); }, []);
  const allExercises = [...new Set(logs.flatMap(l => (l.exercises||[]).map(e => e.name)))].sort();
  const filtered = filterType==='bodypart' ? logs.filter(l => l.workoutType===selectedBP) : logs.filter(l => (l.exercises||[]).some(e => e.name===selectedEx));
  const volumeSeries = (filterType==='exercise' && selectedEx) ? [...logs]
    .filter(l => (l.exercises||[]).some(e => e.name===selectedEx))
    .sort((a,b) => a.date.localeCompare(b.date))
    .map(l => {
      const ex = (l.exercises||[]).find(e => e.name===selectedEx);
      const doneSets = (ex.sets||[]).filter(s => s.reps || s.weight);
      const volume = doneSets.reduce((sum,s) => sum + ((parseFloat(s.reps)||0) * (parseFloat(s.weight)||0)), 0);
      return { date: l.date, volume, setCount: doneSets.length };
    })
    .filter(v => v.setCount > 0 && v.setCount < 4) : [];
  const latestVolume = volumeSeries.length ? volumeSeries[volumeSeries.length-1].volume : null;
  const bestVolume = volumeSeries.length ? Math.max(...volumeSeries.map(v=>v.volume)) : null;
  const allSessionsForEx = (filterType==='exercise' && selectedEx) ? logs.filter(l => (l.exercises||[]).some(e => e.name===selectedEx)).map(l => {
    const ex = (l.exercises||[]).find(e => e.name===selectedEx);
    return (ex.sets||[]).filter(s => s.reps || s.weight).length;
  }) : [];
  const excludedHighSetCount = allSessionsForEx.filter(c => c>=4).length;
  function renderRow(log) {
    const rowCardStyle = {padding:'14px 16px',background:TH.card,borderRadius:TH.radiusSm,marginBottom:8,boxShadow:TH.shadowSm,border:`1px solid ${TH.border}`,position:'relative',overflow:'hidden'};
    const isRowingType = log.workoutType==='R';
    const isXTType = log.workoutType==='XT';
    if(filterType==='exercise'){const ex=(log.exercises||[]).find(e=>e.name===selectedEx);if(!ex)return null;return(<div key={log.date} style={rowCardStyle}><div style={{fontSize:12,color:TH.textMuted,marginBottom:6}}>{fmtDate(log.date)}{log.am&&<span style={{marginLeft:8}}>🏅</span>}</div><div style={{fontSize:13,fontWeight:600,marginBottom:6,color:TH.text}}>{ex.name}</div><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{ex.sets.filter(s=>s.reps||s.weight).map((s,i)=><span key={i} style={{background:TH.cardAlt,border:`1px solid ${TH.border}`,borderRadius:6,padding:'4px 10px',fontSize:13,color:TH.textSec}}>{s.reps} reps x {s.weight}kg</span>)}</div></div>);}
    if(isRowingType) return(<div key={log.date} style={rowCardStyle}><div style={{fontSize:12,color:TH.textMuted,marginBottom:4}}>{fmtDate(log.date)}{log.am&&<span style={{marginLeft:8}}>🏅</span>}</div><div style={{fontSize:13,color:TH.text}}>{log.am?'AM session':'Session logged'}</div></div>);
    if(isXTType) return(<div key={log.date} style={rowCardStyle}><div style={{fontSize:12,color:TH.textMuted,marginBottom:4}}>{fmtDate(log.date)}{log.am&&<span style={{marginLeft:8}}>🏅</span>}</div><div style={{fontSize:13,color:TH.text}}>{log.xtDuration?`${log.xtDuration} min`:'Session logged'}{log.xtCalories?` • ${log.xtCalories} kcal`:''}</div>{log.sessionNotes && <div style={{fontSize:12,color:TH.textMuted,marginTop:4}}>{log.sessionNotes}</div>}</div>);
    return(<div key={log.date} style={rowCardStyle}><div style={{fontSize:12,color:TH.textMuted,marginBottom:8}}>{fmtDate(log.date)}{log.am&&<span style={{marginLeft:8}}>🏅</span>}</div>{(log.exercises||[]).map((ex,i)=>(<div key={i} style={{marginBottom:10}}><div style={{fontSize:13,fontWeight:600,marginBottom:4,color:TH.text}}>{ex.name}</div><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{ex.sets.filter(s=>s.reps||s.weight).map((s,si)=><span key={si} style={{background:TH.cardAlt,border:`1px solid ${TH.border}`,borderRadius:6,padding:'4px 10px',fontSize:12,color:TH.textSec}}>{s.reps} reps x {s.weight}kg</span>)}</div></div>))}</div>);
  }
  return (<div>
    <div style={{display:'flex',gap:8,marginBottom:'1rem'}}>
      {[['exercise','By exercise'],['bodypart','By body part']].map(([k,l])=>(<button key={k} onClick={()=>setFilterType(k)} style={{flex:1,padding:'11px',borderRadius:TH.radiusSm,border:`2px solid ${filterType===k?TH.cyan:TH.border}`,background:filterType===k?'rgba(77,212,255,0.08)':'transparent',color:filterType===k?TH.cyan:TH.textMuted,fontWeight:600,cursor:'pointer',fontFamily:'inherit',fontSize:13,transition:'all 150ms ease'}}>{l}</button>))}
    </div>
    {filterType==='bodypart' && (<div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:'1rem'}}>
      {WORKOUT_TYPES.map(w=>(<button key={w.key} onClick={()=>setSelectedBP(w.key)} style={{padding:'8px 12px',borderRadius:8,border:`2px solid ${selectedBP===w.key?(w.isSplit?'#B0A0F0':w.color):TH.border}`,background:selectedBP===w.key?(w.isSplit?'rgba(152,132,232,0.12)':w.color+'20'):'transparent',color:selectedBP===w.key?(w.isSplit?'#B0A0F0':w.color):TH.textMuted,fontSize:13,fontWeight:selectedBP===w.key?600:400,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease'}}>{w.key} - {w.label}</button>))}</div>)}
    {filterType==='exercise' && (<div style={{marginBottom:'1rem'}}><select value={selectedEx} onChange={e=>setSelectedEx(e.target.value)} style={{width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:14,fontFamily:'inherit',boxShadow:TH.glow}}><option value="">Select an exercise...</option>{allExercises.map(ex=><option key={ex} value={ex}>{ex}</option>)}</select></div>)}
    {volumeSeries.length>=2 && (<div style={{marginBottom:'1.5rem'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:12}}>
        <StatCard label="Latest volume" value={`${Math.round(latestVolume)}`} sub="kg total" />
        <StatCard label="Personal best" value={`${Math.round(bestVolume)}`} sub="kg total" />
      </div>
      <div style={{fontSize:12,color:TH.textMuted,marginBottom:8,fontWeight:500}}>Volume trend — {selectedEx}</div>
      <div style={{height:180}}><Line data={{labels:volumeSeries.map(v=>shortDate(v.date)),datasets:[{data:volumeSeries.map(v=>Math.round(v.volume)),borderColor:TH.cyan,backgroundColor:'rgba(77,212,255,0.08)',borderWidth:2,pointRadius:4,pointBackgroundColor:TH.cyan,tension:0.35,fill:true,spanGaps:true}]}} options={darkChartOpts({yTicks:{callback:v=>`${v}kg`}})} /></div>
      {excludedHighSetCount>0 && (<div style={{fontSize:11,color:TH.textMuted,marginTop:6,textAlign:'center'}}>{excludedHighSetCount} session{excludedHighSetCount>1?'s':''} with 4+ sets excluded for a fair comparison</div>)}
    </div>)}
    {filterType==='exercise' && selectedEx && volumeSeries.length===1 && (<div style={{textAlign:'center',padding:'0.5rem 0 1rem',color:TH.textMuted,fontSize:12}}>Log one more session to see the volume trend</div>)}
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
    const nextMonth=month===11?1:month+2; const nextYear=month===11?year+1:year;
    const [prevRes,nextRes]=await Promise.all([fetch(`/api/weight?year=${prevYear}&month=${prevMonth}`),fetch(`/api/weight?year=${nextYear}&month=${nextMonth}`)]);
    const [prevData,nextData]=await Promise.all([prevRes.json(),nextRes.json()]);
    const combined=[...prevData,...monthData,...nextData].sort((a,b)=>a.date.localeCompare(b.date)); setAllData(combined);
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
  function openModal(dateStr){const existing=weightByDate[dateStr];setInput(existing!==undefined?String(existing):'');setModal(dateStr);}
  async function save(){if(!input||isNaN(parseFloat(input)))return;await fetch('/api/weight',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:modal,weight:parseFloat(input)})});setModal(null);setInput('');fetchData();}
  async function remove(){await fetch('/api/weight',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:modal})});setModal(null);setInput('');fetchData();}
  return (<div>
    {monthSorted.length>0&&(<div style={{display:'grid',gridTemplateColumns:change!==null?'repeat(4,1fr)':'repeat(3,1fr)',gap:10,marginBottom:'1.5rem'}}>
      <StatCard label="Latest" value={`${latest}`} sub="kg" />
      {change!==null&&(<StatCard label="Change" value={`${parseFloat(change)>0?'+':''}${change}`} sub={<span style={{color:parseFloat(change)<0?HEAT.green1:parseFloat(change)>0?HEAT.red:TH.textMuted}}>kg this month</span>} />)}
      <StatCard label="Lowest" value={`${lowest}`} sub="kg" />
      <StatCard label="Highest" value={`${highest}`} sub="kg" /></div>)}
    <CalendarGrid year={year} month={month}
      getCellStyle={(day,dateStr)=>{const hasEntry=weightByDate[dateStr]!==undefined;if(!hasEntry)return{border:`1px solid ${TH.border}`,color:TH.textMuted,borderRadius:TH.radiusSm};const direction=directionByDate[dateStr];let bg=TH.cardAlt;let color=TH.textSec;if(direction==='down'){bg=HEAT.green1;color=HEAT.green1Text;}else if(direction==='up'){bg=HEAT.red;color=HEAT.redText;}else{bg=TH.cardAlt;color=TH.textSec;}return{background:bg,color,borderRadius:TH.radiusSm,fontWeight:600,bottomLabel:`${weightByDate[dateStr]}`};}}
      onDayClick={dateStr=>openModal(dateStr)} />
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

// ─── ROWING TAB ─────────────────────────────────────────────────────────────
function RowingTab() {
  const [sessions,setSessions] = useState([]);
  const [selectedCat,setSelectedCat] = useState('30 min row');
  const [showAdd,setShowAdd] = useState(false);
  const [importMsg,setImportMsg] = useState('');
  const [importing,setImporting] = useState(false);
  const [form,setForm] = useState({ date:todayStr(), category:'30 min row', customDesc:'', time:'', distance:'', strokeRate:'', avgHeartRate:'', dragFactor:'', comments:'' });
  const [chartExpanded,setChartExpanded] = useState(false);

  useEffect(() => { fetchSessions(); }, []);
  async function fetchSessions() { const res = await fetch('/api/rowing'); setSessions(await res.json()); }

  async function removeSession(id) {
    if(!id) return;
    await fetch('/api/rowing', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) });
    fetchSessions();
  }

  async function runImport() {
    setImporting(true); setImportMsg('');
    try {
      const res = await fetch('/api/rowing-import', { method:'POST' });
      const data = await res.json();
      setImportMsg(`${data.inserted} new session${data.inserted===1?'':'s'} imported (${data.alreadyPresent} already there)`);
      fetchSessions();
    } catch(e) { setImportMsg('Import failed — try again'); }
    setImporting(false);
  }

  const catMeta = ROWING_CATEGORIES.find(c=>c.key===selectedCat) || ROWING_CATEGORIES[0];
  const inCat = sessions.filter(s=>s.category===selectedCat).sort((a,b)=>a.date.localeCompare(b.date));
  const scored = inCat.filter(s => catMeta.type==='time' ? s.workDistance!=null : s.workTimeSeconds!=null)
    .map(s => ({ ...s, score: catMeta.type==='time' ? s.workDistance : s.workTimeSeconds }));
  const yMin = (() => {
    if (catMeta.type==='time') return 6000;
    if (scored.length < 2) return 0;
    const lo = Math.min(...scored.map(s=>s.score));
    const step = lo>=2000 ? 500 : lo>=200 ? 50 : 10;
    return Math.max(0, Math.floor((lo*0.9)/step)*step);
  })();
  const bestScore = scored.length ? (catMeta.type==='time' ? Math.max(...scored.map(s=>s.score)) : Math.min(...scored.map(s=>s.score))) : null;
  const latestScore = scored.length ? scored[scored.length-1].score : null;
  const listDesc = [...inCat].sort((a,b)=>b.date.localeCompare(a.date));

  async function submitAdd() {
    const seconds = parseTimeToSeconds(form.time);
    const category = form.category;
    const description = category==='other' ? (form.customDesc || 'Row') : category;
    await fetch('/api/rowing', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
      date: form.date, category, description,
      workTimeSeconds: seconds, workDistance: form.distance,
      strokeRate: form.strokeRate, avgHeartRate: form.avgHeartRate, dragFactor: form.dragFactor,
      comments: form.comments,
    })});
    setShowAdd(false);
    setForm({ date:todayStr(), category:'30 min row', customDesc:'', time:'', distance:'', strokeRate:'', avgHeartRate:'', dragFactor:'', comments:'' });
    fetchSessions();
  }

  return (<div>
    <div style={{display:'flex',gap:8,marginBottom:'1rem'}}>
      <Btn onClick={()=>setShowAdd(true)} style={{flex:1}}>+ Add row</Btn>
      <Btn variant="secondary" onClick={runImport} style={{flex:1}}>{importing?'Importing…':'Import history'}</Btn>
    </div>
    {importMsg && <div style={{fontSize:12,color:TH.cyan,textAlign:'center',marginBottom:'1rem'}}>{importMsg}</div>}

    <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:'1.25rem'}}>
      {ROWING_CATEGORIES.map(c=>(<button key={c.key} onClick={()=>setSelectedCat(c.key)} style={{padding:'8px 12px',borderRadius:8,border:`2px solid ${selectedCat===c.key?TH.cyan:TH.border}`,background:selectedCat===c.key?'rgba(77,212,255,0.08)':'transparent',color:selectedCat===c.key?TH.cyan:TH.textMuted,fontSize:13,fontWeight:selectedCat===c.key?600:400,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease'}}>{c.label}</button>))}
    </div>

    {catMeta.type!=='other' && scored.length>=2 && (<div style={{marginBottom:'1.5rem'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:12}}>
        <StatCard label="Latest" value={catMeta.type==='time'?`${Math.round(latestScore)}m`:fmtMMSS(latestScore)} sub={catMeta.type==='time'?'metres rowed':'finish time'} />
        <StatCard label="Personal best" value={catMeta.type==='time'?`${Math.round(bestScore)}m`:fmtMMSS(bestScore)} sub={catMeta.type==='time'?'metres rowed':'finish time'} />
      </div>
      <div style={{fontSize:12,color:TH.textMuted,marginBottom:8,fontWeight:500,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span>{catMeta.label} trend {catMeta.type==='distance' && <span style={{opacity:0.7}}>(lower = faster)</span>}</span>
        <span style={{color:TH.cyan,fontSize:11,cursor:'pointer'}} onClick={()=>setChartExpanded(true)}>⤢ Expand</span>
      </div>
      <div style={{height:180,cursor:'pointer'}} onClick={()=>setChartExpanded(true)}><Line data={{labels:scored.map(s=>fmtRowDate(s.date)),datasets:[{data:scored.map(s=>Math.round(s.score)),borderColor:TH.cyan,backgroundColor:'rgba(77,212,255,0.08)',borderWidth:2,pointRadius:3,pointBackgroundColor:TH.cyan,tension:0.35,fill:true,spanGaps:true},{data:scored.map(()=>Math.round(latestScore)),borderColor:'rgba(244,246,250,0.4)',borderWidth:1,borderDash:[6,4],pointRadius:0,fill:false,tension:0}]}} options={darkChartOpts({yMin,yReverse:catMeta.type==='distance',yTicks:{callback:v=>catMeta.type==='time'?`${v}m`:fmtMMSS(v)},tooltipLabel:v=>catMeta.type==='time'?`${v}m`:fmtMMSS(v)})} /></div>
    </div>)}
    {catMeta.type!=='other' && scored.length===1 && (<div style={{textAlign:'center',padding:'0.5rem 0 1rem',color:TH.textMuted,fontSize:12}}>Log one more {catMeta.label} row to see the trend</div>)}
    {catMeta.type!=='other' && scored.length===0 && (<div style={{textAlign:'center',padding:'1.5rem 0',color:TH.textMuted,fontSize:13}}>No {catMeta.label} rows logged yet</div>)}

    {listDesc.map(s=>(<div key={s._id||s.logId} style={{padding:'14px 16px',background:TH.card,borderRadius:TH.radiusSm,marginBottom:8,boxShadow:TH.shadowSm,border:`1px solid ${TH.border}`}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <div style={{fontSize:12,color:TH.textMuted}}>{fmtRowDate(s.date)}</div>
        <button onClick={()=>removeSession(s._id)} style={{background:'none',border:'none',color:TH.textMuted,fontSize:12,cursor:'pointer',fontFamily:'inherit',padding:0}}>Delete</button>
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:s.comments?6:0}}>
        {s.workDistance!=null && <span style={{background:TH.cardAlt,border:`1px solid ${TH.border}`,borderRadius:6,padding:'4px 10px',fontSize:13,color:TH.textSec}}>{Math.round(s.workDistance)}m</span>}
        {s.workTimeSeconds!=null && <span style={{background:TH.cardAlt,border:`1px solid ${TH.border}`,borderRadius:6,padding:'4px 10px',fontSize:13,color:TH.textSec}}>{fmtMMSS(s.workTimeSeconds)}</span>}
        {fmtPace(s.workTimeSeconds,s.workDistance) && <span style={{background:TH.cardAlt,border:`1px solid ${TH.border}`,borderRadius:6,padding:'4px 10px',fontSize:13,color:TH.textSec}}>{fmtPace(s.workTimeSeconds,s.workDistance)}/500m</span>}
        {s.strokeRate!=null && <span style={{background:TH.cardAlt,border:`1px solid ${TH.border}`,borderRadius:6,padding:'4px 10px',fontSize:13,color:TH.textSec}}>{s.strokeRate} s/m</span>}
        {s.avgHeartRate!=null && <span style={{background:TH.cardAlt,border:`1px solid ${TH.border}`,borderRadius:6,padding:'4px 10px',fontSize:13,color:TH.textSec}}>{s.avgHeartRate} bpm</span>}
      </div>
      {s.comments && <div style={{fontSize:12,color:TH.textMuted,fontStyle:'italic'}}>{s.comments}</div>}
    </div>))}
    {listDesc.length===0 && catMeta.type==='other' && <div style={{textAlign:'center',padding:'2.5rem',color:TH.textMuted,fontSize:14}}>No data yet</div>}

    {showAdd && (<Modal title="Add rowing session" onClose={()=>setShowAdd(false)}>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div><label style={{fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500}}>Date</label>
          <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={{...inputStyle,textAlign:'left'}} /></div>
        <div><label style={{fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500}}>Session type</label>
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={{width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:14,fontFamily:'inherit',boxShadow:TH.glow}}>
            {ROWING_CATEGORIES.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}
          </select></div>
        {form.category==='other' && (<div><label style={{fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500}}>Description</label>
          <input type="text" value={form.customDesc} onChange={e=>setForm(f=>({...f,customDesc:e.target.value}))} placeholder="e.g. interval session" style={{...inputStyle,textAlign:'left'}} /></div>)}
        <div style={{display:'flex',gap:10}}>
          <div style={{flex:1}}><label style={{fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500}}>Time (mm:ss)</label>
            <input type="text" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} placeholder="30:00" style={inputStyle} /></div>
          <div style={{flex:1}}><label style={{fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500}}>Distance (m)</label>
            <input type="number" value={form.distance} onChange={e=>setForm(f=>({...f,distance:e.target.value}))} placeholder="7000" style={inputStyle} /></div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <div style={{flex:1}}><label style={{fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500}}>Stroke rate</label>
            <input type="number" value={form.strokeRate} onChange={e=>setForm(f=>({...f,strokeRate:e.target.value}))} placeholder="optional" style={inputStyle} /></div>
          <div style={{flex:1}}><label style={{fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500}}>Avg heart rate</label>
            <input type="number" value={form.avgHeartRate} onChange={e=>setForm(f=>({...f,avgHeartRate:e.target.value}))} placeholder="optional" style={inputStyle} /></div>
        </div>
        <div><label style={{fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500}}>Drag factor</label>
          <input type="number" value={form.dragFactor} onChange={e=>setForm(f=>({...f,dragFactor:e.target.value}))} placeholder="optional" style={inputStyle} /></div>
        <div><label style={{fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500}}>Comments</label>
          <input type="text" value={form.comments} onChange={e=>setForm(f=>({...f,comments:e.target.value}))} placeholder="optional" style={{...inputStyle,textAlign:'left'}} /></div>
        <Btn onClick={submitAdd}>Save session</Btn>
      </div>
    </Modal>)}

    {chartExpanded && (<div style={{position:'fixed',inset:0,background:'rgba(4,8,20,0.95)',zIndex:1100,display:'flex',flexDirection:'column',padding:'1.25rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <span style={{fontWeight:700,fontSize:16,fontFamily:TH.heading,color:TH.text}}>{catMeta.label} trend {catMeta.type==='distance' && <span style={{opacity:0.7,fontWeight:400,fontSize:13}}>(lower = faster)</span>}</span>
        <button onClick={()=>setChartExpanded(false)} style={{background:'rgba(77,212,255,0.08)',border:`1px solid ${TH.border}`,fontSize:18,color:TH.textSec,padding:'4px 12px',cursor:'pointer',borderRadius:8}}>×</button>
      </div>
      <div style={{flex:1,minHeight:0}}><Line data={{labels:scored.map(s=>fmtRowDate(s.date)),datasets:[{data:scored.map(s=>Math.round(s.score)),borderColor:TH.cyan,backgroundColor:'rgba(77,212,255,0.08)',borderWidth:2,pointRadius:4,pointHoverRadius:6,pointBackgroundColor:TH.cyan,tension:0.35,fill:true,spanGaps:true},{data:scored.map(()=>Math.round(latestScore)),borderColor:'rgba(244,246,250,0.4)',borderWidth:1,borderDash:[6,4],pointRadius:0,fill:false,tension:0}]}} options={darkChartOpts({yMin,yReverse:catMeta.type==='distance',yTicks:{callback:v=>catMeta.type==='time'?`${v}m`:fmtMMSS(v)},tooltipLabel:v=>catMeta.type==='time'?`${v}m`:fmtMMSS(v)})} /></div>
    </div>)}
  </div>);
}

// ─── GYM SECTION ────────────────────────────────────────────────────────────
const GYM_TABS=[{key:'calendar',label:'Calendar'},{key:'log',label:'Log'},{key:'history',label:'History'},{key:'weight',label:'Weight'},{key:'rowing',label:'Rowing'}];
function GymSection() {
  const now=new Date(); const [tab,setTab]=useState('calendar'); const [year,setYear]=useState(now.getFullYear()); const [month,setMonth]=useState(now.getMonth());
  const [logs,setLogs]=useState([]);

  useEffect(()=>{ fetchLogs(); },[]);
  async function fetchLogs(){ fetch('/api/exercise-log').then(r=>r.json()).then(setLogs); }

  function prevMonth(){if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}
  function nextMonth(){if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}
  const monthLabel=new Date(year,month).toLocaleString('default',{month:'long',year:'numeric'});
  return (<div>
    <div style={{display:'flex',gap:4,marginBottom:'1.5rem',background:TH.card,borderRadius:TH.radiusSm,padding:4,border:`1px solid ${TH.border}`}}>
      {GYM_TABS.map(t=>(<button key={t.key} onClick={()=>{setTab(t.key);fetchLogs();}} style={{flex:1,padding:'10px 0',background:tab===t.key?TH.pink:'transparent',border:'none',borderRadius:10,color:tab===t.key?'#fff':TH.textMuted,fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease',boxShadow:tab===t.key?'0 0 12px rgba(236,116,135,0.3)':'none'}}>{t.label}</button>))}</div>
    {(tab==='calendar'||tab==='weight')&&(<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
      <button onClick={prevMonth} style={{background:TH.card,border:`1px solid ${TH.border}`,borderRadius:8,padding:'7px 16px',fontSize:16,color:TH.textSec,cursor:'pointer'}}>&#8249;</button>
      <span style={{fontWeight:700,fontSize:15,fontFamily:TH.heading,color:TH.text}}>{monthLabel}</span>
      <button onClick={nextMonth} style={{background:TH.card,border:`1px solid ${TH.border}`,borderRadius:8,padding:'7px 16px',fontSize:16,color:TH.textSec,cursor:'pointer'}}>&#8250;</button></div>)}
    {tab==='calendar'&&<GymCalendar year={year} month={month} externalLogs={logs} />}
    {tab==='log'&&<GymLog onSessionSaved={fetchLogs} />}
    {tab==='history'&&<ExerciseHistory />}
    {tab==='weight'&&<WeightTab year={year} month={month} />}
    {tab==='rowing'&&<RowingTab />}
  </div>);
}

// ─── CHART OPTIONS ──────────────────────────────────────────────────────────
function darkChartOpts(extra={}) {
  const tooltipPlugin = extra.tooltipLabel ? { callbacks: { label: (ctx) => extra.tooltipLabel(ctx.parsed.y) } } : undefined;
  return {responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},...(tooltipPlugin?{tooltip:tooltipPlugin}:{}),...extra.plugins},
    scales:{x:{ticks:{color:TH.textMuted,font:{size:11}},grid:{color:'rgba(77,212,255,0.04)'}},y:{reverse:!!extra.yReverse,min:extra.yMin||0,max:extra.yMax||undefined,ticks:{color:TH.textMuted,font:{size:10},...(extra.yTicks||{})},grid:{color:'rgba(77,212,255,0.04)'}}}};
}

// ─── APP SHELL ──────────────────────────────────────────────────────────────
export default function App() {
  return (<>
    <Head><title>Chris's Dashboard</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
    <div style={{maxWidth:600,margin:'0 auto',padding:'0 0 4rem',minHeight:'100vh'}}>
      <div style={{padding:'1.5rem 1.25rem 0',marginBottom:'1.25rem'}}>
        <div style={{fontSize:12,fontWeight:600,letterSpacing:'0.18em',textTransform:'uppercase',color:TH.cyan,marginBottom:4,opacity:0.7}}>Personal dashboard</div>
        <div style={{fontSize:38,fontWeight:700,fontFamily:TH.heading,color:TH.text,letterSpacing:'-0.02em'}}>Chris</div></div>
      <div style={{padding:'0 1.25rem'}}>
        <GymSection />
      </div></div>
  </>);
}
