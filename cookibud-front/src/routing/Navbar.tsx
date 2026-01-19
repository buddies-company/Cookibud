import { Navbar } from "@soilhat/react-components";
import { Outlet, NavLink } from "react-router-dom";
import { 
  CakeIcon, 
  CalendarDaysIcon, 
  ShoppingCartIcon, 
  UserCircleIcon 
} from "@heroicons/react/24/outline";

const navItems = [
  { 
    label: "Recipes", 
    href: "/recipes", 
    icon: <CakeIcon />, 
    element: <NavLink to="/recipes">Recipes</NavLink>
  },
  { 
    label: "Meals", 
    href: "/meals", 
    icon: <CalendarDaysIcon />, 
    element: <NavLink to="/meals">Meals</NavLink>
  },
  { 
    label: "Groceries", 
    href: "/groceries", 
    icon: <ShoppingCartIcon />, 
    element: <NavLink to="/groceries">Groceries</NavLink>
  },
];

export const NavbarComponent = () => {
  return (
    <Navbar 
      layout="sidebar" 
      brandName="Cookibud" 
      logoURl="/assets/pal only.png"
      links={navItems}
      actions={
        <button className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-text-secondary dark:text-text-secondary-dark">
          <UserCircleIcon className="size-5" />
          Profile
        </button>
      }
      mobileNav={<MobileBottomNav links={navItems} />}
    >
      <Outlet />
    </Navbar>
  );
};

/**
 * Mobile Bottom Navigation Component
 * Best for UX on small screens (reachable with thumbs)
 */
const MobileBottomNav = ({ links }: { links: any[] }) => (
  <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border dark:border-border-dark bg-surface-panel/90 dark:bg-surface-panel-dark/90 backdrop-blur-lg pb-safe">
    <div className="flex justify-around items-center h-16">
      {links.map((link) => (
        <NavLink
          key={link.label}
          to={link.href}
          className={({ isActive }) => `
            flex flex-col items-center justify-center gap-1 w-full h-full transition-colors
            ${isActive 
                ? 'text-primary dark:text-primary-dark font-bold' 
                : 'text-text-secondary dark:text-text-secondary-dark font-medium'
            }
          `}
        >
          <span className="size-6">{link.icon}</span>
          <span className="text-[10px] uppercase tracking-wider">{link.label}</span>
        </NavLink>
      ))}
    </div>
  </nav>
);