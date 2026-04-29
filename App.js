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

// Verificar estado de autenticación
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "Login.html";
  } else {
    loadWorkouts(user.uid);
  }
});

// Guardar entrenamiento
window.saveWorkout = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const name = document.getElementById("workoutName").value;
  const data = document.getElementById("workoutData").value;
  const date = new Date().toISOString();

  if (!name || !data) {
    alert("Por favor rellena todos los campos");
    return;
  }

  try {
    await setDoc(doc(collection(db, "users", user.uid, "workouts")), {
      name,
      data,
      date,
      timestamp: Date.now()
    });
    alert("Entreno guardado");
    document.getElementById("workoutName").value = "";
    document.getElementById("workoutData").value = "";
  } catch (err) {
    alert("Error al guardar: " + err.message);
  }
};

// Cargar entrenamientos en tiempo real
function loadWorkouts(userId) {
  const q = query(
    collection(db, "users", userId, "workouts"),
    orderBy("timestamp", "desc")
  );

  onSnapshot(q, (snapshot) => {
    const workoutList = document.getElementById("workoutList");
    if (!workoutList) return;
    
    workoutList.innerHTML = "";
    snapshot.forEach((doc) => {
      const workout = doc.data();
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4 style="margin:0;">${workout.name}</h4>
          <small>${new Date(workout.date).toLocaleDateString()}</small>
        </div>
        <p style="white-space: pre-wrap; margin-top:10px;">${workout.data}</p>
      `;
      workoutList.appendChild(div);
    });
  });
}

// Cerrar sesión
window.logout = () => {
  auth.signOut();
};

// Configuración de Gráficas
const chartConfig = (label, color) => ({
  type: "line",
  data: {
    labels: ["Semana 1", "Semana 2", "Semana 3", "Semana 4"],
    datasets: [{
      label: label,
      data: [0, 0, 0, 0], // Datos de ejemplo, se podrían cargar de Firebase
      borderColor: color,
      backgroundColor: color + "22",
      tension: 0.4,
      fill: true
    }]
  },
  options: {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: false } }
  }
});

// Inicializar Gráficas
const ctxSQ = document.getElementById("sqChart");
const ctxBP = document.getElementById("bpChart");
const ctxDL = document.getElementById("dlChart");

if (ctxSQ) new Chart(ctxSQ, chartConfig("Squat", "#ff4d4d"));
if (ctxBP) new Chart(ctxBP, chartConfig("Bench", "#c581ff"));
if (ctxDL) new Chart(ctxDL, chartConfig("Deadlift", "#4dff88"));

// Datos de la Rutina (Extraídos del Excel)
const routineData = {
  Lunes: [
    { ex: "SQ LB 2ct", set: "4 x 4 @4" },
    { ex: "DL SUMO 2ct", set: "3 x 4 @4" },
    { ex: "Ext. cuádriceps", set: "3 x 12 Rir1" },
    { ex: "Prensa", set: "3 x 8 rir 0" }
  ],
  Martes: [
    { ex: "BP kodama", set: "3 x 5 @4" },
    { ex: "Remo en T", set: "3 x 12 rir 0" },
    { ex: "Jalón al pecho", set: "4 x 12 rir 1" },
    { ex: "Remo Gironda", set: "3 x 12 rir 1" },
    { ex: "Curl predicador", set: "2 x 12 rir 0" },
    { ex: "Bayesian", set: "2 x 12 rir 0" }
  ],
  Jueves: [
    { ex: "Bp spotto", set: "3 x 4 @4" },
    { ex: "Inclinado mancuernas", set: "3 x 8 rir 0" },
    { ex: "Aperturas", set: "4 x 12 rir 1" },
    { ex: "Press militar", set: "3 x 12 rir 2" },
    { ex: "Laterales", set: "4 x 15 rir 0" },
    { ex: "Extensión de tríceps", set: "3 x 12 rir 1" }
  ],
  Viernes: [
    { ex: "SQ LB", set: "4 x 4 @4 / 1 x 2 @6" },
    { ex: "BP", set: "4 x 4 @4" },
    { ex: "DL SUMO", set: "3 x 3 @3 / 2 x 2 @6" },
    { ex: "Rumano", set: "3 x 12 rir 2" },
    { ex: "Curl de isquio", set: "2 x 15 rir 0" }
  ]
};

window.loadRoutine = (day) => {
  const container = document.getElementById("routineContent");
  if (!container) return;
  
  const exercises = routineData[day] || [];
  container.innerHTML = `<h3>${day}</h3>`;
  
  if (exercises.length === 0) {
    container.innerHTML += "<p>Descanso o día no configurado.</p>";
    return;
  }

  const table = document.createElement("table");
  table.style.width = "100%";
  table.innerHTML = `<tr><th>Ejercicio</th><th>Series/Reps</th></tr>`;
  
  exercises.forEach(item => {
    const row = table.insertRow();
    row.innerHTML = `<td>${item.ex}</td><td>${item.set}</td>`;
  });
  
  container.innerHTML = "";
  container.appendChild(table);
};
