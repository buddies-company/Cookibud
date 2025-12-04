import { createContext, useContext, useState, useMemo, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { callApi } from "../services/api";
import type { User } from "../utils/constants/types";
import { useToast } from "@soilhat/react-components";

interface LoginData { username: string, password: string }

export interface NumberOrStringDictionary {
    [index: string]: number | string | string[] | NumberOrStringDictionary;
}

const AuthContext = createContext<{
    user?: User, loginAction: (data: LoginData) => Promise<void> | void, registerAction: (data: LoginData) => void, logOut: () => void
}>({ user: undefined, loginAction: () => void 0, registerAction: () => void 0, logOut: () => void 0 });

const AuthProvider = () => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") ?? "{}"));
    const location = useLocation();
    const navigate = useNavigate();
    const { error } = useToast();

    // persist last visited non-auth page so we can redirect back after login
    // stored in sessionStorage as 'lastVisited'
    useEffect(() => {
        try {
            if (typeof sessionStorage !== 'undefined') {
                const p = location.pathname + location.search;
                if (!p.startsWith('/auth')) {
                    sessionStorage.setItem('lastVisited', p);
                }
            }
        } catch (err) {
            // sessionStorage may be unavailable (SSR / restricted env)
            console.debug('sessionStorage not available for lastVisited', err);
        }
    }, [location]);

    const loginAction = async (data: LoginData) => {
        const formData = new FormData();
        formData.append('username', data.username);
        formData.append('password', data.password);
        callApi("/token", "POST", undefined, formData).then((res) => {
            if (res.data.access_token) {
                setUser({ username: data.username });
                localStorage.setItem("user", JSON.stringify({ username: data.username }));
                localStorage.setItem("token", res.data.access_token);
                // prefer explicit redirectTo query param, otherwise use lastVisited saved in sessionStorage
                let redirectTo = new URLSearchParams(location.search).get("redirectTo");
                try {
                    if (!redirectTo && typeof sessionStorage !== 'undefined') {
                        const last = sessionStorage.getItem('lastVisited');
                        if (last && !last.startsWith('/auth')) redirectTo = last;
                    }
                } catch (err) {
                    console.debug('failed to read lastVisited from sessionStorage', err);
                }
                if (!redirectTo || redirectTo.startsWith('/auth')) redirectTo = "/";
                navigate(redirectTo);
            }
        }).catch((err) => {
            if (err.message === "Unauthorized") {
                error("Invalid username or password");
            }
            else {
                console.log(err.message);
                error("An error occurred while logging in. Please try again later.");
            }
        })
    }

    const registerAction = async (data: LoginData) => {
        callApi("/auth/register", "POST", undefined, data).then(() => {
            loginAction(data);
        }).catch((err) => {
            if (err.message === "Conflict") {
                error("User already exists");
            } else {
                error("An error occurred while registering. Please try again later.");
            }
        })
    }

    const logOut = () => {
        setUser(null);
        localStorage.clear();
        navigate("/auth/login");
    }
    const value = useMemo(() => ({ user, loginAction, registerAction, logOut }), [user, loginAction, registerAction, logOut]);

    return <AuthContext.Provider value={value}>
        <Outlet />
    </AuthContext.Provider>
}

export default AuthProvider;

export const useAuth = () => {
    return useContext(AuthContext);
}