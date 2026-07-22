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
const TOP_SECTIONS = [{key:'gym',label:'GYM'},{key:'nutrition',label:'NUTRITION'},{key:'tasks',label:'TASKS'}];

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
    return (<div key={key} onClick={clickable?() => onDayClick(day):undefined}
      style={{ aspectRatio:'1',borderRadius:s.borderRadius||TH.radiusSm,border:s.border||'none',background:isSplit?'transparent':(s.background||TH.cardAlt),display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:s.color||TH.textMuted,fontWeight:s.fontWeight||500,cursor:clickable?'pointer':'default',position:'relative',transition:'transform 150ms ease',overflow:'hidden',boxShadow:isToday?`0 0 0 2px ${TH.cyan}, 0 0 12px rgba(77,212,255,0.35)`:'none' }}>
      {isSplit && (<svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position:'absolute',inset:0,width:'100%',height:'100%' }}>
        <polygon points="0,0 100,0 0,100" fill={s.splitBg[0]} /><polygon points="100,0 100,100 0,100" fill={s.splitBg[1]} /></svg>)}
      {s.trophy ? (
        <span style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.6em',zIndex:2,lineHeight:1 }}>🏆</span>
      ) : (
        <>
          <span style={{ position:'relative',zIndex:1,textShadow:isSplit?'0 0 3px rgba(0,0,0,0.35)':'none' }}>{day}</span>
          {s.letter && <span style={{ position:'absolute',bottom:2,left:3,fontSize:8,fontWeight:700,color:s.color,opacity:0.85,zIndex:1,textShadow:isSplit?'0 0 3px rgba(0,0,0,0.35)':'none' }}>{s.letter}</span>}
          {s.intensity && <span style={{ position:'absolute',bottom:2,right:3,fontSize:8,fontWeight:700,color:s.color,opacity:0.85,zIndex:1 }}>{s.intensity}</span>}
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
  const [detailModal,setDetailModal] = useState(null);
  const [form,setForm] = useState({ type:'L' });
  const [editSession,setEditSession] = useState(null);
  const [editing,setEditing] = useState(false);
  const [moveMode,setMoveMode] = useState(false);
  const [moveDate,setMoveDate] = useState('');

  useEffect(() => { refreshData(); }, [year,month]);

  const byDate = {}; data.forEach(d => { byDate[d.date] = d; });
  const logByDate = {}; (externalLogs||logs).forEach(l => { logByDate[l.date] = l; });

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
  async function removeSession() {
    if (!detailModal) return;
    await fetch('/api/workouts',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:detailModal})});
    setDetailModal(null); setEditSession(null); setEditing(false); refreshData();
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
      getCellStyle={(day,dateStr) => {
        const entry = byDate[dateStr];
        const log = logByDate[dateStr];
        if (!entry) return {border:`1px solid ${TH.border}`,color:TH.textMuted,borderRadius:TH.radiusSm};
        const wt = WORKOUT_TYPES.find(w => w.key===entry.type);
        const isAM = !!(log && log.am);
        if (wt?.isSplit) return {splitBg:[wt.color,wt.color2],color:'#FFFFFF',borderRadius:TH.radiusSm,fontWeight:600,letter:entry.type,intensity:entry.intensity||null,trophy:isAM};
        return {background:wt?.color||'#888',color:wt?.textColor||'#fff',borderRadius:TH.radiusSm,fontWeight:600,letter:entry.type,intensity:entry.intensity||null,trophy:isAM};
      }}
      onDayClick={day => openDay(day)}
    />
    <div style={{ display:'flex',flexWrap:'wrap',gap:12,marginBottom:'1.5rem' }}>
      {WORKOUT_TYPES.map(w => (<div key={w.key} style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:TH.textSec }}>
        {w.isSplit ? <SplitIcon size={12} radius={4} /> : <div style={{ width:12,height:12,borderRadius:4,background:w.color }} />}
        <span style={{ fontWeight:700,color:TH.text }}>{w.key}</span> {w.label}</div>))}
      <div style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:TH.textSec }}><span>🏆</span> AM session</div>
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
          {byDate[modal] && (<>
            <Btn onClick={() => {setMoveMode(true);setMoveDate(modal);}} variant="secondary">Move to different date</Btn>
            <Btn onClick={remove} variant="danger">Remove entry</Btn>
          </>)}
        </>) : (<>
          <div>
            <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:8,fontWeight:500 }}>Move workout to new date</label>
            <input type="date" value={moveDate} onChange={e => setMoveDate(e.target.value)} style={{ width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:16,fontFamily:'inherit',boxShadow:TH.glow }} />
            {moveDate && moveDate!==modal && (<div style={{ fontSize:12,color:TH.textSec,marginTop:8 }}>
              Moving from {fmtDate(modal)} to {fmtDate(moveDate)}
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
            {editSession.am && <span style={{ fontSize:16 }}>🏆</span>}
          </div>
          {!editing && !moveMode ? (<>
            {isRowingType && <div style={{ fontSize:14,color:TH.textSec,padding:'6px 0' }}>{editSession.am ? '🏆 AM session' : 'No AM data'}</div>}
            {!isRowingType && (editSession.exercises||[]).map((ex,exIdx) => {
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
            <Btn onClick={() => {if(moveDate&&moveDate!==detailModal)moveWorkout(detailModal,moveDate);}} style={{ opacity:moveDate&&moveDate!==detailModal?1:0.4 }}>Confirm move</Btn>
            <Btn onClick={() => setMoveMode(false)} variant="secondary">Cancel</Btn>
          </>) : (<>
            {isRowingType && (
              <div style={{ padding:'12px',background:TH.cardAlt,borderRadius:TH.radiusSm,border:`1px solid ${TH.border}` }}>
                <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:8,fontWeight:500 }}>AM session?</label>
                <button onClick={() => setEditSession(prev => ({...prev,am:!prev.am}))}
                  style={{ display:'flex',alignItems:'center',gap:10,width:'100%',padding:'12px 14px',borderRadius:TH.radiusSm,border:`2px solid ${editSession.am?'#FFD700':TH.border}`,background:editSession.am?'rgba(255,215,0,0.08)':TH.input,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease' }}>
                  <span style={{ fontSize:22 }}>{editSession.am?'🏆':'⬜'}</span>
                  <span style={{ fontSize:14,color:editSession.am?'#FFD700':TH.textMuted,fontWeight:editSession.am?600:400 }}>{editSession.am?'Yes — AM session':'No AM session'}</span>
                </button>
              </div>
            )}
            {!isRowingType && (editSession.exercises||[]).map((ex,exIdx) => (<div key={exIdx} style={{ padding:'8px 0',borderBottom:`1px solid ${TH.border}` }}>
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
                  <span style={{ fontSize:20 }}>{editSession.am?'🏆':'⬜'}</span>
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
    const now = new Date(); const y=now.getFullYear(),m=now.getMonth()+1;
    const [wRes,lRes,dRes,iRes,oRes,cRes] = await Promise.all([fetch(`/api/workouts?year=${y}&month=${m}`),fetch('/api/exercise-log'),fetch('/api/exercise-draft'),fetch('/api/inactive-exercises'),fetch('/api/exercise-order'),fetch('/api/custom-exercises')]);
    const [w,l,d,i,o,c] = await Promise.all([wRes.json(),lRes.json(),dRes.json(),iRes.json(),oRes.json(),cRes.json()]);
    setWorkouts(w); setLogged(l); setDrafts(d);
    const iMap = {}; i.forEach(x => { if(!iMap[x.bodyPart]) iMap[x.bodyPart]=[]; iMap[x.bodyPart].push(x); }); setInactive(iMap);
    const oMap = {}; o.forEach(x => { oMap[x.bodyPart] = x.exercises; }); setExerciseOrder(oMap);
    const cMap = {}; c.forEach(x => { if(!cMap[x.bodyPart]) cMap[x.bodyPart]=[]; cMap[x.bodyPart].push(x); }); setCustomExercises(cMap);
  }
  const loggedDates = new Set(logged.map(l => l.date));
  const pending = workouts.filter(w => !loggedDates.has(w.date)).sort((a,b) => b.date.localeCompare(a.date));

  async function markNoData(workout) {
    await fetch('/api/exercise-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:workout.date,workoutType:workout.type,noData:true,exercises:[]})});
    loadAll();
  }
  function openSession(workout) {
    const draft = drafts.find(d => d.date===workout.date);
    if (draft) { setSession(draft); return; }
    const wt = WORKOUT_TYPES.find(w => w.key===workout.type);
    const inactiveList = inactive[workout.type]||[]; const inactiveNames = inactiveList.map(i => i.exercise);
    const savedOrder = exerciseOrder[workout.type]; const defaultList = DEFAULT_EXERCISES[workout.type]||[];
    const customList = (customExercises[workout.type]||[]).map(c => c.exercise);
    const allExercises = [...defaultList, ...customList.filter(e => !defaultList.includes(e))];
    let orderedList; if(savedOrder){const extras=allExercises.filter(ex=>!savedOrder.includes(ex));orderedList=[...savedOrder,...extras];}else{orderedList=allExercises;}
    const activeExercises = orderedList.filter(ex => !inactiveNames.includes(ex));
    setSession({date:workout.date,workoutType:workout.type,workoutLabel:wt?.label||workout.type,intensity:null,am:false,exercises:activeExercises.map(name=>({name,sets:[{weight:'',reps:''},{weight:'',reps:''},{weight:'',reps:''}]}))});
  }
  async function saveSession(sessionData,complete) {
    if(complete){
      await fetch('/api/exercise-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...sessionData,noData:false})});
      if(sessionData.intensity){await fetch('/api/workouts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:sessionData.date,type:sessionData.workoutType,intensity:sessionData.intensity})});}
      await fetch('/api/exercise-draft',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:sessionData.date})});
      setSession(null); loadAll(); if(onSessionSaved) onSessionSaved();
    } else { await fetch('/api/exercise-draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sessionData)}); setSession(null); loadAll(); }
  }
  async function moveToInactive(bodyPart,exercise) { await fetch('/api/inactive-exercises',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bodyPart,exercise})}); loadAll(); }
  async function restoreFromInactive(id) { await fetch('/api/inactive-exercises',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}); loadAll(); }
  async function deleteInactive(id) { await fetch('/api/inactive-exercises',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,permanent:true})}); loadAll(); }
  async function deleteCustomExercise(customId) { await fetch('/api/custom-exercises',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:customId})}); loadAll(); }

  if(session){return <SessionLogger session={session} onSave={saveSession} onMoveInactive={moveToInactive} inactive={inactive} allLogs={logged} customExercises={customExercises} onCustomExerciseAdded={loadAll} />;}
  return (<div>
    <div style={{ fontSize:12,color:TH.textMuted,marginBottom:'1rem',fontWeight:500 }}>Workouts waiting to be logged</div>
    {pending.length===0 && <div style={{ textAlign:'center',padding:'2.5rem',color:TH.textMuted,fontSize:14 }}>No workouts waiting to be logged</div>}
    {pending.map(w => {
      const wt = WORKOUT_TYPES.find(x => x.key===w.type);
      const draft = drafts.find(d => d.date===w.date);
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
function SessionLogger({ session,onSave,onMoveInactive,inactive,allLogs,customExercises,onCustomExerciseAdded }) {
  const [exercises,setExercises] = useState(session.exercises||[]);
  const [intensity,setIntensity] = useState(session.intensity||'3');
  const [am,setAm] = useState(session.am||false);
  const [showInactive,setShowInactive] = useState(false);
  const [previousData,setPreviousData] = useState({});
  const [showAddExercise,setShowAddExercise] = useState(false);
  const [newExerciseName,setNewExerciseName] = useState('');
  const [addingExercise,setAddingExercise] = useState(false);
  const wt = WORKOUT_TYPES.find(w => w.key===session.workoutType);
  const isRowingType = session.workoutType==='R'||session.workoutType==='KBR';
  const [rowingType,setRowingType] = useState(session.rowingType||'time');
  const [rowingValue,setRowingValue] = useState(session.rowingValue||'');
  const [sessionNotes,setSessionNotes] = useState(session.sessionNotes||'');

  useEffect(() => {
    if(!allLogs||isRowingType) return;
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
      const draftData = {date:session.date,workoutType:session.workoutType,workoutLabel:session.workoutLabel,intensity:wt?.hasIntensity?intensity:null,am,exercises:isRowingType?[]:exercises,rowingType:isRowingType?rowingType:null,rowingValue:isRowingType?rowingValue:null,sessionNotes};
      fetch('/api/exercise-draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draftData)});
    }, 1500);
    return () => clearTimeout(timer);
  }, [exercises,intensity,am,rowingType,rowingValue,sessionNotes]);

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

  function getSessionData() { return {date:session.date,workoutType:session.workoutType,workoutLabel:session.workoutLabel,intensity:wt?.hasIntensity?intensity:null,am,exercises:isRowingType?[]:exercises,rowingType:isRowingType?rowingType:null,rowingValue:isRowingType?rowingValue:null,sessionNotes}; }
  const inactiveList = inactive[session.workoutType]||[];

  return (<div>
    <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:'1.25rem' }}>
      {wt?.isSplit ? <SplitIcon size={34} radius={8} /> : <span style={{ background:wt?.color,color:wt?.textColor,borderRadius:8,fontSize:12,fontWeight:700,padding:'5px 12px' }}>{session.workoutType}</span>}
      <div><div style={{ fontWeight:700,fontSize:18,fontFamily:TH.heading,color:TH.text }}>{session.workoutLabel}</div>
        <div style={{ fontSize:12,color:TH.textMuted }}>{fmtDate(session.date)}</div></div></div>

    {/* AM checkbox — shown for ALL workout types */}
    <div style={{ marginBottom:'1.5rem',padding:'14px 16px',background:TH.card,borderRadius:TH.radiusSm,border:`2px solid ${am?'#FFD700':TH.border}`,boxShadow:am?'0 0 16px rgba(255,215,0,0.15)':'none',transition:'all 200ms ease' }}>
      <button onClick={() => setAm(a => !a)}
        style={{ display:'flex',alignItems:'center',gap:12,background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit',width:'100%' }}>
        <span style={{ fontSize:28,lineHeight:1,transition:'transform 200ms ease',transform:am?'scale(1.15)':'scale(1)' }}>{am?'🏆':'⬜'}</span>
        <div style={{ textAlign:'left' }}>
          <div style={{ fontSize:14,fontWeight:700,color:am?'#FFD700':TH.textSec }}>{am?'AM session — nice work!':'Mark as AM session'}</div>
          <div style={{ fontSize:11,color:TH.textMuted,marginTop:2 }}>Tap to toggle</div>
        </div>
      </button>
    </div>

    {wt?.hasIntensity && (<div style={{ marginBottom:'1.5rem' }}>
      <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:8,fontWeight:500 }}>Intensity</label>
      <div style={{ display:'flex',gap:8 }}>
        {['1','2','3'].map(n => (<button key={n} onClick={() => setIntensity(n)} style={{ flex:1,padding:'11px',borderRadius:TH.radiusSm,border:`2px solid ${intensity===n?TH.pink:TH.border}`,background:intensity===n?TH.pink:'transparent',fontWeight:700,fontSize:16,color:intensity===n?'#fff':TH.textMuted,cursor:'pointer',fontFamily:TH.heading,transition:'all 150ms ease',boxShadow:intensity===n?'0 0 16px rgba(236,116,135,0.3)':'none' }}>{n}</button>))}
      </div></div>)}

    {/* Rowing: only AM checkbox, no time/distance */}
    {isRowingType && (
      <div style={{ padding:'16px',background:TH.cardAlt,borderRadius:TH.radiusSm,border:`1px solid ${TH.border}`,marginBottom:'1.5rem',textAlign:'center' }}>
        <div style={{ fontSize:13,color:TH.textMuted }}>Distance and time are tracked in your rowing app.</div>
        <div style={{ fontSize:12,color:TH.textMuted,marginTop:4 }}>Just mark AM above if it was a morning session.</div>
      </div>
    )}

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
function ExerciseHistory() {
  const [logs,setLogs] = useState([]); const [filterType,setFilterType] = useState('exercise');
  const [selectedBP,setSelectedBP] = useState('L'); const [selectedEx,setSelectedEx] = useState('');
  useEffect(() => { fetch('/api/exercise-log').then(r=>r.json()).then(data => { setLogs(data.filter(d => !d.noData).sort((a,b) => b.date.localeCompare(a.date))); }); }, []);
  const allExercises = [...new Set(logs.flatMap(l => (l.exercises||[]).map(e => e.name)))].sort();
  const filtered = filterType==='bodypart' ? logs.filter(l => l.workoutType===selectedBP) : logs.filter(l => (l.exercises||[]).some(e => e.name===selectedEx));
  function renderRow(log) {
    const rowCardStyle = {padding:'14px 16px',background:TH.card,borderRadius:TH.radiusSm,marginBottom:8,boxShadow:TH.shadowSm,border:`1px solid ${TH.border}`,position:'relative',overflow:'hidden'};
    const isRowingType = log.workoutType==='R'||log.workoutType==='KBR';
    if(filterType==='exercise'){const ex=(log.exercises||[]).find(e=>e.name===selectedEx);if(!ex)return null;return(<div key={log.date} style={rowCardStyle}><div style={{fontSize:12,color:TH.textMuted,marginBottom:6}}>{fmtDate(log.date)}{log.am&&<span style={{marginLeft:8}}>🏆</span>}</div><div style={{fontSize:13,fontWeight:600,marginBottom:6,color:TH.text}}>{ex.name}</div><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{ex.sets.filter(s=>s.reps||s.weight).map((s,i)=><span key={i} style={{background:TH.cardAlt,border:`1px solid ${TH.border}`,borderRadius:6,padding:'4px 10px',fontSize:13,color:TH.textSec}}>{s.reps} reps x {s.weight}kg</span>)}</div></div>);}
    if(isRowingType) return(<div key={log.date} style={rowCardStyle}><div style={{fontSize:12,color:TH.textMuted,marginBottom:4}}>{fmtDate(log.date)}{log.am&&<span style={{marginLeft:8}}>🏆</span>}</div><div style={{fontSize:13,color:TH.text}}>{log.am?'AM session':'Session logged'}</div></div>);
    return(<div key={log.date} style={rowCardStyle}><div style={{fontSize:12,color:TH.textMuted,marginBottom:8}}>{fmtDate(log.date)}{log.am&&<span style={{marginLeft:8}}>🏆</span>}</div>{(log.exercises||[]).map((ex,i)=>(<div key={i} style={{marginBottom:10}}><div style={{fontSize:13,fontWeight:600,marginBottom:4,color:TH.text}}>{ex.name}</div><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{ex.sets.filter(s=>s.reps||s.weight).map((s,si)=><span key={si} style={{background:TH.cardAlt,border:`1px solid ${TH.border}`,borderRadius:6,padding:'4px 10px',fontSize:12,color:TH.textSec}}>{s.reps} reps x {s.weight}kg</span>)}</div></div>))}</div>);
  }
  return (<div>
    <div style={{display:'flex',gap:8,marginBottom:'1rem'}}>
      {[['exercise','By exercise'],['bodypart','By body part']].map(([k,l])=>(<button key={k} onClick={()=>setFilterType(k)} style={{flex:1,padding:'11px',borderRadius:TH.radiusSm,border:`2px solid ${filterType===k?TH.cyan:TH.border}`,background:filterType===k?'rgba(77,212,255,0.08)':'transparent',color:filterType===k?TH.cyan:TH.textMuted,fontWeight:600,cursor:'pointer',fontFamily:'inherit',fontSize:13,transition:'all 150ms ease'}}>{l}</button>))}
    </div>
    {filterType==='bodypart' && (<div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:'1rem'}}>
      {WORKOUT_TYPES.map(w=>(<button key={w.key} onClick={()=>setSelectedBP(w.key)} style={{padding:'8px 12px',borderRadius:8,border:`2px solid ${selectedBP===w.key?(w.isSplit?'#B0A0F0':w.color):TH.border}`,background:selectedBP===w.key?(w.isSplit?'rgba(152,132,232,0.12)':w.color+'20'):'transparent',color:selectedBP===w.key?(w.isSplit?'#B0A0F0':w.color):TH.textMuted,fontSize:13,fontWeight:selectedBP===w.key?600:400,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease'}}>{w.key} - {w.label}</button>))}</div>)}
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
      getCellStyle={(day,dateStr)=>{const hasEntry=weightByDate[dateStr]!==undefined;if(!hasEntry)return{border:`1px solid ${TH.border}`,color:TH.textMuted,borderRadius:TH.radiusSm};const direction=directionByDate[dateStr];let bg=TH.cardAlt;let color=TH.textSec;if(direction==='down'){bg=HEAT.green1;color=HEAT.green1Text;}else if(direction==='up'){bg=HEAT.red;color=HEAT.redText;}else{bg=TH.cardAlt;color=TH.textSec;}return{background:bg,color,borderRadius:TH.radiusSm,fontWeight:600,bottomLabel:`${weightByDate[dateStr]}`};}}
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
  </div>);
}

// ─── CHART OPTIONS ──────────────────────────────────────────────────────────
function darkChartOpts(extra={}) {
  return {responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},...extra.plugins},
    scales:{x:{ticks:{color:TH.textMuted,font:{size:11}},grid:{color:'rgba(77,212,255,0.04)'}},y:{min:extra.yMin||0,max:extra.yMax||undefined,ticks:{color:TH.textMuted,font:{size:10},...(extra.yTicks||{})},grid:{color:'rgba(77,212,255,0.04)'}}}};
}

// ─── TASK CATEGORIES ────────────────────────────────────────────────────────
const TASK_CATEGORIES = {
  magic: { label:'Magic', color:'#C084FC', textColor:'#2E1065' },
  balloon: { label:'Balloon Business', color:'#34D399', textColor:'#022C22' },
};

// ─── BUSINESS LAUNCH ROADMAP — premium redesign for the Balloon Business backlog ──
// Visual-only components. All data still flows through the same /api/todos and
// /api/dailytasks endpoints and the same handlers already defined in DailyTasksSection.
const LAUNCH = {
  bg:'#0B0F14',
  card:'#151B23',
  cardAlt:'#1D2430',
  border:'rgba(255,255,255,0.08)',
  accent:'#4F8CFF',
  accentDark:'#346DFF',
  success:'#27C76F',
  warning:'#FFB547',
  textSec:'rgba(255,255,255,0.72)',
  textMuted:'rgba(255,255,255,0.45)',
};

function BrickWall({ total,completed }) {
  const count = Math.max(total,1);
  const perRow = 6;
  const rows = [];
  for (let i=0;i<count;i+=perRow) rows.push(Array.from({ length:Math.min(perRow,count-i) },(_,j)=>i+j));
  return (<div className="lrBrickWall">
    {rows.map((row,rIdx) => (
      <div key={rIdx} className="lrBrickRow" style={{ marginLeft: rIdx%2===1 ? 22 : 0 }}>
        {row.map(i => {
          const done = i < completed;
          return <div key={i} className={done ? 'lrBrick lrBrickDone' : 'lrBrick'} />;
        })}
      </div>
    ))}
    <style>{`
      .lrBrickWall { display: flex; flex-direction: column; gap: 6px; }
      .lrBrickRow { display: flex; gap: 6px; }
      .lrBrick { width: 44px; height: 24px; flex-shrink: 0; border-radius: 6px; background: #2D3440; border: 1px solid rgba(255,255,255,0.08); transition: all 400ms ease; }
      .lrBrickDone { background: linear-gradient(180deg, #5FA6FF, #3E7DFF); border-color: transparent; box-shadow: 0 0 18px rgba(79,140,255,0.35); animation: lrBrickPop 400ms ease; }
      @keyframes lrBrickPop { 0%{ transform:scale(0.8); opacity:0.4; } 60%{ transform:scale(1.08); } 100%{ transform:scale(1); opacity:1; } }
    `}</style>
  </div>);
}

function LaunchHero({ completed,total,nextTask }) {
  const pct = total ? Math.round((completed/total)*100) : 0;
  const remaining = Math.max(total-completed,0);
  const isComplete = total>0 && completed===total;
  return (<div className="lrHero">
    <div className="lrHeroTop">
      <div>
        <div className="lrHeroTitle">BUSINESS LAUNCH</div>
        <div className="lrHeroTitleSub">Roadmap</div>
      </div>
      <span className="lrPill" style={isComplete?{ background:'rgba(39,199,111,0.14)',color:'#3ED98A' }:undefined}>{isComplete?'LAUNCHED':'IN PROGRESS'}</span>
    </div>
    <div className="lrPctBlock">
      <div className="lrPctNum">{pct}%</div>
      <div className="lrPctCaption">Launch Readiness</div>
      <div className="lrPctSub">{total===0?'No milestones yet':`${remaining} milestone${remaining===1?'':'s'} remaining`}</div>
    </div>
    <div className="lrTrack"><div className="lrFill" style={{ width:`${pct}%` }} /></div>
    {nextTask && (<div className="lrNextMission">
      <div className="lrNextLabel">Next Mission</div>
      <div className="lrNextTask">{nextTask}</div>
    </div>)}
    {total>0 && <BrickWall total={total} completed={completed} />}
    <style>{`
      .lrHero { position: relative; min-height: 340px; background: linear-gradient(180deg, rgba(27,33,44,0.72), rgba(23,29,39,0.72)); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border: 1px solid rgba(255,255,255,0.06); border-radius: 28px; padding: 36px 30px 30px; box-shadow: 0 14px 40px rgba(0,0,0,0.45); display: flex; flex-direction: column; gap: 28px; transition: transform 300ms ease, box-shadow 300ms ease; }
      .lrHero:hover { transform: translateY(-3px); box-shadow: 0 24px 60px rgba(0,0,0,0.45); }
      .lrHeroTop { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: -8px; }
      .lrHeroTitle { font-size: 13px; font-weight: 800; letter-spacing: 0.12em; color: rgba(255,255,255,0.55); }
      .lrHeroTitleSub { font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.01em; margin-top: 2px; }
      .lrPill { padding: 8px 16px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; background: rgba(79,140,255,0.12); color: #6FAEFF; white-space: nowrap; }
      .lrPctBlock { margin-bottom: -8px; }
      .lrPctNum { font-size: 72px; font-weight: 800; letter-spacing: -4px; line-height: 0.9; color: #fff; }
      .lrPctCaption { font-size: 14px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.6); margin-top: 6px; }
      .lrPctSub { font-size: 16px; opacity: 0.65; color: #fff; margin-top: 4px; }
      .lrTrack { height: 22px; background: #242A35; border-radius: 999px; overflow: hidden; }
      .lrFill { height: 100%; background: linear-gradient(90deg, #61A8FF, #437DFF); border-radius: 999px; box-shadow: 0 0 20px rgba(97,168,255,0.45); transition: width 700ms ease; }
      .lrNextLabel { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.5); }
      .lrNextTask { font-size: 24px; font-weight: 700; color: #fff; margin-top: 6px; line-height: 1.2; }
    `}</style>
  </div>);
}

function RoadmapTaskCard({ item,index,manageMode,onUseToday,onToggleDone,onDelete,onMoveUp,onMoveDown,canMoveUp,canMoveDown }) {
  const done = item.done;
  return (<div className={done ? 'lrCard lrCardDone' : 'lrCard'}>
    <div className="lrBadge">{index+1}</div>
    <div style={{ flex:1,minWidth:0 }}>
      <div className="lrTitle" style={{ textDecoration:done?'line-through':'none' }}>{item.text}</div>
    </div>
    {manageMode ? (<div style={{ display:'flex',gap:6,alignItems:'center',flexShrink:0 }}>
      <button className="lrIconBtn" onClick={onMoveUp} disabled={!canMoveUp}>▲</button>
      <button className="lrIconBtn" onClick={onMoveDown} disabled={!canMoveDown}>▼</button>
      <button className="lrIconBtn" onClick={onToggleDone}>{done?'✓':'○'}</button>
      <button className="lrIconBtn lrDanger" onClick={onDelete}>×</button>
    </div>) : done ? (
      <span className="lrDoneTick">✓</span>
    ) : (
      <button className="lrUseBtn" onClick={onUseToday}>Use Today</button>
    )}
    <style>{`
      .lrCard { display: flex; align-items: center; gap: 12px; background: ${LAUNCH.cardAlt}; border: 1px solid ${LAUNCH.border}; border-radius: 16px; padding: 14px 16px; transition: all 250ms ease-out; animation: lrFadeIn 300ms ease-out; }
      .lrCard:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
      .lrCardDone { border-color: rgba(39,199,111,0.4); background: rgba(39,199,111,0.06); box-shadow: 0 0 16px rgba(39,199,111,0.12); opacity: 0.75; }
      .lrBadge { width: 26px; height: 26px; border-radius: 8px; background: rgba(79,140,255,0.14); color: ${LAUNCH.accent}; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .lrCardDone .lrBadge { background: rgba(39,199,111,0.16); color: ${LAUNCH.success}; }
      .lrTitle { font-size: 14px; font-weight: 600; color: #fff; }
      .lrUseBtn { background: linear-gradient(135deg, ${LAUNCH.accent}, ${LAUNCH.accentDark}); color: #fff; border: none; border-radius: 12px; padding: 8px 14px; font-size: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 0 12px rgba(79,140,255,0.3); transition: all 150ms ease; flex-shrink: 0; font-family: inherit; }
      .lrUseBtn:hover { transform: translateY(-1px); box-shadow: 0 0 18px rgba(79,140,255,0.45); }
      .lrDoneTick { color: ${LAUNCH.success}; font-size: 18px; font-weight: 700; flex-shrink: 0; }
      .lrIconBtn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: rgba(255,255,255,0.7); font-size: 11px; padding: 5px 7px; cursor: pointer; font-family: inherit; }
      .lrIconBtn:disabled { opacity: 0.3; cursor: default; }
      .lrDanger { color: #FF6B6B; }
      @keyframes lrFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    `}</style>
  </div>);
}

function BalloonRoadmapModal({ todos,onClose,onAdd,onToggleDone,onDelete,onReorder,onUseToday,newTodoText,setNewTodoText,manageMode,setManageMode }) {
  const completed = todos.filter(t=>t.done).length;
  const total = todos.length;
  const nextTask = (todos.find(t=>!t.done)||{}).text;
  return (<div className="lrOverlay" onClick={onClose}>
    <div className="lrSheet" onClick={e=>e.stopPropagation()}>
      <div className="lrHeader">
        <span style={{ fontSize:16,fontWeight:700,color:'#fff' }}>🎈 Balloon Business Roadmap</span>
        <button onClick={onClose} className="lrClose">×</button>
      </div>
      <div className="lrBody">
        <LaunchHero completed={completed} total={total} nextTask={nextTask} />
        <div className="lrStatsRow">
          <div className="lrStat"><div className="lrStatLabel">Completed</div><div className="lrStatValue">{completed}</div></div>
          <div className="lrStat"><div className="lrStatLabel">Remaining</div><div className="lrStatValue">{total-completed}</div></div>
          <div className="lrStat"><div className="lrStatLabel">Readiness</div><div className="lrStatValue">{total?Math.round((completed/total)*100):0}%</div></div>
        </div>
        {todos.length===0 && <div style={{ color:LAUNCH.textMuted,fontSize:13,textAlign:'center',padding:'1.5rem 0' }}>No milestones yet — add your first step below</div>}
        <div style={{ display:'flex',flexDirection:'column',gap:10,marginTop:8 }}>
          {todos.map((item,idx) => (
            <RoadmapTaskCard key={item._id} item={item} index={idx} manageMode={manageMode}
              onUseToday={() => onUseToday(item)}
              onToggleDone={() => onToggleDone(item)}
              onDelete={() => onDelete(item._id)}
              onMoveUp={() => onReorder(idx,-1)}
              onMoveDown={() => onReorder(idx,1)}
              canMoveUp={idx>0}
              canMoveDown={idx<todos.length-1}
            />
          ))}
        </div>
        <div style={{ display:'flex',gap:8,marginTop:16 }}>
          <input type="text" value={newTodoText} onChange={e => setNewTodoText(e.target.value)}
            placeholder="Add a new milestone..."
            onKeyDown={e => { if(e.key==='Enter'&&newTodoText.trim()) onAdd(); }}
            className="lrInput" />
          <button onClick={onAdd} className="lrAddBtn">Add</button>
        </div>
        <button onClick={() => setManageMode(m=>!m)} className="lrManageBtn">{manageMode?'Done managing':'Manage milestones'}</button>
      </div>
      <style>{`
        .lrHeader { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .lrClose { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); font-size: 18px; border-radius: 8px; padding: 2px 10px; cursor: pointer; }
        .lrBody { padding: 20px; max-height: 75vh; overflow-y: auto; }
        .lrStatsRow { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin: 16px 0; }
        .lrStat { background: ${LAUNCH.card}; border: 1px solid ${LAUNCH.border}; border-radius: 14px; padding: 12px; text-align: center; }
        .lrStatLabel { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${LAUNCH.textMuted}; margin-bottom: 4px; }
        .lrStatValue { font-size: 22px; font-weight: 800; color: #fff; }
        .lrInput { flex: 1; padding: 12px 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); background: ${LAUNCH.card}; color: #fff; font-size: 13px; font-family: inherit; box-sizing: border-box; }
        .lrAddBtn { background: linear-gradient(135deg, ${LAUNCH.accent}, ${LAUNCH.accentDark}); color: #fff; border: none; border-radius: 14px; padding: 0 18px; font-weight: 700; font-size: 13px; cursor: pointer; box-shadow: 0 0 16px rgba(79,140,255,0.3); font-family: inherit; }
        .lrManageBtn { width: 100%; margin-top: 12px; background: transparent; border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.72); border-radius: 14px; padding: 11px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
      `}</style>
    </div>
    <style>{`
      .lrOverlay { position: fixed; inset: 0; background: rgba(4,8,20,0.85); backdrop-filter: blur(8px); display: flex; align-items: flex-start; justify-content: center; z-index: 1000; overflow-y: auto; padding: 16px; }
      .lrSheet { width: 420px; max-width: 100%; margin-top: 1.5rem; margin-bottom: 1.5rem; background: ${LAUNCH.bg}; border: 1px solid ${LAUNCH.border}; border-radius: 20px; box-shadow: 0 18px 60px rgba(0,0,0,0.45); overflow: hidden; }
    `}</style>
  </div>);
}

// ─── DAILY TASKS SECTION ─────────────────────────────────────────────────────
function DailyTasksSection() {
  const now = new Date();
  const [year,setYear] = useState(now.getFullYear());
  const [month,setMonth] = useState(now.getMonth());
  const [monthData,setMonthData] = useState([]);
  const [adjData,setAdjData] = useState([]);
  const [today,setToday] = useState('');
  const [todayEntry,setTodayEntry] = useState(null);
  const [taskText,setTaskText] = useState('');
  const [category,setCategory] = useState('magic');
  const [savingToday,setSavingToday] = useState(false);
  const [modal,setModal] = useState(null);
  const [modalEntry,setModalEntry] = useState(null);
  const [magicTodos,setMagicTodos] = useState([]);
  const [balloonTodos,setBalloonTodos] = useState([]);
  const [pickerList,setPickerList] = useState(null);
  const [newTodoText,setNewTodoText] = useState('');
  const [manageMode,setManageMode] = useState(false);
  const [showManualEntry,setShowManualEntry] = useState(false);

  useEffect(() => { setToday(todayStr()); }, []);
  useEffect(() => { loadMonth(); }, [year,month]);
  useEffect(() => { loadToday(); }, []);
  useEffect(() => { loadTodos(); }, []);

  async function loadMonth() {
    const prevMonth0 = month===0?11:month-1; const prevYear = month===0?year-1:year;
    const nextMonth0 = month===11?0:month+1; const nextYear = month===11?year+1:year;
    const [cur,prev,next] = await Promise.all([
      fetch(`/api/dailytasks?year=${year}&month=${month+1}`).then(r=>r.json()),
      fetch(`/api/dailytasks?year=${prevYear}&month=${prevMonth0+1}`).then(r=>r.json()),
      fetch(`/api/dailytasks?year=${nextYear}&month=${nextMonth0+1}`).then(r=>r.json()),
    ]);
    setMonthData(cur); setAdjData([...prev,...next]);
  }
  async function loadToday() {
    const res = await fetch(`/api/dailytasks?date=${todayStr()}`);
    const data = await res.json();
    setTodayEntry(data && data.length ? data[0] : null);
  }
  async function loadTodos() {
    const [m,b] = await Promise.all([
      fetch('/api/todos?list=magic').then(r=>r.json()),
      fetch('/api/todos?list=balloon').then(r=>r.json()),
    ]);
    setMagicTodos(m); setBalloonTodos(b);
  }

  async function saveTodayTask() {
    if(!taskText.trim()) return;
    setSavingToday(true);
    await fetch('/api/dailytasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:todayStr(),category,task:taskText.trim(),done:false,todoId:null})});
    setTaskText(''); setSavingToday(false); setShowManualEntry(false);
    loadToday(); loadMonth();
  }
  async function useTodoToday(item) {
    await fetch('/api/dailytasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:todayStr(),category:item.list,task:item.text,done:false,todoId:item._id})});
    closePicker(); loadToday(); loadMonth();
  }
  async function toggleDone() {
    if(!todayEntry) return;
    const newDone = !todayEntry.done;
    await fetch('/api/dailytasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:todayEntry.date,category:todayEntry.category,task:todayEntry.task,done:newDone,todoId:todayEntry.todoId||null})});
    if(todayEntry.todoId) {
      await fetch('/api/todos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:todayEntry.todoId,done:newDone})});
    }
    loadToday(); loadMonth(); loadTodos();
  }
  async function clearToday() {
    await fetch('/api/dailytasks',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:todayStr()})});
    setTodayEntry(null); loadMonth();
  }

  function openPicker(list) { setPickerList(list); setManageMode(false); setNewTodoText(''); }
  function closePicker() { setPickerList(null); setManageMode(false); setNewTodoText(''); }
  async function addTodoItem(list) {
    if(!newTodoText.trim()) return;
    await fetch('/api/todos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({list,text:newTodoText.trim()})});
    setNewTodoText(''); loadTodos();
  }
  async function toggleTodoDone(item) {
    await fetch('/api/todos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item._id,done:!item.done})});
    loadTodos();
  }
  async function deleteTodoItem(id) {
    await fetch('/api/todos',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
    loadTodos();
  }
  async function reorderTodo(list,items,index,direction) {
    const newIndex = index+direction; if(newIndex<0||newIndex>=items.length) return;
    const updated = [...items]; [updated[index],updated[newIndex]] = [updated[newIndex],updated[index]];
    const ids = updated.map(i => i._id);
    await fetch('/api/todos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'reorder',list,ids})});
    loadTodos();
  }

  const byDateAll = {}; [...monthData,...adjData].forEach(e => { byDateAll[e.date] = e; });
  const byDate = {}; monthData.forEach(e => { byDate[e.date] = e; });

  function prevMonth(){if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}
  function nextMonth(){if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}
  const monthLabel = new Date(year,month).toLocaleString('default',{month:'long',year:'numeric'});

  let streak = 0;
  if(today){
    let cursor = new Date();
    const todayKey = todayStr();
    if(!(byDateAll[todayKey] && byDateAll[todayKey].done)) { cursor.setDate(cursor.getDate()-1); }
    while(true) {
      const key = `${cursor.getFullYear()}-${pad(cursor.getMonth()+1)}-${pad(cursor.getDate())}`;
      const entry = byDateAll[key];
      if(entry && entry.done) { streak++; cursor.setDate(cursor.getDate()-1); } else break;
    }
  }

  const magicCount = monthData.filter(e => e.done && e.category==='magic').length;
  const balloonCount = monthData.filter(e => e.done && e.category==='balloon').length;

  function openDay(day) {
    const dateStr = toDateStr(year,month,day);
    const entry = byDate[dateStr];
    setModal(dateStr); setModalEntry(entry||null);
  }
  async function removeModalEntry() {
    if(!modal) return;
    await fetch('/api/dailytasks',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:modal})});
    setModal(null); setModalEntry(null); loadMonth();
    if(modal===todayStr()) loadToday();
  }

  return (<div>
    <div style={{ background:TH.card,borderRadius:TH.radiusSm,padding:'16px',marginBottom:'1.5rem',border:`1px solid ${TH.border}`,boxShadow:TH.shadowSm,position:'relative',overflow:'hidden' }}>
      <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg, transparent, ${TH.borderGlow}, transparent)` }} />
      <div style={{ fontSize:12,color:TH.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10 }}>Today's task</div>
      {!todayEntry ? (<div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        <div style={{ display:'flex',gap:8 }}>
          {Object.entries(TASK_CATEGORIES).map(([k,c]) => {
            const list = k==='magic'?magicTodos:balloonTodos;
            const remaining = list.filter(i => !i.done).length;
            return (<button key={k} onClick={() => openPicker(k)}
              style={{ flex:1,padding:'14px 10px',borderRadius:TH.radiusSm,border:`2px solid ${c.color}`,background:c.color+'15',color:c.color,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease',textAlign:'center' }}>
              <div>{c.label}</div>
              <div style={{ fontSize:11,fontWeight:500,opacity:0.85,marginTop:3 }}>{remaining} to do</div>
            </button>);
          })}
        </div>
        {!showManualEntry ? (
          <button onClick={() => setShowManualEntry(true)} style={{ background:'none',border:'none',color:TH.textMuted,fontSize:12,cursor:'pointer',fontFamily:'inherit',textDecoration:'underline',padding:0,textAlign:'left' }}>or type a one-off task</button>
        ) : (<>
          <div style={{ display:'flex',gap:8 }}>
            {Object.entries(TASK_CATEGORIES).map(([k,c]) => (<button key={k} onClick={() => setCategory(k)}
              style={{ flex:1,padding:'10px',borderRadius:TH.radiusSm,border:`2px solid ${category===k?c.color:TH.border}`,background:category===k?c.color+'20':'transparent',color:category===k?c.color:TH.textMuted,fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease' }}>{c.label}</button>))}
          </div>
          <input type="text" value={taskText} onChange={e => setTaskText(e.target.value)} placeholder="What are you doing today?"
            onKeyDown={e => { if(e.key==='Enter'&&taskText.trim()) saveTodayTask(); }}
            style={{ width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:14,fontFamily:'inherit',boxShadow:TH.glow,boxSizing:'border-box' }} />
          <Btn onClick={saveTodayTask} style={{ opacity:taskText.trim()?1:0.4 }}>{savingToday?'Saving...':'Set task'}</Btn>
        </>)}
      </div>) : (<div>
        <div style={{ marginBottom:6 }}>
          <span style={{ fontSize:11,fontWeight:700,color:TASK_CATEGORIES[todayEntry.category]?.color,textTransform:'uppercase',letterSpacing:'0.04em' }}>{TASK_CATEGORIES[todayEntry.category]?.label}</span>
        </div>
        <div style={{ fontSize:16,fontWeight:600,color:TH.text,marginBottom:14 }}>{todayEntry.task}</div>
        <button onClick={toggleDone}
          style={{ display:'flex',alignItems:'center',gap:10,width:'100%',padding:'12px 14px',borderRadius:TH.radiusSm,border:`2px solid ${todayEntry.done?'#34D399':TH.border}`,background:todayEntry.done?'rgba(52,211,153,0.1)':TH.input,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease',marginBottom:8 }}>
          <span style={{ fontSize:22 }}>{todayEntry.done?'✅':'⬜'}</span>
          <span style={{ fontSize:14,fontWeight:600,color:todayEntry.done?'#34D399':TH.textMuted }}>{todayEntry.done?'Done — nice work!':'Mark as done'}</span>
        </button>
        <Btn onClick={clearToday} variant="ghost" style={{ fontSize:12,padding:'4px 6px' }}>Clear today's task</Btn>
      </div>)}
    </div>

    <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:'1.5rem' }}>
      <StatCard label="Streak" value={streak} sub="days" />
      <StatCard label="Magic" value={magicCount} sub="this month" />
      <StatCard label="Balloon Biz" value={balloonCount} sub="this month" />
    </div>

    {balloonTodos.length>0 && (
      <div style={{ marginBottom:'1.5rem' }}>
        <LaunchHero
          completed={balloonTodos.filter(t=>t.done).length}
          total={balloonTodos.length}
          nextTask={(balloonTodos.find(t=>!t.done)||{}).text}
        />
      </div>
    )}

    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem' }}>
      <button onClick={prevMonth} style={{ background:TH.card,border:`1px solid ${TH.border}`,borderRadius:8,padding:'7px 16px',fontSize:16,color:TH.textSec,cursor:'pointer' }}>&#8249;</button>
      <span style={{ fontWeight:700,fontSize:15,fontFamily:TH.heading,color:TH.text }}>{monthLabel}</span>
      <button onClick={nextMonth} style={{ background:TH.card,border:`1px solid ${TH.border}`,borderRadius:8,padding:'7px 16px',fontSize:16,color:TH.textSec,cursor:'pointer' }}>&#8250;</button>
    </div>
    <CalendarGrid year={year} month={month}
      getCellStyle={(day,dateStr) => {
        const entry = byDateAll[dateStr];
        const isPast = today && dateStr < today;
        if(!entry) { if(isPast) return {background:HEAT.red,color:HEAT.redText,borderRadius:TH.radiusSm,fontWeight:500}; return {border:`1px solid ${TH.border}`,color:TH.textMuted,borderRadius:TH.radiusSm}; }
        if(entry.done) { const c = TASK_CATEGORIES[entry.category]; return {background:c?.color||TH.cardAlt,color:c?.textColor||TH.text,borderRadius:TH.radiusSm,fontWeight:600,letter:entry.category==='magic'?'M':'B'}; }
        if(isPast) return {background:HEAT.red,color:HEAT.redText,borderRadius:TH.radiusSm,fontWeight:500};
        return {border:`1px solid ${TH.border}`,color:TH.textMuted,borderRadius:TH.radiusSm};
      }}
      onDayClick={day => openDay(day)} />
    <div style={{ display:'flex',flexWrap:'wrap',gap:12,marginBottom:'1.5rem' }}>
      {Object.entries(TASK_CATEGORIES).map(([k,c]) => (<div key={k} style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:TH.textSec }}><div style={{ width:12,height:12,borderRadius:4,background:c.color }} />{c.label}</div>))}
      <div style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:TH.textSec }}><div style={{ width:12,height:12,borderRadius:4,background:HEAT.red }} />Missed</div>
    </div>

    <div style={{ fontSize:12,color:TH.textMuted,marginBottom:8,fontWeight:500 }}>History — {monthLabel}</div>
    {monthData.length===0 && <div style={{ textAlign:'center',padding:'2rem',color:TH.textMuted,fontSize:14 }}>No tasks logged this month</div>}
    {[...monthData].sort((a,b) => b.date.localeCompare(a.date)).map(e => {
      const c = TASK_CATEGORIES[e.category];
      return (<div key={e.date} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:TH.card,borderRadius:TH.radiusSm,marginBottom:6,border:`1px solid ${TH.border}` }}>
        <div style={{ minWidth:0,flex:1 }}>
          <div style={{ fontSize:12,color:TH.textMuted,marginBottom:2 }}>{fmtDate(e.date)}</div>
          <div style={{ fontSize:13,color:TH.text,fontWeight:500 }}>{e.task} <span style={{ fontSize:11,color:c?.color,fontWeight:700,marginLeft:6,textTransform:'uppercase' }}>{c?.label}</span></div>
        </div>
        <span style={{ fontSize:18,flexShrink:0 }}>{e.done?'✅':'❌'}</span>
      </div>);
    })}

    {modal && (<Modal title={fmtDate(modal)} onClose={() => {setModal(null);setModalEntry(null);}}>
      {modalEntry ? (<div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        <span style={{ fontSize:11,fontWeight:700,color:TASK_CATEGORIES[modalEntry.category]?.color,textTransform:'uppercase' }}>{TASK_CATEGORIES[modalEntry.category]?.label}</span>
        <div style={{ fontSize:15,color:TH.text,fontWeight:600 }}>{modalEntry.task}</div>
        <div style={{ fontSize:13,color:modalEntry.done?'#34D399':HEAT.red }}>{modalEntry.done?'Done':'Not done'}</div>
        <Btn onClick={removeModalEntry} variant="danger">Remove entry</Btn>
      </div>) : (<div style={{ color:TH.textMuted,fontSize:13 }}>No task logged for this day</div>)}
    </Modal>)}

    {pickerList==='balloon' && (
      <BalloonRoadmapModal
        todos={balloonTodos}
        onClose={closePicker}
        onAdd={() => addTodoItem('balloon')}
        onToggleDone={toggleTodoDone}
        onDelete={deleteTodoItem}
        onReorder={(idx,dir) => reorderTodo('balloon',balloonTodos,idx,dir)}
        onUseToday={useTodoToday}
        newTodoText={newTodoText}
        setNewTodoText={setNewTodoText}
        manageMode={manageMode}
        setManageMode={setManageMode}
      />
    )}

    {pickerList==='magic' && (<Modal title={`${TASK_CATEGORIES.magic.label} to-dos`} onClose={closePicker}>
      <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
        {magicTodos.length===0 && <div style={{ color:TH.textMuted,fontSize:13 }}>No items yet — add one below</div>}
        {magicTodos.map((item) => (
          <div key={item._id} style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 12px',background:TH.cardAlt,borderRadius:10,border:`1px solid ${TH.border}`,opacity:item.done?0.5:1 }}>
            <span style={{ fontSize:13,color:TH.text,flex:1,textDecoration:item.done?'line-through':'none' }}>{item.text}</span>
            {manageMode ? (<div style={{ display:'flex',gap:4,flexShrink:0,alignItems:'center' }}>
              <button onClick={() => toggleTodoDone(item)} style={{ background:'none',border:`1px solid ${TH.border}`,borderRadius:4,color:item.done?'#34D399':TH.textMuted,fontSize:11,padding:'3px 6px',cursor:'pointer' }}>{item.done?'✓':'○'}</button>
              <button onClick={() => deleteTodoItem(item._id)} style={{ background:'none',border:'none',color:TH.textMuted,fontSize:14,cursor:'pointer',padding:'3px 6px' }}>x</button>
            </div>) : (!item.done && <button onClick={() => useTodoToday(item)} style={{ background:'rgba(77,212,255,0.08)',border:`1px solid ${TH.borderMed}`,color:TH.cyan,fontSize:12,fontWeight:700,cursor:'pointer',padding:'6px 10px',borderRadius:8,fontFamily:'inherit',flexShrink:0 }}>Use today</button>)}
          </div>
        ))}
        <div style={{ display:'flex',gap:8,marginTop:4 }}>
          <input type="text" value={newTodoText} onChange={e => setNewTodoText(e.target.value)} placeholder="Add new item..."
            onKeyDown={e => { if(e.key==='Enter'&&newTodoText.trim()) addTodoItem('magic'); }}
            style={{ flex:1,padding:'10px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:13,fontFamily:'inherit',boxShadow:TH.glow,boxSizing:'border-box' }} />
          <Btn onClick={() => addTodoItem('magic')} style={{ padding:'10px 14px',fontSize:13 }}>Add</Btn>
        </div>
        <Btn onClick={() => setManageMode(m => !m)} variant="secondary" style={{ marginTop:4 }}>{manageMode?'Done managing':'Manage list'}</Btn>
      </div>
    </Modal>)}
  </div>);
}

// ─── NUTRITION SECTION (calorie counting) ───────────────────────────────────
function timeToMinsN(t) { const [h,m] = t.split(':').map(Number); return h * 60 + m; }
function minsToLabel(m) { const h=Math.floor(m/60); const mm=m%60; return `${h>12?h-12:h||12}:${pad(mm)}${h>=12?'pm':'am'}`; }
function cal100(f) { return (Number(f.carbsPer100)||0)*4 + (Number(f.proteinPer100)||0)*4 + (Number(f.fatPer100)||0)*9; }
function scaleFood(f,grams) {
  const factor = (Number(grams)||0)/100;
  return {
    grams:Number(grams)||0,
    carbs:Math.round((Number(f.carbsPer100)||0)*factor*10)/10,
    protein:Math.round((Number(f.proteinPer100)||0)*factor*10)/10,
    fat:Math.round((Number(f.fatPer100)||0)*factor*10)/10,
    calories:Math.round(cal100(f)*factor),
  };
}
function yesterdayStr() { const n=new Date(); n.setDate(n.getDate()-1); return `${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())}`; }

// ─── FOODS TAB ───────────────────────────────────────────────────────────────
function FoodsTab({ foods,onChanged }) {
  const [filter,setFilter] = useState('all');
  const [modal,setModal] = useState(null); // null | 'add' | food object being edited
  const [form,setForm] = useState({ name:'',type:'meal',carbsPer100:'',proteinPer100:'',fatPer100:'',defaultGrams:'' });

  function openAdd() { setForm({ name:'',type:'meal',carbsPer100:'',proteinPer100:'',fatPer100:'',defaultGrams:'' }); setModal('add'); }
  function openEdit(f) { setForm({ id:f._id,name:f.name,type:f.type,carbsPer100:String(f.carbsPer100||''),proteinPer100:String(f.proteinPer100||''),fatPer100:String(f.fatPer100||''),defaultGrams:String(f.defaultGrams||'') }); setModal('edit'); }

  async function save() {
    if(!form.name.trim()) return;
    const payload = {
      id:form.id, name:form.name.trim(), type:form.type,
      carbsPer100:parseFloat(form.carbsPer100)||0, proteinPer100:parseFloat(form.proteinPer100)||0,
      fatPer100:parseFloat(form.fatPer100)||0, defaultGrams:parseFloat(form.defaultGrams)||100,
    };
    await fetch('/api/saved-foods',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    setModal(null); onChanged();
  }
  async function remove(id) { await fetch('/api/saved-foods',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}); onChanged(); }

  const meals = foods.filter(f=>f.type==='meal');
  const snacks = foods.filter(f=>f.type==='snack');
  const display = filter==='meal'?meals:filter==='snack'?snacks:foods;

  function FoodRow({ f }) {
    return (<div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:TH.card,borderRadius:TH.radiusSm,marginBottom:6,border:`1px solid ${TH.border}` }}>
      <div onClick={()=>openEdit(f)} style={{ cursor:'pointer',minWidth:0,flex:1 }}>
        <div style={{ fontSize:14,color:TH.text,fontWeight:600 }}>{f.name}</div>
        <div style={{ fontSize:11,color:TH.textMuted,marginTop:2 }}>{Math.round(cal100(f))} kcal/100g · C{f.carbsPer100||0} P{f.proteinPer100||0} F{f.fatPer100||0} · default {f.defaultGrams||100}g</div>
      </div>
      <button onClick={()=>remove(f._id)} style={{ background:'none',border:'none',color:TH.textMuted,fontSize:16,cursor:'pointer',padding:'4px 8px',flexShrink:0 }}>x</button>
    </div>);
  }

  return (<div>
    <div style={{ display:'flex',gap:6,marginBottom:'1rem' }}>
      {[['all','All'],['meal','Meals'],['snack','Snacks']].map(([k,l])=>(<button key={k} onClick={()=>setFilter(k)} style={{ flex:1,padding:'9px',borderRadius:10,border:`2px solid ${filter===k?TH.cyan:TH.border}`,background:filter===k?'rgba(77,212,255,0.08)':'transparent',color:filter===k?TH.cyan:TH.textMuted,fontWeight:600,cursor:'pointer',fontFamily:'inherit',fontSize:13,transition:'all 150ms ease' }}>{l}{k==='meal'?` (${meals.length})`:k==='snack'?` (${snacks.length})`:` (${foods.length})`}</button>))}
    </div>
    {display.length===0 && <div style={{ textAlign:'center',padding:'2rem',color:TH.textMuted,fontSize:14 }}>{foods.length===0?'No foods saved yet':'None here yet'}</div>}
    {filter==='all' ? (<>
      {meals.length>0 && (<div style={{ marginBottom:'1.25rem' }}>
        <div style={{ fontSize:12,color:TH.pink,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8 }}>Meals ({meals.length})</div>
        {meals.map(f=><FoodRow key={f._id} f={f} />)}
      </div>)}
      {snacks.length>0 && (<div style={{ marginBottom:'1.25rem' }}>
        <div style={{ fontSize:12,color:TH.purple,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8 }}>Snacks ({snacks.length})</div>
        {snacks.map(f=><FoodRow key={f._id} f={f} />)}
      </div>)}
    </>) : display.map(f=><FoodRow key={f._id} f={f} />)}
    <Btn onClick={openAdd} variant="secondary" style={{ width:'100%',marginTop:'0.5rem' }}>+ Add a food</Btn>

    {modal && (<Modal title={modal==='edit'?'Edit food':'Add a food'} onClose={()=>setModal(null)}>
      <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
        <div><label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:6,fontWeight:500 }}>Type</label>
          <div style={{ display:'flex',gap:8 }}>
            {[['meal','Meal'],['snack','Snack']].map(([k,l])=>(<button key={k} onClick={()=>setForm(f=>({...f,type:k}))} style={{ flex:1,padding:'11px',borderRadius:TH.radiusSm,border:`2px solid ${form.type===k?(k==='meal'?TH.pink:TH.purple):TH.border}`,background:form.type===k?(k==='meal'?'rgba(236,116,135,0.1)':'rgba(139,92,246,0.1)'):'transparent',color:form.type===k?(k==='meal'?TH.pink:TH.purple):TH.textMuted,fontWeight:600,cursor:'pointer',fontFamily:'inherit',fontSize:14,transition:'all 150ms ease' }}>{l}</button>))}
          </div></div>
        <div><label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500 }}>Food name</label>
          <input type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Chicken curry" style={{ width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:14,fontFamily:'inherit',boxShadow:TH.glow,boxSizing:'border-box' }} /></div>
        <div style={{ fontSize:11,color:TH.textMuted,fontWeight:500 }}>Macros per 100g</div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8 }}>
          <div><label style={{ fontSize:10,color:TH.textMuted,display:'block',marginBottom:4 }}>Carbs (g)</label>
            <input type="number" value={form.carbsPer100} onChange={e=>setForm(f=>({...f,carbsPer100:e.target.value}))} style={inputStyle} /></div>
          <div><label style={{ fontSize:10,color:TH.textMuted,display:'block',marginBottom:4 }}>Protein (g)</label>
            <input type="number" value={form.proteinPer100} onChange={e=>setForm(f=>({...f,proteinPer100:e.target.value}))} style={inputStyle} /></div>
          <div><label style={{ fontSize:10,color:TH.textMuted,display:'block',marginBottom:4 }}>Fat (g)</label>
            <input type="number" value={form.fatPer100} onChange={e=>setForm(f=>({...f,fatPer100:e.target.value}))} style={inputStyle} /></div>
        </div>
        <div><label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500 }}>Default portion (g)</label>
          <input type="number" value={form.defaultGrams} onChange={e=>setForm(f=>({...f,defaultGrams:e.target.value}))} placeholder="e.g. 150" style={{ width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:14,fontFamily:'inherit',boxShadow:TH.glow,boxSizing:'border-box' }} /></div>
        {(form.carbsPer100||form.proteinPer100||form.fatPer100) && (<div style={{ fontSize:12,color:TH.cyan,fontWeight:600 }}>≈ {Math.round(cal100({carbsPer100:parseFloat(form.carbsPer100)||0,proteinPer100:parseFloat(form.proteinPer100)||0,fatPer100:parseFloat(form.fatPer100)||0}))} kcal/100g</div>)}
        <Btn onClick={save} style={{ opacity:form.name.trim()?1:0.4 }}>{modal==='edit'?'Save changes':`Save ${form.type}`}</Btn>
      </div>
    </Modal>)}
  </div>);
}

// ─── LOG TAB ─────────────────────────────────────────────────────────────────
function LogTab({ foods,onFoodsChanged }) {
  const todayDate = todayStr(); const yDate = yesterdayStr();
  const [todayEntries,setTodayEntries] = useState([]);
  const [yesterdayEntries,setYesterdayEntries] = useState([]);
  const [modal,setModal] = useState(null);
  const [pickType,setPickType] = useState('');
  const [search,setSearch] = useState('');
  const [selectedFood,setSelectedFood] = useState(null);
  const [grams,setGrams] = useState('');
  const [time,setTime] = useState('');

  useEffect(()=>{ loadToday(); loadYesterday(); },[]);
  async function loadToday(){ const res=await fetch(`/api/nutrition?date=${todayDate}`); setTodayEntries(await res.json()); }
  async function loadYesterday(){ const res=await fetch(`/api/nutrition?date=${yDate}`); setYesterdayEntries(await res.json()); }

  function openLog() {
    const n = new Date();
    setPickType(''); setSearch(''); setSelectedFood(null); setGrams('');
    setTime(`${pad(n.getHours())}:${pad(n.getMinutes())}`);
    setModal('log');
  }
  function pickFood(f) { setSelectedFood(f); setGrams(String(f.defaultGrams||100)); }

  async function logEntry() {
    if(!selectedFood||!time) return;
    const scaled = scaleFood(selectedFood,grams);
    await fetch('/api/nutrition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      date:todayDate,time,food:selectedFood.name,type:selectedFood.type,
      grams:scaled.grams,carbs:scaled.carbs,protein:scaled.protein,fat:scaled.fat,calories:scaled.calories,
    })});
    setModal(null); loadToday();
  }
  async function logFromYesterday(entry) {
    const n = new Date();
    const match = foods.find(f=>f.name===entry.food&&f.type===entry.type);
    const grams = entry.grams || (match?match.defaultGrams:100) || 100;
    const scaled = match ? scaleFood(match,grams) : {grams,carbs:entry.carbs||0,protein:entry.protein||0,fat:entry.fat||0,calories:entry.calories||0};
    await fetch('/api/nutrition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      date:todayDate,time:`${pad(n.getHours())}:${pad(n.getMinutes())}`,food:entry.food,type:entry.type,
      grams:scaled.grams,carbs:scaled.carbs,protein:scaled.protein,fat:scaled.fat,calories:scaled.calories,
    })});
    loadToday();
  }
  async function deleteEntry(id) { await fetch('/api/nutrition',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}); loadToday(); }

  const totalCal = todayEntries.reduce((s,e)=>s+(e.calories||0),0);
  const totalCarbs = todayEntries.reduce((s,e)=>s+(e.carbs||0),0);
  const totalProtein = todayEntries.reduce((s,e)=>s+(e.protein||0),0);
  const totalFat = todayEntries.reduce((s,e)=>s+(e.fat||0),0);
  const pickerFoods = foods.filter(f=>f.type===pickType&&(!search||f.name.toLowerCase().includes(search.toLowerCase())));
  const loggedYesterdayNames = new Set(todayEntries.map(e=>`${e.type}::${e.food}`));
  const yesterdayUnique = [];
  const seen = new Set();
  [...yesterdayEntries].sort((a,b)=>a.time.localeCompare(b.time)).forEach(e=>{ const key=`${e.type}::${e.food}`; if(!seen.has(key)){ seen.add(key); yesterdayUnique.push(e); } });

  return (<div>
    <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:'1.25rem' }}>
      <StatCard label="Calories" value={totalCal} sub="today" />
      <StatCard label="Carbs" value={`${Math.round(totalCarbs)}g`} />
      <StatCard label="Protein" value={`${Math.round(totalProtein)}g`} />
      <StatCard label="Fat" value={`${Math.round(totalFat)}g`} />
    </div>

    <Btn onClick={openLog} style={{ width:'100%',fontSize:15,padding:'14px',marginBottom:'1.25rem' }}>+ Log food</Btn>

    {yesterdayUnique.length>0 && (<div style={{ marginBottom:'1.25rem' }}>
      <div style={{ fontSize:12,color:TH.textMuted,marginBottom:8,fontWeight:500 }}>Copy from yesterday</div>
      <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
        {yesterdayUnique.map((e,i)=>(<div key={i} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:TH.cardAlt,borderRadius:TH.radiusSm,border:`1px solid ${TH.border}` }}>
          <div style={{ minWidth:0,flex:1 }}>
            <span style={{ fontSize:13,color:TH.text }}>{e.food}</span>
            <span style={{ fontSize:10,color:e.type==='snack'?TH.purple:TH.pink,fontWeight:600,marginLeft:8,textTransform:'uppercase' }}>{e.type}</span>
          </div>
          <button onClick={()=>logFromYesterday(e)} style={{ background:'rgba(77,212,255,0.08)',border:`1px solid ${TH.borderMed}`,color:TH.cyan,fontSize:13,fontWeight:700,cursor:'pointer',padding:'6px 12px',borderRadius:8,fontFamily:'inherit',flexShrink:0 }}>+ Log</button>
        </div>))}
      </div>
    </div>)}

    <div style={{ fontSize:12,color:TH.textMuted,marginBottom:8,fontWeight:500 }}>Today</div>
    {todayEntries.length===0 && <div style={{ textAlign:'center',padding:'1.5rem',color:TH.textMuted,fontSize:14 }}>Nothing logged today</div>}
    {[...todayEntries].sort((a,b)=>a.time.localeCompare(b.time)).map((e,i)=>(
      <div key={e._id||i} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:TH.card,borderRadius:TH.radiusSm,marginBottom:6,border:`1px solid ${TH.border}` }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,minWidth:0,flex:1 }}>
          <span style={{ fontSize:13,fontWeight:700,color:TH.cyan,fontFamily:TH.heading,flexShrink:0 }}>{minsToLabel(timeToMinsN(e.time))}</span>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:14,color:TH.text,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{e.food} <span style={{ color:TH.textMuted,fontWeight:400 }}>· {e.grams||0}g</span></div>
            <div style={{ fontSize:11,color:TH.textMuted,marginTop:1 }}>{e.calories||0} kcal · C{e.carbs||0} P{e.protein||0} F{e.fat||0}</div>
          </div>
        </div>
        <button onClick={()=>deleteEntry(e._id)} style={{ background:'none',border:'none',color:TH.textMuted,fontSize:16,cursor:'pointer',padding:'4px 6px',flexShrink:0 }}>x</button>
      </div>
    ))}

    {modal==='log' && (<Modal title="Log food" onClose={()=>setModal(null)}>
      <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
        <div><label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500 }}>Time</label>
          <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={{ width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:16,fontFamily:'inherit',boxShadow:TH.glow }} /></div>
        <div style={{ display:'flex',gap:8 }}>
          {[['meal','Meal'],['snack','Snack']].map(([k,l])=>(<button key={k} onClick={()=>{setPickType(pickType===k?'':k);setSelectedFood(null);setSearch('');}} style={{ flex:1,padding:'12px',borderRadius:TH.radiusSm,border:`2px solid ${pickType===k?(k==='meal'?TH.pink:TH.purple):TH.border}`,background:pickType===k?(k==='meal'?'rgba(236,116,135,0.12)':'rgba(139,92,246,0.12)'):'transparent',color:pickType===k?(k==='meal'?TH.pink:TH.purple):TH.textMuted,fontWeight:700,cursor:'pointer',fontFamily:'inherit',fontSize:14,transition:'all 150ms ease' }}>{l}</button>))}
        </div>
        {pickType && (pickerFoods.length>0 ? (<>
          {foods.filter(f=>f.type===pickType).length>6 && (<input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{ width:'100%',padding:'8px 12px',borderRadius:10,border:`1px solid ${TH.border}`,background:TH.input,color:TH.text,fontSize:13,fontFamily:'inherit',boxShadow:TH.glow }} />)}
          <div style={{ display:'flex',flexDirection:'column',gap:5,maxHeight:180,overflowY:'auto' }}>
            {pickerFoods.map(f=>{ const sel=selectedFood&&selectedFood._id===f._id; return (<button key={f._id} onClick={()=>pickFood(f)}
              style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 14px',borderRadius:12,border:`1.5px solid ${sel?TH.cyan:TH.borderMed}`,background:sel?'rgba(77,212,255,0.08)':TH.input,color:sel?TH.text:TH.textSec,fontSize:14,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease',textAlign:'left',fontWeight:sel?600:400 }}>
              <span>{f.name}</span><span style={{ fontSize:11,color:TH.textMuted }}>{Math.round(cal100(f))} kcal/100g</span>
            </button>);})}
          </div>
        </>) : (<div style={{ padding:'16px',textAlign:'center',color:TH.textMuted,fontSize:13,background:TH.input,borderRadius:12,border:`1px solid ${TH.border}` }}>No saved {pickType}s yet — add one in the Foods tab</div>))}
        {selectedFood && (<>
          <div><label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500 }}>Amount (g)</label>
            <input type="number" value={grams} onChange={e=>setGrams(e.target.value)} style={{ width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:16,fontWeight:600,textAlign:'center',fontFamily:'inherit',boxShadow:TH.glow }} /></div>
          <div style={{ fontSize:13,color:TH.cyan,fontWeight:600,textAlign:'center' }}>≈ {scaleFood(selectedFood,grams).calories} kcal · C{scaleFood(selectedFood,grams).carbs} P{scaleFood(selectedFood,grams).protein} F{scaleFood(selectedFood,grams).fat}</div>
          <Btn onClick={logEntry}>Log {selectedFood.name}</Btn>
        </>)}
      </div>
    </Modal>)}
  </div>);
}

// ─── NUTRITION CALENDAR TAB ──────────────────────────────────────────────────
function NutritionCalendarTab() {
  const now = new Date();
  const [year,setYear] = useState(now.getFullYear()); const [month,setMonth] = useState(now.getMonth());
  const [monthData,setMonthData] = useState([]);
  const [detailDay,setDetailDay] = useState(null);
  const [detailEntries,setDetailEntries] = useState([]);

  useEffect(()=>{ loadMonth(); },[year,month]);
  async function loadMonth() {
    const prevMonth0=month===0?11:month-1; const prevYear=month===0?year-1:year;
    const nextMonth0=month===11?0:month+1; const nextYear=month===11?year+1:year;
    const [cur,prev,next] = await Promise.all([
      fetch(`/api/nutrition?year=${year}&month=${month+1}`).then(r=>r.json()),
      fetch(`/api/nutrition?year=${prevYear}&month=${prevMonth0+1}`).then(r=>r.json()),
      fetch(`/api/nutrition?year=${nextYear}&month=${nextMonth0+1}`).then(r=>r.json()),
    ]);
    setMonthData([...prev,...cur,...next]);
  }
  async function openDayDetail(dateStr) { const res=await fetch(`/api/nutrition?date=${dateStr}`); setDetailDay(dateStr); setDetailEntries(await res.json()); }
  function prevMonth(){ if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
  function nextMonth(){ if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }
  const monthLabel = new Date(year,month).toLocaleString('default',{month:'long',year:'numeric'});

  const byDate = {}; monthData.forEach(e=>{ if(!byDate[e.date]) byDate[e.date]=[]; byDate[e.date].push(e); });
  function dayTotal(dateStr) { return (byDate[dateStr]||[]).reduce((s,e)=>s+(e.calories||0),0); }
  const loggedDays = Object.keys(byDate).filter(d=>byDate[d].length>0);
  const avgCal = loggedDays.length ? Math.round(loggedDays.reduce((s,d)=>s+dayTotal(d),0)/loggedDays.length) : 0;
  const daysThisMonth = loggedDays.filter(d=>d.startsWith(`${year}-${pad(month+1)}`));

  return (<div>
    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem' }}>
      <button onClick={prevMonth} style={{ background:TH.card,border:`1px solid ${TH.border}`,borderRadius:8,padding:'7px 16px',fontSize:16,color:TH.textSec,cursor:'pointer' }}>&#8249;</button>
      <span style={{ fontWeight:700,fontSize:15,fontFamily:TH.heading,color:TH.text }}>{monthLabel}</span>
      <button onClick={nextMonth} style={{ background:TH.card,border:`1px solid ${TH.border}`,borderRadius:8,padding:'7px 16px',fontSize:16,color:TH.textSec,cursor:'pointer' }}>&#8250;</button></div>
    <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:'1.5rem' }}>
      <StatCard label="Days logged" value={daysThisMonth.length} sub="this month" />
      <StatCard label="Avg calories" value={avgCal} sub="per logged day" />
    </div>
    <CalendarGrid year={year} month={month}
      getCellStyle={(day,dateStr)=>{ const entries=byDate[dateStr]||[]; if(entries.length===0) return {border:`1px solid ${TH.border}`,color:TH.textMuted,borderRadius:TH.radiusSm}; return {background:TH.cardAlt,color:TH.cyan,border:`1px solid ${TH.borderMed}`,borderRadius:TH.radiusSm,fontWeight:600,bottomLabel:`${dayTotal(dateStr)}`}; }}
      onDayClick={day=>openDayDetail(toDateStr(year,month,day))} />
    {detailDay && (<div style={{ background:TH.card,borderRadius:TH.radiusSm,padding:'14px',border:`1px solid ${TH.border}`,marginBottom:'1rem',position:'relative',overflow:'hidden' }}>
      <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg, transparent, ${TH.borderGlow}, transparent)` }} />
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
        <span style={{ fontWeight:700,fontSize:14,fontFamily:TH.heading,color:TH.text }}>{fmtDate(detailDay)}</span>
        <button onClick={()=>{setDetailDay(null);setDetailEntries([]);}} style={{ background:'none',border:'none',color:TH.textMuted,fontSize:18,cursor:'pointer' }}>x</button></div>
      {detailEntries.length===0 && <div style={{ color:TH.textMuted,fontSize:13 }}>No food logged</div>}
      {[...detailEntries].sort((a,b)=>a.time.localeCompare(b.time)).map((e,i)=>(
        <div key={e._id||i} style={{ display:'flex',alignItems:'center',gap:10,padding:'6px 0',borderBottom:i<detailEntries.length-1?`1px solid ${TH.border}`:'none' }}>
          <span style={{ fontSize:12,fontWeight:700,color:TH.cyan,fontFamily:TH.heading,flexShrink:0,width:56 }}>{minsToLabel(timeToMinsN(e.time))}</span>
          <span style={{ fontSize:13,color:TH.text,flex:1 }}>{e.food} <span style={{ color:TH.textMuted }}>· {e.grams||0}g</span></span>
          <span style={{ fontSize:12,color:TH.textSec,fontWeight:600 }}>{e.calories||0} kcal</span>
        </div>
      ))}
      {detailEntries.length>0 && (<div style={{ marginTop:8,paddingTop:8,borderTop:`1px solid ${TH.border}`,fontSize:12,color:TH.textMuted }}>
        Total: <strong style={{ color:TH.text }}>{detailEntries.reduce((s,e)=>s+(e.calories||0),0)} kcal</strong>
        {' · '}C{Math.round(detailEntries.reduce((s,e)=>s+(e.carbs||0),0))} P{Math.round(detailEntries.reduce((s,e)=>s+(e.protein||0),0))} F{Math.round(detailEntries.reduce((s,e)=>s+(e.fat||0),0))}
      </div>)}
    </div>)}
  </div>);
}

// ─── NUTRITION SECTION SHELL ─────────────────────────────────────────────────
const NUTR_TABS=[{key:'foods',label:'Foods'},{key:'log',label:'Log'},{key:'calendar',label:'Calendar'}];
function NutritionSection() {
  const [tab,setTab] = useState('log');
  const [foods,setFoods] = useState([]);
  useEffect(()=>{ loadFoods(); },[]);
  async function loadFoods() { const res=await fetch('/api/saved-foods'); setFoods(await res.json()); }
  return (<div>
    <div style={{ display:'flex',gap:4,marginBottom:'1.5rem',background:TH.card,borderRadius:TH.radiusSm,padding:4,border:`1px solid ${TH.border}` }}>
      {NUTR_TABS.map(t=>(<button key={t.key} onClick={()=>setTab(t.key)} style={{ flex:1,padding:'10px 0',background:tab===t.key?TH.pink:'transparent',border:'none',borderRadius:10,color:tab===t.key?'#fff':TH.textMuted,fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease',boxShadow:tab===t.key?'0 0 12px rgba(236,116,135,0.3)':'none' }}>{t.label}</button>))}</div>
    {tab==='foods' && <FoodsTab foods={foods} onChanged={loadFoods} />}
    {tab==='log' && <LogTab foods={foods} onFoodsChanged={loadFoods} />}
    {tab==='calendar' && <NutritionCalendarTab />}
  </div>);
}

// ─── APP SHELL ──────────────────────────────────────────────────────────────
export default function App() {
  const [section,setSection]=useState('gym');
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
        {section==='tasks'&&<DailyTasksSection />}
      </div></div>
  </>);
}
