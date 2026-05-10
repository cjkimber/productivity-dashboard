import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const WORKOUT_TYPES = [
  { key: 'L',  label: 'Legs',            color: '#3B6D11', hasIntensity: true  },
  { key: 'B',  label: 'Back & Biceps',   color: '#185FA5', hasIntensity: true  },
  { key: 'C',  label: 'Chest & Triceps', color: '#7B2D8B', hasIntensity: true  },
  { key: 'D',  label: 'Delts',           color: '#BA7517', hasIntensity: true  },
  { key: 'R',  label: 'Rowing',          color: '#993556', hasIntensity: false },
  { key: 'OC', label: 'Other Cardio',    color: '#2A7F7F', hasIntensity: false },
];

const DEFAULT_EXERCISES = {
  L:  ['Squats','Smith Squats','Leg Extensions','Single Leg KB Squats','KB Lunges','Lying Ham Curl','Seated Leg Curl'],
  B:  ['Lying EZ Rows','Wide Grip Pulldowns','Seated Cable Row','Close Grip Pulldowns','Dbell Rows','Fixed Pulldowns','Assisted Pull Ups','Dbell Curls','Standing EZ Curls','EZ Preacher Curls','Preacher Dbell Curls','Cable Curls','Single Cable Curls'],
  C:  ['Incline Bench Press','Incline Dbell Press','Pec Dec','Incline Smith Press','Flye Machine','Flat Dbell Press','Cable Cross Overs','Bench Dips','Dbell Raises','KB Kick Back','DB Kick Backs','Cable Pushdowns','Tri Bar Push Downs'],
  D:  ['Dbell Press','Side Raises','Leaning Side Raises','Bar Raises','KB Swings','B.O Dbell Rows','Single Arm B.O Rows','EZ Rear Rows'],
  R:  [],
  OC: [],
};

const COLORS = {
  green1: '#C0DD97', green1Text: '#27500A',
  green2: '#C0DD97', green2Text: '#27500A',
  amber:  '#EF9F27', amberText:  '#412402',
  red:    '#E24B4A', redText:    '#501313',
  none:   '#EBEBEB', noneText:   '#888',
};

