import { Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import AuthLayout, { Login, Register } from './pages/auth';
import AuthProvider from "./routing/AuthProvider";
import PrivateRoute from "./routing/PrivateRoute";
import { NavbarComponent } from "./routing/Navbar";
import { ErrorBoundary, useToast } from "@soilhat/react-components";
import Recipes from "./pages/Recipes";
import Recipe from "./pages/Recipes/Recipe";
import Meals from "./pages/Meals";
import Meal from "./pages/Meals/Meal";
import GroceryPeriod from "./pages/Meals/GroceryPeriod";
import Fridge from "./pages/Fridge";
import type { ApiToastDetail } from "./utils/constants/types";

export const ApiToastListener = () => {
  const { error, info, success } = useToast();

  useEffect(() => {
    const handleToast = (event: Event) => {
      const customEvent = event as CustomEvent<ApiToastDetail>;
      const { message, type } = customEvent.detail;

      if (type === 'error') {
        error(message);
      } else if (type === 'info') {
        info(message);
      } else if (type === 'success') {
        success(message);
      }
    };

    window.addEventListener('api-toast', handleToast);
    return () => window.removeEventListener('api-toast', handleToast);
  }, [error, info, success]);

  return null;
};

const App = () => {
  return (
    <ErrorBoundary>
      <ApiToastListener />
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
                  <Route path="/groceries" element={<GroceryPeriod />} />
                  <Route path="/fridge" element={<Fridge />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </Suspense>
    </ErrorBoundary>
  );
};
export default App;