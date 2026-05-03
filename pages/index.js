import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const TABS = ['Workouts', 'Switch-off', 'Deep Work', 'Lying In'];

const COLORS = {
  green1: '#C0DD97', green1Text: '#27500A',
  green2: '#C0DD97', green2Text: '#27500A',
  amber:  '#EF9F27', amberText:  '#412402',
  red:    '#E24B4A', redText:    '#501313',
  none:   '#EBEBEB', noneText:   '#888',
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}
function padDate(n) { return String(n).padStart(2, '0'); }
function toDateStr(year, month, day) {
  return `${year}-${padDate(month + 1)}-${padDate(day)}`;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', width: 320, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 500, fontSize: 16 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#888', padding: '0 4px' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: '#f0f0ee', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: '#999', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.06)' } },
    y: { ticks: { color: '#999', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.06)' } }
  }
};

// ─── WORKOUT TAB ───────────────────────────────────────────────────────────────
const WORKOUT_TYPES = [
  { key: 'L',  label: 'Legs',              color: '#3B6D11', hasIntensity: true  },
  { key: 'B',  label: 'Back & biceps',     color: '#185FA5', hasIntensity: true  },
  { key: 'C',  label: 'Chest & triceps',   color: '#7B2D8B', hasIntensity: true  },
  { key: 'D',  label: 'Delts',             color: '#BA7517', hasIntensity: true  },
  { key: 'R',  label: 'Rowing',            color: '#993556', hasIntensity: false },
  { key: 'OC', label: 'Other cardio',      color: '#2A7F7F', hasIntensity: false },
];

