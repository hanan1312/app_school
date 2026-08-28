import { SlidersHorizontal } from "lucide-react";

export default function ControlPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <SlidersHorizontal size={22} />
      </span>
      <p className="text-sm font-medium text-slate-600">Control</p>
      <p className="text-xs text-slate-400">This section is coming soon.</p>
    </div>
  );
}
