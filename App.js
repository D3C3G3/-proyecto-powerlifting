import {
  auth,
  db,
  doc,
  setDoc,
  collection,
  query,
  orderBy,
  onSnapshot
} from "./Firebase.js";

// --- CONFIGURACIÓN Y DATOS ---
const routineData = {
  Lunes: [{ ex: "SQ LB 2ct", set: "4 x 4 @4" }, { ex: "DL SUMO 2ct", set: "3 x 4 @4" }, { ex: "Ext. cuádriceps", set: "3 x 12 Rir1" }, { ex: "Prensa", set: "3 x 8 rir 0" }],
  Martes: [{ ex: "BP kodama", set: "3 x 5 @4" }, { ex: "Remo en T", set: "3 x 12 rir 0" }, { ex: "Jalón al pecho", set: "4 x 12 rir 1" }, { ex: "Remo Gironda", set: "3 x 12 rir 1" }, { ex: "Curl predicador", set: "2 x 12 rir 0" }, { ex: "Bayesian", set: "2 x 12 rir 0" }],
  Jueves: [{ ex: "Bp spotto", set: "3 x 4 @4" }, { ex: "Inclinado mancuernas", set: "3 x 8 rir 0" }, { ex: "Aperturas", set: "4 x 12 rir 1" }, { ex: "Press militar", set: "3 x 12 rir 2" }, { ex: "Laterales", set: "4 x 15 rir 0" }, { ex: "Extensión de tríceps", set: "3 x 12 rir 1" }],
  Viernes: [{ ex: "SQ LB", set: "4 x 4 @4 / 1 x 2 @6" }, { ex: "BP", set: "4 x 4 @4" }, { ex: "DL SUMO", set: "3 x 3 @3 / 2 x 2 @6" }, { ex: "Rumano", set: "3 x 12 rir 2" }, { ex: "Curl de isquio", set: "2 x 15 rir 0" }]
};

let charts = {};

// --- LÓGICA DE AUTENTICACIÓN ---
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "Login.html";
  } else {
    initApp(user.uid);
  }
});

function initApp(userId) {
  loadWorkouts(userId);
  initCharts();
}

// --- LÓGICA DE ENTRENAMIENTOS ---
window.updateExercises = () => {
  const day = document.getElementById("workoutDay").value;
  const exSelect = document.getElementById("workoutEx");
  exSelect.innerHTML = '<option value="">-- Selecciona Ejercicio --</option>';
  if (routineData[day]) {
    routineData[day].forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.ex;
      opt.textContent = item.ex;
      exSelect.appendChild(opt);
    });
  }
};

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
  const rpe = parseFloat(document.getElementById("workoutRPE").value);
  const notes = document.getElementById("workoutNotes").value;
  const date = new Date();

  if (!day || !ex || isNaN(weight) || isNaN(reps)) {
    alert("Rellena los campos obligatorios");
    return;
  }

  // Calcular 1RM Estimado (Brzycki)
  const e1RM = weight / (1.0278 - (0.0278 * reps));

  try {
    await setDoc(doc(collection(db, "users", user.uid, "workouts")), {
      day, ex, weight, reps, rpe, notes, e1RM,
      date: date.toISOString(),
      isFriday: date.getDay() === 5,
      timestamp: Date.now()
    });
    alert("Registro guardado");
    resetForm();
  } catch (err) {
    alert("Error: " + err.message);
  }
};

function resetForm() {
  document.getElementById("workoutWeight").value = "";
  document.getElementById("workoutReps").value = "";
  document.getElementById("workoutRPE").value = "";
  document.getElementById("workoutNotes").value = "";
}

// --- HISTORIAL Y GRÁFICAS ---
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

  // Agrupar por fecha
  const groups = workouts.reduce((acc, w) => {
    const date = new Date(w.date).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(w);
    return acc;
  }, {});

  Object.entries(groups).forEach(([date, items]) => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "accordion-item";
    itemDiv.innerHTML = `
      <div class="accordion-header" onclick="this.parentElement.classList.toggle('active')">
        <span>${date} - ${items[0].day}</span>
        <span>${items.length} ejercicios ▾</span>
      </div>
      <div class="accordion-content">
        ${items.map(i => `
          <div style="padding: 8px 0; border-top: 1px solid #262626;">
            <strong>${i.ex}</strong>: ${i.weight}kg x ${i.reps} (RPE ${i.rpe || '-'})
            <div style="font-size: 0.8rem; color: #a1a1a1;">e1RM: ${Math.round(i.e1RM)}kg | ${i.notes || ''}</div>
          </div>
        `).join('')}
      </div>
    `;
    container.appendChild(itemDiv);
  });
}

// --- GRÁFICAS (Solo Viernes) ---
function initCharts() {
  const config = (color) => ({
    type: 'line',
    data: { labels: [], datasets: [{ data: [], borderColor: color, tension: 0.4, fill: false }] },
    options: { 
      responsive: true, 
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { ticks: { color: '#a1a1a1' }, grid: { color: '#262626' } }, x: { display: false } }
    }
  });

  charts.SQ = new Chart(document.getElementById("sqChart"), config("#10b981"));
  charts.BP = new Chart(document.getElementById("bpChart"), config("#3b82f6"));
  charts.DL = new Chart(document.getElementById("dlChart"), config("#f59e0b"));
}

function updateCharts(workouts) {
  const fridayWorkouts = workouts.filter(w => w.isFriday);
  const exercises = { SQ: "SQ LB", BP: "BP", DL: "DL SUMO" };

  Object.entries(exercises).forEach(([key, name]) => {
    const data = fridayWorkouts
      .filter(w => w.ex === name)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-10);

    charts[key].data.labels = data.map(d => new Date(d.date).toLocaleDateString());
    charts[key].data.datasets[0].data = data.map(d => d.weight);
    charts[key].update();
  });
}

// --- CALCULADORA DE PLACAS ---
window.calculatePlates = () => {
  const target = parseFloat(document.getElementById("workoutWeight").value);
  if (isNaN(target) || target < 20) { alert("Peso mínimo 20kg (barra)"); return; }
  
  let weightPerSide = (target - 20) / 2;
  const plates = [25, 20, 15, 10, 5, 2.5, 1.25];
  let result = [];

  plates.forEach(p => {
    while (weightPerSide >= p) {
      result.push(p);
      weightPerSide -= p;
    }
  });

  alert(`Discos por lado: ${result.length > 0 ? result.join(', ') + ' kg' : 'Sin discos'}`);
};

// --- RUTINA ---
window.loadRoutine = (day) => {
  const container = document.getElementById("routineContent");
  const exercises = routineData[day] || [];
  container.innerHTML = `<h3>${day}</h3>`;
  if (exercises.length === 0) { container.innerHTML += "<p>Descanso.</p>"; return; }
  
  const table = document.createElement("table");
  table.innerHTML = `<tr><th>Ejercicio</th><th>Series/Reps</th></tr>`;
  exercises.forEach(item => {
    const row = table.insertRow();
    row.innerHTML = `<td>${item.ex}</td><td>${item.set}</td>`;
  });
  container.innerHTML = ""; container.appendChild(table);
};

window.logout = () => auth.signOut();
window.showSection = (id) => {
  ['dashboard', 'workouts', 'routine'].forEach(s => {
    document.getElementById(`${s}-section`).style.display = s === id ? 'block' : 'none';
  });
};
