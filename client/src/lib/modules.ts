import { Users, Wallet, SlidersHorizontal, Package, CalendarDays, Bus, Building2, Settings, type LucideIcon } from "lucide-react";

export type ModuleDef = {
  key: string;
  label: string;
  icon: LucideIcon;
  path: string;
};

export const MODULES: ModuleDef[] = [
  { key: "students", label: "Students", icon: Users, path: "/" },
  { key: "finance", label: "Finance", icon: Wallet, path: "/finance" },
  { key: "control", label: "Control", icon: SlidersHorizontal, path: "/control" },
  { key: "inventory", label: "Inventory", icon: Package, path: "/inventory" },
  { key: "timetable", label: "Time Table", icon: CalendarDays, path: "/timetable" },
  { key: "buses", label: "Buses", icon: Bus, path: "/buses" },
  { key: "management", label: "Management", icon: Building2, path: "/management" },
  { key: "configuration", label: "Configuration", icon: Settings, path: "/configuration" },
];
