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
              <span style={{ color:"#94a3b8", fontSize:13 }}>{cf.label}</span>
              <input defaultValue={youth.customFields?.[cf.key]||""} onBlur={e=>{
                const updated = { ...youth, customFields:{ ...(youth.customFields||{}), [cf.key]:e.target.value }};
                onUpdate(updated);
              }} style={{ background:"transparent", border:"1px solid #334155", borderRadius:6, padding:"4px 8px", color:"#f1f5f9", fontSize:13, width:140, outline:"none", textAlign:"right" }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#0f172a", borderRadius:8, padding:"10px 14px" }}>
      <span style={{ color:"#64748b", fontSize:12, textTransform:"uppercase", letterSpacing:1 }}>{label}</span>
      <span style={{ color:"#e2e8f0", fontSize:13, fontWeight:600 }}>{value}</span>
    </div>
  );
}

// ─── YOUTH LIST (Members module) ──────────────────────────────────────────────
function MembersModule({ youth, setYouth, customFields }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = youth.filter(y => {
    const q = search.toLowerCase();
    const matchQ = y.name.toLowerCase().includes(q) || y.skills.some(s=>s.toLowerCase().includes(q)) || y.course.toLowerCase().includes(q);
    const matchS = !filterStatus || y.status === filterStatus;
    return matchQ && matchS;
  });

  function updateYouth(updated) {
    const list = youth.map(y => y.id === updated.id ? updated : y);
    setYouth(list);
    setSelected(updated);
  }

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Buscar por nome, habilidade ou curso..." style={{ flex:1, minWidth:200, background:"#1e293b", border:"1px solid #334155", borderRadius:10, padding:"10px 14px", color:"#f1f5f9", fontSize:14, outline:"none" }} />
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
          style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:10, padding:"10px 14px", color:"#94a3b8", fontSize:13, outline:"none" }}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
        {filtered.map(y => <YouthCard key={y.id} youth={y} onOpen={setSelected} />)}
      </div>
      {filtered.length === 0 && <p style={{ color:"#64748b", textAlign:"center", marginTop:40 }}>Nenhum jovem encontrado.</p>}
      <Modal open={!!selected} onClose={()=>setSelected(null)} title="Ficha do Jovem">
        {selected && <YouthProfile youth={selected} onClose={()=>setSelected(null)} onUpdate={updateYouth} customFields={customFields} />}
      </Modal>
    </div>
  );
}

