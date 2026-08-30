import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ClassesProvider } from "./context/ClassesContext";
import { SettingsProvider } from "./context/SettingsContext";
import { SchoolsProvider } from "./context/SchoolsContext";
import { HrEmployeesProvider } from "./context/HrEmployeesContext";
import LoginPage from "./pages/LoginPage";
import StudentsPage from "./pages/StudentsPage";
import FinancePage from "./pages/FinancePage";
import TimeTablePage from "./pages/TimeTablePage";
import BusesPage from "./pages/BusesPage";
import InventoryPage from "./pages/InventoryPage";
import UsersPage from "./pages/UsersPage";
import ControlPage from "./pages/ControlPage";
import ManagementPage from "./pages/ManagementPage";
import PreferencesPage from "./pages/PreferencesPage";
import ConfigurationPage from "./pages/ConfigurationPage";
import HrEmployeesPage from "./pages/hr/EmployeesPage";
import HrPayrollPage from "./pages/hr/PayrollPage";
import HrConfigurationPage from "./pages/hr/ConfigurationPage";
import HrThemesPage from "./pages/hr/ThemesPage";
import DashboardLayout from "./components/DashboardLayout";

function ProtectedArea() {
  const { user, bootstrapping } = useAuth();
  if (bootstrapping) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <SettingsProvider>
      <ClassesProvider>
        <SchoolsProvider>
          <HrEmployeesProvider>
            <DashboardLayout />
          </HrEmployeesProvider>
        </SchoolsProvider>
      </ClassesProvider>
    </SettingsProvider>
  );
}

function RequireModule({ moduleKey, children }: { moduleKey: string; children: ReactNode }) {
  const { hasModule } = useAuth();
  if (!hasModule(moduleKey)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <ShieldOff size={22} />
        </span>
        <p className="text-sm font-medium text-slate-600">You don't have access to this module.</p>
        <p className="text-xs text-slate-400">Ask an admin to grant you access from Users.</p>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedArea />}>
            <Route
              index
              element={
                <RequireModule moduleKey="students">
                  <StudentsPage />
                </RequireModule>
              }
            />
            <Route
              path="finance"
              element={
                <RequireModule moduleKey="finance">
                  <FinancePage />
                </RequireModule>
              }
            />
            <Route
              path="timetable"
              element={
                <RequireModule moduleKey="timetable">
                  <TimeTablePage />
                </RequireModule>
              }
            />
            <Route
              path="buses"
              element={
                <RequireModule moduleKey="buses">
                  <BusesPage />
                </RequireModule>
              }
            />
            <Route
              path="inventory"
              element={
                <RequireModule moduleKey="inventory">
                  <InventoryPage />
                </RequireModule>
              }
            />
            <Route
              path="users"
              element={
                <RequireModule moduleKey="control">
                  <UsersPage />
                </RequireModule>
              }
            />
            <Route
              path="control"
              element={
                <RequireModule moduleKey="controlPanel">
                  <ControlPage />
                </RequireModule>
              }
            />
            <Route
              path="management"
              element={
                <RequireModule moduleKey="management">
                  <ManagementPage />
                </RequireModule>
              }
            />
            <Route
              path="preferences"
              element={
                <RequireModule moduleKey="configuration">
                  <PreferencesPage />
                </RequireModule>
              }
            />
            <Route
              path="configuration"
              element={
                <RequireModule moduleKey="configurationPanel">
                  <ConfigurationPage />
                </RequireModule>
              }
            />
            <Route
              path="hr/employees"
              element={
                <RequireModule moduleKey="hrEmployees">
                  <HrEmployeesPage />
                </RequireModule>
              }
            />
            <Route
              path="hr/payroll"
              element={
                <RequireModule moduleKey="hrPayroll">
                  <HrPayrollPage />
                </RequireModule>
              }
            />
            <Route
              path="hr/configuration"
              element={
                <RequireModule moduleKey="hrConfiguration">
                  <HrConfigurationPage />
                </RequireModule>
              }
            />
            <Route
              path="hr/themes"
              element={
                <RequireModule moduleKey="hrThemes">
                  <HrThemesPage />
                </RequireModule>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
