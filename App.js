import {
  auth,
  db,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot
} from "./Firebase.js";

let charts = {};

// --- NAVEGACIÓN ---
window.showSection = (id) => {
  const sections = ['dashboard', 'workouts', 'routine', 'pesos', 'account'];
  sections.forEach(s => {
    const el = document.getElementById(`${s}-section`);
    if (el) el.style.display = s === id ? 'block' : 'none';
  });
  
  document.querySelectorAll('.tab-item').forEach(item => {
    item.classList.remove('active');
    const onclickAttr = item.getAttribute('onclick');
    if (onclickAttr && onclickAttr.includes(id)) {
      item.classList.add('active');
    }
  });
};

// --- AUTENTICACIÓN ---
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "Login.html";
  } else {
    initApp(user.uid);
  }
});

function initApp(userId) {
  loadWorkouts(userId);
  loadPesos(userId);
  loadProfile(userId);
  // Pequeño delay para asegurar que los canvas existen
  setTimeout(initCharts, 100);
}

// --- DATOS RUTINA ---
const routineData = {
  Lunes: [{ ex: "SQ 420T", set: "3 x 4 @4" }, { ex: "DL SUMO 300T", set: "4 x 5 @4" }, { ex: "Curl femoral", set: "3 x 12 RIR 1" }, { ex: "Aductor", set: "3 x 12 RIR 0" }, { ex: "Rumano con mancuernas", set: "4 x 8 RIR 0" }, { ex: "Híper extensiones", set: "3 x 6 RIR 0" }],
  Martes: [{ ex: "BP Board", set: "1 x 2 @7 / 3 x 4 @4" }, { ex: "Militar con mancuernas", set: "3 x 8 RIR 2" }, { ex: "Remo en T", set: "4 x 8 RIR 0" }, { ex: "Jalón al pecho", set: "3 x 12 RIR 1" }, { ex: "Dominadas", set: "4 series" }, { ex: "Bayesian", set: "2 x 12 RIR 0" }],
  Miércoles: [{ ex: "BP 420T", set: "3 x 5 @4" }, { ex: "Press inclinado con mancuernas", set: "3 x 8 RIR 0" }, { ex: "Aperturas", set: "2 x 12 RIR 1" }, { ex: "Extensión de tríceps", set: "4 x 12 RIR 0" }, { ex: "Press francés", set: "2 x 6 RIR 0" }, { ex: "Laterales", set: "4 x 12 RIR 0" }],
  Jueves: [],
  Viernes: [{ ex: "SQ LB", set: "2 x 2 x 112.5 / 4 x 3 @4" }, { ex: "BP", set: "3 x 2 67.5 / 2 x 2 72.5 / 1 x 1 80" }, { ex: "DL SUMO", set: "1 x 1 x 125 / 3 x 3 90 / 1 x 1 x 125" }, { ex: "Prensa", set: "3 x 12 RIR 1" }, { ex: "Extensión de cuádriceps", set: "2 x 12 RIR 1" }, { ex: "Soleo sentado", set: "3 x 12 RIR 1" }],
  Sábado: [{ ex: "Flor press con barra", set: "1 x 2 @8 / 3 x 6 @4" }, { ex: "Militar con barra sentado", set: "4 x 6 RIR 2" }, { ex: "Extensión de tríceps con barra", set: "3 x 12 RIR 0" }, { ex: "Fondos", set: "3 x 6 RIR 2" }, { ex: "Laterales", set: "5 x 8 RIR 0" }, { ex: "Ruck pull", set: "4 x 6 RIR 1" }],
  Domingo: []
};

// --- ZONAS MUSCULARES ---
// Mapea cada ejercicio de la rutina a su zona de trabajo principal.
// Si añades ejercicios nuevos a routineData, añádelos también aquí para que
// aparezcan clasificados correctamente en la vista "Pesos".
const exerciseMuscleGroup = {
  "SQ 420T": "Pierna",
  "DL SUMO 300T": "Espalda",
  "Curl femoral": "Pierna",
  "Aductor": "Pierna",
  "Rumano con mancuernas": "Pierna",
  "BP Board": "Pecho",
  "Militar con mancuernas": "Hombro",
  "Remo en T": "Espalda",
  "Jalón al pecho": "Espalda",
  "Dominadas": "Espalda",
  "BP 420T": "Pecho",
  "Press inclinado con mancuernas": "Pecho",
  "Aperturas": "Pecho",
  "Extensión de tríceps": "Tríceps",
  "Press francés": "Tríceps",
  "SQ LB": "Pierna",
  "BP": "Pecho",
  "DL SUMO": "Espalda",
  "Prensa": "Pierna",
  "Extensión de cuádriceps": "Pierna",
  "Flor press con barra": "Hombro",
  "Militar con barra sentado": "Hombro",
  "Extensión de tríceps con barra": "Tríceps",
  "Fondos": "Tríceps",
  "Laterales": "Hombro",
  "Híper extensiones": "Espalda",
  "Bayesian": "Bíceps",
  "Soleo sentado": "Pierna",
  "Ruck pull": "Espalda"
};

