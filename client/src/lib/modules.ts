import {
  Users,
  Wallet,
  ShieldCheck,
  SlidersHorizontal,
  Package,
  CalendarDays,
  Bus,
  Building2,
  Settings,
  Palette,
  type LucideIcon,
} from "lucide-react";

export type SectionKey = "studentsAffair" | "hrStaff";

export type SectionDef = {
  key: SectionKey;
  label: string;
};

export const SECTIONS: SectionDef[] = [
  { key: "studentsAffair", label: "Student's Affair" },
  { key: "hrStaff", label: "HR & Staff" },
];

export type ModuleDef = {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
  section: SectionKey;
};

export const MODULES: ModuleDef[] = [
  { key: "students", label: "Students", icon: Users, path: "/", section: "studentsAffair" },
  { key: "finance", label: "Finance", icon: Wallet, path: "/finance", section: "studentsAffair" },
  { key: "control", label: "Users", icon: ShieldCheck, path: "/users", section: "studentsAffair" },
  { key: "controlPanel", label: "Control", icon: SlidersHorizontal, path: "/control", section: "studentsAffair" },
  { key: "inventory", label: "Inventory", icon: Package, path: "/inventory", section: "studentsAffair" },
  { key: "timetable", label: "Time Table", icon: CalendarDays, path: "/timetable", section: "studentsAffair" },
  { key: "buses", label: "Buses", icon: Bus, path: "/buses", section: "studentsAffair" },
  { key: "management", label: "Management", icon: Building2, path: "/management", section: "studentsAffair" },
  { key: "configuration", label: "Preferences", icon: Settings, path: "/preferences", section: "studentsAffair" },
  {
    key: "configurationPanel",
    label: "Configuration",
    icon: SlidersHorizontal,
    path: "/configuration",
    section: "studentsAffair",
  },
  { key: "hrEmployees", label: "Employees", icon: Users, path: "/hr/employees", section: "hrStaff" },
  { key: "hrPayroll", label: "Payroll", icon: Wallet, path: "/hr/payroll", section: "hrStaff" },
  { key: "hrConfiguration", label: "Configuration", icon: Settings, path: "/hr/configuration", section: "hrStaff" },
  { key: "hrThemes", label: "Themes", icon: Palette, path: "/hr/themes", section: "hrStaff" },
];
