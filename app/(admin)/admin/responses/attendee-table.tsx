"use client";

import { useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  CsvExportModule,
  ModuleRegistry,
  PaginationModule,
  TextFilterModule,
  type ColDef,
} from "ag-grid-community";

ModuleRegistry.registerModules([
  CsvExportModule,
  PaginationModule,
  TextFilterModule,
]);

export type AttendeeRow = {
  id: string;
  fullName: string;
  email: string;
  organizationName: string;
};

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "attendees"
  );
}

export default function AttendeeTableView({
  attendees,
}: {
  attendees: AttendeeRow[];
}) {
  const gridRef = useRef<AgGridReact<AttendeeRow>>(null);

  const columnDefs = useMemo<ColDef<AttendeeRow>[]>(
    () => [
      {
        headerName: "Name",
        field: "fullName",
        sortable: true,
        filter: true,
        pinned: "left",
        minWidth: 200,
      },
      {
        headerName: "Email",
        field: "email",
        sortable: true,
        filter: true,
        minWidth: 220,
      },
      {
        headerName: "Organization",
        field: "organizationName",
        sortable: true,
        filter: true,
        minWidth: 200,
      },
    ],
    []
  );

  function handleExportCsv() {
    const today = new Date().toISOString().slice(0, 10);
    gridRef.current?.api.exportDataAsCsv({
      fileName: `attendees-${slugify(today)}.csv`,
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
    <div className="rounded-lg border border-brand-cement bg-brand-white p-3">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-brand-cement px-1 pb-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-brand-blue">
            Attendees
          </h2>
          <p className="mt-1 text-sm text-brand-blue/70">
            Every registered attendee in the system.
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
        <AgGridReact<AttendeeRow>
          ref={gridRef}
          rowData={attendees}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          theme="legacy"
          pagination={true}
          paginationPageSize={50}
          paginationPageSizeSelector={[25, 50, 100, 200]}
          suppressCellFocus={false}
          animateRows={true}
          getRowId={(p) => p.data.id}
        />
      </div>
    </div>
  );
}