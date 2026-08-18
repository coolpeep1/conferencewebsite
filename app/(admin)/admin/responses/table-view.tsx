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
  type ICellRendererParams,
  type ValueFormatterParams,
  type ValueGetterParams,
} from "ag-grid-community";

ModuleRegistry.registerModules([
  CsvExportModule,
  PaginationModule,
  TextFilterModule,
  ValidationModule,
]);

export type FieldDef = {
  label: string;
  type: "text" | "textarea" | "email" | "number" | "select" | "radio" | "checkbox";
  required: boolean;
  options?: string[];
};

export type FormSummary = {
  id: string;
  title: string;
  description: string;
  fields: FieldDef[];
};

export type ResponseRow = {
  assignmentId: string;
  recipientName: string;
  recipientEmail: string;
  assignedAt: string;
  submittedAt: string | null;
  answers: Record<string, unknown>;
};

function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "—";
  }
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return "—";
}

function StatusCell({ value }: ICellRendererParams) {
  const submitted = value === "Submitted";
  return (
    <span
      className={`tableview-status-chip ${submitted ? "submitted" : "pending"}`}
    >
      {submitted ? "Submitted" : "Pending"}
    </span>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "form";
}

export default function TableView({
  forms,
  selectedForm,
  rows,
  showHeader = true,
}: {
  forms: FormSummary[];
  selectedForm: FormSummary | null;
  rows: ResponseRow[];
  showHeader?: boolean;
}) {
  const columnDefs: ColDef<ResponseRow>[] = useMemo(() => {
    const cols: ColDef<ResponseRow>[] = [
      {
        headerName: "Respondent",
        field: "recipientName",
        sortable: true,
        filter: true,
        pinned: "left",
        minWidth: 180,
      },
      {
        headerName: "Email",
        field: "recipientEmail",
        sortable: true,
        filter: true,
        minWidth: 200,
      },
      {
        headerName: "Status",
        colId: "status",
        field: "submittedAt",
        sortable: true,
        filter: true,
        width: 130,
        valueGetter: (p: ValueGetterParams<ResponseRow, string | null>) =>
          p.data?.submittedAt ? "Submitted" : "Pending",
        cellRenderer: StatusCell,
      },
    ];

    if (selectedForm) {
      for (const field of selectedForm.fields) {
        const key = field.label;
        cols.push({
          headerName: field.label,
          valueGetter: (p: ValueGetterParams<ResponseRow>) =>
            formatAnswer(p.data?.answers?.[key]),
          sortable: true,
          filter: true,
          minWidth: 160,
          flex: 1,
          tooltipValueGetter: (p) => {
            const v = p.data?.answers?.[key];
            return typeof v === "string" ? v : undefined;
          },
        });
      }
    }

    cols.push(
      {
        headerName: "Assigned At",
        field: "assignedAt",
        sortable: true,
        filter: true,
        width: 170,
        valueFormatter: (p: ValueFormatterParams) =>
          p.value ? new Date(p.value as string).toLocaleString() : "",
      },
      {
        headerName: "Submitted At",
        colId: "submittedAt",
        field: "submittedAt",
        sortable: true,
        filter: true,
        width: 170,
        valueFormatter: (p: ValueFormatterParams) =>
          p.value ? new Date(p.value as string).toLocaleString() : "—",
      }
    );

    return cols;
  }, [selectedForm]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      suppressMovable: false,
    }),
    []
  );

  const submittedCount = rows.filter((r) => r.submittedAt).length;
  const gridRef = useRef<AgGridReact<ResponseRow>>(null);

  function handleExportCsv() {
    if (!selectedForm) return;
    const today = new Date().toISOString().slice(0, 10);
    gridRef.current?.api.exportDataAsCsv({
      fileName: `${slugify(selectedForm.title)}-responses-${today}.csv`,
      processCellCallback: (params) => {
        // Status column (colId "status") uses a valueGetter -> value is already "Submitted" | "Pending".
        if (params.column.getColId() === "status") {
          return params.value || "Pending";
        }
        return params.value;
      },
    });
  }

  return (
    <section className="space-y-6">
      {showHeader && (
        <header>
          <div className="h-1.5 w-12 rounded-full bg-brand-saffron" />
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-brand-blue">
            Table View
          </h1>
          <p className="mt-2 text-sm text-brand-blue/70">
            Inspect every response across your forms in one sortable, filterable grid.
          </p>
        </header>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Form picker */}
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
              {forms.map((f) => {
                const active = f.id === selectedForm?.id;
                return (
                  <li key={f.id}>
                    <Link
                      href={`/admin/responses?form=${f.id}`}
                      className={`block rounded-md border-l-2 px-3 py-2 text-sm transition-colors ${
                        active
                          ? "border-brand-saffron bg-brand-blue text-brand-white"
                          : "border-transparent text-brand-blue hover:bg-brand-white"
                      }`}
                    >
                      <div className="font-medium">{f.title}</div>
                      <div
                        className={`mt-0.5 text-xs ${
                          active ? "text-brand-white/70" : "text-brand-blue/60"
                        }`}
                      >
                        {f.fields.length} field
                        {f.fields.length === 1 ? "" : "s"}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Grid or empty state */}
        <div className="rounded-lg border border-brand-cement bg-brand-white p-3">
          {!selectedForm ? (
            <div className="flex h-64 flex-col">
              <div className="h-1 w-full rounded-full bg-brand-saffron" />
              <div className="flex flex-1 items-center justify-center text-sm text-brand-blue/60">
                Select a form from the left to view its responses.
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-64 flex-col">
              <div className="h-1 w-full rounded-full bg-brand-saffron" />
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                <p className="font-display text-lg font-bold text-brand-blue">
                  {selectedForm.title}
                </p>
                <p className="text-sm text-brand-blue/60">
                  No organizations have been assigned this form yet.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-brand-cement px-1 pb-3">
                <h2 className="font-display text-2xl font-bold text-brand-blue">
                  {selectedForm.title}
                </h2>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-brand-blue/60">
                    {submittedCount} of {rows.length} responded
                  </p>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="rounded-md border border-[#b86800] bg-brand-saffron px-3 py-1.5 text-xs font-semibold text-brand-white hover:bg-[#d97500]"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
              <div className="ag-theme-quartz h-[560px] w-full">
                <AgGridReact<ResponseRow>
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
            </>
          )}
        </div>
      </div>
    </section>
  );
}
