import { useState, useMemo, useEffect, useCallback } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { callApi } from "../services/api";
import type { User, LoginData } from "../utils/constants/types";
import { useToast } from "@soilhat/react-components";
import { AuthContext } from "./AuthContext";

export interface NumberOrStringDictionary {
    [index: string]: number | string | string[] | NumberOrStringDictionary;
}

const AuthProvider = () => {
    const [user, setUser] = useState<User | undefined>(JSON.parse(localStorage.getItem("user") ?? "{}"));
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

    const computeRedirect = (loc: ReturnType<typeof useLocation>) => {
        let redirectTo = new URLSearchParams(loc.search).get("redirectTo");
        try {
            if (!redirectTo && typeof sessionStorage !== 'undefined') {
                const last = sessionStorage.getItem('lastVisited');
                if (last && !last.startsWith('/auth')) redirectTo = last;
            }
        } catch (err) {
            console.debug('failed to read lastVisited from sessionStorage', err);
        }
        if (!redirectTo || redirectTo.startsWith('/auth')) redirectTo = "/";
        return redirectTo;
    }

    const getErrorMessage = (err: unknown) => {
        if (err && typeof err === 'object' && 'message' in err) {
            const m = (err as { message?: unknown }).message;
            if (typeof m === 'string') return m;
        }
        return String(err);
    }

    const loginAction = useCallback(async (data: LoginData) => {
        const formData = new FormData();
        formData.append('username', data.username);
        formData.append('password', data.password);
        try {
            const res = await callApi<{ access_token: string }>("/token", "POST", undefined, formData);
            if (res.data.access_token) {
                localStorage.setItem("token", res.data.access_token);
                let userId: string | undefined = undefined;
                try {
                    const parts = res.data.access_token.split('.');
                    if (parts.length === 3) {
                        const payload = JSON.parse(atob(parts[1]));
                        userId = payload.user_id;
                        // payload.username should match provided username
                    }
                } catch (err) {
                    console.debug('Failed to decode token payload', err);
                }
                const userObj = { username: data.username, id: userId };
                setUser(userObj);
                localStorage.setItem("user", JSON.stringify(userObj));
                // compute redirect target (prefers explicit redirectTo query param, otherwise lastVisited)
                const redirectTo = computeRedirect(location);
                navigate(redirectTo);
            }
        } catch (err: unknown) {
            const msg = getErrorMessage(err);
            if (msg === "Unauthorized") {
                error("Invalid username or password");
            } else {
                console.log(msg);
                error("An error occurred while logging in. Please try again later.");
            }
        }
    }, [location, navigate, error]);

    const registerAction = useCallback(async (data: LoginData) => {
        try {
            await callApi("/auth/register", "POST", undefined, data);
            // on success, log them in
            await loginAction(data);
        } catch (err: unknown) {
            const msg = getErrorMessage(err);
            if (msg === "Conflict") {
                error("User already exists");
            } else {
                error("An error occurred while registering. Please try again later.");
            }
        }
    }, [loginAction, error]);

    const logOut = useCallback(() => {
        setUser(undefined);
        localStorage.clear();
        navigate("/auth/login");
    }, [navigate]);
    const value = useMemo(() => ({ user, loginAction, registerAction, logOut }), [user, loginAction, registerAction, logOut]);

    return <AuthContext.Provider value={value}>
        <Outlet />
    </AuthContext.Provider>
}

export default AuthProvider;