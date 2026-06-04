import { useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import { FiFileText } from "react-icons/fi";
import { HiArrowsUpDown } from "react-icons/hi2";
import MultiFilterDropdown, {
  type MultiFilterSection,
  type MultiFilterValue,
} from "./MultiFilterDropdown";
import { SearchBar } from "./SearchBar";
import Checkbox from "./Checkbox";
export type Column<T> = {
  id?: string;
  key?: string;
  header: string;
  accessor?: keyof T | string;
  render?: (row: T, index: number) => ReactNode;
  cell?: (row: T, index: number) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  sortable?: boolean;
  sortType?: "string" | "number" | "date";
  sortValue?: (row: T) => unknown;
};

type DataTableProps<T> = {
  columns?: Column<T>[];
  rows?: T[];
  totalItems?: number;
  startIndex?: number;
  endIndex?: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  isAllSelected?: boolean;
  onToggleAll?: (checked: boolean) => void;
  isRowSelected?: (row: T) => boolean;
  onToggleRow?: (rowId: string, checked: boolean, row?: T) => void;
  isRowSelectable?: (row: T) => boolean;
  getRowKey?: (row: T) => string;
  getRowId?: (row: T) => string;
  getRowClassName?: (row: T) => string;
  selectedRowId?: string | null;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => ReactNode;
  actionsLabel?: string;
  bulkActions?: ReactNode;
  selectedCount?: number;
  tableLoading?: boolean;
  /** Number of skeleton rows shown while `tableLoading` is true (default 5). */
  loadingSkeletonRows?: number;
  hasSearched?: boolean;
  showCheckboxes?: boolean;
  showAutoNumber?: boolean;
  search?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  filter?: boolean;
  filterValue?: MultiFilterValue;
  onFilterChange?: (next: MultiFilterValue) => void;
  filterSections?: MultiFilterSection[];
  filterButtonLabel?: string;
  filterTitle?: string;
  minHeightClassName?: string;
  containerClassName?: string;
  tableContainerClassName?: string;
  fillContainer?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  /** Optional toolbar actions (buttons, links, etc.) shown beside search/filter. */
  actionsButtons?: ReactNode;
};

export type DataTableToolbarProps = Pick<
  DataTableProps<unknown>,
  | "bulkActions"
  | "selectedCount"
  | "search"
  | "searchValue"
  | "onSearchChange"
  | "searchPlaceholder"
  | "searchAriaLabel"
  | "filter"
  | "filterValue"
  | "onFilterChange"
  | "filterSections"
  | "filterButtonLabel"
  | "filterTitle"
  | "actionsButtons"
> & {
  showBulkActions?: boolean;
  className?: string;
};

function readAccessor<T>(row: T, accessor?: keyof T | string) {
  if (!accessor) return undefined;
  return (row as Record<string, unknown>)[String(accessor)];
}

function renderValue(value: unknown): ReactNode {
  if (value === null || value === undefined) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return value;
  return String(value);
}

function resolveColumnId<T>(column: Column<T>, index: number) {
  return (
    column.id ??
    column.key ??
    (typeof column.accessor === "string" ? column.accessor : undefined) ??
    `${column.header}-${index}`
  );
}

function compareValues(
  left: unknown,
  right: unknown,
  sortType: "string" | "number" | "date",
) {
  const leftMissing = left === null || left === undefined || left === "";
  const rightMissing = right === null || right === undefined || right === "";
  if (leftMissing && rightMissing) return 0;
  if (leftMissing) return 1;
  if (rightMissing) return -1;

  if (sortType === "number") {
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    if (!Number.isFinite(leftNumber) && !Number.isFinite(rightNumber)) return 0;
    if (!Number.isFinite(leftNumber)) return 1;
    if (!Number.isFinite(rightNumber)) return -1;
    return leftNumber - rightNumber;
  }

  if (sortType === "date") {
    const leftTime = new Date(String(left)).getTime();
    const rightTime = new Date(String(right)).getTime();
    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;
    return leftTime - rightTime;
  }

  return String(left).localeCompare(String(right), "en-KE", {
    sensitivity: "base",
  });
}

function defaultPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 5)
    return Array.from({ length: totalPages }, (_, index) => index + 1);

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 5, "...", totalPages] as Array<number | string>;
  }

  if (currentPage >= totalPages - 2) {
    return [
      1,
      "...",
      ...Array.from({ length: 5 }, (_, index) => totalPages - 4 + index),
    ] as Array<number | string>;
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ] as Array<number | string>;
}

