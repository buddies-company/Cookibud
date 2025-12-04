import { Outlet } from "react-router";

export default function AuthLayout() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
            <div className="bg-white dark:bg-gray-900 dark:text-white w-full max-w-sm rounded-lg shadow p-6 space-y-4">
                <Outlet />
            </div>
        </div>
    )
}

export { default as Login } from "./Login";
export { default as Register } from "./Register";