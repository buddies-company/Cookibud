import { createContext } from "react";
import type { User, LoginData } from "../utils/constants/types";


export const AuthContext = createContext<{
    user?: User, loginAction: (data: LoginData) => Promise<void> | void, registerAction: (data: LoginData) => void, logOut: () => void
}>({ user: undefined, loginAction: () => void 0, registerAction: () => void 0, logOut: () => void 0 });
