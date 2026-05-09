import { Router, Route } from "@solidjs/router";
import Home from "./pages/home.jsx";
import Configure from "./pages/configure.jsx";
import Training from "./pages/training.jsx";
import Progress from "./pages/progress.jsx";
import ExercisesInspect from "./pages/exercises.jsx";

export default function App() {
  return (
    <Router>
      <Route path="/" component={Home} />
      <Route path="/selection" component={Configure} />
      <Route path="/training" component={Training} />
      <Route path="/progress" component={Progress} />
      <Route path="/exercises" component={ExercisesInspect} />
    </Router>
  );
}