const MUSCLE_GROUP_ORDER = ["Pecho", "Espalda", "Hombro", "Bíceps", "Tríceps", "Pierna"];

function sanitizeId(name) {
  return name.replace(/[/.#$\[\]]/g, "-");
}

function updateExercises() {
  const day = document.getElementById("workoutDay").value;
  const exSelect = document.getElementById("workoutEx");
  exSelect.innerHTML = '<option value="">Ejercicio</option>';
  const exercises = routineData[day] || [];
  exercises.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.ex;
    opt.textContent = item.ex;
    exSelect.appendChild(opt);
  });
}

window.updateExercises = updateExercises;

document.addEventListener("DOMContentLoaded", () => {
  const daySelect = document.getElementById("workoutDay");
  if (daySelect) daySelect.addEventListener("change", updateExercises);
});

window.addWeight = (amount) => {
  const input = document.getElementById("workoutWeight");
  input.value = (parseFloat(input.value) || 0) + amount;
};

window.saveWorkout = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const day = document.getElementById("workoutDay").value;
  const ex = document.getElementById("workoutEx").value;
  const weight = parseFloat(document.getElementById("workoutWeight").value);
  const reps = parseInt(document.getElementById("workoutReps").value);
  const rpe = parseFloat(document.getElementById("workoutRPE").value) || 0;
  const date = new Date();

  if (!day || !ex || isNaN(weight) || isNaN(reps)) {
    alert("Completa los campos");
    return;
  }

  const e1RM = weight / (1.0278 - (0.0278 * reps));

  try {
    await setDoc(doc(collection(db, "users", user.uid, "workouts")), {
      day, ex, weight, reps, rpe, e1RM,
      date: date.toISOString(),
      isFriday: date.getDay() === 5,
      timestamp: Date.now()
    });

    // --- ACTUALIZAR PESO MÁXIMO (PR) DEL EJERCICIO ---
    const prRef = doc(db, "users", user.uid, "prs", sanitizeId(ex));
    const prSnap = await getDoc(prRef);
    const currentBest = prSnap.exists() ? prSnap.data().weight : 0;

    if (weight > currentBest) {
      await setDoc(prRef, {
        ex,
        weight,
        reps,
        muscleGroup: exerciseMuscleGroup[ex] || "Otros",
        date: date.toISOString(),
        timestamp: Date.now()
      });
    }

    alert("Guardado");
    document.getElementById("workoutWeight").value = "";
    document.getElementById("workoutReps").value = "";
    document.getElementById("workoutRPE").value = "";
  } catch (err) {
    alert(err.message);
  }
};

// --- HISTORIAL ---
function loadWorkouts(userId) {
  const q = query(collection(db, "users", userId, "workouts"), orderBy("timestamp", "desc"));
  onSnapshot(q, (snapshot) => {
    const workouts = [];
    snapshot.forEach(doc => workouts.push(doc.data()));
    renderHistory(workouts);
    updateCharts(workouts);
  });
}

function renderHistory(workouts) {
  const container = document.getElementById("workoutList");
  if (!container) return;
  container.innerHTML = "";

  const groups = workouts.reduce((acc, w) => {
    const date = new Date(w.date).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(w);
    return acc;
  }, {});

  Object.entries(groups).forEach(([date, items]) => {
    const div = document.createElement("div");
    div.className = "card accordion-item";
    div.innerHTML = `
      <div class="accordion-header" onclick="this.parentElement.classList.toggle('active')">
        <span>${date}</span>
        <span style="color:var(--accent-color)">${items[0].day} ▾</span>
      </div>
      <div class="accordion-content">
        ${items.map(i => `
          <div style="padding:12px 0; border-top: 1px solid rgba(0,0,0,0.05)">
            <div style="display:flex; justify-content:space-between">
              <strong style="color:var(--text-primary)">${i.ex}</strong>
              <span style="font-weight:700">${i.weight}kg x ${i.reps}</span>
            </div>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:4px">
              e1RM: ${Math.round(i.e1RM)}kg | RPE: ${i.rpe}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    container.appendChild(div);
  });
}

// --- PESOS (récords por ejercicio, agrupados por zona muscular) ---
let currentPRs = {}; // { "SQ LB": 140, "BP": 90, ... } — usado también para el Total SBD

