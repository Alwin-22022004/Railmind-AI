import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import ToastContainer from "../common/ToastContainer";
import { useSidebar } from "../../context/SidebarContext";

function DashboardLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed, toggleSidebar } = useSidebar();

  return (
    <div className="flex min-h-screen bg-[#F4F7FB] dark:bg-[#080D1A] text-[#172033] dark:text-slate-100 transition-colors duration-200 antialiased">
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggle={toggleSidebar}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Navbar onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}

export default DashboardLayout;
