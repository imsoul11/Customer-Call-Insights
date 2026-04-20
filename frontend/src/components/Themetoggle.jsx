import { useEffect, useState } from "react";
import { SunIcon,MoonIcon } from "lucide-react";

export default function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedMode = localStorage.getItem("theme");
    if (savedMode) {
      setIsDarkMode(savedMode === "dark");
      document.body.classList.toggle("dark", savedMode === "dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, []);

  const handleToggle = () => {
    const newMode = !isDarkMode ? "dark" : "light";
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle("dark", newMode === "dark");
    localStorage.setItem("theme", newMode);
  };

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-md bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 transition"
    >
      {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
    </button>
  );
}
