import { Router, Route } from "@solidjs/router";
import Home from "./pages/home.jsx";
import Start from "./pages/start.jsx";
import Configure from "./pages/configure.jsx";
import Training from "./pages/training.jsx";
import Progress from "./pages/progress.jsx";
import ProgressRecords from "./pages/progressRecords.jsx";
import ProgressMuscle from "./pages/progressMuscle.jsx";
import ProgressExercise from "./pages/progressExercise.jsx";
import ProgressSessions from "./pages/progressSessions.jsx";
import ExercisesInspect from "./pages/exercises.jsx";
import SavedSessions from "./pages/saved.jsx";
import SavedDetail from "./pages/savedDetail.jsx";
import TrainingOnGoing from "./pages/training-ongoing.jsx";
import PastTraining from "./pages/pastTraining.jsx";

export default function App() {
  return (
    <Router>
      <Route path="/" component={Home} />
      <Route path="/start" component={Start} />
      <Route path="/selection" component={Configure} />
      <Route path="/training" component={Training} />
      <Route path="/progress" component={Progress} />
      <Route path="/progress/records" component={ProgressRecords} />
      <Route path="/progress/muscle/:group" component={ProgressMuscle} />
      <Route path="/progress/exercise/:exoId" component={ProgressExercise} />
      <Route path="/progress/sessions" component={ProgressSessions} />
      <Route path="/past-training/:id" component={PastTraining} />
      <Route path="/exercises" component={ExercisesInspect} />
      <Route path="/saved" component={SavedSessions} />
      <Route path="/saved/:id" component={SavedDetail} />
      <Route path="/training/ongoing" component={TrainingOnGoing} />
    </Router>
  );
}
