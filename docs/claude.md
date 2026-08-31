# Session Log — HR & Staff Module (Navigation, Employees, Attendance, Leave, Payroll, Configuration, Multi-School)

This document summarizes the work done in one Claude Code session on this repo (app_school:
a school management app with an Express/better-sqlite3 `server` and a Vite/React `client`).
It replaces an earlier session-log doc of the same name that covered a prior session
(deployment scripting, the master account, activity monitoring, and some Students-table UI
changes) — that file was removed in this session's `aab4d7c` commit.

## 1. Navigation restructure: two top-level sections

The previously flat module nav (Students, Finance, Users, Control, Inventory, Time Table,
Buses, Management, Configuration) was split into two top-level sections, each with its own
row of module tabs beneath it:

- **Student's Affair** — all the pre-existing modules, plus:
  - The old "Configuration" (school settings: branding, theme, name/address/phone/currency)
    was renamed to **Preferences** (`client/src/pages/PreferencesPage.tsx`, was
    `ConfigurationPage.tsx`), keeping its original `configuration` permission — same pattern
    as the earlier Control→Users rename (same page, same permission, new path).
  - A new, currently-empty **Configuration** tab takes over the old path/label, gated by its
    own independent `configurationPanel` permission — same "empty placeholder" pattern as the
    existing empty Control tab.
- **HR & Staff** (new) — Employees, Payroll, Configuration, Themes (Themes is still an empty
  placeholder; not built out this session).

`client/src/components/DashboardLayout.tsx` renders the section-tab row above the
module-tab row; `client/src/lib/modules.ts`'s `MODULES` array gained a `section` field per
entry. A shared `ComingSoonPage` component replaced the one-off "coming soon" markup that
used to live only in the Control page, since there are now several placeholder tabs.

## 2. HR & Staff → Employees

A full employee master-data system, deliberately **not** built on top of the pre-existing
`staff` table / `server/src/routes/staff.ts` (a shallow 9-field directory used by the
unrelated Student's Affair → Management tab) — `hr_employees` is a new, separate table with
~35 fields grouped into tabs matching the reference desktop app: Basic Data, Position,
Contracts, Education, Documentation.

- `server/src/routes/hrEmployees.ts` — CRUD + photo upload (reusing the students
  `:id/photo` multer pattern).
- `client/src/components/hr/EmployeeFormModal.tsx` — tabbed modal modeled directly on
  `StudentFormModal.tsx`'s structure and layout helpers (extracted into
  `client/src/components/FormLayout.tsx` — `Section`/`Field`/`inputCls` — since they were
  about to be needed a second time).
- `client/src/pages/hr/EmployeesPage.tsx` — a ribbon-style action bar (mirroring
  `StudentsPage.tsx`'s pattern; the shared bits were extracted into
  `client/src/components/RibbonGroup.tsx`) with the employee grid as the default view.
- Two small field tweaks requested after the initial build: the "Job" field was relabeled
  **مرحلة**, and a **مؤمن بالمعاش** ("insured for pension") checkbox was added alongside
  Insured / Insured-with-Another / Fellowship Box (`insured_pension` column, additive
  migration in `db.ts` since `hr_employees` already existed in the dev DB by that point).
- **Import/Export**: reused the existing `CsvImportModal`/`downloadExcel` infrastructure
  (the same one `StudentsPage` uses) rather than building new plumbing — a subset of core
  fields (name, gender, ID, contact, Division/Section/Department/مرحلة, status).

## 3. Multi-school support

A real `schools` table was added, with `hr_employees`/`hr_attendance`/`hr_leave_ledger` and
the HR configuration catalogs scoped by `school_id`. **Deliberately not** retrofitted onto
Students/Finance/Buses/etc. — those stay single-school, exactly as before. This was an
explicit scope decision (confirmed with the user) rather than an oversight, to avoid a much
larger, unrequested multi-tenancy project.

- One school is auto-seeded from the pre-existing single-school `settings` table, so an
  existing install behaves identically until a second school is actually added.
- `client/src/context/SchoolsContext.tsx` + `client/src/components/hr/SchoolsSwitcherModal.tsx`
  (a "Multi Propertys"-style list dialog) — the switcher lives only inside HR & Staff, never
  as a global control, so its scope stays visually obvious.
- `server/src/routes/schools.ts` — list is readable by anyone with `hrEmployees`;
  create/edit/delete requires `hrConfiguration`. At least one school is always required.

## 4. HR & Staff → Employees: Attendance

`server/src/routes/hrAttendance.ts` + `client/src/components/hr/HrAttendanceModal.tsx` —
Daily Attendance / Day Details / Overall / Days Closed tabs, modeled on the existing student
attendance system's shape (`server/src/routes/attendance.ts`'s single-day upsert + date-range
analysis pattern), extended with a **Days Closed** concept the student system doesn't have:
once a day is closed, `POST /hr/attendance/bulk` rejects further writes for that date
server-side (not just a disabled button client-side).

