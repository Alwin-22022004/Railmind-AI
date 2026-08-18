import { FiSun, FiMoon } from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className="relative w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:text-cyan-600 hover:bg-slate-100 dark:text-gray-400 dark:hover:text-cyan-400 dark:hover:bg-slate-800 transition"
    >
      {theme === "dark" ? <FiSun size={20} /> : <FiMoon size={20} />}
    </button>
  );
}

export default ThemeToggle;
