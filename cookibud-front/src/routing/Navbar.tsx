import { Navbar } from "@soilhat/react-components";
import { Outlet, NavLink } from "react-router-dom";

const navItems = [
    { label: "Recipes", href: "/recipes",  element:<NavLink to="/recipes">Recipes</NavLink> },
    { label: "Meals", href: "/meals",  element:<NavLink to="/meals">Meals</NavLink> },
    { label: "Groceries", href: "/groceries",  element:<NavLink to="/groceries">Groceries</NavLink> },
];
export const NavbarComponent = () => {
    return (
        <div className="min-h-screen  bg-surface-base dark:bg-surface-base-dark">
            <Navbar links={navItems} brandName="Cookibud" logoURl="/assets/pal only.png" />
            <Outlet />
        </div>
    );
}