export function DataTableToolbar({
  bulkActions,
  selectedCount,
  showBulkActions = true,
  search,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Start typing to search . . .",
  searchAriaLabel = "Search list",
  filter,
  filterValue,
  onFilterChange,
  filterSections = [],
  filterButtonLabel = "Filter",
  filterTitle = "Select Filters",
  className,
  actionsButtons,
}: DataTableToolbarProps) {
  const hasBulkActions =
    showBulkActions && Boolean(bulkActions || selectedCount);
  const showSearch = Boolean(search && onSearchChange);
  const showFilter = Boolean(
    filter && filterValue && onFilterChange && filterSections.length,
  );
  const showActionsButtons = actionsButtons != null && actionsButtons !== false;
  if (!hasBulkActions && !showSearch && !showFilter && !showActionsButtons)
    return null;

  return (
    <div className={clsx("px-2 py-2.5 lg:px-2", className)}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        {hasBulkActions ? (
          <div className="flex w-full flex-wrap items-center gap-2">
            <p className="text-xs font-bold text-slate-600 lg:text-sm">
              {selectedCount ?? 0} selected
            </p>
            {bulkActions ? (
              <div className="flex flex-wrap gap-2">{bulkActions}</div>
            ) : null}
          </div>
        ) : null}

        {showSearch || showFilter || showActionsButtons ? (
          <div
            className={clsx(
              "flex w-full flex-col gap-2 md:flex-row md:items-center",
              hasBulkActions ? " md:justify-end" : "md:justify-start",
            )}
          >
            {showSearch ? (
              <SearchBar
                value={searchValue}
                onChange={onSearchChange!}
                placeholder={searchPlaceholder}
                aria-label={searchAriaLabel}
                wrapperClassName={clsx(
                  "w-full max-w-none",
                  hasBulkActions
                    ? "md:max-w-3xl lg:max-w-5xl"
                    : "md:max-w-3xl lg:max-w-5xl",
                )}
              />
            ) : null}
            {showFilter ? (
              <MultiFilterDropdown
                value={filterValue!}
                onChange={onFilterChange!}
                sections={filterSections}
                buttonLabel={filterButtonLabel}
                title={filterTitle}
                className="shrink-0"
              />
            ) : null}
            {showActionsButtons ? (
              <div className="flex flex-wrap gap-2">{actionsButtons}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DataTable<T>({
  columns = [],
  rows = [],
  totalItems,
  startIndex = 1,
  endIndex,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize,
  pageSizeOptions = [25, 50, 100],
  onPageSizeChange,
  isAllSelected = false,
  onToggleAll,
  isRowSelected,
  onToggleRow,
  isRowSelectable = () => true,
  getRowKey,
  getRowId,
  getRowClassName,
  selectedRowId,
  onRowClick,
  actions,
  actionsLabel = "Actions",
  bulkActions,
  selectedCount,
  tableLoading = false,
  loadingSkeletonRows = 5,
  hasSearched = false,
  showCheckboxes,
  showAutoNumber = false,
  search,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  actionsButtons,
  filter,
  filterValue,
  onFilterChange,
  filterSections,
  filterButtonLabel,
  filterTitle,
  minHeightClassName = "min-h-0",
  containerClassName,
  tableContainerClassName,
  fillContainer = false,
  emptyTitle,
  emptyMessage,
}: DataTableProps<T>) {
  const [sortColumnId, setSortColumnId] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null,
  );

  const resolvedShowCheckboxes =
    showCheckboxes ?? Boolean(onToggleRow || onToggleAll);
  const resolvedTotalItems = totalItems ?? rows.length;
  const resolvedEndIndex =
    endIndex ?? (rows.length ? startIndex + rows.length - 1 : 0);
  const colSpan =
    columns.length +
    (resolvedShowCheckboxes ? 1 : 0) +
    (showAutoNumber ? 1 : 0) +
    (actions ? 1 : 0);

  const resolveRowId = (row: T) => {
    if (getRowId) return getRowId(row);
    if (getRowKey) return getRowKey(row);
    const id = (row as Record<string, unknown>).id;
    return typeof id === "string" || typeof id === "number"
      ? String(id)
      : JSON.stringify(row);
  };

  const sortedRows = useMemo(() => {
    if (!sortColumnId || !sortDirection) return rows;
    const sortColumn = columns.find(
      (column, index) => resolveColumnId(column, index) === sortColumnId,
    );
    if (!sortColumn) return rows;

    const sortType = sortColumn.sortType ?? "string";
    const multiplier = sortDirection === "asc" ? 1 : -1;
    return [...rows].sort((leftRow, rightRow) => {
      const left = sortColumn.sortValue
        ? sortColumn.sortValue(leftRow)
        : readAccessor(leftRow, sortColumn.accessor);
      const right = sortColumn.sortValue
        ? sortColumn.sortValue(rightRow)
        : readAccessor(rightRow, sortColumn.accessor);
      return compareValues(left, right, sortType) * multiplier;
    });
  }, [columns, rows, sortColumnId, sortDirection]);

  function toggleSort(columnId: string) {
    if (sortColumnId !== columnId) {
      setSortColumnId(columnId);
      setSortDirection("asc");
      return;
    }
    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }
    setSortColumnId(null);
    setSortDirection(null);
  }

  const pageNumbers = defaultPageNumbers(currentPage, totalPages);
  const hasPagination =
    Boolean(onPageChange) && totalPages > 1 && sortedRows.length > 0;

  return (
    <div
      className={clsx(
        "overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-sm",
        fillContainer && "flex h-full min-h-0 flex-col",
        containerClassName,
      )}
    >
      <DataTableToolbar
        bulkActions={bulkActions}
        selectedCount={selectedCount}
        showBulkActions={resolvedShowCheckboxes}
        search={search}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        searchAriaLabel={searchAriaLabel}
        filter={filter}
        filterValue={filterValue}
        onFilterChange={onFilterChange}
        filterSections={filterSections}
        filterButtonLabel={filterButtonLabel}
        filterTitle={filterTitle}
        actionsButtons={actionsButtons}
      />

      <div
        className={clsx(
          "overflow-x-auto p-0 scrollbar-thin",
          fillContainer && "min-h-0 flex-1 overflow-y-auto",
          minHeightClassName,
          tableContainerClassName,
        )}
      >
        <table className="w-full min-w-full border-collapse text-sm text-gray-700">
          <thead className="border-y border-primary-500 bg-primary-50 text-left font-semibold text-gray-700">
            <tr>
              {resolvedShowCheckboxes ? (
                <th
                  scope="col"
                  className="hidden rounded-tl-xl py-2.5 pl-3 text-left text-gray-700 sm:table-cell lg:pl-6 lg:py-3"
                >
                  <Checkbox
                    checked={isAllSelected}
                    onChange={(checked) => onToggleAll?.(checked)}
                    size="sm"
                  />
                </th>
              ) : null}

              {showAutoNumber ? (
                <th
                  scope="col"
                  className={clsx(
                    "hidden py-2.5 pl-1.5 text-left text-gray-700 sm:table-cell lg:pl-2 lg:py-3",
                    !resolvedShowCheckboxes ? "rounded-tl-xl" : "",
                  )}
                >
                  <div className="flex items-center">#</div>
                </th>
              ) : null}

              {columns.map((column, index) => {
                const columnId = resolveColumnId(column, index);
                const isSorted =
                  sortColumnId === columnId && sortDirection !== null;
                const ariaSort = isSorted
                  ? sortDirection === "asc"
                    ? "ascending"
                    : "descending"
                  : "none";

                return (
                  <th
                    key={columnId}
                    scope="col"
                    aria-sort={column.sortable ? ariaSort : undefined}
                    className={clsx(
                      "px-3 py-2.5 text-left text-sm lg:px-4 lg:py-3",
                      column.headerClassName,
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(columnId)}
                        className="inline-flex items-center gap-1.5 text-left transition hover:text-secondary-700"
                      >
                        <span>{column.header}</span>
                        <HiArrowsUpDown
                          className={clsx(
                            "h-4 w-4",
                            isSorted && "text-primary-700",
                            isSorted && sortDirection === "asc" && "rotate-180",
                          )}
                        />
                      </button>
                    ) : (
                      <span className="block text-left">{column.header}</span>
                    )}
                  </th>
                );
              })}

              {actions ? (
                <th
                  scope="col"
                  className="rounded-tr-xl px-3 py-2.5 text-right lg:px-4 lg:py-3"
                >
                  {actionsLabel}
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody>
            {tableLoading ? (
              Array.from({ length: Math.max(1, loadingSkeletonRows) }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="animate-pulse">
                  {resolvedShowCheckboxes ? (
                    <td className="hidden pl-3 py-4 md:table-cell lg:pl-4">
                      <div className="h-4 w-4 rounded bg-slate-200" />
                    </td>
                  ) : null}
                  {showAutoNumber ? (
                    <td className="pl-3 py-4 lg:pl-4">
                      <div className="h-4 w-4 rounded bg-slate-200" />
                    </td>
                  ) : null}

                  {columns.map((column, columnIndex) => (
                    <td
                      key={`${resolveColumnId(column, columnIndex)}-skeleton-${rowIndex}`}
                      className="pl-3 py-4 md:pl-4"
                    >
                      <div className="h-4 rounded bg-slate-200" />
                    </td>
                  ))}
                  {actions ? (
                    <td className="pl-3 py-4 md:pl-4">
                      <div className="ml-auto h-4 w-14 rounded bg-slate-200" />
                    </td>
                  ) : null}
                </tr>
              ))
            ) : sortedRows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="pl-3 py-24 md:pl-4 text-center">
                  <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3">
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400">
                      <FiFileText className="h-8 w-8" aria-hidden />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-700">
                        {emptyTitle ??
                          (hasSearched
                            ? "No results found"
                            : "No records found in this view")}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        {emptyMessage ??
                          (hasSearched
                            ? "Try adjusting your search terms or filter criteria."
                            : "Adjust your filters or refresh the page to see more records.")}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              sortedRows.map((row, rowIndex) => {
                const rowId = resolveRowId(row);
                const selected =
                  isRowSelected?.(row) ??
                  (selectedRowId != null && selectedRowId === rowId);
                const selectable = isRowSelectable(row);

                return (
                  <tr
                    key={`row-${rowId}`}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={clsx(
                      "border-b border-gray-200 bg-white transition-colors duration-150 hover:bg-gray-50/90",
                      selected && "bg-primary-50/70 hover:bg-primary-50/70",
                      onRowClick && "cursor-pointer",
                      getRowClassName?.(row),
                    )}
                  >
                    {resolvedShowCheckboxes ? (
                      <td
                        className="hidden py-3 pl-3 sm:table-cell lg:pl-6 lg:py-4"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Checkbox
                          checked={selected}
                          disabled={!selectable}
                          onChange={(checked) =>
                            onToggleRow?.(rowId, checked, row)
                          }
                          size="sm"
                        />
                      </td>
                    ) : null}

                    {showAutoNumber ? (
                      <td className="py-3 pl-3 text-sm font-medium text-gray-600 lg:pl-4 lg:py-4">
                        {startIndex > 0 ? startIndex + rowIndex : rowIndex + 1}.
                      </td>
                    ) : null}

                    {columns.map((column, columnIndex) => {
                      const columnId = resolveColumnId(column, columnIndex);
                      return (
                        <td
                          key={`cell-${columnId}-${rowId}`}
                          className={clsx(
                            "px-3 py-3 text-left align-middle lg:px-4 lg:py-3.5",
                            column.cellClassName,
                          )}
                        >
                          {column.cell
                            ? column.cell(row, rowIndex)
                            : column.render
                              ? column.render(row, rowIndex)
                              : renderValue(readAccessor(row, column.accessor))}
                        </td>
                      );
                    })}

                    {actions ? (
                      <td
                        className="px-3 py-3 text-right text-slate-700 lg:px-4"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {actions(row)}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-start justify-between gap-4 px-2 pb-4 pt-2.5 sm:flex-row sm:items-center md:px-3 lg:px-6 lg:pb-6 lg:pt-4">
        <div className="flex items-center gap-4">
          <span className="text-xs tracking-tight text-gray-500 lg:text-[0.83rem]">
            {resolvedTotalItems > 0
              ? `Showing ${startIndex} to ${resolvedEndIndex} of ${resolvedTotalItems}`
              : "Showing 0 to 0 of 0"}
          </span>
          {onPageSizeChange ? (
            <div className="flex items-center gap-2">
              <label className="text-xs tracking-tight text-gray-500 lg:text-[0.83rem]">
                Per Page
              </label>
              <select
                value={pageSize ?? pageSizeOptions[0]}
                onChange={(event) => {
                  onPageSizeChange(Number(event.target.value));
                  if (onPageChange) onPageChange(1);
                }}
                className="rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-700 transition-colors hover:border-secondary-600/30 focus:border-secondary-500 focus:outline-none focus:ring-1 focus:ring-secondary-500 lg:text-[0.83rem]"
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        {hasPagination ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1 || resolvedTotalItems === 0}
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-1 text-xs font-bold text-gray-600 transition-colors hover:border-secondary-600/60 hover:bg-secondary-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {pageNumbers.map((pageNumber, index) =>
                pageNumber === "..." ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-gray-600">
                    ...
                  </span>
                ) : (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => onPageChange?.(Number(pageNumber))}
                    disabled={resolvedTotalItems === 0}
                    className={clsx(
                      "rounded-lg px-3 py-1 font-google text-[0.7rem] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      currentPage === pageNumber
                        ? "bg-secondary-700 text-white"
                        : "border border-gray-200 bg-white text-gray-700 hover:border-secondary-600/60 hover:bg-secondary-50",
                    )}
                  >
                    {pageNumber}
                  </button>
                ),
              )}
            </div>
            <button
              type="button"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages || resolvedTotalItems === 0}
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-1 text-xs font-bold text-gray-600 transition-colors hover:border-secondary-600/60 hover:bg-secondary-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default DataTable;
