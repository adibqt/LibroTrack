import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import Catalog from "./pages/Catalog.jsx";
import Members from "./pages/Members.jsx";
import About from "./pages/About.jsx";
import Login from "./pages/Login.jsx";
import Privacy from "./pages/Privacy.jsx";
import Terms from "./pages/Terms.jsx";
import NotFound from "./pages/NotFound.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminBookManager from "./pages/AdminBookManager.jsx";
import AdminMemberManager from "./pages/AdminMemberManager.jsx";
import AdminOperations from "./pages/AdminOperations.jsx";
import AdminFines from "./pages/AdminFines.jsx";
import AdminReports from "./pages/AdminReports.jsx";
import { isAuthed } from "./lib/auth.js";

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Private({ children }) {
  return isAuthed() ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public site with header/footer */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/members" element={<Members />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
      </Route>

      {/* Admin auth + dashboard (no public header/footer) */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <Private>
            <AdminDashboard />
          </Private>
        }
      />
      <Route
        path="/admin/books"
        element={
          <Private>
            <AdminBookManager />
          </Private>
        }
      />
      <Route
        path="/admin/members"
        element={
          <Private>
            <AdminMemberManager />
          </Private>
        }
      />
      <Route
        path="/admin/operations"
        element={
          <Private>
            <AdminOperations />
          </Private>
        }
      />
      <Route
        path="/admin/fines"
        element={
          <Private>
            <AdminFines />
          </Private>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <Private>
            <AdminReports />
          </Private>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
