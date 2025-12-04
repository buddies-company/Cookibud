import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider"

const PrivateRoute = () => {
    const { user } = useAuth();
    const prevLocation = useLocation().pathname;
    if (!user) return <Navigate to={`/auth/login?redirectTo=${prevLocation}`} />
    return <Outlet />
}

export default PrivateRoute