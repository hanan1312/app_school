import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { CalendarDays, ListChecks, BookMarked, FileStack, GraduationCap, Link2, Clock3 } from "lucide-react";
import { useClasses } from "../context/ClassesContext";
import RibbonGroup from "../components/RibbonGroup";
import ClassTimetableCardsModal from "../components/timetable/ClassTimetableCardsModal";
import ClassTimetableModal from "../components/timetable/ClassTimetableModal";
import SubjectSetupModal from "../components/timetable/SubjectSetupModal";
import TeachersModal from "../components/timetable/TeachersModal";
import DailyPeriodsModal from "../components/timetable/DailyPeriodsModal";

type OutletCtx = { notify: (label: string) => void };

export default function TimeTablePage() {
  useOutletContext<OutletCtx>();
  const { selectedClassName } = useClasses();

  const [cardsOpen, setCardsOpen] = useState(false);
  const [activeClassId, setActiveClassId] = useState<number | "blank" | null>(null);
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const [teachersOpen, setTeachersOpen] = useState(false);
  const [dailyPeriodsOpen, setDailyPeriodsOpen] = useState(false);
  const [note, setNote] = useState("Pick a ribbon icon above to manage timetables, subjects and teachers.");

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
        <RibbonGroup
          caption="Time Tables"
          buttons={[
            { label: "Time Table", icon: CalendarDays, onClick: () => setCardsOpen(true) },
            { label: "Time Table Management", icon: ListChecks, onClick: () => setActiveClassId("blank") },
          ]}
        />
        <RibbonGroup
          caption="Configuration"
          buttons={[
            { label: "Subjects", icon: BookMarked, onClick: () => setSubjectsOpen(true) },
            {
              label: "Subjects Details",
              icon: FileStack,
              onClick: () => setNote("Subjects Details is coming soon."),
            },
            { label: "Teachers", icon: GraduationCap, onClick: () => setTeachersOpen(true) },
            { label: "Teachers Link", icon: Link2, onClick: () => setNote("Teachers Link is coming soon.") },
            { label: "Daily Period", icon: Clock3, onClick: () => setDailyPeriodsOpen(true) },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="font-medium text-slate-700">My School</span>
          {selectedClassName && (
            <>
              <span>/</span>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                {selectedClassName}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-slate-400">{note}</div>

      {cardsOpen && (
        <ClassTimetableCardsModal
          onSelectClass={(classId) => {
            setCardsOpen(false);
            setActiveClassId(classId);
          }}
          onClose={() => setCardsOpen(false)}
        />
      )}
      {activeClassId != null && (
        <ClassTimetableModal
          initialClassId={typeof activeClassId === "number" ? activeClassId : null}
          onClose={() => setActiveClassId(null)}
        />
      )}
      {subjectsOpen && <SubjectSetupModal onClose={() => setSubjectsOpen(false)} />}
      {teachersOpen && <TeachersModal onClose={() => setTeachersOpen(false)} />}
      {dailyPeriodsOpen && <DailyPeriodsModal onClose={() => setDailyPeriodsOpen(false)} />}
    </div>
  );
}
