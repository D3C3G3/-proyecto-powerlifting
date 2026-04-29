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
    console.log("Usuario autenticado:", user.email);
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
        <h4>${workout.name}</h4>
        <p>${workout.data}</p>
        <small>${new Date(workout.date).toLocaleDateString()}</small>
      `;
      workoutList.appendChild(div);
    });
  });
}

// Cerrar sesión
window.logout = () => {
  auth.signOut();
};

/* CHART */
const ctx = document.getElementById("benchChart");
if (ctx) {
  new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Semana 1", "Semana 2", "Semana 3"],
      datasets: [{
        label: "Bench",
        data: [70, 75, 80],
        borderColor: "#c581ff",
        tension: 0.4
      }]
    }
  });
}