One real bug was found and fixed here during verification: the daily-attendance `LEFT JOIN`
query selected `hr_attendance.*` before `hr_employees.id`, so on a day with no attendance
marked yet, every row's `employee_id` came back `NULL` (from the unmatched `hr_attendance`
side) — causing a React "duplicate key" warning and, worse, indistinguishable rows. Fixed by
selecting `hr_employees.id as employee_id` **after** `hr_attendance.*` so it overrides.

## 5. HR & Staff → Employees: Leave

- `hr_leave_ledger` — a single table doubles as both the running balance and the leave
  request history: an `opening_balance` row and a `leave` row (negative count, dates filled)
  are both just ledger entries; current balance for (employee, leave type) is `SUM(count)`.
- `client/src/components/hr/HrLeaveModal.tsx` — employee picker + leave form + ledger table,
  matching the reference screenshot's layout.
- `client/src/components/hr/HrLeavePrintView.tsx` — generates the official Arabic
  "استمارة اجازة اعتيادية" leave form on save, reusing the exact `print-area`/`print-hidden`
  CSS convention already used by `StudentCardsModal.tsx` (no PDF library needed). Letterhead
  fields (name/address/phone/governorate/directorate/logo) come from the employee's own
  school row, not the old global settings — otherwise every school's form would look
  identical, defeating the point of multi-school support.

## 6. HR & Staff → Configuration

Two generic tables back ~18 of the ~20 configuration catalogs shown on the reference app's
ribbon, through one generic server route + one generic client modal each, rather than
building near-duplicate CRUD per catalog:

- `hr_lookup_items` (pure name catalogs: Country, Area, Banks, Universities, Educations,
  Outside Employees, Message) — `client/src/components/hr/LookupListModal.tsx`.
- `hr_valued_items` (name + numeric amount/percentage: Allowance, Over Time, Rewards,
  Misconduct, Benefits, Tax, Deductions, plus Leave Balance's annual-day entitlement per
  leave type, plus three Payroll-ribbon-only categories added later — see §7) —
  `client/src/components/hr/ValuedListModal.tsx`.
- Shifts and Official Holidays got their own small dedicated tables/modals
  (`hr_shifts`, `hr_official_holidays`) since their shape doesn't fit the generic pattern.
- "Users" and "Group Function" tiles deep-link to the existing Users page instead of
  duplicating a second user-management system.
- Division/Section/Position were originally modeled as more `hr_lookup_items` categories,
  but were superseded by §8's real org-hierarchy tables and removed from here.

## 7. HR & Staff → Payroll

A genuine payroll-computation engine (explicitly requested after first proposing a
lighter "wire up the catalogs only" scope) — nothing like it existed anywhere in the
codebase before, so this is new domain logic rather than a reskin of an existing feature.

- `hr_employees.basic_salary` (additive column) — per-employee base pay.
- `hr_employee_salary_items` — a standing or one-off per-employee amount, covering every
  Additional (Allowance, Rewards, Benefits, Incentive, Teachers Club, Increase), Deduction
  (Misconduct, Deduction), and Tax button on the Payroll ribbon. Denormalized (label/amount
  copied from the chosen catalog item at assignment time) so a later catalog-rate change
  never rewrites history. `client/src/components/hr/SalaryItemAssignmentModal.tsx` is one
  generic modal reused across all nine categories, exactly like the Configuration catalogs.
- `client/src/components/hr/BasicSalaryModal.tsx` — per-employee basic-salary editor.
- `client/src/components/hr/LeaveCalculationModal.tsx` — per-employee leave days taken in a
  chosen month (from `hr_leave_ledger`), feeding the deduction below.
- **Load Salary** (`hr_payroll_periods` + `hr_payroll_lines`,
  `client/src/components/hr/LoadSalaryModal.tsx`): computes, per employee per month,
  `net = basic + Σ(additions) − Σ(deductions) − (basic ÷ 30 × leave days) − tax`, snapshotted
  so re-running the same month recomputes in place (`ON CONFLICT DO UPDATE`) rather than
  duplicating rows — deliberately **not** locked/closed like attendance days are, since that
  wasn't asked for here.
- `client/src/components/hr/HrPayslipPrintView.tsx` — printable payslip, same
  `print-area` convention as the leave form.

