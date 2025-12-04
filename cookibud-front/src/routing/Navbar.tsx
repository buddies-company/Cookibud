import { Navbar } from "@soilhat/react-components";
import { Outlet, NavLink } from "react-router-dom";

const navItems = [
    { label: "Recipes", href: "/recipes",  element:<NavLink to="/recipes">Recipes</NavLink> },
    { label: "Meals", href: "/meals",  element:<NavLink to="/meals">Meals</NavLink> },
];
export const NavbarComponent = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <Navbar links={navItems} brandName="Cookibud" />
            <Outlet />
        </div>
    );
}
