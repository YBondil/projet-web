import { Router, Route } from "@solidjs/router";
import Home from "./pages/home.jsx";
import Start from "./pages/start.jsx";
import Configure from "./pages/configure.jsx";
import Training from "./pages/training.jsx";
import Progress from "./pages/progress.jsx";
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
      <Route path="/past-training/:id" component={PastTraining} />
      <Route path="/exercises" component={ExercisesInspect} />
      <Route path="/saved" component={SavedSessions} />
      <Route path="/saved/:id" component={SavedDetail} />
      <Route path="/training/ongoing" component={TrainingOnGoing} />
    </Router>
  );
}