function WorkoutTab({ year, month }) {
  const [data, setData] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ type: 'L', intensity: '3' });

  useEffect(() => { fetchData(); }, [year, month]);

  async function fetchData() {
    const res = await fetch(`/api/workouts?year=${year}&month=${month + 1}`);
    setData(await res.json());
  }

  async function save() {
    const wt = WORKOUT_TYPES.find(w => w.key === form.type);
    await fetch('/api/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: modal, type: form.type, intensity: wt.hasIntensity ? form.intensity : null })
    });
    setModal(null); fetchData();
  }

  async function remove() {
    await fetch('/api/workouts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: modal })
    });
    setModal(null); fetchData();
  }

  const byDate = {};
  data.forEach(d => { byDate[d.date] = d; });

  const totalSessions = data.length;
  const bestSessions = data.filter(d => d.intensity == 3).length;
  const cardio = data.filter(d => d.type === 'R' || d.type === 'OC').length;

  const days = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <StatCard label="Sessions this month" value={totalSessions} sub={`${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}`} />
        <StatCard label="Intensity 3 sessions" value={bestSessions} sub="best sessions" />
        <StatCard label="Cardio sessions" value={cardio} sub="rowing + other" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: '1.5rem' }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 11, color: '#bbb', paddingBottom: 4 }}>{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => i + 1).map(day => {
          const dateStr = toDateStr(year, month, day);
          const entry = byDate[dateStr];
          const wt = entry ? WORKOUT_TYPES.find(w => w.key === entry.type) : null;
          const bg = wt ? wt.color : 'transparent';
          const border = wt ? 'none' : '1.5px solid #e0e0e0';
          return (
            <div key={day} onClick={() => {
              if (entry) setForm({ type: entry.type, intensity: String(entry.intensity || '3') });
              else setForm({ type: 'L', intensity: '3' });
              setModal(dateStr);
            }}
              style={{ aspectRatio: '1', borderRadius: 6, background: bg, border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: wt ? '#fff' : '#bbb', position: 'relative', cursor: 'pointer', fontWeight: wt ? 500 : 400 }}>
              {day}
              {entry && wt && (
                <>
                  <span style={{ position: 'absolute', bottom: 2, left: 4, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{entry.type}</span>
                  {entry.intensity && <span style={{ position: 'absolute', bottom: 2, right: 4, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{entry.intensity}</span>}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: '1.5rem' }}>
        {WORKOUT_TYPES.map(w => (
          <div key={w.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: w.color }} />
            <span style={{ fontWeight: 600 }}>{w.key}</span> {w.label}
          </div>
        ))}
      </div>

      {modal && (
        <Modal title={`Log workout — ${modal}`} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 6 }}>Workout type</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {WORKOUT_TYPES.map(w => (
                  <button key={w.key} onClick={() => setForm(f => ({ ...f, type: w.key }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: `2px solid ${form.type === w.key ? w.color : '#ddd'}`, background: form.type === w.key ? w.color+'15' : '#fff', textAlign: 'left', cursor: 'pointer' }}>
                    <span style={{ width: 28, height: 28, borderRadius: 6, background: w.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{w.key}</span>
                    <span style={{ fontSize: 14, color: form.type === w.key ? w.color : '#444', fontWeight: form.type === w.key ? 500 : 400 }}>{w.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {WORKOUT_TYPES.find(w => w.key === form.type)?.hasIntensity && (
              <div>
                <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Intensity</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['1','2','3'].map(n => (
                    <button key={n} onClick={() => setForm(f => ({ ...f, intensity: n }))}
                      style={{ flex: 1, padding: '10px', borderRadius: 8, border: `2px solid ${form.intensity === n ? '#1a1a1a' : '#ddd'}`, background: form.intensity === n ? '#1a1a1a' : '#fff', fontWeight: 500, fontSize: 16, color: form.intensity === n ? '#fff' : '#888' }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button onClick={save} style={{ background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 500, fontSize: 14 }}>Save</button>
            {byDate[modal] && <button onClick={remove} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '10px', color: '#E24B4A', fontSize: 14 }}>Remove entry</button>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── SWITCH-OFF TAB ────────────────────────────────────────────────────────────
function SwitchOffTab({ year, month }) {
  const [data, setData] = useState([]);
  const [modal, setModal] = useState(null);
  const [time, setTime] = useState('19:00');

  useEffect(() => { fetchData(); }, [year, month]);

  async function fetchData() {
    const res = await fetch(`/api/switchoff?year=${year}&month=${month + 1}`);
    setData(await res.json());
  }

  async function save() {
    await fetch('/api/switchoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: modal, time })
    });
    setModal(null); fetchData();
  }

  async function remove() {
    await fetch('/api/switchoff', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: modal })
    });
    setModal(null); fetchData();
  }

  const byDate = {};
  data.forEach(d => { byDate[d.date] = d; });

  function timeToMins(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  function getHeatColor(day) {
    const entry = byDate[toDateStr(year, month, day)];
    if (!entry) return { bg: COLORS.none, text: COLORS.noneText };
    const mins = timeToMins(entry.time);
    if (mins <= 19 * 60) return { bg: COLORS.green1, text: COLORS.green1Text };
    if (mins <= 20 * 60) return { bg: COLORS.green2, text: COLORS.green2Text };
    if (mins <= 21 * 60) return { bg: COLORS.amber, text: COLORS.amberText };
    return { bg: COLORS.red, text: COLORS.redText };
  }

  const hitTarget = data.filter(d => timeToMins(d.time) <= 19 * 60).length;
  const avgMins = data.length ? Math.round(data.reduce((s, d) => s + timeToMins(d.time), 0) / data.length) : null;
  const avgStr = avgMins ? `${Math.floor(avgMins / 60)}:${padDate(avgMins % 60)}pm` : '—';

  const days = getDaysInMonth(year, month);
  const labels = Array.from({ length: days }, (_, i) => i + 1);
  const chartData = labels.map(d => {
    const e = byDate[toDateStr(year, month, d)];
    return e ? parseFloat((timeToMins(e.time) / 60).toFixed(2)) : null;
  });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <StatCard label="Avg switch-off" value={avgStr} sub="this month" />
        <StatCard label="Days hit target" value={hitTarget} sub={`of ${days} days`} />
        <StatCard label="Target" value="7:00pm" sub="goal to reach" />
      </div>

      <CalendarGrid year={year} month={month} getCellStyle={day => {
        const { bg, text } = getHeatColor(day);
        return { background: bg, color: text, border: 'none', borderRadius: 6, fontWeight: 400 };
      }} onDayClick={day => {
        const e = byDate[toDateStr(year, month, day)];
        setTime(e ? e.time : '19:00');
        setModal(toDateStr(year, month, day));
      }} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: '1.5rem' }}>
        {[[COLORS.green1,'Hit target (≤7pm)'],[COLORS.green2,'7–8pm'],[COLORS.amber,'8–9pm'],[COLORS.red,'After 9pm']].map(([c,l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: c }} />{l}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Switch-off time — trend</div>
      <div style={{ height: 180 }}>
        <Line data={{
          labels,
          datasets: [{ data: chartData, borderColor: '#E24B4A', backgroundColor: 'rgba(226,75,74,0.07)', borderWidth: 2, pointRadius: 3, tension: 0.35, fill: true, spanGaps: true }]
        }} options={{ ...chartDefaults, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, min: 17, max: 24, ticks: { color: '#999', font: { size: 11 }, callback: v => `${v}:00` } } } }} />
      </div>

      {modal && (
        <Modal title={`Log switch-off — ${modal}`} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Time you switched off</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }} />
            </div>
            <button onClick={save} style={{ background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 500, fontSize: 14 }}>Save</button>
            {byDate[modal] && <button onClick={remove} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '10px', color: '#E24B4A', fontSize: 14 }}>Remove entry</button>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── DEEP WORK TAB ─────────────────────────────────────────────────────────────
function DeepWorkTab({ year, month }) {
  const [data, setData] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ minutes: '60', subject: 'A' });

  useEffect(() => { fetchData(); }, [year, month]);

  async function fetchData() {
    const res = await fetch(`/api/deepwork?year=${year}&month=${month + 1}`);
    setData(await res.json());
  }

  async function save() {
    const hours = parseFloat((parseInt(form.minutes) / 60).toFixed(2));
    await fetch('/api/deepwork', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: modal, hours, subject: form.subject, replace: false })
    });
    setModal(null); fetchData();
  }

  async function remove() {
    await fetch('/api/deepwork', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: modal })
    });
    setModal(null); fetchData();
  }

  const byDate = {};
  data.forEach(d => { byDate[d.date] = d; });

  function getHeatColor(hours) {
    if (!hours) return { bg: COLORS.none, text: COLORS.noneText };
    if (hours >= 3) return { bg: COLORS.green1, text: COLORS.green1Text };
    if (hours >= 1.5) return { bg: COLORS.green2, text: COLORS.green2Text };
    return { bg: COLORS.amber, text: COLORS.amberText };
  }

  const subjectColors = { A: '#3B6D11', B: '#185FA5', C: '#993556' };
  const totalHours = data.reduce((s, d) => s + (d.hours || 0), 0);
  const sessions = data.length;
  const avg = sessions ? (totalHours / sessions).toFixed(1) : '0';
  const best = data.reduce((m, d) => d.hours > m ? d.hours : m, 0);
  const days = getDaysInMonth(year, month);
  const labels = Array.from({ length: days }, (_, i) => i + 1);
  const chartData = labels.map(d => {
    const e = byDate[toDateStr(year, month, d)];
    return e ? e.hours : 0;
  });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <StatCard label="Hours this month" value={`${totalHours.toFixed(1)}h`} sub={`${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}`} />
        <StatCard label="Avg per session" value={`${avg}h`} sub={`${sessions} sessions`} />
        <StatCard label="Best day" value={`${best}h`} sub="this month" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: '1.5rem' }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 11, color: '#bbb', paddingBottom: 4 }}>{d}</div>
        ))}
        {Array.from({ length: getFirstDayOfMonth(year, month) }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => i + 1).map(day => {
          const dateStr = toDateStr(year, month, day);
          const entry = byDate[dateStr];
          const { bg, text } = getHeatColor(entry?.hours);
          return (
            <div key={day}
              onClick={() => {
                const mins = entry ? String(Math.round(entry.hours * 60)) : '60';
                setForm({ minutes: mins, subject: entry?.subject || 'A' });
                setModal(dateStr);
              }}
              style={{ aspectRatio: '1', borderRadius: 6, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: text, position: 'relative', cursor: 'pointer', userSelect: 'none' }}>
              {day}
              {entry?.subject && (
                <span style={{ position: 'absolute', top: 2, right: 3, fontSize: 9, fontWeight: 500, color: subjectColors[entry.subject] || text }}>
                  {entry.subject}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
        {[[COLORS.amber,'under 1.5h'],[COLORS.green2,'1.5–3h'],[COLORS.green1,'3h+']].map(([c,l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: c }} />{l}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: '1.5rem' }}>
        {[['A','Ozzy Wizzpop'],['B','Reading'],['C','Magic study']].map(([k,l]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666' }}>
            <span style={{ fontWeight: 500, color: subjectColors[k], fontSize: 13 }}>{k}</span>{l}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Deep work hours — trend</div>
      <div style={{ height: 180 }}>
        <Bar data={{
          labels,
          datasets: [{ data: chartData, backgroundColor: chartData.map(h => h >= 3 ? COLORS.green1 : h >= 1.5 ? COLORS.green2 : h > 0 ? COLORS.amber : COLORS.none), borderRadius: 3 }]
        }} options={{ ...chartDefaults, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, min: 0, ticks: { color: '#999', font: { size: 11 }, callback: v => v + 'h' } } } }} />
      </div>

      {modal && (
        <Modal title={`Log deep work — ${modal}`} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {byDate[modal] && (
              <div style={{ background: '#f0f0ee', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#444' }}>
                Already logged today: <strong>{Math.round(byDate[modal].hours * 60)} min ({byDate[modal].hours.toFixed(1)}h)</strong> — adding to this
              </div>
            )}
            <div>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Add minutes</label>
              <input type="number" min="20" max="480" step="20" value={form.minutes} onChange={e => setForm(f => ({ ...f, minutes: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }} />
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                = {(parseInt(form.minutes || 0) / 60).toFixed(1)} hours
                {byDate[modal] && ` → total will be ${((byDate[modal].hours) + parseInt(form.minutes || 0) / 60).toFixed(1)}h`}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[20,40,60,90,120,180].map(n => (
                <button key={n} onClick={() => setForm(f => ({ ...f, minutes: String(n) }))}
                  style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${form.minutes == n ? '#1a1a1a' : '#ddd'}`, background: form.minutes == n ? '#1a1a1a' : '#fff', color: form.minutes == n ? '#fff' : '#666', fontSize: 13 }}>
                  {n}m
                </button>
              ))}
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Subject</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['A','Ozzy Wizzpop'],['B','Reading'],['C','Magic study']].map(([k, l]) => (
                  <button key={k} onClick={() => setForm(f => ({ ...f, subject: k }))}
                    style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `2px solid ${form.subject === k ? subjectColors[k] : '#ddd'}`, background: form.subject === k ? '#f5f5f5' : '#fff', fontSize: 12, color: form.subject === k ? subjectColors[k] : '#888', fontWeight: form.subject === k ? 500 : 400 }}>
                    <span style={{ fontWeight: 700, display: 'block', fontSize: 16 }}>{k}</span>{l}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={save} style={{ background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 500, fontSize: 14 }}>Add to today</button>
            {byDate[modal] && <button onClick={remove} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '10px', color: '#E24B4A', fontSize: 14 }}>Clear today's total</button>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── LYING IN TAB ──────────────────────────────────────────────────────────────
function LyingInTab({ year, month }) {
  const [data, setData] = useState([]);
  const [modal, setModal] = useState(null);
  const [minutes, setMinutes] = useState('15');

  useEffect(() => { fetchData(); }, [year, month]);

  async function fetchData() {
    const res = await fetch(`/api/lyingin?year=${year}&month=${month + 1}`);
    setData(await res.json());
  }

  async function save() {
    await fetch('/api/lyingin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: modal, minutes })
    });
    setModal(null); fetchData();
  }

  async function remove() {
    await fetch('/api/lyingin', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: modal })
    });
    setModal(null); fetchData();
  }

  const byDate = {};
  data.forEach(d => { byDate[d.date] = d; });

  function getHeatColor(mins) {
    if (!mins && mins !== 0) return { bg: COLORS.none, text: COLORS.noneText };
    if (mins < 10) return { bg: COLORS.green1, text: COLORS.green1Text };
    if (mins < 20) return { bg: COLORS.green2, text: COLORS.green2Text };
    if (mins < 40) return { bg: COLORS.amber, text: COLORS.amberText };
    return { bg: COLORS.red, text: COLORS.redText };
  }

  const under10 = data.filter(d => d.minutes < 10).length;
  const avgMins = data.length ? Math.round(data.reduce((s, d) => s + d.minutes, 0) / data.length) : 0;
  const days = getDaysInMonth(year, month);
  const labels = Array.from({ length: days }, (_, i) => i + 1);
  const chartData = labels.map(d => {
    const e = byDate[toDateStr(year, month, d)];
    return e ? e.minutes : null;
  });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <StatCard label="Avg lying-in" value={`${avgMins} min`} sub="this month" />
        <StatCard label="Days under 10 min" value={under10} sub={`of ${data.length} logged`} />
        <StatCard label="Target" value="Under 10 min" sub="goal to reach" />
      </div>

      <CalendarGrid year={year} month={month} getCellStyle={day => {
        const entry = byDate[toDateStr(year, month, day)];
        const { bg, text } = getHeatColor(entry?.minutes);
        return { background: bg, color: text, border: 'none', borderRadius: 6, fontWeight: 400 };
      }} onDayClick={day => {
        const e = byDate[toDateStr(year, month, day)];
        setMinutes(e ? String(e.minutes) : '15');
        setModal(toDateStr(year, month, day));
      }} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: '1.5rem' }}>
        {[[COLORS.green1,'Under 10 min'],[COLORS.green2,'10–20 min'],[COLORS.amber,'20–40 min'],[COLORS.red,'40+ min']].map(([c,l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666' }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: c }} />{l}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Lying-in duration — trend</div>
      <div style={{ height: 180 }}>
        <Line data={{
          labels,
          datasets: [{ data: chartData, borderColor: '#E24B4A', backgroundColor: 'rgba(226,75,74,0.07)', borderWidth: 2, pointRadius: 3, tension: 0.35, fill: true, spanGaps: true }]
        }} options={{ ...chartDefaults, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, min: 0, ticks: { color: '#999', font: { size: 11 }, callback: v => v + 'm' } } } }} />
      </div>

      {modal && (
        <Modal title={`Log lying-in — ${modal}`} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, color: '#666', display: 'block', marginBottom: 4 }}>Minutes in bed after waking</label>
              <input type="number" min="0" max="180" step="1" value={minutes} onChange={e => setMinutes(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 16 }} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[5,10,15,20,30,45,60].map(n => (
                <button key={n} onClick={() => setMinutes(String(n))}
                  style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${minutes == n ? '#1a1a1a' : '#ddd'}`, background: minutes == n ? '#1a1a1a' : '#fff', color: minutes == n ? '#fff' : '#666', fontSize: 13 }}>
                  {n}m
                </button>
              ))}
            </div>
            <button onClick={save} style={{ background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontWeight: 500, fontSize: 14 }}>Save</button>
            {byDate[modal] && <button onClick={remove} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 8, padding: '10px', color: '#E24B4A', fontSize: 14 }}>Remove entry</button>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── CALENDAR GRID (shared) ────────────────────────────────────────────────────
function CalendarGrid({ year, month, getCellStyle, onDayClick }) {
  const days = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: '1.5rem' }}>
      {['S','M','T','W','T','F','S'].map((d, i) => (
        <div key={i} style={{ textAlign: 'center', fontSize: 11, color: '#bbb', paddingBottom: 4 }}>{d}</div>
      ))}
      {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
      {Array.from({ length: days }, (_, i) => i + 1).map(day => {
        const style = getCellStyle(day);
        return (
          <div key={day} onClick={() => onDayClick(day)}
            style={{ aspectRatio: '1', borderRadius: style.borderRadius || '50%', border: style.border || 'none', background: style.background || 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: style.color || '#bbb', fontWeight: style.fontWeight || 400, cursor: 'pointer' }}>
            {day}
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const now = new Date();
  const [tab, setTab] = useState(0);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const monthLabel = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <>
      <Head>
        <title>Chris's Productivity Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: 4 }}>Personal dashboard</div>
          <div style={{ fontSize: 24, fontWeight: 500 }}>Chris's productivity tracker</div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #e5e5e5', marginBottom: '1.5rem', overflowX: 'auto' }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === i ? '#1a1a1a' : 'transparent'}`, color: tab === i ? '#1a1a1a' : '#888', fontWeight: 500, fontSize: 14, whiteSpace: 'nowrap', marginBottom: -1 }}>
              {t}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: '1px solid #e5e5e5', borderRadius: 8, padding: '6px 14px', fontSize: 16, color: '#666' }}>‹</button>
          <span style={{ fontWeight: 500, fontSize: 14, color: '#444' }}>{monthLabel}</span>
          <button onClick={nextMonth} style={{ background: 'none', border: '1px solid #e5e5e5', borderRadius: 8, padding: '6px 14px', fontSize: 16, color: '#666' }}>›</button>
        </div>

        {tab === 0 && <WorkoutTab year={year} month={month} />}
        {tab === 1 && <SwitchOffTab year={year} month={month} />}
        {tab === 2 && <DeepWorkTab year={year} month={month} />}
        {tab === 3 && <LyingInTab year={year} month={month} />}
      </div>
    </>
  );
}