// ─── PUBLIC REGISTRATION FORM ─────────────────────────────────────────────────
function PublicForm({ onSubmit }) {
  const [form, setForm] = useState({
    name:"", age:"", address:"", livesWithParents:true, status:"studying", course:"",
    skillsRaw:"", studyMorning:false, studyAfternoon:false, studyNight:false,
    workMorning:false, workAfternoon:false, workNight:false, seekingJob:false
  });
  const [sent, setSent] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  async function handleSubmit() {
    if (!form.name || !form.age) return;
    const initials = form.name.split(" ").slice(0,2).map(w=>w[0].toUpperCase()).join("");
    const entry = {
      id: "p" + Date.now(), name:form.name, age:Number(form.age), address:form.address,
      livesWithParents:form.livesWithParents, status:form.status, course:form.course,
      skills: form.skillsRaw.split(",").map(s=>s.trim()).filter(Boolean),
      studyHours:{}, workHours:{}, seekingJob:form.seekingJob,
      avatar: initials || "??", timeline:[], customFields:{}, approved:false
    };
    setSent(true);
    onSubmit(entry);
    // Envia para o Google Sheets (não bloqueia a tela de sucesso)
    apiPost({ action:"register", youth: entry }).catch(()=>{});
  }

  if (sent) return (
    <div style={{ textAlign:"center", padding:"60px 24px" }}>
      <div style={{ fontSize:64, marginBottom:16 }}>🙌</div>
      <h2 style={{ color:"#6EE7B7", fontWeight:800, fontSize:24, marginBottom:8 }}>Cadastro Enviado!</h2>
      <p style={{ color:"#94a3b8", fontSize:15 }}>Seu cadastro foi enviado para aprovação do líder. Em breve você será adicionado ao grupo!</p>
    </div>
  );

  const input = { background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:"12px 14px", color:"#f1f5f9", fontSize:14, outline:"none", width:"100%", boxSizing:"border-box" };
  const label = { color:"#64748b", fontSize:12, textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:6 };

  return (
    <div style={{ maxWidth:520, margin:"0 auto", padding:24 }}>
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div style={{ fontSize:42, marginBottom:8 }}>✝️</div>
        <h1 style={{ color:"#f1f5f9", fontWeight:900, fontSize:26, margin:0 }}>YouthConnect</h1>
        <p style={{ color:"#64748b", fontSize:14, marginTop:4 }}>Formulário de Auto-Cadastro — Jovens da Igreja</p>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
        <div>
          <label style={label}>Nome Completo *</label>
          <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Seu nome" style={input} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div>
            <label style={label}>Idade *</label>
            <input value={form.age} onChange={e=>set("age",e.target.value)} placeholder="Ex: 18" type="number" style={input} />
          </div>
          <div>
            <label style={label}>Status</label>
            <select value={form.status} onChange={e=>set("status",e.target.value)} style={{...input}}>
              {Object.entries(STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={label}>Endereço</label>
          <input value={form.address} onChange={e=>set("address",e.target.value)} placeholder="Rua, Número, Bairro" style={input} />
        </div>
        <div>
          <label style={label}>Curso ou Área</label>
          <input value={form.course} onChange={e=>set("course",e.target.value)} placeholder="Ex: Ciências da Computação" style={input} />
        </div>
        <div>
          <label style={label}>Habilidades (separadas por vírgula)</label>
          <input value={form.skillsRaw} onChange={e=>set("skillsRaw",e.target.value)} placeholder="Ex: Violão, Design, Fotografia" style={input} />
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:10, background:"#1e293b", borderRadius:10, padding:"12px 14px" }}>
          <input type="checkbox" id="parents" checked={form.livesWithParents} onChange={e=>set("livesWithParents",e.target.checked)} style={{ accentColor:"#6EE7B7", width:16, height:16 }} />
          <label htmlFor="parents" style={{ color:"#94a3b8", fontSize:14, cursor:"pointer" }}>Moro com meus pais</label>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"#1e293b", borderRadius:10, padding:"12px 14px" }}>
          <input type="checkbox" id="seeking" checked={form.seekingJob} onChange={e=>set("seekingJob",e.target.checked)} style={{ accentColor:"#FCD34D", width:16, height:16 }} />
          <label htmlFor="seeking" style={{ color:"#94a3b8", fontSize:14, cursor:"pointer" }}>Estou buscando emprego/estágio</label>
        </div>

        <button onClick={handleSubmit} style={{ background:"linear-gradient(135deg,#6EE7B7,#3B82F6)", color:"#0f172a", border:"none", borderRadius:12, padding:"14px", fontWeight:800, fontSize:16, cursor:"pointer", marginTop:8 }}>
          Enviar Cadastro 🚀
        </button>
      </div>
    </div>
  );
}

