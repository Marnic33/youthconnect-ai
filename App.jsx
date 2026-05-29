import { useState, useEffect, useRef, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

// ─── GOOGLE SHEETS API ──────────────────────────────────────────────────────
const SHEETS_API = "https://script.google.com/macros/s/AKfycbxNilLwy4UFAxltaVxnSD5ij_s6apgtMiUhmbfM7Tj1aw7JomN4AolNi5adxqOCSb3s/exec";

async function apiList() {
  try {
    const r = await fetch(SHEETS_API + "?action=list");
    const d = await r.json();
    return d.youth || [];
  } catch (e) { return null; }
}
async function apiPost(payload) {
  // text/plain evita preflight CORS no Apps Script
  return fetch(SHEETS_API, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
}

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const SEED_YOUTH = [
  {
    id: "y1", name: "Ana Beatriz Santos", age: 19, address: "Rua das Flores, 42", livesWithParents: true,
    status: "studying", course: "Ciências da Computação", skills: ["Design Gráfico","Edição de Vídeo","Violão"],
    studyHours: { mon:"08-12", tue:"08-12", wed:"13-17", thu:"08-12", fri:"08-12" },
    workHours: {}, seekingJob: false, avatar: "AB",
    timeline: [{ date:"2024-03-01", note:"Primeira visita à célula de jovens." },{ date:"2024-06-15", note:"Pedido de oração pela família." }],
    customFields: { batizado: "Sim", tocaInstrumento: "Violão" }, approved: true
  },
  {
    id: "y2", name: "Carlos Eduardo Lima", age: 22, address: "Av. Brasil, 500", livesWithParents: false,
    status: "working", course: "Técnico em TI", skills: ["Informática","Manutenção de PCs","Som e Áudio"],
    studyHours: {}, workHours: { mon:"08-17", tue:"08-17", wed:"08-17", thu:"08-17", fri:"08-17" },
    seekingJob: false, avatar: "CE",
    timeline: [{ date:"2024-01-10", note:"Voluntário na equipe de som." }],
    customFields: { batizado: "Não", tocaInstrumento: "Bateria" }, approved: true
  },
  {
    id: "y3", name: "Mariana Oliveira", age: 20, address: "Rua da Paz, 88", livesWithParents: true,
    status: "both", course: "Administração", skills: ["Redes Sociais","Fotografia","Teclado"],
    studyHours: { mon:"18-22", tue:"18-22", thu:"18-22" },
    workHours: { mon:"08-17", tue:"08-17", wed:"08-17", thu:"08-17" },
    seekingJob: false, avatar: "MO",
    timeline: [{ date:"2024-05-20", note:"Participou do retiro jovem 2024." }],
    customFields: { batizado: "Sim", tocaInstrumento: "Teclado" }, approved: true
  },
  {
    id: "y4", name: "Rafael Mendes", age: 21, address: "Rua Esperança, 15", livesWithParents: true,
    status: "seeking", course: "Design Gráfico", skills: ["Illustrator","Photoshop","Design"],
    studyHours: {}, workHours: {}, seekingJob: true, avatar: "RM",
    timeline: [{ date:"2024-07-01", note:"Buscando oportunidade na área de design." }],
    customFields: { batizado: "Sim", tocaInstrumento: "Não" }, approved: true
  },
  {
    id: "y5", name: "Juliana Costa", age: 18, address: "Rua Nova, 77", livesWithParents: true,
    status: "studying", course: "Enfermagem", skills: ["Canto","Mídia","Redes Sociais"],
    studyHours: { mon:"07-12", tue:"07-12", wed:"07-12", thu:"07-12", fri:"07-12" },
    workHours: {}, seekingJob: false, avatar: "JC",
    timeline: [],
    customFields: { batizado: "Não", tocaInstrumento: "Não" }, approved: true
  },
  {
    id: "y6", name: "Lucas Ferreira", age: 23, address: "Bairro Industrial, 300", livesWithParents: false,
    status: "both", course: "Engenharia Elétrica", skills: ["Elétrica","Informática","Mixagem de Áudio"],
    studyHours: { tue:"19-23", thu:"19-23" },
    workHours: { mon:"07-16", tue:"07-16", wed:"07-16", thu:"07-16", fri:"07-16" },
    seekingJob: false, avatar: "LF",
    timeline: [{ date:"2024-04-10", note:"Ajudou na instalação do sistema de som." }],
    customFields: { batizado: "Sim", tocaInstrumento: "Baixo" }, approved: true
  },
];

const SEED_JOBS = [
  { id: "j1", title: "Designer Gráfico Jr.", company: "Agência Criativa", type: "CLT", area: "Design", skills: ["Design","Photoshop","Illustrator"], date: "2024-07-10" },
  { id: "j2", title: "Suporte Técnico", company: "TechSolutions", type: "Estágio", area: "Informática", skills: ["Informática","Manutenção de PCs"], date: "2024-07-15" },
];

const SEED_PENDING = [
  {
    id: "p1", name: "Thiago Ramos", age: 17, address: "Rua da Igreja, 10", livesWithParents: true,
    status: "studying", course: "Ensino Médio", skills: ["Guitarra","Canto"],
    studyHours: { mon:"07-12", tue:"07-12", wed:"07-12", thu:"07-12", fri:"07-12" },
    workHours: {}, seekingJob: false, avatar: "TR",
    timeline: [], customFields: {}, approved: false
  }
];

const DAYS = ["seg","ter","qua","qui","sex","sáb","dom"];
const PERIODS = ["Manhã (06-12)","Tarde (12-18)","Noite (18-23)"];
const STATUS_LABELS = { studying:"Estudando", working:"Trabalhando", both:"Ambos", seeking:"Buscando Oportunidade" };
const STATUS_COLORS = { studying:"#6EE7B7", working:"#60A5FA", both:"#A78BFA", seeking:"#FCD34D" };

// ─── UTILS ────────────────────────────────────────────────────────────────────
function initLS() {
  if (!localStorage.getItem("yc_youth")) localStorage.setItem("yc_youth", JSON.stringify(SEED_YOUTH));
  if (!localStorage.getItem("yc_jobs")) localStorage.setItem("yc_jobs", JSON.stringify(SEED_JOBS));
  if (!localStorage.getItem("yc_pending")) localStorage.setItem("yc_pending", JSON.stringify(SEED_PENDING));
  if (!localStorage.getItem("yc_custom_fields")) localStorage.setItem("yc_custom_fields", JSON.stringify([{ key:"batizado", label:"Batizado?" },{ key:"tocaInstrumento", label:"Toca Instrumento?" }]));
}

function useLS(key, defaultVal) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : defaultVal; }
    catch { return defaultVal; }
  });
  const set = useCallback(v => {
    setVal(v);
    localStorage.setItem(key, JSON.stringify(v));
  }, [key]);
  return [val, set];
}

