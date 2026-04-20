// src/components/Layout.js
import { Outlet } from 'react-router-dom';
import React from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"; // Adjust the path as needed
import { AppSidebar } from "@/components/app-sidebar"; // Adjust the path as needed
import Navbar from './Navbar'; // Import the Navbar component

const Layout = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main>
        <Navbar component={<SidebarTrigger />}/> {/* Add the Navbar here */}
        
        <Outlet />
      </main>
    </SidebarProvider>
  );
};

export default Layout;