function loadPesos(userId) {
  const q = query(collection(db, "users", userId, "prs"), orderBy("weight", "desc"));
  onSnapshot(q, (snapshot) => {
    const prs = [];
    currentPRs = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      prs.push(data);
      currentPRs[data.ex] = data.weight;
    });
    renderPesos(prs);
    updateAccountMetrics();
  });
}

function renderPesos(prs) {
  const container = document.getElementById("pesosList");
  if (!container) return;
  container.innerHTML = "";

  // Solo se agrupan ejercicios que ya tienen al menos un registro guardado.
  const groups = prs.reduce((acc, pr) => {
    const group = pr.muscleGroup || "Otros";
    if (!acc[group]) acc[group] = [];
    acc[group].push(pr);
    return acc;
  }, {});

  const orderedGroups = MUSCLE_GROUP_ORDER.filter(g => groups[g] && groups[g].length > 0);

  if (orderedGroups.length === 0) {
    container.innerHTML = "<p style='color:var(--text-secondary); text-align:center'>Aún no tienes pesos registrados. Guarda un ejercicio para que aparezca aquí.</p>";
    return;
  }

  orderedGroups.forEach(group => {
    const items = groups[group].sort((a, b) => b.weight - a.weight);
    const div = document.createElement("div");
    div.className = "card accordion-item active";
    div.innerHTML = `
      <div class="accordion-header" onclick="this.parentElement.classList.toggle('active')">
        <span>${group}</span>
        <span style="color:var(--accent-color)">${items.length} ejercicio${items.length > 1 ? 's' : ''} ▾</span>
      </div>
      <div class="accordion-content">
        ${items.map(i => `
          <div style="padding:12px 0; border-top: 1px solid rgba(0,0,0,0.05); display:flex; justify-content:space-between; align-items:center">
            <strong style="color:var(--text-primary)">${i.ex}</strong>
            <span class="text-accent" style="font-weight:700">${i.weight}kg</span>
          </div>
        `).join('')}
      </div>
    `;
    container.appendChild(div);
  });
}

// --- GRÁFICAS ---
function initCharts() {
  const config = (color) => ({
    type: 'line',
    data: { labels: [], datasets: [{ data: [], borderColor: color, backgroundColor: color + '15', fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: color, borderWidth: 3 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { color: '#6e6e73', font: { weight: '600' } } },
        x: { display: false }
      }
    }
  });

  const sqCanvas = document.getElementById("sqChart");
  const bpCanvas = document.getElementById("bpChart");
  const dlCanvas = document.getElementById("dlChart");

  if (sqCanvas) charts.SQ = new Chart(sqCanvas, config("#c581ff"));
  if (bpCanvas) charts.BP = new Chart(bpCanvas, config("#c581ff"));
  if (dlCanvas) charts.DL = new Chart(dlCanvas, config("#c581ff"));
}

function updateCharts(workouts) {
  const mapping = { SQ: "SQ LB", BP: "BP", DL: "DL SUMO" };

  Object.entries(mapping).forEach(([key, name]) => {
    if (!charts[key]) return;
    
    // Filtrar por ejercicio y ordenar por fecha
    const data = workouts
      .filter(w => w.ex === name)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-7);

    charts[key].data.labels = data.map(d => new Date(d.date).toLocaleDateString());
    charts[key].data.datasets[0].data = data.map(d => d.weight);
    charts[key].update();
  });
}

// --- RUTINA ---
window.loadRoutine = (day) => {
  const container = document.getElementById("routineContent");
  const exercises = routineData[day] || [];
  container.innerHTML = `<h2 style="margin-bottom:20px; color:var(--text-primary)">${day}</h2>`;
  
  if (exercises.length === 0) {
    container.innerHTML += "<p style='color:var(--text-secondary)'>Día de descanso.</p>";
    return;
  }

  const table = document.createElement("table");
  table.className = "routine-table";
  exercises.forEach(item => {
    const row = table.insertRow();
    row.innerHTML = `
      <td>
        <span class="ex-name">${item.ex}</span>
        <span class="ex-sets">${item.set}</span>
      </td>
    `;
  });
  container.appendChild(table);
};

window.calculatePlates = () => {
  const target = parseFloat(document.getElementById("workoutWeight").value);
  if (isNaN(target) || target < 20) return;
  let side = (target - 20) / 2;
  const plates = [25, 20, 15, 10, 5, 2.5, 1.25];
  let res = [];
  plates.forEach(p => { while(side >= p) { res.push(p); side -= p; } });
  alert(`Discos por lado: ${res.join(', ')} kg`);
};

// --- CUENTA / PERFIL ---