function avatarColor(initials) {
  const colors = ["#6EE7B7","#60A5FA","#A78BFA","#FCD34D","#F472B6","#34D399","#818CF8"];
  let h = 0;
  for (const c of initials) h = (h * 31 + c.charCodeAt(0)) % colors.length;
  return colors[h];
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function Avatar({ initials, size = 40 }) {
  const bg = avatarColor(initials);
  return (
    <div style={{ width: size, height: size, background: bg, borderRadius: "50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize: size * 0.38, color:"#0f172a", flexShrink:0 }}>
      {initials}
    </div>
  );
}

function Badge({ label, color }) {
  return (
    <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius:6, padding:"2px 10px", fontSize:12, fontWeight:600 }}>
      {label}
    </span>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div style={{ background:"#1e293b", borderRadius:16, padding:24, maxWidth:640, width:"100%", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 25px 60px #000" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ color:"#f1f5f9", fontWeight:700, fontSize:20 }}>{title}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:22 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ youth }) {
  const statusData = Object.entries(STATUS_LABELS).map(([k, label]) => ({
    name: label,
    value: youth.filter(y => y.status === k).length,
    color: STATUS_COLORS[k]
  })).filter(d => d.value > 0);

  const seekingCount = youth.filter(y => y.seekingJob).length;

  // Availability heatmap: for each day+period, count free youth
  const dayKeys = ["mon","tue","wed","thu","fri","sat","sun"];
  const dayLabels = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];

  function isFree(y, dayKey, period) {
    const study = y.studyHours[dayKey] || "";
    const work = y.workHours[dayKey] || "";
    const periodStart = period === 0 ? 6 : period === 1 ? 12 : 18;
    const periodEnd = period === 0 ? 12 : period === 1 ? 18 : 23;
    const overlaps = (h) => {
      if (!h) return false;
      const [s, e] = h.split("-").map(Number);
      return s < periodEnd && e > periodStart;
    };
    return !overlaps(study) && !overlaps(work);
  }

  const availData = dayKeys.map((dk, di) => {
    const row = { day: dayLabels[di] };
    PERIODS.forEach((p, pi) => {
      row[p] = youth.filter(y => isFree(y, dk, pi)).length;
    });
    return row;
  });

  const radarData = PERIODS.map((p, pi) => ({
    period: p.split(" ")[0],
    ...Object.fromEntries(dayLabels.map((dl, di) => [dl, availData[di][p]]))
  }));

  const skills = {};
  youth.forEach(y => y.skills.forEach(s => { skills[s] = (skills[s] || 0) + 1; }));
  const skillData = Object.entries(skills).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,val])=>({name,val}));

  const stats = [
    { label:"Total de Jovens", value: youth.length, icon:"👥", accent:"#6EE7B7" },
    { label:"Buscando Emprego", value: seekingCount, icon:"🎯", accent:"#FCD34D" },
    { label:"Talentos Cadastrados", value: Object.keys(skills).length, icon:"✨", accent:"#A78BFA" },
    { label:"Aprovados", value: youth.filter(y=>y.approved).length, icon:"✅", accent:"#60A5FA" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      {/* Stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:16 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background:"#1e293b", borderRadius:14, padding:20, borderLeft:`4px solid ${s.accent}`, boxShadow:"0 4px 20px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize:28 }}>{s.icon}</div>
            <div style={{ fontSize:32, fontWeight:800, color:s.accent, lineHeight:1.1 }}>{s.value}</div>
            <div style={{ color:"#94a3b8", fontSize:13, marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {/* Status pie */}
        <div style={{ background:"#1e293b", borderRadius:14, padding:20, boxShadow:"0 4px 20px rgba(0,0,0,0.3)" }}>
          <h3 style={{ color:"#e2e8f0", fontSize:15, fontWeight:700, marginBottom:16 }}>📊 Divisão por Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {statusData.map((d,i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background:"#0f172a", border:"none", borderRadius:8, color:"#f1f5f9" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Skills bar */}
        <div style={{ background:"#1e293b", borderRadius:14, padding:20, boxShadow:"0 4px 20px rgba(0,0,0,0.3)" }}>
          <h3 style={{ color:"#e2e8f0", fontSize:15, fontWeight:700, marginBottom:16 }}>✨ Top Talentos do Grupo</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={skillData} layout="vertical" margin={{ left:10 }}>
              <XAxis type="number" tick={{ fill:"#64748b", fontSize:11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill:"#94a3b8", fontSize:11 }} width={110} />
              <Tooltip contentStyle={{ background:"#0f172a", border:"none", borderRadius:8, color:"#f1f5f9" }} />
              <Bar dataKey="val" fill="#6EE7B7" radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Availability heatmap */}
      <div style={{ background:"#1e293b", borderRadius:14, padding:20, boxShadow:"0 4px 20px rgba(0,0,0,0.3)" }}>
        <h3 style={{ color:"#e2e8f0", fontSize:15, fontWeight:700, marginBottom:16 }}>🗓 Matriz de Disponibilidade do Grupo</h3>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"separate", borderSpacing:4 }}>
            <thead>
              <tr>
                <th style={{ color:"#64748b", fontSize:12, textAlign:"left", paddingBottom:8, width:110 }}>Período</th>
                {dayLabels.map(d => <th key={d} style={{ color:"#94a3b8", fontSize:12, textAlign:"center", fontWeight:600 }}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((p, pi) => (
                <tr key={p}>
                  <td style={{ color:"#64748b", fontSize:12, paddingRight:8 }}>{p}</td>
                  {dayKeys.map((dk, di) => {
                    const count = availData[di][p];
                    const pct = youth.length ? count / youth.length : 0;
                    const bg = `rgba(110,231,183,${pct * 0.8 + 0.05})`;
                    return (
                      <td key={dk} style={{ background:bg, borderRadius:8, textAlign:"center", padding:"10px 4px" }} title={`${count} livres`}>
                        <span style={{ color: pct > 0.5 ? "#0f172a" : "#94a3b8", fontSize:13, fontWeight:700 }}>{count}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ color:"#64748b", fontSize:11, marginTop:8 }}>Número de jovens disponíveis em cada período (mais escuro = mais disponíveis).</p>
        </div>
      </div>
    </div>
  );
}

// ─── YOUTH CARD ───────────────────────────────────────────────────────────────
function YouthCard({ youth, onOpen }) {
  return (
    <div onClick={() => onOpen(youth)} style={{ background:"#1e293b", borderRadius:14, padding:16, cursor:"pointer", border:"1px solid transparent", transition:"all 0.2s", boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}
      onMouseEnter={e => e.currentTarget.style.borderColor="#6EE7B7"}
      onMouseLeave={e => e.currentTarget.style.borderColor="transparent"}>
      <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
        <Avatar initials={youth.avatar} size={44} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ color:"#f1f5f9", fontWeight:700, fontSize:15, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{youth.name}</div>
          <div style={{ color:"#64748b", fontSize:12 }}>{youth.age} anos · {youth.course}</div>
        </div>
        <Badge label={STATUS_LABELS[youth.status]} color={STATUS_COLORS[youth.status]} />
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {youth.skills.slice(0,4).map(s => (
          <span key={s} style={{ background:"#0f172a", color:"#94a3b8", borderRadius:6, padding:"2px 8px", fontSize:11 }}>{s}</span>
        ))}
        {youth.skills.length > 4 && <span style={{ color:"#64748b", fontSize:11 }}>+{youth.skills.length-4}</span>}
      </div>
      {youth.seekingJob && <div style={{ marginTop:10, color:"#FCD34D", fontSize:12, display:"flex", alignItems:"center", gap:4 }}>🎯 Buscando oportunidade</div>}
    </div>
  );
}

// ─── YOUTH PROFILE MODAL ──────────────────────────────────────────────────────
function YouthProfile({ youth, onClose, onUpdate, customFields }) {
  const [tab, setTab] = useState("info");
  const [newNote, setNewNote] = useState("");

  function addNote() {
    if (!newNote.trim()) return;
    const updated = { ...youth, timeline: [...(youth.timeline||[]), { date: new Date().toISOString().slice(0,10), note: newNote }] };
    onUpdate(updated);
    setNewNote("");
  }

  const tabs = [["info","📋 Perfil"],["timeline","📅 Histórico"],["fields","⚙️ Campos"]];

  return (
    <div>
      <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:20 }}>
        <Avatar initials={youth.avatar} size={56} />
        <div>
          <div style={{ color:"#f1f5f9", fontWeight:800, fontSize:20 }}>{youth.name}</div>
          <div style={{ color:"#64748b", fontSize:13 }}>{youth.age} anos · {youth.address}</div>
          <div style={{ marginTop:4 }}><Badge label={STATUS_LABELS[youth.status]} color={STATUS_COLORS[youth.status]} /></div>
        </div>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:20, borderBottom:"1px solid #334155", paddingBottom:12 }}>
        {tabs.map(([key,label]) => (
          <button key={key} onClick={()=>setTab(key)} style={{ background: tab===key?"#6EE7B7":"transparent", color: tab===key?"#0f172a":"#94a3b8", border:"none", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontWeight:600, fontSize:13, transition:"all 0.2s" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <InfoRow label="Mora com os pais" value={youth.livesWithParents ? "Sim" : "Não"} />
          <InfoRow label="Curso" value={youth.course} />
          <InfoRow label="Buscando emprego" value={youth.seekingJob ? "Sim 🎯" : "Não"} />
          <div>
            <div style={{ color:"#64748b", fontSize:12, marginBottom:6 }}>HABILIDADES</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {youth.skills.map(s => <span key={s} style={{ background:"#0f172a", color:"#6EE7B7", border:"1px solid #6EE7B744", borderRadius:6, padding:"3px 10px", fontSize:12 }}>{s}</span>)}
            </div>
          </div>
          {customFields.map(cf => (
            <InfoRow key={cf.key} label={cf.label} value={youth.customFields?.[cf.key] || "—"} />
          ))}
        </div>
      )}

      {tab === "timeline" && (
        <div>
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16, maxHeight:260, overflowY:"auto" }}>
            {(!youth.timeline || youth.timeline.length === 0) && <p style={{ color:"#64748b", fontSize:13 }}>Nenhum registro ainda.</p>}
            {(youth.timeline||[]).map((t,i) => (
              <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                <div style={{ width:3, background:"#6EE7B7", borderRadius:4, alignSelf:"stretch", flexShrink:0 }} />
                <div>
                  <div style={{ color:"#64748b", fontSize:11 }}>{t.date}</div>
                  <div style={{ color:"#e2e8f0", fontSize:13 }}>{t.note}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input value={newNote} onChange={e=>setNewNote(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addNote()}
              placeholder="Adicionar registro..." style={{ flex:1, background:"#0f172a", border:"1px solid #334155", borderRadius:8, padding:"8px 12px", color:"#f1f5f9", fontSize:13, outline:"none" }} />
            <button onClick={addNote} style={{ background:"#6EE7B7", color:"#0f172a", border:"none", borderRadius:8, padding:"8px 14px", cursor:"pointer", fontWeight:700, fontSize:13 }}>+</button>
          </div>
        </div>
      )}

      {tab === "fields" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {customFields.map(cf => (
            <div key={cf.key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#0f172a", borderRadius:8, padding:"10px 14px" }}>
              <span style={{ color:"#94a3b8", fontSize:13 }}>{cf.label}</spa
