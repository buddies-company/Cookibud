import { Navbar } from "@soilhat/react-components";
import { Outlet } from "react-router-dom";
import {
  CakeIcon,
  CalendarDaysIcon,
  ShoppingCartIcon,
  CpuChipIcon
} from "@heroicons/react/24/outline";

const navItems = [
  { label: "Recipes", to: "/recipes", icon: <CakeIcon className="size-5" /> },
  { label: "Meals", to: "/", icon: <CalendarDaysIcon className="size-5" /> },
  { label: "Groceries", to: "/groceries", icon: <ShoppingCartIcon className="size-5" /> },
  { label: "Fridge", to: "/fridge", icon: <CpuChipIcon className="size-5" /> },
];

export const NavbarComponent = () => {
  return (
    <Navbar
      layout="sidebar"
      brandName="Cookibud"
      logoURl="/assets/pal only.png"
      links={navItems}
    >
      <Outlet />
    </Navbar>
  );
};
