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

let charts = {};

// --- NAVEGACIÓN ---
window.showSection = (id) => {
  const sections = ['dashboard', 'workouts', 'routine'];
  sections.forEach(s => {
    document.getElementById(`${s}-section`).style.display = s === id ? 'block' : 'none';
  });
  
  // Actualizar Tab Bar
  document.querySelectorAll('.tab-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('onclick').includes(id)) {
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
  initCharts();
}

// --- FORMULARIO ---
const routineData = {
  Lunes: [{ ex: "SQ LB 2ct", set: "4 x 4 @4" }, { ex: "DL SUMO 2ct", set: "3 x 4 @4" }, { ex: "Ext. cuádriceps", set: "3 x 12 Rir1" }, { ex: "Prensa", set: "3 x 8 rir 0" }],
  Martes: [{ ex: "BP kodama", set: "3 x 5 @4" }, { ex: "Remo en T", set: "3 x 12 rir 0" }, { ex: "Jalón al pecho", set: "4 x 12 rir 1" }, { ex: "Remo Gironda", set: "3 x 12 rir 1" }, { ex: "Curl predicador", set: "2 x 12 rir 0" }, { ex: "Bayesian", set: "2 x 12 rir 0" }],
  Jueves: [{ ex: "Bp spotto", set: "3 x 4 @4" }, { ex: "Inclinado mancuernas", set: "3 x 8 rir 0" }, { ex: "Aperturas", set: "4 x 12 rir 1" }, { ex: "Press militar", set: "3 x 12 rir 2" }, { ex: "Laterales", set: "4 x 15 rir 0" }, { ex: "Extensión de tríceps", set: "3 x 12 rir 1" }],
  Viernes: [{ ex: "SQ LB", set: "4 x 4 @4 / 1 x 2 @6" }, { ex: "BP", set: "4 x 4 @4" }, { ex: "DL SUMO", set: "3 x 3 @3 / 2 x 2 @6" }, { ex: "Rumano", set: "3 x 12 rir 2" }, { ex: "Curl de isquio", set: "2 x 15 rir 0" }]
};

window.updateExercises = () => {
  const day = document.getElementById("workoutDay").value;
  const exSelect = document.getElementById("workoutEx");
  exSelect.innerHTML = '<option value="">Ejercicio</option>';
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
    alert("Guardado");
    document.getElementById("workoutWeight").value = "";
    document.getElementById("workoutReps").value = "";
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
          <div style="padding:10px 0; border-top:1px solid var(--border-color)">
            <div style="display:flex; justify-content:space-between">
              <strong>${i.ex}</strong>
              <span>${i.weight}kg x ${i.reps}</span>
            </div>
            <div style="font-size:12px; color:var(--text-secondary)">e1RM: ${Math.round(i.e1RM)}kg | RPE: ${i.rpe}</div>
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
    data: { labels: [], datasets: [{ data: [], borderColor: color, backgroundColor: color + '22', fill: true, tension: 0.4, pointRadius: 4 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8e8e93' } },
        x: { display: false }
      }
    }
  });

  charts.SQ = new Chart(document.getElementById("sqChart"), config("#34c759"));
  charts.BP = new Chart(document.getElementById("bpChart"), config("#007aff"));
  charts.DL = new Chart(document.getElementById("dlChart"), config("#ff9500"));
}

function updateCharts(workouts) {
  const fridayWorkouts = workouts.filter(w => w.isFriday);
  const mapping = { SQ: "SQ LB", BP: "BP", DL: "DL SUMO" };

  Object.entries(mapping).forEach(([key, name]) => {
    const data = fridayWorkouts
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
  container.innerHTML = `<h2>${day}</h2>`;
  
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

window.logout = () => auth.signOut();
