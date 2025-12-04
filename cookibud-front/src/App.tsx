import { Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import AuthLayout, { Login, Register } from './pages/auth';
import AuthProvider from "./routing/AuthProvider";
import PrivateRoute from "./routing/PrivateRoute";
import { NavbarComponent } from "./routing/Navbar";
import Recipes from "./pages/Recipes";
import Recipe from "./pages/Recipes/Recipe";
import Meals from "./pages/Meals";
import Meal from "./pages/Meals/Meal";

const App = () => {
  return (
    <Suspense fallback="loading">
      <BrowserRouter>
        <Routes>
          <Route element={<AuthProvider />}>
            <Route path="auth" element={<AuthLayout />}>
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
            </Route>
            <Route element={<PrivateRoute />}>
              <Route element={<NavbarComponent />}>
                <Route path="/" element={<Meals />} />
                <Route path="/recipes" element={<Recipes />} />
                <Route path="/recipes/:recipeId" element={<Recipe />} />
                <Route path="/meals" element={<Meals />} />
                <Route path="/meals/:mealId" element={<Meal />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </Suspense>
  );
};
export default App;