// Categorías oficiales IPF (vigentes desde 2019, mujeres actualizadas con la
// división 69/76 kg que sustituyó a la antigua clase de 72 kg).
const IPF_WEIGHT_CLASSES = {
  M: [59, 66, 74, 83, 93, 105, 120],
  F: [47, 52, 57, 63, 69, 76, 84]
};

function getWeightCategory(gender, bodyWeight) {
  if (!gender || isNaN(bodyWeight) || bodyWeight <= 0) return "—";
  const classes = IPF_WEIGHT_CLASSES[gender];
  for (const limit of classes) {
    if (bodyWeight <= limit) return `-${limit} kg`;
  }
  return `+${classes[classes.length - 1]} kg`;
}

// Coeficientes oficiales IPF GL Points (Powerlifting Clásico / Raw)
const IPF_GL_COEFFICIENTS = {
  M: { a: 1199.72839, b: 1025.18162, c: 0.00921 },
  F: { a: 610.32796, b: 1045.59282, c: 0.03048 }
};

function calculateIPFGL(total, bodyWeight, gender) {
  if (!total || isNaN(bodyWeight) || bodyWeight <= 0 || !IPF_GL_COEFFICIENTS[gender]) return 0;
  const { a, b, c } = IPF_GL_COEFFICIENTS[gender];
  const denominator = a - b * Math.exp(-c * bodyWeight);
  if (denominator <= 0) return 0;
  return (100 * total) / denominator;
}

function updateAccountMetrics() {
  const catEl = document.getElementById("weightCategory");
  const totalEl = document.getElementById("totalSBD");
  const glEl = document.getElementById("ipfGL");
  if (!catEl || !totalEl || !glEl) return; // la sección aún no está en el DOM

  const bodyWeight = parseFloat(document.getElementById("bodyWeight")?.value);
  const gender = document.getElementById("gender")?.value;

  catEl.textContent = getWeightCategory(gender, bodyWeight);

  // Total SBD = suma de los máximos de SQ, BP y DL introducidos en el perfil
  const sq = parseFloat(document.getElementById("maxSQ")?.value) || 0;
  const bp = parseFloat(document.getElementById("maxBP")?.value) || 0;
  const dl = parseFloat(document.getElementById("maxDL")?.value) || 0;
  const total = sq + bp + dl;
  totalEl.textContent = total > 0 ? `${total} kg` : "— kg";

  if (total > 0 && gender && !isNaN(bodyWeight) && bodyWeight > 0) {
    glEl.textContent = calculateIPFGL(total, bodyWeight, gender).toFixed(2);
  } else {
    glEl.textContent = "—";
  }
}

function loadProfile(userId) {
  const profileRef = doc(db, "users", userId);
  onSnapshot(profileRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      const fields = {
        bodyWeight: document.getElementById("bodyWeight"),
        gender: document.getElementById("gender"),
        maxSQ: document.getElementById("maxSQ"),
        maxBP: document.getElementById("maxBP"),
        maxDL: document.getElementById("maxDL")
      };
      // No pisar lo que el usuario está escribiendo ahora mismo
      Object.entries(fields).forEach(([key, el]) => {
        if (el && data[key] != null && document.activeElement !== el) {
          el.value = data[key];
        }
      });
    }
    updateAccountMetrics();
  });
}

window.saveProfile = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const bodyWeight = parseFloat(document.getElementById("bodyWeight").value);
  const gender = document.getElementById("gender").value;
  const maxSQ = parseFloat(document.getElementById("maxSQ").value) || 0;
  const maxBP = parseFloat(document.getElementById("maxBP").value) || 0;
  const maxDL = parseFloat(document.getElementById("maxDL").value) || 0;

  if (isNaN(bodyWeight) || bodyWeight <= 0 || !gender) {
    alert("Completa el peso corporal y el sexo");
    return;
  }

  try {
    await setDoc(doc(db, "users", user.uid), { bodyWeight, gender, maxSQ, maxBP, maxDL }, { merge: true });
    alert("Perfil guardado");
    updateAccountMetrics();
  } catch (err) {
    alert(err.message);
  }
};

// Recalcular al instante mientras el usuario escribe/selecciona (sin necesidad de guardar)
document.addEventListener("DOMContentLoaded", () => {
  const bodyWeightInput = document.getElementById("bodyWeight");
  const genderSelect = document.getElementById("gender");
  const liveFields = [bodyWeightInput, genderSelect, document.getElementById("maxSQ"), document.getElementById("maxBP"), document.getElementById("maxDL")];
  liveFields.forEach(el => {
    if (el) el.addEventListener(el.tagName === "SELECT" ? "change" : "input", updateAccountMetrics);
  });
});

window.logout = async () => {
  try {
    await auth.signOut();
  } finally {
    localStorage.clear();
    window.location.href = "Login.html";
  }
};
