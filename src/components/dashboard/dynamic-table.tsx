"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Loading } from "@/components/loading";
import { Columns3 } from "lucide-react";

type DynamicTableProps<T extends object> = {
  endpoint: string;
  columns: ColumnDef<T>[];
  transform?: (item: any) => T;
  searchKey?: string;

  // ⭐ New prop for passing action components (Edit/Delete)
  ActionComponent?: (item: T) => React.ReactNode;
};

export function DynamicTable<T extends object>({
  endpoint,
  columns,
  transform,
  searchKey = "search",
  ActionComponent,
}: DynamicTableProps<T>) {
  const [data, setData] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [totalPages, setTotalPages] = React.useState(1);
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [columnSearch, setColumnSearch] = React.useState("");

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [isTyping, setIsTyping] = React.useState(false);

  // ⭐ Add Actions column automatically if ActionComponent is provided
  const finalColumns = React.useMemo(() => {
    if (!ActionComponent) return columns;

    return [
      ...columns,
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }: any) => ActionComponent(row.original),
      },
    ];
  }, [columns, ActionComponent]);

  // API Fetch
  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const url = `${endpoint}?page=${page}&limit=${limit}&${searchKey}=${debouncedSearch}`;
        const res = await fetch(url);
        const json = await res.json();

        if (!res.ok) throw new Error(json.message || "Failed to fetch data");

        const items = Array.isArray(json.data) ? json.data : [];

        setData(transform ? items.map((i: unknown) => transform(i)) : items);
        setTotalPages(json.meta?.totalPages ?? 1);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [endpoint, debouncedSearch, page, limit]);

  const table = useReactTable({
    data,
    columns: finalColumns,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
  });

  // Debounce search
  // React.useEffect(() => {
  //   const t = setTimeout(() => {
  //     setDebouncedSearch(search);
  //     setPage(1);
  //   }, 300);
  //   return () => clearTimeout(t);
  // }, [search]);

  React.useEffect(() => {
    setIsTyping(true);

    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      setIsTyping(false);
    }, 2000);

    return () => clearTimeout(t);
  }, [search]);

  if (loading) return <Loading fullScreen />;
  if (error)
    return <div className="text-red-600 py-10 text-center">Error: {error}</div>;

  return (
    <div className="space-y-4 w-full">
      {/* Search + Column Settings */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Columns3 className="mr-2 h-4 w-4" /> View Columns
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 p-2">
            <Input
              placeholder="Search columns..."
              className="mb-2 h-8"
              value={columnSearch}
              onChange={(e) => setColumnSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />

            {table
              .getAllLeafColumns()
              .filter((col) =>
                col.id.toLowerCase().includes(columnSearch.toLowerCase())
              )
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id.replace(/_/g, " ")}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={finalColumns.length}
                  className="h-24 text-center"
                >
                  No data found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between py-4">
        <div className="flex items-center gap-2 text-sm">
          <span>Rows per page:</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="border rounded p-1"
          >
            {[5, 10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