// ─── APPROVALS ────────────────────────────────────────────────────────────────
function ApprovalsModule({ pending, setPending, youth, setYouth, onRefresh, syncing }) {
  async function approve(p) {
    const approved = { ...p, approved:true };
    setYouth([...youth, approved]);
    setPending(pending.filter(x=>x.id!==p.id));
    if (String(p.id).startsWith("y")) await apiPost({ action:"approve", id:p.id });
  }
  async function reject(p) {
    setPending(pending.filter(x=>x.id!==p.id));
    if (String(p.id).startsWith("y")) await apiPost({ action:"reject", id:p.id });
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <h2 style={{ color:"#f1f5f9", fontWeight:800, fontSize:20, margin:0 }}>Aprovações Pendentes</h2>
        {pending.length > 0 && <span style={{ background:"#FCD34D22", color:"#FCD34D", border:"1px solid #FCD34D44", borderRadius:20, padding:"2px 10px", fontSize:12, fontWeight:700 }}>{pending.length}</span>}
        <button onClick={onRefresh} disabled={syncing} style={{ marginLeft:"auto", background:"#1e293b", color:"#6EE7B7", border:"1px solid #6EE7B744", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:13, fontWeight:600 }}>
          {syncing ? "🔄 Buscando..." : "🔄 Atualizar"}
        </button>
      </div>
      {pending.length === 0 && (
        <div style={{ textAlign:"center", padding:"60px 24px" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
          <p style={{ color:"#64748b", fontSize:15 }}>Nenhuma aprovação pendente. Tudo em dia!</p>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {pending.map(p => (
          <div key={p.id} style={{ background:"#1e293b", borderRadius:14, padding:20, border:"1px solid #FCD34D33" }}>
            <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:14 }}>
              <Avatar initials={p.avatar} size={48} />
              <div style={{ flex:1 }}>
                <div style={{ color:"#f1f5f9", fontWeight:700, fontSize:16 }}>{p.name}</div>
                <div style={{ color:"#64748b", fontSize:13 }}>{p.age} anos · {p.course} · {p.address}</div>
                <div style={{ marginTop:4, color:"#94a3b8", fontSize:12 }}>Habilidades: {p.skills.join(", ") || "Nenhuma"}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={()=>reject(p)} style={{ background:"#ef444422", color:"#ef4444", border:"1px solid #ef444444", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontWeight:600, fontSize:13 }}>Recusar</button>
              <button onClick={()=>approve(p)} style={{ background:"#6EE7B7", color:"#0f172a", border:"none", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontWeight:700, fontSize:13 }}>✓ Aprovar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TALENTS & OPPORTUNITIES ──────────────────────────────────────────────────
function TalentsModule({ youth, jobs, setJobs }) {
  const [tab, setTab] = useState("talents");
  const [skillFilter, setSkillFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [seekFilter, setSeekFilter] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [newJob, setNewJob] = useState({ title:"", company:"", type:"CLT", area:"", skills:"" });
  const [matchJob, setMatchJob] = useState(null);

  const allSkills = [...new Set(youth.flatMap(y=>y.skills))].sort();

  const filtered = youth.filter(y => {
    const matchSkill = !skillFilter || y.skills.some(s=>s.toLowerCase().includes(skillFilter.toLowerCase()));
    const matchStatus = !statusFilter || y.status === statusFilter;
    const matchSeek = !seekFilter || y.seekingJob;
    return matchSkill && matchStatus && matchSeek;
  });

  function addJob() {
    const j = { ...newJob, id:"j"+Date.now(), skills: newJob.skills.split(",").map(s=>s.trim()).filter(Boolean), date: new Date().toISOString().slice(0,10) };
    setJobs([...jobs, j]);
    setNewJob({ title:"", company:"", type:"CLT", area:"", skills:"" });
    setShowJobForm(false);
  }

  function getMatches(job) {
    return youth.filter(y => y.seekingJob && job.skills.some(s => y.skills.map(x=>x.toLowerCase()).includes(s.toLowerCase())));
  }

  const input = { background:"#0f172a", border:"1px solid #334155", borderRadius:8, padding:"10px 12px", color:"#f1f5f9", fontSize:13, outline:"none", width:"100%", boxSizing:"border-box" };

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:20, borderBottom:"1px solid #334155", paddingBottom:12 }}>
        {[["talents","🌟 Banco de Talentos"],["jobs","💼 Vagas"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ background:tab===k?"#6EE7B7":"transparent", color:tab===k?"#0f172a":"#94a3b8", border:"none", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontWeight:700, fontSize:14, transition:"all 0.2s" }}>{l}</button>
        ))}
      </div>

      {tab === "talents" && (
        <div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
            <select value={skillFilter} onChange={e=>setSkillFilter(e.target.value)} style={{ ...input, width:"auto" }}>
              <option value="">Qualquer habilidade</option>
              {allSkills.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{ ...input, width:"auto" }}>
              <option value="">Qualquer status</option>
              {Object.entries(STATUS_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
            <button onClick={()=>setSeekFilter(f=>!f)} style={{ background:seekFilter?"#FCD34D22":"#1e293b", color:seekFilter?"#FCD34D":"#64748b", border:`1px solid ${seekFilter?"#FCD34D44":"#334155"}`, borderRadius:8, padding:"8px 14px", cursor:"pointer", fontSize:13, fontWeight:600 }}>
              🎯 Buscando Emprego
            </button>
          </div>
          <p style={{ color:"#64748b", fontSize:13, marginBottom:14 }}>{filtered.length} jovem(s) encontrado(s)</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
            {filtered.map(y => (
              <div key={y.id} style={{ background:"#1e293b", borderRadius:12, padding:16 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:10 }}>
                  <Avatar initials={y.avatar} size={38} />
                  <div>
                    <div style={{ color:"#f1f5f9", fontWeight:700, fontSize:14 }}>{y.name}</div>
                    <div style={{ color:"#64748b", fontSize:12 }}>{y.course}</div>
                  </div>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                  {y.skills.map(s=><span key={s} style={{ background:"#0f172a", color: skillFilter&&s.toLowerCase().includes(skillFilter.toLowerCase())?"#6EE7B7":"#64748b", border: skillFilter&&s.toLowerCase().includes(skillFilter.toLowerCase())?"1px solid #6EE7B755":"none", borderRadius:5, padding:"2px 8px", fontSize:11 }}>{s}</span>)}
                </div>
                {y.seekingJob && <div style={{ marginTop:8, color:"#FCD34D", fontSize:11 }}>🎯 Disponível para contato</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "jobs" && (
        <div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
            <button onClick={()=>setShowJobForm(f=>!f)} style={{ background:"#6EE7B7", color:"#0f172a", border:"none", borderRadius:10, padding:"10px 20px", cursor:"pointer", fontWeight:700, fontSize:14 }}>+ Nova Vaga</button>
          </div>

          {showJobForm && (
            <div style={{ background:"#1e293b", borderRadius:14, padding:20, marginBottom:20, border:"1px solid #334155" }}>
              <h3 style={{ color:"#e2e8f0", fontWeight:700, marginBottom:16 }}>Cadastrar Vaga</h3>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <input value={newJob.title} onChange={e=>setNewJob(f=>({...f,title:e.target.value}))} placeholder="Título da vaga" style={input} />
                <input value={newJob.company} onChange={e=>setNewJob(f=>({...f,company:e.target.value}))} placeholder="Empresa" style={input} />
                <input value={newJob.area} onChange={e=>setNewJob(f=>({...f,area:e.target.value}))} placeholder="Área (ex: Design, TI)" style={input} />
                <select value={newJob.type} onChange={e=>setNewJob(f=>({...f,type:e.target.value}))} style={input}>
                  <option>CLT</option><option>PJ</option><option>Estágio</option><option>Freelance</option>
                </select>
              </div>
              <input value={newJob.skills} onChange={e=>setNewJob(f=>({...f,skills:e.target.value}))} placeholder="Habilidades necessárias (vírgula)" style={{...input,marginBottom:12}} />
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                <button onClick={()=>setShowJobForm(false)} style={{ background:"transparent", color:"#64748b", border:"1px solid #334155", borderRadius:8, padding:"8px 16px", cursor:"pointer" }}>Cancelar</button>
                <button onClick={addJob} style={{ background:"#6EE7B7", color:"#0f172a", border:"none", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontWeight:700 }}>Salvar</button>
              </div>
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {jobs.map(j => {
              const matches = getMatches(j);
              return (
                <div key={j.id} style={{ background:"#1e293b", borderRadius:14, padding:20 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div>
                      <div style={{ color:"#f1f5f9", fontWeight:700, fontSize:16 }}>{j.title}</div>
                      <div style={{ color:"#64748b", fontSize:13 }}>{j.company} · {j.type} · {j.area}</div>
                    </div>
                    <span style={{ background:"#3B82F622", color:"#60A5FA", border:"1px solid #60A5FA44", borderRadius:6, padding:"3px 10px", fontSize:12, fontWeight:600 }}>{j.date}</span>
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
                    {j.skills.map(s=><span key={s} style={{ background:"#0f172a", color:"#94a3b8", borderRadius:5, padding:"2px 8px", fontSize:11 }}>{s}</span>)}
                  </div>
                  <button onClick={()=>setMatchJob(matchJob?.id===j.id?null:j)} style={{ background:"#A78BFA22", color:"#A78BFA", border:"1px solid #A78BFA44", borderRadius:8, padding:"6px 14px", cursor:"pointer", fontSize:12, fontWeight:600 }}>
                    🔗 Ver {matches.length} jovem(s) compatível(is)
                  </button>
                  {matchJob?.id === j.id && (
                    <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:8 }}>
                      {matches.length === 0 && <p style={{ color:"#64748b", fontSize:13 }}>Nenhum jovem buscando emprego com essas habilidades.</p>}
                      {matches.map(m=>(
                        <div key={m.id} style={{ display:"flex", gap:10, alignItems:"center", background:"#0f172a", borderRadius:8, padding:"10px 14px" }}>
                          <Avatar initials={m.avatar} size={32} />
                          <div>
                            <div style={{ color:"#f1f5f9", fontSize:13, fontWeight:600 }}>{m.name}</div>
                            <div style={{ color:"#64748b", fontSize:11 }}>Compatível: {m.skills.filter(s=>j.skills.map(x=>x.toLowerCase()).includes(s.toLowerCase())).join(", ")}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function SettingsModule({ customFields, setCustomFields }) {
  const [newLabel, setNewLabel] = useState("");

  function addField() {
    if (!newLabel.trim()) return;
    const key = newLabel.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"");
    if (customFields.some(f=>f.key===key)) return;
    setCustomFields([...customFields, { key, label:newLabel.trim() }]);
    setNewLabel("");
  }

  function removeField(key) {
    setCustomFields(customFields.filter(f=>f.key!==key));
  }

  return (
    <div style={{ maxWidth:600 }}>
      <h2 style={{ color:"#f1f5f9", fontWeight:800, fontSize:20, marginBottom:20 }}>⚙️ Campos Customizados da Ficha</h2>
      <p style={{ color:"#64748b", fontSize:14, marginBottom:24 }}>Crie campos personalizados que aparecerão na ficha de todos os jovens.</p>

      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
        {customFields.map(f => (
          <div key={f.key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#1e293b", borderRadius:10, padding:"12px 16px" }}>
            <div>
              <div style={{ color:"#e2e8f0", fontSize:14, fontWeight:600 }}>{f.label}</div>
              <div style={{ color:"#64748b", fontSize:11 }}>Chave: {f.key}</div>
            </div>
            <button onClick={()=>removeField(f.key)} style={{ background:"#ef444422", color:"#ef4444", border:"none", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:12 }}>Remover</button>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addField()}
          placeholder='Ex: "Batizado?", "Toca instrumento?"'
          style={{ flex:1, background:"#1e293b", border:"1px solid #334155", borderRadius:10, padding:"12px 14px", color:"#f1f5f9", fontSize:14, outline:"none" }} />
        <button onClick={addField} style={{ background:"#6EE7B7", color:"#0f172a", border:"none", borderRadius:10, padding:"12px 20px", cursor:"pointer", fontWeight:700, fontSize:14 }}>+ Adicionar</button>
      </div>
    </div>
  );
}

// ─── AI CHAT ──────────────────────────────────────────────────────────────────
function AIChat({ youth, jobs }) {
  const [messages, setMessages] = useState([
    { role:"assistant", content:"Olá, líder! 👋 Sou o **YouthConnect AI**, seu assistente de planejamento. Posso analisar os dados do grupo e ajudar com sugestões estratégicas.\n\n**Exemplos do que posso fazer:**\n- \"Qual o melhor dia para o retiro este mês?\"\n- \"Liste jovens com habilidades para a equipe de mídia.\"\n- \"Quem está disponível nas manhãs de sábado?\"\n- \"Jovens buscando emprego na área de Design?\"" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const suggestions = [
    "Qual o melhor dia para o retiro?",
    "Equipe de mídia e som para o evento",
    "Jovens livres nas manhãs de sábado",
    "Quem busca emprego em Design ou TI?"
  ];

  async function sendMessage(text) {
    const q = text || input.trim();
    if (!q) return;
    setInput("");
    const userMsg = { role:"user", content:q };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    const context = `
Você é o assistente de IA do YouthConnect, sistema de gestão de jovens de uma igreja.
Responda em português, de forma prática e direta para o líder de jovens.

DADOS DO GRUPO (${youth.length} jovens aprovados):
${youth.map(y => `- ${y.name} (${y.age}a): status=${STATUS_LABELS[y.status]}, curso="${y.course}", habilidades=[${y.skills.join(",")}], buscaEmprego=${y.seekingJob}, horáriosEstudo=${JSON.stringify(y.studyHours)}, horáriosTrabalho=${JSON.stringify(y.workHours)}`).join("\n")}

VAGAS CADASTRADAS:
${jobs.map(j => `- ${j.title} @ ${j.company} (${j.type}): habilidades=[${j.skills.join(",")}]`).join("\n")}

Dias da semana: mon=Segunda, tue=Terça, wed=Quarta, thu=Quinta, fri=Sexta, sat=Sábado, sun=Domingo.
Horários: 08-12=manhã, 12-17=tarde, 18-23=noite. Se o horário não está preenchido = livre.

Ao sugerir horários para eventos, analise quando a MAIORIA dos jovens está livre.
Ao sugerir equipes, liste nomes e habilidades relevantes.
Use emojis e formatação markdown para tornar a resposta mais visual. Seja prático e objetivo.
    `.trim();

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          system: context,
          messages: newMessages.map(m=>({ role:m.role, content:m.content }))
        })
      });
      const data = await resp.json();
      const reply = data.content?.find(b=>b.type==="text")?.text || "Desculpe, não consegui processar.";
      setMessages(prev => [...prev, { role:"assistant", content:reply }]);
    } catch(e) {
      setMessages(prev => [...prev, { role:"assistant", content:"⚠️ Erro ao conectar com a IA. Verifique a conexão." }]);
    }
    setLoading(false);
  }

  function renderMarkdown(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#6EE7B7">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)/gm, '• $1')
      .replace(/\n/g, '<br/>');
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 200px)", minHeight:500 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, background:"linear-gradient(135deg,#1e293b,#0f172a)", borderRadius:12, padding:"12px 16px", border:"1px solid #334155" }}>
        <div style={{ width:10, height:10, background:"#6EE7B7", borderRadius:"50%", boxShadow:"0 0 8px #6EE7B7" }} />
        <span style={{ color:"#6EE7B7", fontWeight:700 }}>YouthConnect AI</span>
        <span style={{ color:"#64748b", fontSize:12 }}>Análise de {youth.length} jovens · {jobs.length} vagas</span>
      </div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
        {suggestions.map(s=>(
          <button key={s} onClick={()=>sendMessage(s)} style={{ background:"#1e293b", color:"#94a3b8", border:"1px solid #334155", borderRadius:20, padding:"5px 14px", cursor:"pointer", fontSize:12 }}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:16, paddingBottom:8 }}>
        {messages.map((m,i) => (
          <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", flexDirection: m.role==="user"?"row-reverse":"row" }}>
            <div style={{ width:34, height:34, borderRadius:"50%", background: m.role==="user"?"#3B82F6":"#1e293b", border:"1px solid #334155", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
              {m.role==="user"?"👤":"✝️"}
            </div>
            <div style={{ maxWidth:"80%", background: m.role==="user"?"#1d4ed8":"#1e293b", borderRadius: m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px", padding:"12px 16px", border:"1px solid #334155" }}>
              <p style={{ color:"#e2e8f0", fontSize:14, margin:0, lineHeight:1.6 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
            <div style={{ width:34, height:34, borderRadius:"50%", background:"#1e293b", border:"1px solid #334155", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>✝️</div>
            <div style={{ background:"#1e293b", borderRadius:"14px 14px 14px 4px", padding:"14px 16px", border:"1px solid #334155" }}>
              <div style={{ display:"flex", gap:4 }}>
                {[0,1,2].map(d=><div key={d} style={{ width:6, height:6, background:"#6EE7B7", borderRadius:"50%", animation:`pulse 1s ease-in-out ${d*0.2}s infinite`, opacity:0.6 }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ display:"flex", gap:10, marginTop:12 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMessage()}
          placeholder="Pergunte algo sobre o grupo..."
          style={{ flex:1, background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:"12px 16px", color:"#f1f5f9", fontSize:14, outline:"none" }} />
        <button onClick={()=>sendMessage()} disabled={loading||!input.trim()} style={{ background:"linear-gradient(135deg,#6EE7B7,#3B82F6)", color:"#0f172a", border:"none", borderRadius:12, padding:"12px 18px", cursor:"pointer", fontWeight:700, fontSize:16, opacity: loading||!input.trim()?0.5:1 }}>
          ➤
        </button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

// Formulário público standalone (rota ?cadastro)
function PublicFormPage() {
  return (
    <div style={{ minHeight:"100vh", background:"#0f172a", fontFamily:"'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
      `}</style>
      <PublicForm onSubmit={entry => { apiPost({ action:"register", youth: entry }).catch(()=>{}); }} />
    </div>
  );
}

// Painel interno: mostra e copia o link público
function ShareLinkPanel() {
  const [copied, setCopied] = useState(false);
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const link = base + "/?cadastro";

  function copy() {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ maxWidth:560, margin:"0 auto" }}>
      <div style={{ background:"#1e293b", borderRadius:16, padding:28, textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🔗</div>
        <h2 style={{ color:"#f1f5f9", fontWeight:800, fontSize:20, marginBottom:8 }}>Link Público de Cadastro</h2>
        <p style={{ color:"#94a3b8", fontSize:14, marginBottom:24 }}>Compartilhe este link com os jovens. Eles preenchem o formulário e o cadastro chega na aba <strong style={{color:"#6EE7B7"}}>Aprovações</strong>.</p>

        <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:"14px 16px", marginBottom:16, wordBreak:"break-all", color:"#6EE7B7", fontSize:14, fontFamily:"monospace" }}>
          {link}
        </div>

        <button onClick={copy} style={{ width:"100%", background: copied ? "#34D399" : "linear-gradient(135deg,#6EE7B7,#3B82F6)", color:"#0f172a", border:"none", borderRadius:12, padding:"14px", fontWeight:800, fontSize:16, cursor:"pointer", transition:"all 0.2s" }}>
          {copied ? "✅ Link copiado!" : "📋 Copiar Link"}
        </button>

        <div style={{ marginTop:20, display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
          <a href={`https://wa.me/?text=${encodeURIComponent("Faça seu cadastro no grupo de jovens: " + link)}`} target="_blank" rel="noreferrer"
            style={{ background:"#25D36622", color:"#25D366", border:"1px solid #25D36644", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:600, textDecoration:"none" }}>
            Compartilhar no WhatsApp
          </a>
          <a href={link} target="_blank" rel="noreferrer"
            style={{ background:"#A78BFA22", color:"#A78BFA", border:"1px solid #A78BFA44", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:600, textDecoration:"none" }}>
            Abrir formulário
          </a>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const isPublicForm = typeof window !== "undefined" &&
    (window.location.search.includes("cadastro") || window.location.hash.includes("cadastro"));
  if (isPublicForm) return <PublicFormPage />;
  return <AdminApp />;
}

function AdminApp() {
  initLS();
  const [youth, setYouth] = useLS("yc_youth", SEED_YOUTH);
  const [pending, setPending] = useLS("yc_pending", SEED_PENDING);
  const [jobs, setJobs] = useLS("yc_jobs", SEED_JOBS);
  const [customFields, setCustomFields] = useLS("yc_custom_fields", []);
  const [page, setPage] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Carrega dados do Google Sheets ao abrir e sincroniza
  async function syncFromSheets() {
    setSyncing(true);
    const remote = await apiList();
    setSyncing(false);
    if (!remote) return; // offline: mantém localStorage
    // Jovens aprovados na planilha
    const remoteApproved = remote.filter(r => r.approved).map(r => ({
      ...r, avatar: r.name.split(" ").slice(0,2).map(w=>w[0]?.toUpperCase()).join(""),
      studyHours:{}, workHours:{}, timeline:[], customFields:{}
    }));
    // Pendentes na planilha (ainda não aprovados)
    const remotePending = remote.filter(r => !r.approved).map(r => ({
      ...r, avatar: r.name.split(" ").slice(0,2).map(w=>w[0]?.toUpperCase()).join(""),
      studyHours:{}, workHours:{}, timeline:[], customFields:{}
    }));
    // Mescla: mantém seeds locais + dados da nuvem (sem duplicar por id)
    setYouth(prev => {
      const ids = new Set(remoteApproved.map(r=>r.id));
      return [...prev.filter(p=>!ids.has(p.id) && !String(p.id).startsWith("y17")), ...remoteApproved];
    });
    setPending(prev => {
      const ids = new Set(remotePending.map(r=>r.id));
      const localOnly = prev.filter(p => String(p.id).startsWith("p"));
      return [...localOnly.filter(p=>!ids.has(p.id)), ...remotePending];
    });
  }

  useEffect(() => { syncFromSheets(); }, []);

  const approvedYouth = youth.filter(y=>y.approved);

  const nav = [
    { key:"dashboard", icon:"📊", label:"Dashboard" },
    { key:"members", icon:"👥", label:"Jovens" },
    { key:"register", icon:"📝", label:"Auto-Cadastro" },
    { key:"approvals", icon:"⏳", label:"Aprovações", badge: pending.length },
    { key:"talents", icon:"🌟", label:"Talentos & Vagas" },
    { key:"ai", icon:"🤖", label:"Chat IA" },
    { key:"settings", icon:"⚙️", label:"Configurações" },
  ];

  function setYouthAndUpdate(list) {
    setYouth(list);
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0f172a", fontFamily:"'DM Sans', system-ui, sans-serif", color:"#f1f5f9" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:#0f172a; }
        ::-webkit-scrollbar-thumb { background:#334155; borderRadius:3px; }
        @keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }
      `}</style>

      {/* Sidebar */}
      <div style={{ position:"fixed", left:0, top:0, bottom:0, width:220, background:"#111827", borderRight:"1px solid #1e293b", display:"flex", flexDirection:"column", zIndex:100, transform: menuOpen || window.innerWidth > 768 ? "translateX(0)" : "translateX(-100%)", transition:"transform 0.3s" }}>
        <div style={{ padding:"24px 20px 16px", borderBottom:"1px solid #1e293b" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, background:"linear-gradient(135deg,#6EE7B7,#3B82F6)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>✝️</div>
            <div>
              <div style={{ fontWeight:900, fontSize:15, color:"#f1f5f9", letterSpacing:-0.5 }}>YouthConnect</div>
              <div style={{ fontSize:10, color:"#6EE7B7", fontWeight:600, letterSpacing:1, textTransform:"uppercase" }}>AI Platform</div>
            </div>
          </div>
        </div>

        <nav style={{ flex:1, padding:"12px 10px", display:"flex", flexDirection:"column", gap:4 }}>
          {nav.map(n => (
            <button key={n.key} onClick={()=>{ setPage(n.key); setMenuOpen(false); }}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, border:"none", cursor:"pointer", width:"100%", textAlign:"left", background: page===n.key?"linear-gradient(135deg,#6EE7B722,#3B82F622)":"transparent", color: page===n.key?"#6EE7B7":"#64748b", fontWeight: page===n.key?700:500, fontSize:14, transition:"all 0.2s", position:"relative" }}>
              <span style={{ fontSize:16 }}>{n.icon}</span>
              {n.label}
              {n.badge > 0 && <span style={{ position:"absolute", right:10, background:"#FCD34D", color:"#0f172a", borderRadius:10, padding:"0 6px", fontSize:10, fontWeight:800, minWidth:18, textAlign:"center" }}>{n.badge}</span>}
            </button>
          ))}
        </nav>

        <div style={{ padding:"16px 14px", borderTop:"1px solid #1e293b" }}>
          <div style={{ color:"#64748b", fontSize:11, textAlign:"center" }}>
            {approvedYouth.length} jovens · {jobs.length} vagas
          </div>
        </div>
      </div>

      {/* Mobile topbar */}
      <div style={{ position:"fixed", top:0, left:0, right:0, height:56, background:"#111827", borderBottom:"1px solid #1e293b", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px", zIndex:90, marginLeft:220 }}>
        <h1 style={{ color:"#f1f5f9", fontWeight:800, fontSize:17 }}>
          {nav.find(n=>n.key===page)?.icon} {nav.find(n=>n.key===page)?.label}
        </h1>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ background:"#1e293b", borderRadius:8, padding:"4px 10px", display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:6, height:6, background:"#6EE7B7", borderRadius:"50%", boxShadow:"0 0 6px #6EE7B7" }} />
            <span style={{ color:"#6EE7B7", fontSize:11, fontWeight:600 }}>AO VIVO</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ marginLeft:220, paddingTop:56 }}>
        <div style={{ padding:24, maxWidth:1200 }}>
          {page === "dashboard" && <Dashboard youth={approvedYouth} />}
          {page === "members" && <MembersModule youth={approvedYouth} setYouth={setYouthAndUpdate} customFields={customFields} />}
          {page === "register" && <ShareLinkPanel />}
          {page === "approvals" && <ApprovalsModule pending={pending} setPending={setPending} youth={youth} setYouth={setYouthAndUpdate} onRefresh={syncFromSheets} syncing={syncing} />}
          {page === "talents" && <TalentsModule youth={approvedYouth} jobs={jobs} setJobs={setJobs} />}
          {page === "ai" && <AIChat youth={approvedYouth} jobs={jobs} />}
          {page === "settings" && <SettingsModule customFields={customFields} setCustomFields={setCustomFields} />}
        </div>
      </div>
    </div>
  );
}