Three simplifications were flagged to the user rather than silently decided: "Increase"
only affects that month's pay (doesn't permanently raise `basic_salary`); every leave day is
treated as unpaid for the deduction calc (there's no paid/unpaid flag on leave types yet);
and the existing "Over Time" Configuration catalog has no Payroll-ribbon button, so it isn't
wired into the computation.

## 8. HR & Staff → Employees: org hierarchy tree

The Employees sidebar (which replaces the Student's Affair class-hierarchy tree whenever
you're under HR & Staff) is a real, independently manageable Division → Section → مرحلة
hierarchy — not derived read-only from whichever employees happen to exist — built as a
structural mirror of the existing "My School" class hierarchy
(`stages`/`levels`/`classes` + `ClassesContext` + `ClassTree.tsx`):

- `hr_org_divisions` / `hr_org_sections` / `hr_org_jobs` (per school) +
  `server/src/routes/hrOrg.ts` (same endpoint shapes and "return the whole rebuilt tree after
  every mutation" convention as `classes.ts`) + `client/src/context/HrOrgContext.tsx`.
- Seeded with the exact reference tree supplied by the user (مدير المدرسة; الوكلاء with its
  four stage-deputy sections; المدرسين with its nine subject sections) for every new school,
  and backfilled once at startup for the school that already existed in the dev DB before
  this feature shipped.
- The add/rename/delete tree-row UI (`AddInline`, `RenameInline`, `ConfirmDeleteDialog`,
  `RowActionButton`) was extracted out of `ClassTree.tsx` into a shared
  `client/src/components/TreeControls.tsx`, since `HrEmployeeTree.tsx` needed the identical
  interaction pattern a second time.
- The Employee form's Division/Section/مرحلة fields became a proper cascading picker sourced
  from this tree (picking a division filters the section list, picking a section filters the
  مرحلة list), replacing the earlier independent flat dropdowns.
- The sidebar `<aside>` was widened from `w-64` to `w-80` after the add/edit/delete icons
  were reported as too cramped at the original width — this also benefits the Student's
  Affair class tree, since both trees share the same sidebar element.

## Files touched (non-exhaustive, by area)

- **Navigation**: `client/src/lib/modules.ts`, `client/src/components/DashboardLayout.tsx`,
  `client/src/App.tsx`, `client/src/pages/PreferencesPage.tsx` (new, was
  `ConfigurationPage.tsx`), `client/src/pages/ConfigurationPage.tsx` (new empty stub),
  `client/src/components/ComingSoonPage.tsx` (new), `server/src/permissions.ts`.
- **Employees**: `server/src/routes/hrEmployees.ts`, `client/src/pages/hr/EmployeesPage.tsx`,
  `client/src/components/hr/EmployeeFormModal.tsx`, `client/src/context/HrEmployeesContext.tsx`,
  `client/src/components/FormLayout.tsx`, `client/src/components/RibbonGroup.tsx`.
- **Schools**: `server/src/routes/schools.ts`, `client/src/context/SchoolsContext.tsx`,
  `client/src/components/hr/SchoolsSwitcherModal.tsx`.
- **Attendance**: `server/src/routes/hrAttendance.ts`,
  `client/src/components/hr/HrAttendanceModal.tsx`.
- **Leave**: `server/src/routes/hrLeave.ts`, `client/src/components/hr/HrLeaveModal.tsx`,
  `client/src/components/hr/HrLeavePrintView.tsx`.
- **Configuration**: `server/src/routes/hrConfiguration.ts`,
  `client/src/pages/hr/ConfigurationPage.tsx`, `client/src/components/hr/LookupListModal.tsx`,
  `client/src/components/hr/ValuedListModal.tsx`, `client/src/components/hr/ShiftsListModal.tsx`,
  `client/src/components/hr/HolidaysListModal.tsx`.
- **Payroll**: `server/src/routes/hrPayroll.ts`, `client/src/pages/hr/PayrollPage.tsx`,
  `client/src/components/hr/{BasicSalaryModal,SalaryItemAssignmentModal,
  LeaveCalculationModal,LoadSalaryModal,HrPayslipPrintView}.tsx`.
- **Org hierarchy**: `server/src/routes/hrOrg.ts`, `client/src/context/HrOrgContext.tsx`,
  `client/src/components/hr/HrEmployeeTree.tsx`, `client/src/components/TreeControls.tsx`,
  `client/src/components/ClassTree.tsx` (refactored to use the shared controls).
- **Schema**: `server/src/db.ts` — `schools`, `hr_employees`, `hr_attendance`,
  `hr_attendance_days_closed`, `hr_leave_ledger`, `hr_lookup_items`, `hr_valued_items`,
  `hr_shifts`, `hr_official_holidays`, `hr_employee_salary_items`, `hr_payroll_periods`,
  `hr_payroll_lines`, `hr_org_divisions`, `hr_org_sections`, `hr_org_jobs`.
- **Shared client plumbing**: `client/src/lib/api.ts`, `client/src/lib/types.ts` — every HR
  route above has a corresponding typed `api.*` method and type added here.
