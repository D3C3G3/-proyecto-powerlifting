import {
  auth,
  db,
  doc,
  setDoc
} from "./Firebase.js";

window.saveWorkout = async () => {

  const user = auth.currentUser;

  if (!user) {
    alert("Debes iniciar sesión");
    return;
  }

  const name = document.getElementById("workoutName").value;

  const data = document.getElementById("workoutData").value;

  const date = new Date().toISOString().split("T")[0];

  try {

    await setDoc(
      doc(db, "users", user.uid, "workouts", date),
      {
        name,
        data,
        date
      }
    );

    alert("Entreno guardado");

  } catch(err) {

    alert(err.message);

  }
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
