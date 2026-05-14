import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// ─── THEME ────────────────────────────────────────────────────────────────────
const TH = {
  bg:         '#141416',
  card:       '#1E1E22',
  cardAlt:    '#252529',
  input:      '#2A2A2E',
  text:       '#F0EDE8',
  textSec:    '#8B8B8F',
  textMuted:  '#5A5A5E',
  accent:     '#D97706',
  success:    '#B7D48A',
  border:     'rgba(255,255,255,0.06)',
  borderMed:  'rgba(255,255,255,0.10)',
  shadow:     '0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.2)',
  shadowSm:   '0 1px 3px rgba(0,0,0,0.25)',
  radius:     20,
  radiusSm:   12,
  heading:    "'Satoshi', sans-serif",
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const WORKOUT_TYPES = [
  { key: 'L',  label: 'Legs',            color: '#FFCBE1', textColor: '#8A2050', hasIntensity: true  },
  { key: 'B',  label: 'Back & Biceps',   color: '#BCD8EC', textColor: '#1A4A7A', hasIntensity: true  },
  { key: 'C',  label: 'Chest & Triceps', color: '#DCCCEC', textColor: '#5A2D70', hasIntensity: true  },
  { key: 'D',  label: 'Delts',           color: '#F9E1A8', textColor: '#6B4A0A', hasIntensity: true  },
  { key: 'R',  label: 'Rowing',          color: '#D6E5BD', textColor: '#3B5A1A', hasIntensity: false },
  { key: 'OC', label: 'Other Cardio',    color: '#FFDAB4', textColor: '#7A3A10', hasIntensity: false },
];

const DEFAULT_EXERCISES = {
  L:  ['Squats','Smith Squats','Leg Extensions','Single Leg KB Squats','KB Lunges','Lying Ham Curl','Seated Leg Curl'],
  B:  ['Lying EZ Rows','Wide Grip Pulldowns','Seated Cable Row','Close Grip Pulldowns','Dbell Rows','Fixed Pulldowns','Assisted Pull Ups','Dbell Curls','Standing EZ Curls','EZ Preacher Curls','Preacher Dbell Curls','Cable Curls','Single Cable Curls','21s'],
  C:  ['Incline Bench Press','Incline Dbell Press','Pec Dec','Incline Smith Press','Flye Machine','Flat Dbell Press','Cable Cross Overs','Bench Dips','Dbell Raises','KB Kick Back','DB Kick Backs','Cable Pushdowns','Tri Bar Push Downs','Close Grip Bench'],
  D:  ['Dbell Press','Side Raises','Leaning Side Raises','Bar Raises','KB Swings','B.O Dbell Rows','Single Arm B.O Rows','EZ Rear Rows'],
  R:  [],
  OC: [],
};

const HEAT = {
  green1: '#B7D48A', green1Text: '#2A4A10',
  green2: '#8BBF4A', green2Text: '#1E3A08',
  amber:  '#D97706', amberText:  '#FFF8EE',
  red:    '#DC4A47', redText:    '#FFF0F0',
  none:   '#252529', noneText:   '#5A5A5E',
};

const DW_SUBJECTS = { A: 'Ozzy Wizzpop', B: 'Reading', C: 'Magic study' };
const DW_COLORS   = { A: '#B7D48A', B: '#7CB3D4', C: '#D4A0C0' };

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getDaysInMonth(y, m)    { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y,m) { return new Date(y, m, 1).getDay(); }
function pad(n) { return String(n).padStart(2, '0'); }
function toDateStr(y, m, d) { return `${y}-${pad(m+1)}-${pad(d)}`; }
function todayStr() { const n=new Date(); return `${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())}`; }
function fmtDate(str) { if(!str) return ''; const [y,m,d]=str.split('-'); return new Date(y,m-1,d).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}); }

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'flex-start',justifyContent:'center',zIndex:1000,overflowY:'auto',padding:'1rem' }}>
      <div style={{ background:TH.card,borderRadius:TH.radius,padding:'1.5rem',width:360,maxWidth:'95vw',marginTop:'2rem',marginBottom:'2rem',boxShadow:TH.shadow,border:`1px solid ${TH.border}` }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem' }}>
          <span style={{ fontWeight:700,fontSize:17,fontFamily:TH.heading,color:TH.text }}>{title}</span>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:22,color:TH.textSec,padding:'0 4px',cursor:'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background:TH.card,borderRadius:TH.radiusSm,padding:'14px 16px',boxShadow:TH.shadowSm,border:`1px solid ${TH.border}` }}>
      <div style={{ fontSize:11,color:TH.textSec,marginBottom:5,fontWeight:500,textTransform:'uppercase',letterSpacing:'0.05em' }}>{label}</div>
      <div style={{ fontSize:24,fontWeight:800,fontFamily:TH.heading,color:TH.text }}>{value}</div>
      {sub && <div style={{ fontSize:11,color:TH.textMuted,marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function Btn({ onClick, children, variant='primary', style={} }) {
  const base = { border:'none',borderRadius:TH.radiusSm,padding:'12px 18px',fontWeight:600,fontSize:14,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease' };
  const variants = {
    primary:   { background:TH.accent,color:'#fff' },
    secondary: { background:'transparent',border:`1px solid ${TH.borderMed}`,color:TH.textSec },
    danger:    { background:'transparent',border:'1px solid rgba(220,74,71,0.3)',color:'#DC4A47' },
    ghost:     { background:'none',border:'none',color:TH.textSec,padding:'6px 10px' },
  };
  return <button onClick={onClick} style={{ ...base,...variants[variant],...style }}>{children}</button>;
}

const TOP_SECTIONS = [
  { key:'gym',       label:'GYM'       },
  { key:'nutrition', label:'NUTRITION'  },
  { key:'habits',    label:'HABITS'     },
];

// ─── CALENDAR GRID ────────────────────────────────────────────────────────────
function CalendarGrid({ year, month, getCellStyle, onDayClick }) {
  const days = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  return (
    <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:5,marginBottom:'1.5rem' }}>
      {['S','M','T','W','T','F','S'].map((d,i) => (
        <div key={i} style={{ textAlign:'center',fontSize:11,color:TH.textMuted,paddingBottom:6,fontWeight:600 }}>{d}</div>
      ))}
      {Array.from({ length:firstDay }).map((_,i) => <div key={`e${i}`} />)}
      {Array.from({ length:days },(_,i) => i+1).map(day => {
        const s = getCellStyle(day);
        return (
          <div key={day} onClick={() => onDayClick(day)}
            style={{ aspectRatio:'1',borderRadius:s.borderRadius||TH.radiusSm,border:s.border||'none',background:s.background||TH.cardAlt,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:s.color||TH.textMuted,fontWeight:s.fontWeight||500,cursor:'pointer',position:'relative',transition:'transform 150ms ease' }}>
            {day}
            {s.letter && <span style={{ position:'absolute',bottom:2,left:3,fontSize:8,fontWeight:700,color:s.color,opacity:0.85 }}>{s.letter}</span>}
            {s.intensity && <span style={{ position:'absolute',bottom:2,right:3,fontSize:8,fontWeight:700,color:s.color,opacity:0.85 }}>{s.intensity}</span>}
          </div>
        );
      })}
    </div>
  );
}


// ─── GYM: CALENDAR TAB ────────────────────────────────────────────────────────
function GymCalendar({ year, month }) {
  const [data, setData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [modal, setModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [form, setForm] = useState({ type:'L' });
  const [editSession, setEditSession] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetch(`/api/workouts?year=${year}&month=${month+1}`).then(r=>r.json()).then(setData);
    fetch('/api/exercise-log').then(r=>r.json()).then(setLogs);
  }, [year,month]);

  const byDate = {}; data.forEach(d => { byDate[d.date] = d; });
  const logByDate = {}; logs.forEach(l => { logByDate[l.date] = l; });

  async function save() {
    await fetch('/api/workouts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ date:modal, type:form.type, intensity: null }) });
    setModal(null);
    fetch(`/api/workouts?year=${year}&month=${month+1}`).then(r=>r.json()).then(setData);
  }
  async function remove() {
    await fetch('/api/workouts', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ date:modal }) });
    setModal(null);
    fetch(`/api/workouts?year=${year}&month=${month+1}`).then(r=>r.json()).then(setData);
    fetch('/api/exercise-log').then(r=>r.json()).then(setLogs);
  }
  async function saveEditedSession() {
    if (!editSession) return;
    await fetch('/api/exercise-log', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...editSession, noData:false }) });
    setDetailModal(null); setEditSession(null); setEditing(false);
    fetch('/api/exercise-log').then(r=>r.json()).then(setLogs);
  }
  function openDay(day) {
    const dateStr = toDateStr(year,month,day);
    const entry = byDate[dateStr]; const log = logByDate[dateStr];
    if (entry && log && !log.noData) { setEditSession(JSON.parse(JSON.stringify(log))); setDetailModal(dateStr); }
    else { setForm(entry ? { type:entry.type } : { type:'L' }); setModal(dateStr); }
  }
  function updateEditSet(exIdx, setIdx, field, value) {
    setEditSession(prev => ({ ...prev, exercises: prev.exercises.map((ex,i) => i !== exIdx ? ex : { ...ex, sets: ex.sets.map((s,j) => j !== setIdx ? s : { ...s, [field]: value }) }) }));
  }
  function addEditSet(exIdx) {
    setEditSession(prev => ({ ...prev, exercises: prev.exercises.map((ex,i) => i !== exIdx ? ex : { ...ex, sets: [...ex.sets, {weight:'',reps:''}] }) }));
  }
  function startEditing() {
    setEditSession(prev => ({ ...prev, exercises: (prev.exercises||[]).map(ex => ({ ...ex, sets: (!ex.sets || ex.sets.length < 3) ? [...(ex.sets||[]), ...Array.from({length: 3 - (ex.sets||[]).length}, () => ({weight:'',reps:''}))] : ex.sets })) }));
    setEditing(true);
  }

  return (
    <div>
      <CalendarGrid year={year} month={month}
        getCellStyle={day => {
          const entry = byDate[toDateStr(year,month,day)];
          if (!entry) return { border:`1px solid ${TH.border}`, color:TH.textMuted, borderRadius:TH.radiusSm };
          const wt = WORKOUT_TYPES.find(w => w.key === entry.type);
          return { background: wt?.color||'#888', color: wt?.textColor||'#fff', borderRadius:TH.radiusSm, fontWeight:600, letter: entry.type, intensity: entry.intensity||null };
        }}
        onDayClick={day => openDay(day)}
      />
      <div style={{ display:'flex',flexWrap:'wrap',gap:12,marginBottom:'1.5rem' }}>
        {WORKOUT_TYPES.map(w => (
          <div key={w.key} style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:TH.textSec }}>
            <div style={{ width:12,height:12,borderRadius:4,background:w.color }} />
            <span style={{ fontWeight:700,color:TH.text }}>{w.key}</span> {w.label}
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={`Log workout — ${fmtDate(modal)}`} onClose={() => setModal(null)}>
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            <div>
              <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:8,fontWeight:500 }}>Workout type</label>
              <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                {WORKOUT_TYPES.map(w => (
                  <button key={w.key} onClick={() => setForm(f => ({ ...f, type:w.key }))}
                    style={{ display:'flex',alignItems:'center',gap:10,padding:'11px 14px',borderRadius:TH.radiusSm,border:`2px solid ${form.type===w.key?w.color:TH.border}`,background:form.type===w.key?w.color+'20':TH.cardAlt,textAlign:'left',cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease' }}>
                    <span style={{ width:30,height:30,borderRadius:8,background:w.color,display:'flex',alignItems:'center',justifyContent:'center',color:w.textColor,fontSize:12,fontWeight:700,flexShrink:0 }}>{w.key}</span>
                    <span style={{ fontSize:14,color:form.type===w.key?TH.text:TH.textSec,fontWeight:form.type===w.key?600:400 }}>{w.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <Btn onClick={save}>Save</Btn>
            {byDate[modal] && <Btn onClick={remove} variant="danger">Remove entry</Btn>}
          </div>
        </Modal>
      )}

      {detailModal && editSession && (
        <Modal title={`Session — ${fmtDate(detailModal)}`} onClose={() => { setDetailModal(null); setEditSession(null); setEditing(false); }}>
          {(() => {
            const wt = WORKOUT_TYPES.find(w => w.key === editSession.workoutType);
            return (
              <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:2 }}>
                  <span style={{ background:wt?.color,color:wt?.textColor,borderRadius:8,fontSize:12,fontWeight:700,padding:'5px 12px' }}>{editSession.workoutType}</span>
                  <span style={{ fontWeight:700,fontSize:15,fontFamily:TH.heading,color:TH.text }}>{wt?.label}</span>
                  {editSession.intensity && <span style={{ fontSize:12,color:TH.textSec }}>Intensity {editSession.intensity}</span>}
                </div>
                {!editing ? (
                  <>
                    {editSession.workoutType === 'R' && <div style={{ fontSize:14,color:TH.textSec,padding:'6px 0' }}>{editSession.rowingType === 'time' ? `${editSession.rowingValue} minutes` : `${editSession.rowingValue} metres`}</div>}
                    {editSession.workoutType === 'OC' && <div style={{ fontSize:14,color:TH.textSec,padding:'6px 0' }}>{editSession.cardioNote}</div>}
                    {editSession.workoutType !== 'R' && editSession.workoutType !== 'OC' && (editSession.exercises||[]).map((ex,exIdx) => {
                      const filledSets = ex.sets.filter(s=>s.reps||s.weight);
                      if (filledSets.length === 0) return null;
                      return (
                        <div key={exIdx} style={{ padding:'8px 0',borderBottom:`1px solid ${TH.border}` }}>
                          <div style={{ fontWeight:600,fontSize:13,color:TH.text,marginBottom:5 }}>{ex.name}</div>
                          <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
                            {filledSets.map((s,i) => <span key={i} style={{ background:TH.cardAlt,borderRadius:6,padding:'4px 10px',fontSize:12,color:TH.textSec }}>{s.reps} × {s.weight}kg</span>)}
                          </div>
                        </div>
                      );
                    })}
                    {editSession.sessionNotes && (
                      <div style={{ padding:'8px 0',borderTop:`1px solid ${TH.border}`,marginTop:2 }}>
                        <div style={{ fontSize:11,color:TH.textMuted,marginBottom:3 }}>Notes</div>
                        <div style={{ fontSize:13,color:TH.textSec }}>{editSession.sessionNotes}</div>
                      </div>
                    )}
                    <Btn onClick={startEditing} variant="secondary" style={{ marginTop:4 }}>Edit session</Btn>
                  </>
                ) : (
                  <>
                    {editSession.workoutType === 'R' && (
                      <div>
                        <div style={{ fontSize:12,color:TH.textSec,marginBottom:4 }}>{editSession.rowingType === 'time' ? 'Time (minutes)' : 'Distance (metres)'}</div>
                        <input type="number" value={editSession.rowingValue||''} onChange={e => setEditSession(prev => ({ ...prev, rowingValue:e.target.value }))} style={{ width:'100%',padding:'8px',borderRadius:8,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:14,fontFamily:'inherit' }} />
                      </div>
                    )}
                    {editSession.workoutType === 'OC' && (
                      <div><textarea value={editSession.cardioNote||''} onChange={e => setEditSession(prev => ({ ...prev, cardioNote:e.target.value }))} rows={3} style={{ width:'100%',padding:'8px',borderRadius:8,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:14,fontFamily:'inherit',resize:'vertical' }} /></div>
                    )}
                    {editSession.workoutType !== 'R' && editSession.workoutType !== 'OC' && (editSession.exercises||[]).map((ex,exIdx) => (
                      <div key={exIdx} style={{ padding:'8px 0',borderBottom:`1px solid ${TH.border}` }}>
                        <div style={{ fontWeight:600,fontSize:13,color:TH.text,marginBottom:6 }}>{ex.name}</div>
                        {ex.sets.map((set,setIdx) => (
                          <div key={setIdx} style={{ display:'flex',alignItems:'center',gap:6,marginBottom:5 }}>
                            <span style={{ fontSize:11,color:TH.textMuted,width:22,flexShrink:0 }}>S{setIdx+1}</span>
                            <input type="number" value={set.weight} onChange={e => updateEditSet(exIdx,setIdx,'weight',e.target.value)} style={{ width:52,padding:'5px 4px',borderRadius:6,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:13,textAlign:'center',fontFamily:'inherit' }} />
                            <span style={{ fontSize:11,color:TH.textMuted }}>kg ×</span>
                            <input type="number" value={set.reps} onChange={e => updateEditSet(exIdx,setIdx,'reps',e.target.value)} style={{ width:44,padding:'5px 4px',borderRadius:6,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:13,textAlign:'center',fontFamily:'inherit' }} />
                            <span style={{ fontSize:11,color:TH.textMuted }}>reps</span>
                          </div>
                        ))}
                        <button onClick={() => addEditSet(exIdx)} style={{ fontSize:11,color:TH.textMuted,background:'none',border:`1px dashed ${TH.borderMed}`,borderRadius:6,padding:'5px 10px',cursor:'pointer',width:'100%',marginTop:3,fontFamily:'inherit' }}>+ Add set</button>
                      </div>
                    ))}
                    {editSession.sessionNotes !== undefined && (
                      <div><div style={{ fontSize:11,color:TH.textMuted,marginBottom:3 }}>Notes</div>
                        <textarea value={editSession.sessionNotes||''} onChange={e => setEditSession(prev => ({ ...prev, sessionNotes:e.target.value }))} rows={2} style={{ width:'100%',padding:'8px',borderRadius:8,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:13,fontFamily:'inherit',resize:'vertical' }} />
                      </div>
                    )}
                    <Btn onClick={saveEditedSession}>Save changes</Btn>
                    <Btn onClick={() => setEditing(false)} variant="secondary">Cancel</Btn>
                  </>
                )}
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}

// ─── GYM: LOG TAB ─────────────────────────────────────────────────────────────
function GymLog() {
  const [workouts, setWorkouts] = useState([]); const [logged, setLogged] = useState([]); const [drafts, setDrafts] = useState([]);
  const [session, setSession] = useState(null); const [inactive, setInactive] = useState({}); const [exerciseOrder, setExerciseOrder] = useState({});
  const [showInactive, setShowInactive] = useState(false); const [inactiveBodyPart, setInactiveBodyPart] = useState(null);
  useEffect(() => { loadAll(); }, []);
  async function loadAll() {
    const now = new Date(); const y = now.getFullYear(), m = now.getMonth()+1;
    const [wRes,lRes,dRes,iRes,oRes] = await Promise.all([fetch(`/api/workouts?year=${y}&month=${m}`),fetch('/api/exercise-log'),fetch('/api/exercise-draft'),fetch('/api/inactive-exercises'),fetch('/api/exercise-order')]);
    const [w,l,d,i,o] = await Promise.all([wRes.json(),lRes.json(),dRes.json(),iRes.json(),oRes.json()]);
    setWorkouts(w); setLogged(l); setDrafts(d);
    const iMap = {}; i.forEach(x => { if(!iMap[x.bodyPart]) iMap[x.bodyPart]=[]; iMap[x.bodyPart].push(x); }); setInactive(iMap);
    const oMap = {}; o.forEach(x => { oMap[x.bodyPart] = x.exercises; }); setExerciseOrder(oMap);
  }
  const loggedDates = new Set(logged.map(l => l.date));
  const pending = workouts.filter(w => !loggedDates.has(w.date)).sort((a,b) => b.date.localeCompare(a.date));
  async function markNoData(workout) {
    await fetch('/api/exercise-log', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ date:workout.date, workoutType:workout.type, noData:true, exercises:[] }) }); loadAll();
  }
  function openSession(workout) {
    const draft = drafts.find(d => d.date === workout.date);
    if (draft) { setSession(draft); return; }
    const wt = WORKOUT_TYPES.find(w => w.key === workout.type);
    const inactiveList = inactive[workout.type] || []; const inactiveNames = inactiveList.map(i => i.exercise);
    const savedOrder = exerciseOrder[workout.type]; const defaultList = DEFAULT_EXERCISES[workout.type] || [];
    let orderedList; if (savedOrder) { const extras = defaultList.filter(ex => !savedOrder.includes(ex)); orderedList = [...savedOrder, ...extras]; } else { orderedList = defaultList; }
    const activeExercises = orderedList.filter(ex => !inactiveNames.includes(ex));
    setSession({ date:workout.date, workoutType:workout.type, workoutLabel:wt?.label||workout.type, intensity:null, exercises:activeExercises.map(name => ({ name, sets:[{weight:'',reps:''},{weight:'',reps:''},{weight:'',reps:''}] })) });
  }
  async function saveSession(sessionData, complete) {
    if (complete) {
      await fetch('/api/exercise-log', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...sessionData, noData:false }) });
      if (sessionData.intensity) { await fetch('/api/workouts', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ date:sessionData.date, type:sessionData.workoutType, intensity:sessionData.intensity }) }); }
      await fetch('/api/exercise-draft', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ date:sessionData.date }) });
      setSession(null); loadAll();
    } else {
      await fetch('/api/exercise-draft', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(sessionData) }); setSession(null); loadAll();
    }
  }
  async function moveToInactive(bodyPart, exercise) { await fetch('/api/inactive-exercises', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ bodyPart, exercise }) }); loadAll(); }
  async function restoreFromInactive(id) { await fetch('/api/inactive-exercises', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) }); loadAll(); }
  async function deleteInactive(id) { await fetch('/api/inactive-exercises', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, permanent:true }) }); loadAll(); }

  if (session) { return <SessionLogger session={session} onSave={saveSession} onMoveInactive={moveToInactive} inactive={inactive} allLogs={logged} />; }
  return (
    <div>
      <div style={{ fontSize:12,color:TH.textMuted,marginBottom:'1rem',fontWeight:500 }}>Workouts waiting to be logged</div>
      {pending.length === 0 && <div style={{ textAlign:'center',padding:'2.5rem',color:TH.textMuted,fontSize:14 }}>No workouts waiting to be logged</div>}
      {pending.map(w => {
        const wt = WORKOUT_TYPES.find(x => x.key === w.type); const draft = drafts.find(d => d.date === w.date);
        return (
          <div key={w.date} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',background:TH.card,borderRadius:TH.radiusSm,marginBottom:8,boxShadow:TH.shadowSm,border:`1px solid ${TH.border}` }}>
            <div>
              <div style={{ fontSize:13,fontWeight:600,color:TH.text }}>{fmtDate(w.date)}</div>
              <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:4 }}>
                <span style={{ background:wt?.color,color:wt?.textColor,borderRadius:6,fontSize:11,fontWeight:700,padding:'2px 7px' }}>{w.type}</span>
                <span style={{ fontSize:12,color:TH.textSec }}>{wt?.label}</span>
                {draft && <span style={{ fontSize:11,color:TH.accent,fontWeight:600 }}>● in progress</span>}
              </div>
            </div>
            <div style={{ display:'flex',gap:8 }}>
              <Btn onClick={() => openSession(w)} style={{ padding:'8px 16px',fontSize:13 }}>Record</Btn>
              <Btn onClick={() => markNoData(w)} variant="secondary" style={{ padding:'8px 14px',fontSize:13 }}>No data</Btn>
            </div>
          </div>
        );
      })}
      {showInactive && inactiveBodyPart && (
        <Modal title={`Inactive — ${WORKOUT_TYPES.find(w=>w.key===inactiveBodyPart)?.label}`} onClose={() => setShowInactive(false)}>
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {(inactive[inactiveBodyPart]||[]).length === 0 && <div style={{ color:TH.textMuted,fontSize:13 }}>No inactive exercises</div>}
            {(inactive[inactiveBodyPart]||[]).map(ex => (
              <div key={ex._id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:TH.cardAlt,borderRadius:8 }}>
                <span style={{ fontSize:14,color:TH.text }}>{ex.exercise}</span>
                <div style={{ display:'flex',gap:8 }}>
                  <Btn onClick={() => { restoreFromInactive(ex._id); setShowInactive(false); }} style={{ padding:'6px 12px',fontSize:12 }}>Add back</Btn>
                  <Btn onClick={() => deleteInactive(ex._id)} variant="danger" style={{ padding:'6px 12px',fontSize:12 }}>Delete</Btn>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── SESSION LOGGER ───────────────────────────────────────────────────────────
function SessionLogger({ session, onSave, onMoveInactive, inactive, allLogs }) {
  const [exercises, setExercises] = useState(session.exercises || []);
  const [intensity, setIntensity] = useState(session.intensity || '3');
  const [showInactive, setShowInactive] = useState(false);
  const [previousData, setPreviousData] = useState({});
  const wt = WORKOUT_TYPES.find(w => w.key === session.workoutType);
  const [rowingType, setRowingType] = useState(session.rowingType || 'time');
  const [rowingValue, setRowingValue] = useState(session.rowingValue || '');
  const [cardioNote, setCardioNote] = useState(session.cardioNote || '');
  const [sessionNotes, setSessionNotes] = useState(session.sessionNotes || '');

  useEffect(() => {
    if (!allLogs || session.workoutType === 'R' || session.workoutType === 'OC') return;
    const sameBPLogs = allLogs.filter(l => l.workoutType === session.workoutType && !l.noData && l.date !== session.date).sort((a,b) => b.date.localeCompare(a.date));
    if (sameBPLogs.length === 0) return;
    const prevMap = {}; (sameBPLogs[0].exercises || []).forEach(ex => { prevMap[ex.name] = { sets: ex.sets, date: sameBPLogs[0].date }; });
    setPreviousData(prevMap);
  }, [allLogs, session.workoutType, session.date]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const timer = setTimeout(() => {
      const draftData = { date:session.date, workoutType:session.workoutType, workoutLabel:session.workoutLabel, intensity:wt?.hasIntensity?intensity:null, exercises:session.workoutType==='R'?[]:session.workoutType==='OC'?[]:exercises, rowingType:session.workoutType==='R'?rowingType:null, rowingValue:session.workoutType==='R'?rowingValue:null, cardioNote:session.workoutType==='OC'?cardioNote:null, sessionNotes };
      fetch('/api/exercise-draft', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(draftData) });
    }, 1500);
    return () => clearTimeout(timer);
  }, [exercises, intensity, rowingType, rowingValue, cardioNote, sessionNotes]);

  function updateSet(exIdx, setIdx, field, value) { setExercises(prev => prev.map((ex,i) => i!==exIdx ? ex : { ...ex, sets: ex.sets.map((s,j) => j!==setIdx ? s : { ...s, [field]: value }) })); }
  function addSet(exIdx) { setExercises(prev => prev.map((ex,i) => i!==exIdx ? ex : { ...ex, sets: [...ex.sets, {weight:'',reps:''}] })); }
  function removeSet(exIdx, setIdx) { setExercises(prev => prev.map((ex,i) => i!==exIdx ? ex : { ...ex, sets: ex.sets.filter((_,j) => j!==setIdx) })); }
  function moveToInactive(exIdx) { const ex = exercises[exIdx]; onMoveInactive(session.workoutType, ex.name); setExercises(prev => prev.filter((_,i) => i !== exIdx)); }
  function moveExercise(fromIdx, direction) {
    const toIdx = fromIdx + direction; if (toIdx < 0 || toIdx >= exercises.length) return;
    setExercises(prev => { const updated = [...prev]; [updated[fromIdx], updated[toIdx]] = [updated[toIdx], updated[fromIdx]];
      fetch('/api/exercise-order', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ bodyPart: session.workoutType, exercises: updated.map(ex => ex.name) }) });
      return updated; });
  }
  function getSessionData() { return { date:session.date, workoutType:session.workoutType, workoutLabel:session.workoutLabel, intensity:wt?.hasIntensity?intensity:null, exercises:session.workoutType==='R'?[]:session.workoutType==='OC'?[]:exercises, rowingType:session.workoutType==='R'?rowingType:null, rowingValue:session.workoutType==='R'?rowingValue:null, cardioNote:session.workoutType==='OC'?cardioNote:null, sessionNotes }; }
  const inactiveList = inactive[session.workoutType] || [];

  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:'1.25rem' }}>
        <span style={{ background:wt?.color,color:wt?.textColor,borderRadius:8,fontSize:12,fontWeight:700,padding:'5px 12px' }}>{session.workoutType}</span>
        <div>
          <div style={{ fontWeight:700,fontSize:18,fontFamily:TH.heading,color:TH.text }}>{session.workoutLabel}</div>
          <div style={{ fontSize:12,color:TH.textMuted }}>{fmtDate(session.date)}</div>
        </div>
      </div>
      {wt?.hasIntensity && (
        <div style={{ marginBottom:'1.5rem' }}>
          <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:8,fontWeight:500 }}>Intensity</label>
          <div style={{ display:'flex',gap:8 }}>
            {['1','2','3'].map(n => (
              <button key={n} onClick={() => setIntensity(n)} style={{ flex:1,padding:'11px',borderRadius:TH.radiusSm,border:`2px solid ${intensity===n?TH.accent:TH.border}`,background:intensity===n?TH.accent:'transparent',fontWeight:700,fontSize:16,color:intensity===n?'#fff':TH.textMuted,cursor:'pointer',fontFamily:TH.heading,transition:'all 150ms ease' }}>{n}</button>
            ))}
          </div>
        </div>
      )}
      {session.workoutType === 'R' && (
        <div style={{ marginBottom:'1.5rem' }}>
          <div style={{ display:'flex',gap:8,marginBottom:12 }}>
            {['time','distance'].map(t => (
              <button key={t} onClick={() => setRowingType(t)} style={{ flex:1,padding:'11px',borderRadius:TH.radiusSm,border:`2px solid ${rowingType===t?'#D6E5BD':TH.border}`,background:rowingType===t?'#D6E5BD20':'transparent',color:rowingType===t?'#D6E5BD':TH.textMuted,fontWeight:600,cursor:'pointer',fontFamily:'inherit',fontSize:14,transition:'all 150ms ease' }}>
                {t === 'time' ? '⏱ Time (mins)' : '📏 Distance (m)'}
              </button>
            ))}
          </div>
          <input type="number" value={rowingValue} onChange={e => setRowingValue(e.target.value)} placeholder={rowingType === 'time' ? 'Minutes rowed' : 'Metres rowed'} style={{ width:'100%',padding:'12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:16,fontFamily:'inherit' }} />
        </div>
      )}
      {session.workoutType === 'OC' && (
        <div style={{ marginBottom:'1.5rem' }}>
          <textarea value={cardioNote} onChange={e => setCardioNote(e.target.value)} placeholder="Describe your cardio session..." rows={4} style={{ width:'100%',padding:'12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:14,fontFamily:'inherit',resize:'vertical' }} />
        </div>
      )}
      {session.workoutType !== 'R' && session.workoutType !== 'OC' && (
        <>
          {inactiveList.length > 0 && (
            <button onClick={() => setShowInactive(!showInactive)} style={{ fontSize:12,color:TH.textMuted,background:TH.cardAlt,border:'none',borderRadius:8,padding:'7px 14px',cursor:'pointer',marginBottom:'1rem',fontFamily:'inherit',fontWeight:500 }}>
              {showInactive ? 'Hide' : 'View'} INACTIVE exercises ({inactiveList.length})
            </button>
          )}
          {showInactive && (
            <div style={{ background:TH.card,border:`1px solid ${TH.border}`,borderRadius:TH.radiusSm,padding:'12px',marginBottom:'1rem' }}>
              <div style={{ fontSize:12,color:TH.textMuted,marginBottom:8,fontWeight:500 }}>Inactive exercises</div>
              {inactiveList.map(ex => (
                <div key={ex._id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:`1px solid ${TH.border}` }}>
                  <span style={{ fontSize:13,color:TH.text }}>{ex.exercise}</span>
                  <button onClick={() => { fetch('/api/inactive-exercises',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:ex._id})}).then(()=>{ setExercises(prev=>[...prev,{name:ex.exercise,sets:[{weight:'',reps:''},{weight:'',reps:''},{weight:'',reps:''}]}]); setShowInactive(false); }); }}
                    style={{ fontSize:12,color:TH.success,background:'none',border:`1px solid ${TH.success}`,borderRadius:6,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit' }}>Add back</button>
                </div>
              ))}
            </div>
          )}
          {exercises.map((ex, exIdx) => {
            const prev = previousData[ex.name];
            return (
              <div key={exIdx} style={{ marginBottom:'1.25rem',background:TH.card,borderRadius:TH.radiusSm,padding:'14px 16px',boxShadow:TH.shadowSm,border:`1px solid ${TH.border}` }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                    <div style={{ display:'flex',flexDirection:'column',gap:3 }}>
                      <button onClick={() => moveExercise(exIdx,-1)} disabled={exIdx===0} style={{ background:TH.cardAlt,border:`1px solid ${TH.border}`,borderRadius:5,padding:'6px 10px',fontSize:16,color:exIdx===0?TH.textMuted:TH.textSec,cursor:exIdx===0?'default':'pointer',lineHeight:'1' }}>▲</button>
                      <button onClick={() => moveExercise(exIdx,1)} disabled={exIdx===exercises.length-1} style={{ background:TH.cardAlt,border:`1px solid ${TH.border}`,borderRadius:5,padding:'6px 10px',fontSize:16,color:exIdx===exercises.length-1?TH.textMuted:TH.textSec,cursor:exIdx===exercises.length-1?'default':'pointer',lineHeight:'1' }}>▼</button>
                    </div>
                    <span style={{ fontWeight:600,fontSize:14,color:TH.text }}>{ex.name}</span>
                  </div>
                  <button onClick={() => moveToInactive(exIdx)} style={{ fontSize:11,color:TH.textMuted,background:'none',border:`1px solid ${TH.border}`,borderRadius:6,padding:'4px 8px',cursor:'pointer',fontFamily:'inherit' }}>Move to inactive</button>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'32px 1fr 1fr auto',gap:6,marginBottom:6 }}>
                  <div /><div style={{ fontSize:11,color:TH.textMuted,textAlign:'center',fontWeight:500 }}>Weight (kg)</div><div style={{ fontSize:11,color:TH.textMuted,textAlign:'center',fontWeight:500 }}>Reps</div><div />
                </div>
                {ex.sets.map((set, setIdx) => (
                  <div key={setIdx} style={{ display:'grid',gridTemplateColumns:'32px 1fr 1fr auto',gap:6,marginBottom:6,alignItems:'center' }}>
                    <div style={{ fontSize:12,color:TH.textMuted,textAlign:'center',fontWeight:500 }}>S{setIdx+1}</div>
                    <input type="number" value={set.weight} onChange={e => updateSet(exIdx,setIdx,'weight',e.target.value)} placeholder="kg" style={{ padding:'9px',borderRadius:8,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:14,textAlign:'center',fontFamily:'inherit' }} />
                    <input type="number" value={set.reps} onChange={e => updateSet(exIdx,setIdx,'reps',e.target.value)} placeholder="reps" style={{ padding:'9px',borderRadius:8,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:14,textAlign:'center',fontFamily:'inherit' }} />
                    {ex.sets.length > 1 && <button onClick={() => removeSet(exIdx,setIdx)} style={{ background:'none',border:'none',color:TH.textMuted,fontSize:16,cursor:'pointer',padding:'4px' }}>×</button>}
                  </div>
                ))}
                <button onClick={() => addSet(exIdx)} style={{ fontSize:12,color:TH.textMuted,background:'none',border:`1px dashed ${TH.borderMed}`,borderRadius:8,padding:'7px 12px',cursor:'pointer',width:'100%',marginTop:4,fontFamily:'inherit',fontWeight:500 }}>+ Add set</button>
                {prev && (
                  <div style={{ marginTop:10,padding:'8px 10px',background:TH.cardAlt,borderRadius:8,border:`1px solid ${TH.border}` }}>
                    <div style={{ fontSize:11,color:TH.textMuted,marginBottom:4 }}>Last session — {fmtDate(prev.date)}</div>
                    <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
                      {prev.sets.filter(s=>s.reps||s.weight).map((s,i) => <span key={i} style={{ background:TH.input,border:`1px solid ${TH.border}`,borderRadius:5,padding:'3px 8px',fontSize:12,color:TH.textSec }}>{s.reps} × {s.weight}kg</span>)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
      <div style={{ marginTop:'1rem',marginBottom:'1rem' }}>
        <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:6,fontWeight:500 }}>Session notes</label>
        <textarea value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} placeholder="How did the session go?" rows={3} style={{ width:'100%',padding:'10px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:14,fontFamily:'inherit',resize:'vertical' }} />
      </div>
      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        <Btn onClick={() => onSave(getSessionData(), true)}>Complete & save session</Btn>
        <Btn onClick={() => onSave(getSessionData(), false)} variant="secondary">Save progress & exit</Btn>
      </div>
    </div>
  );
}

// ─── GYM: EXERCISE HISTORY ────────────────────────────────────────────────────
function ExerciseHistory() {
  const [logs, setLogs] = useState([]); const [filterType, setFilterType] = useState('exercise');
  const [selectedBP, setSelectedBP] = useState('L'); const [selectedEx, setSelectedEx] = useState('');
  useEffect(() => { fetch('/api/exercise-log').then(r=>r.json()).then(data => { setLogs(data.filter(d => !d.noData).sort((a,b) => b.date.localeCompare(a.date))); }); }, []);
  const allExercises = [...new Set(logs.flatMap(l => (l.exercises||[]).map(e => e.name)))].sort();
  const filtered = filterType === 'bodypart' ? logs.filter(l => l.workoutType === selectedBP) : logs.filter(l => (l.exercises||[]).some(e => e.name === selectedEx));
  function renderRow(log) {
    const cardStyle = { padding:'14px 16px',background:TH.card,borderRadius:TH.radiusSm,marginBottom:8,boxShadow:TH.shadowSm,border:`1px solid ${TH.border}` };
    if (filterType === 'exercise') {
      const ex = (log.exercises||[]).find(e => e.name === selectedEx); if (!ex) return null;
      return (<div key={log.date} style={cardStyle}><div style={{ fontSize:12,color:TH.textMuted,marginBottom:6 }}>{fmtDate(log.date)}</div><div style={{ fontSize:13,fontWeight:600,marginBottom:6,color:TH.text }}>{ex.name}</div><div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>{ex.sets.filter(s=>s.reps||s.weight).map((s,i) => <span key={i} style={{ background:TH.cardAlt,border:`1px solid ${TH.border}`,borderRadius:6,padding:'4px 10px',fontSize:13,color:TH.textSec }}>{s.reps} reps × {s.weight}kg</span>)}</div></div>);
    }
    if (log.workoutType === 'R') return (<div key={log.date} style={cardStyle}><div style={{ fontSize:12,color:TH.textMuted,marginBottom:4 }}>{fmtDate(log.date)}</div><div style={{ fontSize:13,color:TH.text }}>{log.rowingType === 'time' ? `${log.rowingValue} minutes` : `${log.rowingValue} metres`}</div></div>);
    if (log.workoutType === 'OC') return (<div key={log.date} style={cardStyle}><div style={{ fontSize:12,color:TH.textMuted,marginBottom:4 }}>{fmtDate(log.date)}</div><div style={{ fontSize:13,color:TH.text }}>{log.cardioNote}</div></div>);
    return (<div key={log.date} style={cardStyle}><div style={{ fontSize:12,color:TH.textMuted,marginBottom:8 }}>{fmtDate(log.date)}</div>{(log.exercises||[]).map((ex,i) => (<div key={i} style={{ marginBottom:10 }}><div style={{ fontSize:13,fontWeight:600,marginBottom:4,color:TH.text }}>{ex.name}</div><div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>{ex.sets.filter(s=>s.reps||s.weight).map((s,si) => <span key={si} style={{ background:TH.cardAlt,border:`1px solid ${TH.border}`,borderRadius:6,padding:'4px 10px',fontSize:12,color:TH.textSec }}>{s.reps} reps × {s.weight}kg</span>)}</div></div>))}</div>);
  }
  return (
    <div>
      <div style={{ display:'flex',gap:8,marginBottom:'1rem' }}>
        {[['exercise','By exercise'],['bodypart','By body part']].map(([k,l]) => (
          <button key={k} onClick={() => setFilterType(k)} style={{ flex:1,padding:'11px',borderRadius:TH.radiusSm,border:`2px solid ${filterType===k?TH.accent:TH.border}`,background:filterType===k?TH.accent+'20':'transparent',color:filterType===k?TH.accent:TH.textMuted,fontWeight:600,cursor:'pointer',fontFamily:'inherit',fontSize:13,transition:'all 150ms ease' }}>{l}</button>
        ))}
      </div>
      {filterType === 'bodypart' && (
        <div style={{ display:'flex',flexWrap:'wrap',gap:8,marginBottom:'1rem' }}>
          {WORKOUT_TYPES.map(w => (<button key={w.key} onClick={() => setSelectedBP(w.key)} style={{ padding:'8px 12px',borderRadius:8,border:`2px solid ${selectedBP===w.key?w.color:TH.border}`,background:selectedBP===w.key?w.color+'20':'transparent',color:selectedBP===w.key?w.color:TH.textMuted,fontSize:13,fontWeight:selectedBP===w.key?600:400,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease' }}>{w.key} — {w.label}</button>))}
        </div>
      )}
      {filterType === 'exercise' && (
        <div style={{ marginBottom:'1rem' }}><select value={selectedEx} onChange={e => setSelectedEx(e.target.value)} style={{ width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:14,fontFamily:'inherit' }}><option value="">Select an exercise...</option>{allExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}</select></div>
      )}
      {filtered.length === 0 && <div style={{ textAlign:'center',padding:'2.5rem',color:TH.textMuted,fontSize:14 }}>No data yet</div>}
      {filtered.map(log => renderRow(log))}
    </div>
  );
}

// ─── GYM SECTION ──────────────────────────────────────────────────────────────
const GYM_TABS = [{ key:'calendar', label:'Calendar' },{ key:'log', label:'Log' },{ key:'history', label:'History' }];
function GymSection() {
  const now = new Date(); const [tab, setTab] = useState('calendar'); const [year, setYear] = useState(now.getFullYear()); const [month, setMonth] = useState(now.getMonth());
  function prevMonth() { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
  function nextMonth() { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }
  const monthLabel = new Date(year,month).toLocaleString('default',{month:'long',year:'numeric'});
  return (
    <div>
      <div style={{ display:'flex',gap:4,marginBottom:'1.5rem',background:TH.card,borderRadius:TH.radiusSm,padding:4,border:`1px solid ${TH.border}` }}>
        {GYM_TABS.map(t => (<button key={t.key} onClick={() => setTab(t.key)} style={{ flex:1,padding:'10px 0',background:tab===t.key?TH.accent:'transparent',border:'none',borderRadius:8,color:tab===t.key?'#fff':TH.textMuted,fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease' }}>{t.label}</button>))}
      </div>
      {tab === 'calendar' && (
        <>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem' }}>
            <button onClick={prevMonth} style={{ background:TH.card,border:`1px solid ${TH.border}`,borderRadius:8,padding:'7px 16px',fontSize:16,color:TH.textSec,cursor:'pointer' }}>‹</button>
            <span style={{ fontWeight:700,fontSize:15,fontFamily:TH.heading,color:TH.text }}>{monthLabel}</span>
            <button onClick={nextMonth} style={{ background:TH.card,border:`1px solid ${TH.border}`,borderRadius:8,padding:'7px 16px',fontSize:16,color:TH.textSec,cursor:'pointer' }}>›</button>
          </div>
          <GymCalendar year={year} month={month} />
        </>
      )}
      {tab === 'log' && <GymLog />}
      {tab === 'history' && <ExerciseHistory />}
    </div>
  );
}

// ─── CHART HELPER ─────────────────────────────────────────────────────────────
function darkChartOpts(extra={}) {
  return { responsive:true,maintainAspectRatio:false, plugins:{ legend:{display:false}, ...extra.plugins },
    scales:{ x:{ticks:{color:TH.textMuted,font:{size:11}},grid:{color:'rgba(255,255,255,0.04)'}}, y:{min:extra.yMin||0,max:extra.yMax||undefined,ticks:{color:TH.textMuted,font:{size:10},...(extra.yTicks||{})},grid:{color:'rgba(255,255,255,0.04)'}} } };
}

// ─── DEEP WORK TAB ────────────────────────────────────────────────────────────
function DeepWorkTab({ year, month }) {
  const [data, setData] = useState([]); const [modal, setModal] = useState(null); const [form, setForm] = useState({ minutes:'60', subject:'A' });
  useEffect(() => { fetchData(); }, [year,month]);
  async function fetchData() { const res = await fetch(`/api/deepwork?year=${year}&month=${month+1}`); setData(await res.json()); }
  async function save() { const hours = parseFloat((parseInt(form.minutes)/60).toFixed(2)); await fetch('/api/deepwork', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ date:modal, hours, subject:form.subject, replace:false }) }); setModal(null); fetchData(); }
  async function clearDay() { await fetch('/api/deepwork', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ date:modal }) }); setModal(null); fetchData(); }

  const byDate = {}; data.forEach(d => { if(!byDate[d.date]) byDate[d.date]=[]; byDate[d.date].push(d); });
  function getDayTotals(dateStr) { const sessions=byDate[dateStr]||[]; const total=sessions.reduce((s,d)=>s+(d.hours||0),0); const subTotals={}; sessions.forEach(s=>{subTotals[s.subject]=(subTotals[s.subject]||0)+s.hours;}); return {total,sessions,subTotals}; }
  function getHeatColor(total) { if(!total) return {bg:HEAT.none,text:HEAT.noneText}; if(total>=3) return {bg:HEAT.green2,text:HEAT.green2Text}; if(total>=1.5) return {bg:HEAT.green1,text:HEAT.green1Text}; return {bg:HEAT.amber,text:HEAT.amberText}; }

  const allSessions = [...data].sort((a,b)=>b.date.localeCompare(a.date));
  const totalHours = data.reduce((s,d)=>s+(d.hours||0),0); const uniqueDays = Object.keys(byDate).length;
  const best = Object.values(byDate).reduce((m,sessions)=>{const t=sessions.reduce((s,d)=>s+d.hours,0);return t>m?t:m;},0);
  const days = getDaysInMonth(year,month); const labels = Array.from({length:days},(_,i)=>i+1);
  const chartData = labels.map(d => { const {total}=getDayTotals(toDateStr(year,month,d)); return total; });

  return (
    <div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:'1.5rem' }}>
        <StatCard label="Hours" value={`${totalHours.toFixed(1)}h`} sub="this month" />
        <StatCard label="Days" value={uniqueDays} sub="with deep work" />
        <StatCard label="Best day" value={`${best.toFixed(1)}h`} sub="this month" />
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:5,marginBottom:'1.5rem' }}>
        {['S','M','T','W','T','F','S'].map((d,i)=>(<div key={i} style={{ textAlign:'center',fontSize:11,color:TH.textMuted,paddingBottom:6,fontWeight:600 }}>{d}</div>))}
        {Array.from({length:getFirstDayOfMonth(year,month)}).map((_,i)=><div key={`e${i}`}/>)}
        {Array.from({length:days},(_,i)=>i+1).map(day=>{
          const dateStr=toDateStr(year,month,day); const {total,subTotals}=getDayTotals(dateStr); const {bg,text}=getHeatColor(total);
          return (
            <div key={day} onClick={()=>{setForm({minutes:'60',subject:'A'});setModal(dateStr);}} style={{ aspectRatio:'1',borderRadius:TH.radiusSm,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:text,position:'relative',cursor:'pointer',userSelect:'none',fontWeight:500 }}>
              {day}
              {Object.keys(subTotals).length>0 && <span style={{ position:'absolute',bottom:2,left:3,fontSize:8,fontWeight:700,color:text,opacity:0.85 }}>{Object.keys(subTotals).sort().join('')}</span>}
            </div>
          );
        })}
      </div>

      <div style={{ display:'flex',flexWrap:'wrap',gap:12,marginBottom:8 }}>
        {[[HEAT.amber,'under 1.5h'],[HEAT.green1,'1.5–3h'],[HEAT.green2,'3h+']].map(([c,l])=>(<div key={l} style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:TH.textSec }}><div style={{ width:12,height:12,borderRadius:4,background:c }}/>{l}</div>))}
      </div>
      <div style={{ display:'flex',flexWrap:'wrap',gap:12,marginBottom:'1.5rem' }}>
        {Object.entries(DW_SUBJECTS).map(([k,l])=>(<div key={k} style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:TH.textSec }}><span style={{ fontWeight:700,color:DW_COLORS[k],fontSize:13 }}>{k}</span>{l}</div>))}
      </div>

      <div style={{ display:'flex',flexDirection:'column',gap:'1.5rem',marginBottom:'1.5rem' }}>
        {[
          { label:'Overall', color:TH.text, data:chartData },
          { label:'A — Ozzy Wizzpop', color:DW_COLORS.A, data:labels.map(d=>{const s=(byDate[toDateStr(year,month,d)]||[]).filter(x=>x.subject==='A');return s.reduce((t,x)=>t+x.hours,0)||null;}) },
          { label:'B — Reading', color:DW_COLORS.B, data:labels.map(d=>{const s=(byDate[toDateStr(year,month,d)]||[]).filter(x=>x.subject==='B');return s.reduce((t,x)=>t+x.hours,0)||null;}) },
          { label:'C — Magic study', color:DW_COLORS.C, data:labels.map(d=>{const s=(byDate[toDateStr(year,month,d)]||[]).filter(x=>x.subject==='C');return s.reduce((t,x)=>t+x.hours,0)||null;}) },
        ].map(({label,color,data:d})=>(
          <div key={label}><div style={{ fontSize:12,color:TH.textMuted,marginBottom:6,fontWeight:500 }}>{label}</div>
            <div style={{ height:120 }}><Line data={{ labels, datasets:[{ data:d,borderColor:color,backgroundColor:color+'15',borderWidth:2,pointRadius:3,pointBackgroundColor:color,tension:0.35,fill:true,spanGaps:true }] }} options={darkChartOpts({yTicks:{callback:v=>v+'h'}})} /></div>
          </div>
        ))}
      </div>

      {allSessions.length > 0 && (
        <div><div style={{ fontSize:12,color:TH.textMuted,marginBottom:8,fontWeight:500 }}>Session log</div>
          <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
            {allSessions.map((s,i)=>(
              <div key={i} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:TH.card,borderRadius:TH.radiusSm,border:`1px solid ${TH.border}` }}>
                <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                  <span style={{ width:26,height:26,borderRadius:7,background:DW_COLORS[s.subject]||'#888',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:700 }}>{s.subject}</span>
                  <div><div style={{ fontSize:13,fontWeight:600,color:TH.text }}>{DW_SUBJECTS[s.subject]||s.subject}</div><div style={{ fontSize:11,color:TH.textMuted }}>{s.date}</div></div>
                </div>
                <div style={{ fontSize:14,fontWeight:700,fontFamily:TH.heading,color:TH.text }}>{Math.round(s.hours*60)}m</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal && (
        <Modal title={`Log deep work — ${modal}`} onClose={()=>setModal(null)}>
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            {byDate[modal]&&byDate[modal].length>0&&(
              <div style={{ background:TH.cardAlt,borderRadius:TH.radiusSm,padding:'10px 12px',border:`1px solid ${TH.border}` }}>
                <div style={{ fontSize:12,color:TH.textMuted,marginBottom:6 }}>Already logged today:</div>
                {byDate[modal].map((s,i)=>(<div key={i} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13,marginBottom:4 }}><span><strong style={{ color:DW_COLORS[s.subject] }}>{s.subject}</strong> <span style={{ color:TH.textSec }}>— {DW_SUBJECTS[s.subject]}</span></span><span style={{ color:TH.text,fontWeight:600 }}>{Math.round(s.hours*60)}m</span></div>))}
                <div style={{ fontSize:12,color:TH.textMuted,marginTop:4,borderTop:`1px solid ${TH.border}`,paddingTop:4 }}>Total: {Math.round(byDate[modal].reduce((s,d)=>s+d.hours,0)*60)}m ({byDate[modal].reduce((s,d)=>s+d.hours,0).toFixed(1)}h)</div>
              </div>
            )}
            <div>
              <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500 }}>Add minutes</label>
              <input type="number" min="1" max="480" value={form.minutes} onChange={e=>setForm(f=>({...f,minutes:e.target.value}))} placeholder="e.g. 45" style={{ width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:16,fontFamily:'inherit' }} />
              <div style={{ fontSize:12,color:TH.textMuted,marginTop:4 }}>= {(parseInt(form.minutes||0)/60).toFixed(1)} hours</div>
            </div>
            <div>
              <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500 }}>Subject</label>
              <div style={{ display:'flex',gap:8 }}>
                {Object.entries(DW_SUBJECTS).map(([k,l])=>(<button key={k} onClick={()=>setForm(f=>({...f,subject:k}))} style={{ flex:1,padding:'8px 4px',borderRadius:TH.radiusSm,border:`2px solid ${form.subject===k?DW_COLORS[k]:TH.border}`,background:form.subject===k?DW_COLORS[k]+'20':'transparent',fontSize:12,color:form.subject===k?DW_COLORS[k]:TH.textMuted,fontWeight:form.subject===k?600:400,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease' }}><span style={{ fontWeight:700,display:'block',fontSize:16 }}>{k}</span>{l}</button>))}
              </div>
            </div>
            <Btn onClick={save}>Add session</Btn>
            {byDate[modal]&&byDate[modal].length>0&&<Btn onClick={clearDay} variant="danger">Clear all today's sessions</Btn>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── SWITCH OFF TAB ───────────────────────────────────────────────────────────
function SwitchOffTab({ year, month }) {
  const [data, setData] = useState([]); const [modal, setModal] = useState(null); const [time, setTime] = useState('19:00');
  useEffect(() => { fetchData(); }, [year,month]);
  async function fetchData() { const res = await fetch(`/api/switchoff?year=${year}&month=${month+1}`); setData(await res.json()); }
  async function save() { await fetch('/api/switchoff', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ date:modal, time }) }); setModal(null); fetchData(); }
  async function remove() { await fetch('/api/switchoff', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ date:modal }) }); setModal(null); fetchData(); }

  const byDate = {}; data.forEach(d=>{ byDate[d.date]=d; });
  function timeToMins(t) { const [h,m]=t.split(':').map(Number); return h*60+m; }
  function getHeatColor(day) {
    const entry = byDate[toDateStr(year,month,day)];
    if (!entry) return { bg:HEAT.none, text:HEAT.noneText };
    const mins = timeToMins(entry.time);
    if (mins<=19*60) return { bg:HEAT.green1, text:HEAT.green1Text };
    if (mins<=20*60) return { bg:HEAT.green1, text:HEAT.green1Text };
    if (mins<=21*60) return { bg:HEAT.amber, text:HEAT.amberText };
    return { bg:HEAT.red, text:HEAT.redText };
  }

  const hitTarget = data.filter(d=>timeToMins(d.time)<=19*60).length;
  const avgMins = data.length ? Math.round(data.reduce((s,d)=>s+timeToMins(d.time),0)/data.length) : null;
  const avgStr = avgMins ? `${Math.floor(avgMins/60)}:${pad(avgMins%60)}pm` : '—';
  const days = getDaysInMonth(year,month); const labels = Array.from({length:days},(_,i)=>i+1);
  const chartData = labels.map(d=>{ const e=byDate[toDateStr(year,month,d)]; return e?parseFloat((timeToMins(e.time)/60).toFixed(2)):null; });

  return (
    <div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:'1.5rem' }}>
        <StatCard label="Avg switch-off" value={avgStr} sub="this month" />
        <StatCard label="Days hit target" value={hitTarget} sub={`of ${days} days`} />
        <StatCard label="Target" value="7:00pm" sub="goal to reach" />
      </div>

      <CalendarGrid year={year} month={month}
        getCellStyle={day=>{ const {bg,text}=getHeatColor(day); return { background:bg,color:text,border:'none',borderRadius:TH.radiusSm,fontWeight:500 }; }}
        onDayClick={day=>{ const e=byDate[toDateStr(year,month,day)]; setTime(e?e.time:'19:00'); setModal(toDateStr(year,month,day)); }}
      />

      <div style={{ display:'flex',flexWrap:'wrap',gap:12,marginBottom:'1.5rem' }}>
        {[[HEAT.green1,'Hit target (≤7pm)'],[HEAT.green1,'7–8pm'],[HEAT.amber,'8–9pm'],[HEAT.red,'After 9pm']].map(([c,l],i)=>(
          <div key={i} style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:TH.textSec }}><div style={{ width:12,height:12,borderRadius:4,background:c }}/>{l}</div>
        ))}
      </div>

      <div style={{ fontSize:12,color:TH.textMuted,marginBottom:8,fontWeight:500 }}>Switch-off time — trend</div>
      <div style={{ height:180 }}>
        <Line data={{ labels, datasets:[{ data:chartData,borderColor:HEAT.red,backgroundColor:'rgba(220,74,71,0.1)',borderWidth:2,pointRadius:3,tension:0.35,fill:true,spanGaps:true }] }}
          options={darkChartOpts({ yMin:17, yMax:24, yTicks:{callback:v=>`${v}:00`}, plugins:{tooltip:{callbacks:{label:(ctx)=>{const h=Math.floor(ctx.parsed.y);const m=Math.round((ctx.parsed.y-h)*60);return `${h}:${pad(m)}pm`;}}}} })} />
      </div>

      {modal && (
        <Modal title={`Log switch-off — ${fmtDate(modal)}`} onClose={()=>setModal(null)}>
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            <div>
              <label style={{ fontSize:12,color:TH.textSec,display:'block',marginBottom:4,fontWeight:500 }}>Time you switched off</label>
              <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={{ width:'100%',padding:'11px 12px',borderRadius:TH.radiusSm,border:`1px solid ${TH.borderMed}`,background:TH.input,color:TH.text,fontSize:16,fontFamily:'inherit' }} />
            </div>
            <Btn onClick={save}>Save</Btn>
            {byDate[modal] && <Btn onClick={remove} variant="danger">Remove entry</Btn>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── HABITS SECTION ───────────────────────────────────────────────────────────
const HABITS_TABS = [{ key:'deepwork', label:'Deep Work' },{ key:'switchoff', label:'Switch-off' }];
function HabitsSection() {
  const now = new Date(); const [tab, setTab] = useState('deepwork'); const [year, setYear] = useState(now.getFullYear()); const [month, setMonth] = useState(now.getMonth());
  function prevMonth() { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
  function nextMonth() { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }
  const monthLabel = new Date(year,month).toLocaleString('default',{month:'long',year:'numeric'});
  return (
    <div>
      <div style={{ display:'flex',gap:4,marginBottom:'1.5rem',background:TH.card,borderRadius:TH.radiusSm,padding:4,border:`1px solid ${TH.border}` }}>
        {HABITS_TABS.map(t=>(<button key={t.key} onClick={()=>setTab(t.key)} style={{ flex:1,padding:'10px 0',background:tab===t.key?TH.accent:'transparent',border:'none',borderRadius:8,color:tab===t.key?'#fff':TH.textMuted,fontWeight:600,fontSize:13,cursor:'pointer',fontFamily:'inherit',transition:'all 150ms ease' }}>{t.label}</button>))}
      </div>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem' }}>
        <button onClick={prevMonth} style={{ background:TH.card,border:`1px solid ${TH.border}`,borderRadius:8,padding:'7px 16px',fontSize:16,color:TH.textSec,cursor:'pointer' }}>‹</button>
        <span style={{ fontWeight:700,fontSize:15,fontFamily:TH.heading,color:TH.text }}>{monthLabel}</span>
        <button onClick={nextMonth} style={{ background:TH.card,border:`1px solid ${TH.border}`,borderRadius:8,padding:'7px 16px',fontSize:16,color:TH.textSec,cursor:'pointer' }}>›</button>
      </div>
      {tab==='deepwork' && <DeepWorkTab year={year} month={month} />}
      {tab==='switchoff' && <SwitchOffTab year={year} month={month} />}
    </div>
  );
}

// ─── NUTRITION PLACEHOLDER ────────────────────────────────────────────────────
function NutritionSection() {
  return (
    <div style={{ textAlign:'center',padding:'3rem 1rem',color:TH.textMuted }}>
      <div style={{ fontSize:40,marginBottom:'1rem' }}>🥗</div>
      <div style={{ fontSize:16,fontWeight:700,fontFamily:TH.heading,color:TH.textSec }}>Nutrition coming soon</div>
      <div style={{ fontSize:13,marginTop:8 }}>This section is being built</div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [section, setSection] = useState('gym');
  return (
    <>
      <Head>
        <title>Chris's Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ maxWidth:600,margin:'0 auto',padding:'0 0 4rem',minHeight:'100vh' }}>
        <div style={{ padding:'1.5rem 1.25rem 0',marginBottom:'1.25rem' }}>
          <div style={{ fontSize:12,fontWeight:600,letterSpacing:'0.18em',textTransform:'uppercase',color:TH.textMuted,marginBottom:4 }}>Personal dashboard</div>
          <div style={{ fontSize:38,fontWeight:700,fontFamily:TH.heading,color:TH.text,letterSpacing:'-0.02em' }}>Chris</div>
        </div>
        <div style={{ display:'flex',gap:4,margin:'0 1.25rem 1.5rem',background:TH.card,borderRadius:TH.radiusSm,padding:4,border:`1px solid ${TH.border}` }}>
          {TOP_SECTIONS.map(s=>(<button key={s.key} onClick={()=>setSection(s.key)} style={{ flex:1,padding:'11px 4px',background:section===s.key?TH.accent:'transparent',border:'none',borderRadius:8,color:section===s.key?'#fff':TH.textMuted,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:TH.heading,letterSpacing:'-0.01em',transition:'all 150ms ease',textAlign:'center' }}>{s.label}</button>))}
        </div>
        <div style={{ padding:'0 1.25rem' }}>
          {section==='gym' && <GymSection />}
          {section==='nutrition' && <NutritionSection />}
          {section==='habits' && <HabitsSection />}
        </div>
      </div>
    </>
  );
}
