"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  CsvExportModule,
  ModuleRegistry,
  PaginationModule,
  TextFilterModule,
  ValidationModule,
  type ColDef,
  type ValueGetterParams,
} from "ag-grid-community";

ModuleRegistry.registerModules([
  CsvExportModule,
  PaginationModule,
  TextFilterModule,
  ValidationModule,
]);

export type AggregateFormColumn = {
  id: string;
  title: string;
  fields: { label: string }[];
};

type AggregateCell = {
  formId: string;
  formTitle: string;
  submittedAt: string | null;
  answers: Record<string, unknown>;
};

export type AggregateAttendee = {
  recipientUserId: string;
  email: string;
  fullName: string;
  forms: Record<string, AggregateCell>;
};

export type AggregateRow = {
  organizationId: string | null;
  organizationName: string;
  attendees: AggregateAttendee[];
  forms: Record<string, AggregateCell>;
};

function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "—";
  }
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return "—";
}

// Render a (form, field) cell across all attendees of the org row. Shows
// `Name: answer` per attendee, joined with newlines so the cell wraps. AG
// Grid's CSV exporter quotes cells with newlines correctly, so export stays
// well-formed.
function formatCellForOrg(row: AggregateRow | undefined, formId: string, fieldLabel: string): string {
  if (!row) return "—";
  const attendees = row.attendees;
  if (attendees.length === 0) return "—";

  const lines: string[] = [];
  for (const attendee of attendees) {
    const cell = attendee.forms[formId];
    if (!cell?.submittedAt) {
      lines.push(`${attendee.fullName}: Pending`);
      continue;
    }
    lines.push(`${attendee.fullName}: ${formatAnswer(cell.answers?.[fieldLabel])}`);
  }
  return lines.length > 0 ? lines.join("\n") : "—";
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "responses"
  );
}

export default function AllFormsTableView({
  forms,
  rows,
}: {
  forms: AggregateFormColumn[];
  rows: AggregateRow[];
}) {
  const gridRef = useRef<AgGridReact<AggregateRow>>(null);

  const columnDefs = useMemo<ColDef<AggregateRow>[]>(() => {
    const cols: ColDef<AggregateRow>[] = [
      {
        headerName: "Organization",
        field: "organizationName",
        pinned: "left",
        sortable: true,
        filter: true,
        minWidth: 220,
      },
      {
        headerName: "Submitted by",
        colId: "submittedBy",
        sortable: true,
        filter: true,
        minWidth: 200,
        valueGetter: (p: ValueGetterParams<AggregateRow>) =>
          p.data?.attendees.map((a) => a.fullName).join(", ") ?? "",
        tooltipValueGetter: (p) =>
          p.data?.attendees
            .map((a) => `${a.fullName} <${a.email}>`)
            .join("\n") ?? "",
      },
      {
        headerName: "Emails",
        colId: "emails",
        sortable: true,
        filter: true,
        minWidth: 220,
        valueGetter: (p: ValueGetterParams<AggregateRow>) =>
          p.data?.attendees.map((a) => a.email).join(", ") ?? "",
      },
    ];

    for (const form of forms) {
      for (const field of form.fields) {
        const columnId = `${form.id}:${field.label}`;
        cols.push({
          headerName: `${form.title} - ${field.label}`,
          colId: columnId,
          sortable: true,
          filter: true,
          minWidth: 220,
          flex: 1,
          valueGetter: (params: ValueGetterParams<AggregateRow>) =>
            formatCellForOrg(params.data, form.id, field.label),
          tooltipValueGetter: (params) =>
            formatCellForOrg(params.data, form.id, field.label),
        });
      }
    }

    return cols;
  }, [forms]);

  function handleExportCsv() {
    const today = new Date().toISOString().slice(0, 10);
    gridRef.current?.api.exportDataAsCsv({
      fileName: `all-forms-by-org-${slugify(today)}.csv`,
    });
  }

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      suppressMovable: false,
      wrapHeaderText: true,
      autoHeaderHeight: true,
    }),
    []
  );

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-brand-cement bg-brand-cement p-3">
          <h2 className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-brand-blue">
            Your Forms
          </h2>
          {forms.length === 0 ? (
            <p className="px-2 py-3 text-sm text-brand-blue/70">
              You haven&apos;t created any forms yet.
            </p>
          ) : (
            <ul className="space-y-1">
              {forms.map((form) => (
                <li key={form.id}>
                  <Link
                    href={`/admin/forms/${form.id}`}
                    className="block rounded-md border-l-2 border-transparent bg-brand-white px-3 py-2 text-sm text-brand-blue transition-colors hover:border-brand-saffron hover:bg-brand-cement/40"
                  >
                    <div className="font-medium">{form.title}</div>
                    <div className="mt-0.5 text-xs text-brand-blue/60">
                      {form.fields.length} field{form.fields.length === 1 ? "" : "s"}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="rounded-lg border border-brand-cement bg-brand-white p-3">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-brand-cement px-1 pb-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-brand-blue">
                All Forms
              </h2>
              <p className="mt-1 text-sm text-brand-blue/70">
                One row per organization with every form field in its own cell.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportCsv}
              className="rounded-md border border-[#b86800] bg-brand-saffron px-3 py-1.5 text-xs font-semibold text-brand-white hover:bg-[#d97500]"
            >
              Export CSV
            </button>
          </div>

          <div className="ag-theme-quartz h-[560px] w-full">
            <AgGridReact<AggregateRow>
              ref={gridRef}
              rowData={rows}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              theme="legacy"
              pagination={true}
              paginationPageSize={50}
              paginationPageSizeSelector={[25, 50, 100, 200]}
              suppressCellFocus={false}
              animateRows={true}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