const DW_SUBJECTS = { A: 'Ozzy Wizzpop', B: 'Reading', C: 'Magic study' };
const DW_COLORS   = { A: '#3B6D11', B: '#185FA5', C: '#993556' };

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getDaysInMonth(y, m)    { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y,m) { return new Date(y, m, 1).getDay(); }
function pad(n) { return String(n).padStart(2, '0'); }
function toDateStr(y, m, d) { return `${y}-${pad(m+1)}-${pad(d)}`; }
function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())}`;
}
function fmtDate(str) {
  if (!str) return '';
  const [y,m,d] = str.split('-');
  return new Date(y,m-1,d).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
}

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-start',justifyContent:'center',zIndex:1000,overflowY:'auto',padding:'1rem' }}>
      <div style={{ background:'#fff',borderRadius:16,padding:'1.5rem',width:wide?560:340,maxWidth:'95vw',marginTop:'2rem',marginBottom:'2rem' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem' }}>
          <span style={{ fontWeight:500,fontSize:16 }}>{title}</span>
          <button onClick={onClose} style={{ background:'none',border:'none',fontSize:22,color:'#888',padding:'0 4px',cursor:'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background:'#f0f0ee',borderRadius:10,padding:'12px 14px' }}>
      <div style={{ fontSize:11,color:'#888',marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:20,fontWeight:500 }}>{value}</div>
      {sub && <div style={{ fontSize:11,color:'#888',marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function Btn({ onClick, children, variant='primary', style={} }) {
  const base = { border:'none',borderRadius:8,padding:'11px 16px',fontWeight:500,fontSize:14,cursor:'pointer',fontFamily:'inherit' };
  const variants = {
    primary:   { background:'#1a1a1a',color:'#fff' },
    secondary: { background:'none',border:'1px solid #ddd',color:'#444' },
    danger:    { background:'none',border:'1px solid #ddd',color:'#E24B4A' },
    ghost:     { background:'none',border:'none',color:'#666',padding:'6px 10px' },
  };
  return <button onClick={onClick} style={{ ...base,...variants[variant],...style }}>{children}</button>;
}

// ─── TOP NAV ──────────────────────────────────────────────────────────────────
const TOP_SECTIONS = [
  { key:'gym',       label:'💪🏻 GYM'      },
  { key:'nutrition', label:'🥗 NUTRITION'  },
  { key:'habits',    label:'🚀 HABITS'     },
];

// ─── CALENDAR GRID ────────────────────────────────────────────────────────────
function CalendarGrid({ year, month, getCellStyle, onDayClick }) {
  const days = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  return (
    <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:'1.5rem' }}>
      {['S','M','T','W','T','F','S'].map((d,i) => (
        <div key={i} style={{ textAlign:'center',fontSize:11,color:'#bbb',paddingBottom:4 }}>{d}</div>
      ))}
      {Array.from({ length:firstDay }).map((_,i) => <div key={`e${i}`} />)}
      {Array.from({ length:days },(_,i) => i+1).map(day => {
        const s = getCellStyle(day);
        return (
          <div key={day} onClick={() => onDayClick(day)}
            style={{ aspectRatio:'1',borderRadius:s.borderRadius||'50%',border:s.border||'none',background:s.background||'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:s.color||'#bbb',fontWeight:s.fontWeight||400,cursor:'pointer',position:'relative' }}>
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
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ type:'L', intensity:'3' });

  useEffect(() => { fetch(`/api/workouts?year=${year}&month=${month+1}`).then(r=>r.json()).then(setData); }, [year,month]);

  const byDate = {};
  data.forEach(d => { byDate[d.date] = d; });

  async function save() {
    const wt = WORKOUT_TYPES.find(w => w.key === form.type);
    await fetch('/api/workouts', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ date:modal, type:form.type, intensity: wt.hasIntensity ? form.intensity : null }) });
    setModal(null);
    fetch(`/api/workouts?year=${year}&month=${month+1}`).then(r=>r.json()).then(setData);
  }

  async function remove() {
    await fetch('/api/workouts', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ date:modal }) });
    setModal(null);
    fetch(`/api/workouts?year=${year}&month=${month+1}`).then(r=>r.json()).then(setData);
  }

  const totalSessions = data.length;
  const best = data.filter(d => d.intensity == 3).length;
  const cardio = data.filter(d => d.type==='R'||d.type==='OC').length;

  return (
    <div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:'1.5rem' }}>
        <StatCard label="Sessions" value={totalSessions} sub="this month" />
        <StatCard label="Intensity 3" value={best} sub="best sessions" />
        <StatCard label="Cardio" value={cardio} sub="rowing + other" />
      </div>

      <CalendarGrid year={year} month={month}
        getCellStyle={day => {
          const entry = byDate[toDateStr(year,month,day)];
          if (!entry) return { border:'1.5px solid #e0e0e0', color:'#bbb', borderRadius:6 };
          const wt = WORKOUT_TYPES.find(w => w.key === entry.type);
          return { background: wt?.color||'#888', color:'#fff', borderRadius:6, fontWeight:500, letter: entry.type, intensity: entry.intensity||null };
        }}
        onDayClick={day => {
          const e = byDate[toDateStr(year,month,day)];
          setForm(e ? { type:e.type, intensity:String(e.intensity||'3') } : { type:'L', intensity:'3' });
          setModal(toDateStr(year,month,day));
        }}
      />

      <div style={{ display:'flex',flexWrap:'wrap',gap:10,marginBottom:'1.5rem' }}>
        {WORKOUT_TYPES.map(w => (
          <div key={w.key} style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#666' }}>
            <div style={{ width:12,height:12,borderRadius:3,background:w.color }} />
            <span style={{ fontWeight:600 }}>{w.key}</span> {w.label}
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={`Log workout — ${fmtDate(modal)}`} onClose={() => setModal(null)}>
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            <div>
              <label style={{ fontSize:13,color:'#666',display:'block',marginBottom:6 }}>Workout type</label>
              <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                {WORKOUT_TYPES.map(w => (
                  <button key={w.key} onClick={() => setForm(f => ({ ...f, type:w.key }))}
                    style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,border:`2px solid ${form.type===w.key?w.color:'#ddd'}`,background:form.type===w.key?w.color+'15':'#fff',textAlign:'left',cursor:'pointer',fontFamily:'inherit' }}>
                    <span style={{ width:28,height:28,borderRadius:6,background:w.color,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:700,flexShrink:0 }}>{w.key}</span>
                    <span style={{ fontSize:14,color:form.type===w.key?w.color:'#444',fontWeight:form.type===w.key?500:400 }}>{w.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {WORKOUT_TYPES.find(w=>w.key===form.type)?.hasIntensity && (
              <div>
                <label style={{ fontSize:13,color:'#666',display:'block',marginBottom:4 }}>Intensity</label>
                <div style={{ display:'flex',gap:8 }}>
                  {['1','2','3'].map(n => (
                    <button key={n} onClick={() => setForm(f => ({ ...f, intensity:n }))}
                      style={{ flex:1,padding:'10px',borderRadius:8,border:`2px solid ${form.intensity===n?'#1a1a1a':'#ddd'}`,background:form.intensity===n?'#1a1a1a':'#fff',fontWeight:500,fontSize:16,color:form.intensity===n?'#fff':'#888',cursor:'pointer',fontFamily:'inherit' }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Btn onClick={save}>Save</Btn>
            {byDate[modal] && <Btn onClick={remove} variant="danger">Remove entry</Btn>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── GYM: LOG TAB ─────────────────────────────────────────────────────────────
function GymLog() {
  const [workouts, setWorkouts]   = useState([]);
  const [logged, setLogged]       = useState([]);
  const [drafts, setDrafts]       = useState([]);
  const [session, setSession]     = useState(null); // active logging session
  const [inactive, setInactive]   = useState({});
  const [showInactive, setShowInactive] = useState(false);
  const [inactiveBodyPart, setInactiveBodyPart] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth()+1;
    const [wRes, lRes, dRes, iRes] = await Promise.all([
      fetch(`/api/workouts?year=${y}&month=${m}`),
      fetch('/api/exercise-log'),
      fetch('/api/exercise-draft'),
      fetch('/api/inactive-exercises'),
    ]);
    const [w, l, d, i] = await Promise.all([wRes.json(), lRes.json(), dRes.json(), iRes.json()]);
    setWorkouts(w);
    setLogged(l);
    setDrafts(d);
    // inactive is { L: [...], B: [...], ... }
    const iMap = {};
    i.forEach(x => { if (!iMap[x.bodyPart]) iMap[x.bodyPart] = []; iMap[x.bodyPart].push(x); });
    setInactive(iMap);
  }

  // Workouts that are in calendar but not yet completed (not in logged)
  const loggedDates = new Set(logged.map(l => l.date));
  const pending = workouts
    .filter(w => !loggedDates.has(w.date))
    .sort((a,b) => b.date.localeCompare(a.date));

  async function markNoData(workout) {
    await fetch('/api/exercise-log', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ date:workout.date, workoutType:workout.type, noData:true, exercises:[] }) });
    loadAll();
  }

  function openSession(workout) {
    // Check for existing draft
    const draft = drafts.find(d => d.date === workout.date);
    if (draft) {
      setSession(draft);
    } else {
      const wt = WORKOUT_TYPES.find(w => w.key === workout.type);
      const activeExercises = DEFAULT_EXERCISES[workout.type]?.filter(ex => {
        const inactiveList = inactive[workout.type] || [];
        return !inactiveList.find(i => i.exercise === ex);
      }) || [];
      setSession({
        date: workout.date,
        workoutType: workout.type,
        workoutLabel: wt?.label || workout.type,
        exercises: activeExercises.map(name => ({
          name,
          sets: [{ weight:'', reps:'' }, { weight:'', reps:'' }, { weight:'', reps:'' }]
        }))
      });
    }
  }

  async function saveSession(sessionData, complete) {
    if (complete) {
      await fetch('/api/exercise-log', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...sessionData, noData:false }) });
      // Remove draft if exists
      await fetch('/api/exercise-draft', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ date:sessionData.date }) });
      setSession(null);
      loadAll();
    } else {
      // Save as draft
      await fetch('/api/exercise-draft', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(sessionData) });
      setSession(null);
      loadAll();
    }
  }

  async function moveToInactive(bodyPart, exercise) {
    await fetch('/api/inactive-exercises', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ bodyPart, exercise }) });
    loadAll();
  }

  async function restoreFromInactive(id) {
    await fetch('/api/inactive-exercises', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) });
    loadAll();
  }

  async function deleteInactive(id) {
    await fetch('/api/inactive-exercises', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, permanent:true }) });
    loadAll();
  }

  if (session) {
    return <SessionLogger session={session} onSave={saveSession} onMoveInactive={moveToInactive} inactive={inactive} onLoadInactive={(bp) => { setInactiveBodyPart(bp); setShowInactive(true); }} />;
  }

  return (
    <div>
      <div style={{ fontSize:13,color:'#888',marginBottom:'1rem' }}>Workouts waiting to be logged</div>

      {pending.length === 0 && (
        <div style={{ textAlign:'center',padding:'2rem',color:'#aaa',fontSize:14 }}>
          No workouts waiting to be logged
        </div>
      )}

      {pending.map(w => {
        const wt = WORKOUT_TYPES.find(x => x.key === w.type);
        const draft = drafts.find(d => d.date === w.date);
        return (
          <div key={w.date} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'#f5f5f3',borderRadius:10,marginBottom:8 }}>
            <div>
              <div style={{ fontSize:13,fontWeight:500 }}>{fmtDate(w.date)}</div>
              <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:3 }}>
                <span style={{ background:wt?.color,color:'#fff',borderRadius:4,fontSize:11,fontWeight:700,padding:'2px 6px' }}>{w.type}</span>
                <span style={{ fontSize:12,color:'#666' }}>{wt?.label}</span>
                {draft && <span style={{ fontSize:11,color:'#BA7517',fontWeight:500 }}>● in progress</span>}
              </div>
            </div>
            <div style={{ display:'flex',gap:8 }}>
              <Btn onClick={() => openSession(w)} style={{ padding:'8px 14px',fontSize:13 }}>Record</Btn>
              <Btn onClick={() => markNoData(w)} variant="secondary" style={{ padding:'8px 14px',fontSize:13 }}>No data</Btn>
            </div>
          </div>
        );
      })}

      {showInactive && inactiveBodyPart && (
        <Modal title={`Inactive exercises — ${WORKOUT_TYPES.find(w=>w.key===inactiveBodyPart)?.label}`} onClose={() => setShowInactive(false)}>
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {(inactive[inactiveBodyPart]||[]).length === 0 && <div style={{ color:'#aaa',fontSize:13 }}>No inactive exercises</div>}
            {(inactive[inactiveBodyPart]||[]).map(ex => (
              <div key={ex._id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:'#f5f5f3',borderRadius:8 }}>
                <span style={{ fontSize:14 }}>{ex.exercise}</span>
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
function SessionLogger({ session, onSave, onMoveInactive, inactive }) {
  const [exercises, setExercises] = useState(session.exercises || []);
  const [showInactive, setShowInactive] = useState(false);
  const wt = WORKOUT_TYPES.find(w => w.key === session.workoutType);

  // For Rowing
  const [rowingType, setRowingType] = useState(session.rowingType || 'time');
  const [rowingValue, setRowingValue] = useState(session.rowingValue || '');
  // For Other Cardio
  const [cardioNote, setCardioNote] = useState(session.cardioNote || '');
  // Session notes
  const [sessionNotes, setSessionNotes] = useState(session.sessionNotes || '');

  function updateSet(exIdx, setIdx, field, value) {
    setExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: value })
    }));
  }

  function addSet(exIdx) {
    setExercises(prev => prev.map((ex,i) => i !== exIdx ? ex : { ...ex, sets: [...ex.sets, { weight:'', reps:'' }] }));
  }

  function removeSet(exIdx, setIdx) {
    setExercises(prev => prev.map((ex,i) => i !== exIdx ? ex : { ...ex, sets: ex.sets.filter((_,j) => j !== setIdx) }));
  }

  function moveToInactive(exIdx) {
    const ex = exercises[exIdx];
    onMoveInactive(session.workoutType, ex.name);
    setExercises(prev => prev.filter((_,i) => i !== exIdx));
  }

  function getSessionData() {
    return {
      date: session.date,
      workoutType: session.workoutType,
      workoutLabel: session.workoutLabel,
      exercises: session.workoutType === 'R' ? [] : session.workoutType === 'OC' ? [] : exercises,
      rowingType: session.workoutType === 'R' ? rowingType : null,
      rowingValue: session.workoutType === 'R' ? rowingValue : null,
      cardioNote: session.workoutType === 'OC' ? cardioNote : null,
      sessionNotes,
    };
  }

  const inactiveList = inactive[session.workoutType] || [];

  return (
    <div>
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:'1rem' }}>
        <span style={{ background:wt?.color,color:'#fff',borderRadius:6,fontSize:12,fontWeight:700,padding:'4px 10px' }}>{session.workoutType}</span>
        <div>
          <div style={{ fontWeight:500,fontSize:16 }}>{session.workoutLabel}</div>
          <div style={{ fontSize:12,color:'#888' }}>{fmtDate(session.date)}</div>
        </div>
      </div>

      {session.workoutType === 'R' && (
        <div style={{ marginBottom:'1.5rem' }}>
          <div style={{ display:'flex',gap:8,marginBottom:12 }}>
            {['time','distance'].map(t => (
              <button key={t} onClick={() => setRowingType(t)}
                style={{ flex:1,padding:'10px',borderRadius:8,border:`2px solid ${rowingType===t?'#993556':'#ddd'}`,background:rowingType===t?'#f9f0f3':'#fff',color:rowingType===t?'#993556':'#888',fontWeight:500,cursor:'pointer',fontFamily:'inherit',fontSize:14 }}>
                {t === 'time' ? '⏱ Time (mins)' : '📏 Distance (m)'}
              </button>
            ))}
          </div>
          <input type="number" value={rowingValue} onChange={e => setRowingValue(e.target.value)}
            placeholder={rowingType === 'time' ? 'Minutes rowed' : 'Metres rowed'}
            style={{ width:'100%',padding:'12px',borderRadius:8,border:'1px solid #ddd',fontSize:16,fontFamily:'inherit' }} />
        </div>
      )}

      {session.workoutType === 'OC' && (
        <div style={{ marginBottom:'1.5rem' }}>
          <textarea value={cardioNote} onChange={e => setCardioNote(e.target.value)}
            placeholder="Describe your cardio session..."
            rows={4}
            style={{ width:'100%',padding:'12px',borderRadius:8,border:'1px solid #ddd',fontSize:14,fontFamily:'inherit',resize:'vertical' }} />
        </div>
      )}

      {session.workoutType !== 'R' && session.workoutType !== 'OC' && (
        <>
          {inactiveList.length > 0 && (
            <button onClick={() => setShowInactive(!showInactive)}
              style={{ fontSize:12,color:'#888',background:'#f0f0ee',border:'none',borderRadius:6,padding:'6px 12px',cursor:'pointer',marginBottom:'1rem',fontFamily:'inherit' }}>
              {showInactive ? 'Hide' : 'View'} INACTIVE exercises ({inactiveList.length})
            </button>
          )}

          {showInactive && (
            <div style={{ background:'#fafaf8',border:'1px solid #eee',borderRadius:10,padding:'12px',marginBottom:'1rem' }}>
              <div style={{ fontSize:12,color:'#888',marginBottom:8 }}>Inactive exercises</div>
              {inactiveList.map(ex => (
                <div key={ex._id} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #eee' }}>
                  <span style={{ fontSize:13 }}>{ex.exercise}</span>
                  <button onClick={() => {
                    fetch('/api/inactive-exercises', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id:ex._id }) })
                      .then(() => {
                        setExercises(prev => [...prev, { name:ex.exercise, sets:[{weight:'',reps:''},{weight:'',reps:''},{weight:'',reps:''}] }]);
                        setShowInactive(false);
                      });
                  }} style={{ fontSize:12,color:'#3B6D11',background:'none',border:'1px solid #3B6D11',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit' }}>
                    Add back
                  </button>
                </div>
              ))}
            </div>
          )}

          {exercises.map((ex, exIdx) => (
            <div key={exIdx} style={{ marginBottom:'1.5rem',background:'#f5f5f3',borderRadius:10,padding:'12px 14px' }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem' }}>
                <span style={{ fontWeight:500,fontSize:14 }}>{ex.name}</span>
                <button onClick={() => moveToInactive(exIdx)}
                  style={{ fontSize:11,color:'#888',background:'none',border:'1px solid #ddd',borderRadius:6,padding:'4px 8px',cursor:'pointer',fontFamily:'inherit' }}>
                  Move to inactive
                </button>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'32px 1fr 1fr auto',gap:6,marginBottom:6 }}>
                <div style={{ fontSize:11,color:'#999',display:'flex',alignItems:'center' }}></div>
                <div style={{ fontSize:11,color:'#999',textAlign:'center' }}>Weight (kg)</div>
                <div style={{ fontSize:11,color:'#999',textAlign:'center' }}>Reps</div>
                <div />
              </div>
              {ex.sets.map((set, setIdx) => (
                <div key={setIdx} style={{ display:'grid',gridTemplateColumns:'32px 1fr 1fr auto',gap:6,marginBottom:6,alignItems:'center' }}>
                  <div style={{ fontSize:12,color:'#888',textAlign:'center' }}>S{setIdx+1}</div>
                  <input type="number" value={set.weight} onChange={e => updateSet(exIdx,setIdx,'weight',e.target.value)}
                    placeholder="kg"
                    style={{ padding:'8px',borderRadius:6,border:'1px solid #ddd',fontSize:14,textAlign:'center',fontFamily:'inherit' }} />
                  <input type="number" value={set.reps} onChange={e => updateSet(exIdx,setIdx,'reps',e.target.value)}
                    placeholder="reps"
                    style={{ padding:'8px',borderRadius:6,border:'1px solid #ddd',fontSize:14,textAlign:'center',fontFamily:'inherit' }} />
                  {ex.sets.length > 1 && (
                    <button onClick={() => removeSet(exIdx,setIdx)} style={{ background:'none',border:'none',color:'#ccc',fontSize:16,cursor:'pointer',padding:'4px' }}>×</button>
                  )}
                </div>
              ))}
              <button onClick={() => addSet(exIdx)}
                style={{ fontSize:12,color:'#666',background:'none',border:'1px dashed #ddd',borderRadius:6,padding:'6px 12px',cursor:'pointer',width:'100%',marginTop:4,fontFamily:'inherit' }}>
                + Add set
              </button>
            </div>
          ))}
        </>
      )}

      <div style={{ marginTop:'1rem',marginBottom:'1rem' }}>
        <label style={{ fontSize:13,color:'#666',display:'block',marginBottom:6 }}>Session notes</label>
        <textarea value={sessionNotes} onChange={e => setSessionNotes(e.target.value)}
          placeholder="How did the session go? Any notes on weights, how you felt, anything to remember..."
          rows={3}
          style={{ width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #ddd',fontSize:14,fontFamily:'inherit',resize:'vertical' }} />
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
  const [logs, setLogs]           = useState([]);
  const [filterType, setFilterType] = useState('exercise'); // 'exercise' | 'bodypart'
  const [selectedBP, setSelectedBP] = useState('L');
  const [selectedEx, setSelectedEx] = useState('');

  useEffect(() => {
    fetch('/api/exercise-log').then(r=>r.json()).then(data => {
      setLogs(data.filter(d => !d.noData).sort((a,b) => b.date.localeCompare(a.date)));
    });
  }, []);

  // All exercises across all logs
  const allExercises = [...new Set(logs.flatMap(l => (l.exercises||[]).map(e => e.name)))].sort();

  const filtered = filterType === 'bodypart'
    ? logs.filter(l => l.workoutType === selectedBP)
    : logs.filter(l => (l.exercises||[]).some(e => e.name === selectedEx));

  function renderRow(log) {
    if (filterType === 'exercise') {
      const ex = (log.exercises||[]).find(e => e.name === selectedEx);
      if (!ex) return null;
      return (
        <div key={log.date} style={{ padding:'12px 14px',background:'#f5f5f3',borderRadius:10,marginBottom:8 }}>
          <div style={{ fontSize:12,color:'#888',marginBottom:6 }}>{fmtDate(log.date)}</div>
          <div style={{ fontSize:13,fontWeight:500,marginBottom:4 }}>{ex.name}</div>
          <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
            {ex.sets.filter(s=>s.reps||s.weight).map((s,i) => (
              <span key={i} style={{ background:'#fff',border:'1px solid #e0e0e0',borderRadius:6,padding:'4px 10px',fontSize:13 }}>
                {s.reps} reps × {s.weight}kg
              </span>
            ))}
          </div>
        </div>
      );
    } else {
      if (log.workoutType === 'R') {
        return (
          <div key={log.date} style={{ padding:'12px 14px',background:'#f5f5f3',borderRadius:10,marginBottom:8 }}>
            <div style={{ fontSize:12,color:'#888',marginBottom:4 }}>{fmtDate(log.date)}</div>
            <div style={{ fontSize:13 }}>
              {log.rowingType === 'time' ? `${log.rowingValue} minutes` : `${log.rowingValue} metres`}
            </div>
          </div>
        );
      }
      if (log.workoutType === 'OC') {
        return (
          <div key={log.date} style={{ padding:'12px 14px',background:'#f5f5f3',borderRadius:10,marginBottom:8 }}>
            <div style={{ fontSize:12,color:'#888',marginBottom:4 }}>{fmtDate(log.date)}</div>
            <div style={{ fontSize:13 }}>{log.cardioNote}</div>
          </div>
        );
      }
      return (
        <div key={log.date} style={{ padding:'12px 14px',background:'#f5f5f3',borderRadius:10,marginBottom:8 }}>
          <div style={{ fontSize:12,color:'#888',marginBottom:8 }}>{fmtDate(log.date)}</div>
          {(log.exercises||[]).map((ex,i) => (
            <div key={i} style={{ marginBottom:10 }}>
              <div style={{ fontSize:13,fontWeight:500,marginBottom:4 }}>{ex.name}</div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
                {ex.sets.filter(s=>s.reps||s.weight).map((s,si) => (
                  <span key={si} style={{ background:'#fff',border:'1px solid #e0e0e0',borderRadius:6,padding:'4px 10px',fontSize:12 }}>
                    {s.reps} reps × {s.weight}kg
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
  }

  return (
    <div>
      <div style={{ display:'flex',gap:8,marginBottom:'1rem' }}>
        {[['exercise','By exercise'],['bodypart','By body part']].map(([k,l]) => (
          <button key={k} onClick={() => setFilterType(k)}
            style={{ flex:1,padding:'10px',borderRadius:8,border:`2px solid ${filterType===k?'#1a1a1a':'#ddd'}`,background:filterType===k?'#1a1a1a':'#fff',color:filterType===k?'#fff':'#888',fontWeight:500,cursor:'pointer',fontFamily:'inherit',fontSize:13 }}>
            {l}
          </button>
        ))}
      </div>

      {filterType === 'bodypart' && (
        <div style={{ display:'flex',flexWrap:'wrap',gap:8,marginBottom:'1rem' }}>
          {WORKOUT_TYPES.map(w => (
            <button key={w.key} onClick={() => setSelectedBP(w.key)}
              style={{ padding:'8px 12px',borderRadius:8,border:`2px solid ${selectedBP===w.key?w.color:'#ddd'}`,background:selectedBP===w.key?w.color+'15':'#fff',color:selectedBP===w.key?w.color:'#888',fontSize:13,fontWeight:selectedBP===w.key?500:400,cursor:'pointer',fontFamily:'inherit' }}>
              {w.key} — {w.label}
            </button>
          ))}
        </div>
      )}

      {filterType === 'exercise' && (
        <div style={{ marginBottom:'1rem' }}>
          <select value={selectedEx} onChange={e => setSelectedEx(e.target.value)}
            style={{ width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #ddd',fontSize:14,fontFamily:'inherit',background:'#fff' }}>
            <option value="">Select an exercise...</option>
            {allExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
          </select>
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign:'center',padding:'2rem',color:'#aaa',fontSize:14 }}>No data yet</div>
      )}

      {filtered.map(log => renderRow(log))}
    </div>
  );
}

// ─── GYM SECTION ──────────────────────────────────────────────────────────────
const GYM_TABS = [
  { key:'calendar', label:'🗓 Calendar' },
  { key:'log',      label:'📘 Log'      },
  { key:'history',  label:'📈 History'  },
];

function GymSection() {
  const now = new Date();
  const [tab, setTab]     = useState('calendar');
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  function prevMonth() { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
  function nextMonth() { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }

  const monthLabel = new Date(year,month).toLocaleString('default',{month:'long',year:'numeric'});

  return (
    <div>
      <div style={{ display:'flex',borderBottom:'1px solid #e5e5e5',marginBottom:'1.5rem',overflowX:'auto' }}>
        {GYM_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'10px 16px',background:'none',border:'none',borderBottom:`2px solid ${tab===t.key?'#1a1a1a':'transparent'}`,color:tab===t.key?'#1a1a1a':'#888',fontWeight:500,fontSize:14,whiteSpace:'nowrap',marginBottom:-1,cursor:'pointer',fontFamily:'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'calendar' && (
        <>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem' }}>
            <button onClick={prevMonth} style={{ background:'none',border:'1px solid #e5e5e5',borderRadius:8,padding:'6px 14px',fontSize:16,color:'#666',cursor:'pointer' }}>‹</button>
            <span style={{ fontWeight:500,fontSize:14,color:'#444' }}>{monthLabel}</span>
            <button onClick={nextMonth} style={{ background:'none',border:'1px solid #e5e5e5',borderRadius:8,padding:'6px 14px',fontSize:16,color:'#666',cursor:'pointer' }}>›</button>
          </div>
          <GymCalendar year={year} month={month} />
        </>
      )}
      {tab === 'log'      && <GymLog />}
      {tab === 'history'  && <ExerciseHistory />}
    </div>
  );
}

// ─── DEEP WORK TAB ────────────────────────────────────────────────────────────
function DeepWorkTab({ year, month }) {
  const [data, setData]   = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm]   = useState({ minutes:'60', subject:'A' });

  useEffect(() => { fetchData(); }, [year,month]);

  async function fetchData() {
    const res = await fetch(`/api/deepwork?year=${year}&month=${month+1}`);
    setData(await res.json());
  }

  async function save() {
    const hours = parseFloat((parseInt(form.minutes)/60).toFixed(2));
    await fetch('/api/deepwork', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ date:modal, hours, subject:form.subject, replace:false }) });
    setModal(null); fetchData();
  }

  async function clearDay() {
    await fetch('/api/deepwork', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ date:modal }) });
    setModal(null); fetchData();
  }

  const byDate = {};
  data.forEach(d => { if(!byDate[d.date]) byDate[d.date]=[]; byDate[d.date].push(d); });

  function getDayTotals(dateStr) {
    const sessions = byDate[dateStr]||[];
    const total = sessions.reduce((s,d)=>s+(d.hours||0),0);
    const subTotals = {};
    sessions.forEach(s=>{ subTotals[s.subject]=(subTotals[s.subject]||0)+s.hours; });
    const dominant = Object.entries(subTotals).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
    return { total, dominant, sessions, subTotals };
  }

  function getHeatColor(total) {
    if (!total) return { bg:COLORS.none, text:COLORS.noneText };
    if (total>=3) return { bg:COLORS.green1, text:COLORS.green1Text };
    if (total>=1.5) return { bg:COLORS.green2, text:COLORS.green2Text };
    return { bg:COLORS.amber, text:COLORS.amberText };
  }

  const allSessions = [...data].sort((a,b)=>b.date.localeCompare(a.date));
  const totalHours = data.reduce((s,d)=>s+(d.hours||0),0);
  const uniqueDays = Object.keys(byDate).length;
  const best = Object.values(byDate).reduce((m,sessions)=>{ const t=sessions.reduce((s,d)=>s+d.hours,0); return t>m?t:m; },0);
  const days = getDaysInMonth(year,month);
  const labels = Array.from({length:days},(_,i)=>i+1);
  const chartData = labels.map(d => { const {total}=getDayTotals(toDateStr(year,month,d)); return total; });

  return (
    <div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:'1.5rem' }}>
        <StatCard label="Hours this month" value={`${totalHours.toFixed(1)}h`} sub={`${new Date(year,month).toLocaleString('default',{month:'long'})} ${year}`} />
        <StatCard label="Days with deep work" value={uniqueDays} sub="this month" />
        <StatCard label="Best day" value={`${best.toFixed(1)}h`} sub="this month" />
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:'1.5rem' }}>
        {['S','M','T','W','T','F','S'].map((d,i)=>(<div key={i} style={{ textAlign:'center',fontSize:11,color:'#bbb',paddingBottom:4 }}>{d}</div>))}
        {Array.from({length:getFirstDayOfMonth(year,month)}).map((_,i)=><div key={`e${i}`}/>)}
        {Array.from({length:days},(_,i)=>i+1).map(day=>{
          const dateStr=toDateStr(year,month,day);
          const {total,subTotals}=getDayTotals(dateStr);
          const {bg,text}=getHeatColor(total);
          return (
            <div key={day} onClick={()=>{ setForm({minutes:'60',subject:'A'}); setModal(dateStr); }}
              style={{ aspectRatio:'1',borderRadius:6,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:text,position:'relative',cursor:'pointer',userSelect:'none' }}>
              {day}
              {Object.keys(subTotals).length>0 && (
                <span style={{ position:'absolute',bottom:2,left:3,fontSize:8,fontWeight:700,color:text,opacity:0.85 }}>
                  {Object.keys(subTotals).sort().join('')}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display:'flex',flexWrap:'wrap',gap:12,marginBottom:8 }}>
        {[[COLORS.amber,'under 1.5h'],[COLORS.green2,'1.5–3h'],[COLORS.green1,'3h+']].map(([c,l])=>(
          <div key={l} style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#666' }}>
            <div style={{ width:12,height:12,borderRadius:3,background:c }}/>{l}
          </div>
        ))}
      </div>
      <div style={{ display:'flex',flexWrap:'wrap',gap:12,marginBottom:'1.5rem' }}>
        {Object.entries(DW_SUBJECTS).map(([k,l])=>(
          <div key={k} style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#666' }}>
            <span style={{ fontWeight:500,color:DW_COLORS[k],fontSize:13 }}>{k}</span>{l}
          </div>
        ))}
      </div>

      <div style={{ display:'flex',flexDirection:'column',gap:'1.5rem',marginBottom:'1.5rem' }}>
        {[
          { label:'Overall', color:'#1a1a1a', data:chartData },
          { label:'A — Ozzy Wizzpop', color:DW_COLORS.A, data:labels.map(d=>{const s=(byDate[toDateStr(year,month,d)]||[]).filter(x=>x.subject==='A');return s.reduce((t,x)=>t+x.hours,0)||null;}) },
          { label:'B — Reading', color:DW_COLORS.B, data:labels.map(d=>{const s=(byDate[toDateStr(year,month,d)]||[]).filter(x=>x.subject==='B');return s.reduce((t,x)=>t+x.hours,0)||null;}) },
          { label:'C — Magic study', color:DW_COLORS.C, data:labels.map(d=>{const s=(byDate[toDateStr(year,month,d)]||[]).filter(x=>x.subject==='C');return s.reduce((t,x)=>t+x.hours,0)||null;}) },
        ].map(({label,color,data:d})=>(
          <div key={label}>
            <div style={{ fontSize:12,color:'#888',marginBottom:6 }}>{label}</div>
            <div style={{ height:120 }}>
              <Line data={{ labels, datasets:[{ data:d,borderColor:color,backgroundColor:color+'15',borderWidth:2,pointRadius:3,pointBackgroundColor:color,tension:0.35,fill:true,spanGaps:true }] }}
                options={{ responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{ x:{ticks:{color:'#999',font:{size:11}},grid:{color:'rgba(0,0,0,0.06)'}}, y:{min:0,ticks:{color:'#999',font:{size:10},callback:v=>v+'h'},grid:{color:'rgba(0,0,0,0.06)'}} } }} />
            </div>
          </div>
        ))}
      </div>

      {allSessions.length > 0 && (
        <div>
          <div style={{ fontSize:12,color:'#888',marginBottom:8 }}>Session log</div>
          <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
            {allSessions.map((s,i)=>(
              <div key={i} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:'#f5f5f3',borderRadius:8 }}>
                <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                  <span style={{ width:24,height:24,borderRadius:6,background:DW_COLORS[s.subject]||'#888',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:700 }}>{s.subject}</span>
                  <div>
                    <div style={{ fontSize:13,fontWeight:500 }}>{DW_SUBJECTS[s.subject]||s.subject}</div>
                    <div style={{ fontSize:11,color:'#888' }}>{s.date}</div>
                  </div>
                </div>
                <div style={{ fontSize:13,fontWeight:500,color:'#444' }}>{Math.round(s.hours*60)}m</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal && (
        <Modal title={`Log deep work — ${modal}`} onClose={()=>setModal(null)}>
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            {byDate[modal]&&byDate[modal].length>0&&(
              <div style={{ background:'#f0f0ee',borderRadius:8,padding:'10px 12px' }}>
                <div style={{ fontSize:12,color:'#666',marginBottom:6 }}>Already logged today:</div>
                {byDate[modal].map((s,i)=>(
                  <div key={i} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13,marginBottom:4 }}>
                    <span><strong style={{ color:DW_COLORS[s.subject] }}>{s.subject}</strong> — {DW_SUBJECTS[s.subject]}</span>
                    <span style={{ color:'#444',fontWeight:500 }}>{Math.round(s.hours*60)}m</span>
                  </div>
                ))}
                <div style={{ fontSize:12,color:'#888',marginTop:4,borderTop:'1px solid #ddd',paddingTop:4 }}>
                  Total: {Math.round(byDate[modal].reduce((s,d)=>s+d.hours,0)*60)}m ({byDate[modal].reduce((s,d)=>s+d.hours,0).toFixed(1)}h)
                </div>
              </div>
            )}
            <div>
              <label style={{ fontSize:13,color:'#666',display:'block',marginBottom:4 }}>Add minutes</label>
              <input type="number" min="1" max="480" value={form.minutes} onChange={e=>setForm(f=>({...f,minutes:e.target.value}))}
                placeholder="e.g. 45"
                style={{ width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #ddd',fontSize:16,fontFamily:'inherit' }} />
              <div style={{ fontSize:12,color:'#888',marginTop:4 }}>= {(parseInt(form.minutes||0)/60).toFixed(1)} hours</div>
            </div>
            <div>
              <label style={{ fontSize:13,color:'#666',display:'block',marginBottom:4 }}>Subject</label>
              <div style={{ display:'flex',gap:8 }}>
                {Object.entries(DW_SUBJECTS).map(([k,l])=>(
                  <button key={k} onClick={()=>setForm(f=>({...f,subject:k}))}
                    style={{ flex:1,padding:'8px 4px',borderRadius:8,border:`2px solid ${form.subject===k?DW_COLORS[k]:'#ddd'}`,background:form.subject===k?'#f5f5f5':'#fff',fontSize:12,color:form.subject===k?DW_COLORS[k]:'#888',fontWeight:form.subject===k?500:400,cursor:'pointer',fontFamily:'inherit' }}>
                    <span style={{ fontWeight:700,display:'block',fontSize:16 }}>{k}</span>{l}
                  </button>
                ))}
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
  const [data, setData]   = useState([]);
  const [modal, setModal] = useState(null);
  const [time, setTime]   = useState('19:00');

  useEffect(() => { fetchData(); }, [year,month]);

  async function fetchData() {
    const res = await fetch(`/api/switchoff?year=${year}&month=${month+1}`);
    setData(await res.json());
  }

  async function save() {
    await fetch('/api/switchoff', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ date:modal, time }) });
    setModal(null); fetchData();
  }

  async function remove() {
    await fetch('/api/switchoff', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ date:modal }) });
    setModal(null); fetchData();
  }

  const byDate = {};
  data.forEach(d=>{ byDate[d.date]=d; });

  function timeToMins(t) { const [h,m]=t.split(':').map(Number); return h*60+m; }

  function getHeatColor(day) {
    const entry = byDate[toDateStr(year,month,day)];
    if (!entry) return { bg:COLORS.none, text:COLORS.noneText };
    const mins = timeToMins(entry.time);
    if (mins<=19*60) return { bg:COLORS.green1, text:COLORS.green1Text };
    if (mins<=20*60) return { bg:COLORS.green2, text:COLORS.green2Text };
    if (mins<=21*60) return { bg:COLORS.amber, text:COLORS.amberText };
    return { bg:COLORS.red, text:COLORS.redText };
  }

  const hitTarget = data.filter(d=>timeToMins(d.time)<=19*60).length;
  const avgMins = data.length ? Math.round(data.reduce((s,d)=>s+timeToMins(d.time),0)/data.length) : null;
  const avgStr = avgMins ? `${Math.floor(avgMins/60)}:${pad(avgMins%60)}pm` : '—';
  const days = getDaysInMonth(year,month);
  const labels = Array.from({length:days},(_,i)=>i+1);
  const chartData = labels.map(d=>{ const e=byDate[toDateStr(year,month,d)]; return e?parseFloat((timeToMins(e.time)/60).toFixed(2)):null; });

  return (
    <div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:'1.5rem' }}>
        <StatCard label="Avg switch-off" value={avgStr} sub="this month" />
        <StatCard label="Days hit target" value={hitTarget} sub={`of ${days} days`} />
        <StatCard label="Target" value="7:00pm" sub="goal to reach" />
      </div>

      <CalendarGrid year={year} month={month}
        getCellStyle={day=>{ const {bg,text}=getHeatColor(day); return { background:bg,color:text,border:'none',borderRadius:6,fontWeight:400 }; }}
        onDayClick={day=>{ const e=byDate[toDateStr(year,month,day)]; setTime(e?e.time:'19:00'); setModal(toDateStr(year,month,day)); }}
      />

      <div style={{ display:'flex',flexWrap:'wrap',gap:12,marginBottom:'1.5rem' }}>
        {[[COLORS.green1,'Hit target (≤7pm)'],[COLORS.green2,'7–8pm'],[COLORS.amber,'8–9pm'],[COLORS.red,'After 9pm']].map(([c,l])=>(
          <div key={l} style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#666' }}>
            <div style={{ width:12,height:12,borderRadius:3,background:c }}/>{l}
          </div>
        ))}
      </div>

      <div style={{ fontSize:12,color:'#888',marginBottom:8 }}>Switch-off time — trend</div>
      <div style={{ height:180 }}>
        <Line data={{ labels, datasets:[{ data:chartData,borderColor:'#E24B4A',backgroundColor:'rgba(226,75,74,0.07)',borderWidth:2,pointRadius:3,tension:0.35,fill:true,spanGaps:true }] }}
          options={{ responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:(ctx)=>{ const h=Math.floor(ctx.parsed.y); const m=Math.round((ctx.parsed.y-h)*60); return `${h}:${pad(m)}pm`; }}}},scales:{ x:{ticks:{color:'#999',font:{size:11}},grid:{color:'rgba(0,0,0,0.06)'}}, y:{min:17,max:24,ticks:{color:'#999',font:{size:11},callback:v=>`${v}:00`},grid:{color:'rgba(0,0,0,0.06)'}} } }} />
      </div>

      {modal && (
        <Modal title={`Log switch-off — ${fmtDate(modal)}`} onClose={()=>setModal(null)}>
          <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
            <div>
              <label style={{ fontSize:13,color:'#666',display:'block',marginBottom:4 }}>Time you switched off</label>
              <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={{ width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid #ddd',fontSize:16,fontFamily:'inherit' }} />
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
const HABITS_TABS = [
  { key:'deepwork',  label:'🧠 Deep Work'   },
  { key:'switchoff', label:'📵 Switch-off'  },
];

function HabitsSection() {
  const now = new Date();
  const [tab, setTab]     = useState('deepwork');
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  function prevMonth() { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
  function nextMonth() { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }

  const monthLabel = new Date(year,month).toLocaleString('default',{month:'long',year:'numeric'});

  return (
    <div>
      <div style={{ display:'flex',borderBottom:'1px solid #e5e5e5',marginBottom:'1.5rem',overflowX:'auto' }}>
        {HABITS_TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{ padding:'10px 16px',background:'none',border:'none',borderBottom:`2px solid ${tab===t.key?'#1a1a1a':'transparent'}`,color:tab===t.key?'#1a1a1a':'#888',fontWeight:500,fontSize:14,whiteSpace:'nowrap',marginBottom:-1,cursor:'pointer',fontFamily:'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem' }}>
        <button onClick={prevMonth} style={{ background:'none',border:'1px solid #e5e5e5',borderRadius:8,padding:'6px 14px',fontSize:16,color:'#666',cursor:'pointer' }}>‹</button>
        <span style={{ fontWeight:500,fontSize:14,color:'#444' }}>{monthLabel}</span>
        <button onClick={nextMonth} style={{ background:'none',border:'1px solid #e5e5e5',borderRadius:8,padding:'6px 14px',fontSize:16,color:'#666',cursor:'pointer' }}>›</button>
      </div>

      {tab==='deepwork'  && <DeepWorkTab year={year} month={month} />}
      {tab==='switchoff' && <SwitchOffTab year={year} month={month} />}
    </div>
  );
}

// ─── NUTRITION PLACEHOLDER ────────────────────────────────────────────────────
function NutritionSection() {
  return (
    <div style={{ textAlign:'center',padding:'3rem 1rem',color:'#aaa' }}>
      <div style={{ fontSize:40,marginBottom:'1rem' }}>🥗</div>
      <div style={{ fontSize:16,fontWeight:500,color:'#888' }}>Nutrition coming soon</div>
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

      <div style={{ maxWidth:600,margin:'0 auto',padding:'0 0 4rem' }}>

        {/* Header */}
        <div style={{ padding:'1.25rem 1rem 0',marginBottom:'1rem' }}>
          <div style={{ fontSize:11,fontWeight:500,letterSpacing:'0.1em',textTransform:'uppercase',color:'#888',marginBottom:3 }}>Personal dashboard</div>
          <div style={{ fontSize:22,fontWeight:500 }}>Chris</div>
        </div>

        {/* Top nav */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:0,borderBottom:'1px solid #e5e5e5',marginBottom:'1.5rem' }}>
          {TOP_SECTIONS.map(s=>(
            <button key={s.key} onClick={()=>setSection(s.key)}
              style={{ padding:'12px 4px',background:'none',border:'none',borderBottom:`3px solid ${section===s.key?'#1a1a1a':'transparent'}`,color:section===s.key?'#1a1a1a':'#888',fontWeight:section===s.key?600:400,fontSize:13,cursor:'pointer',fontFamily:'inherit',marginBottom:-1,textAlign:'center' }}>
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ padding:'0 1rem' }}>
          {section==='gym'       && <GymSection />}
          {section==='nutrition' && <NutritionSection />}
          {section==='habits'    && <HabitsSection />}
        </div>
      </div>
    </>
  );
}
