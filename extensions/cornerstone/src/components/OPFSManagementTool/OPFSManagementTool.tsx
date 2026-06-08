import React, { useEffect, useState } from 'react';
import {
  ColumnDef,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronDown, MoreHorizontal } from 'lucide-react';
import { Button, Checkbox, Input } from '@ohif/ui-next';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@ohif/ui-next';
import { Icons } from '@ohif/ui-next';
import { Tooltip, TooltipTrigger, TooltipContent } from '@ohif/ui-next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ohif/ui-next';
import { Study } from './types';
import {
  clearPreviousOPFSVersionData,
  deleteFoldersFromOPFS,
  formatSize,
  getOPFSData,
  hybridGlobalFilter,
  purgeOldFilesFromOPFS,
} from './utils';
import { OPFS_PURGE_METADATA } from './constants';
import { useAppConfig } from '@state';

const columnHelper = createColumnHelper<Study>();

const columns: ColumnDef<Study>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() ? 'indeterminate' : false)
        }
        onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={value => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    enableGlobalFilter: false,
  },
  {
    accessorKey: 'study-uid',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          StudyInstanceUID <ArrowUpDown className="h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div>{row.getValue('study-uid')}</div>,
  },
  columnHelper.accessor(row => row['study-description'], {
    id: 'study-description',
    sortingFn: (rowA, rowB) => {
      const valA = rowA.original['study-description'];
      const valB = rowB.original['study-description'];

      if (!valA && !valB) {
        return 0;
      }
      if (!valA) {
        return 1;
      }
      if (!valB) {
        return -1;
      }

      return valA.localeCompare(valB);
    },
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          StudyDescription <ArrowUpDown className="h-4 w-4" />
        </Button>
      );
    },
    cell: ({ getValue }) => {
      const value = getValue<string>();
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="max-w-[200px] truncate">{value}</div>
          </TooltipTrigger>
          <TooltipContent side="bottom">{value}</TooltipContent>
        </Tooltip>
      );
    },
  }) as ColumnDef<Study>,
  columnHelper.accessor(row => row['study-modalities'].sort().join(', '), {
    id: 'study-modalities',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Modalities <ArrowUpDown className="h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const modalities: string = row.getValue('study-modalities');
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="max-w-24 truncate">{modalities}</div>
          </TooltipTrigger>
          <TooltipContent side="bottom">{modalities}</TooltipContent>
        </Tooltip>
      );
    },
  }) as ColumnDef<Study>,
  columnHelper.accessor(
    row => {
      const size: number = row['study-size'];
      return formatSize(size);
    },
    {
      id: 'study-size',
      sortingFn: (rowA, rowB) => {
        // Directly use the known key instead of columnId
        const sizeA = rowA.original['study-size'];
        const sizeB = rowB.original['study-size'];

        if (sizeA < sizeB) {
          return -1;
        }
        if (sizeA > sizeB) {
          return 1;
        }
        return 0;
      },
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Size <ArrowUpDown className="h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => <div>{row.getValue('study-size')}</div>,
    }
  ) as ColumnDef<Study>,
  columnHelper.accessor(
    row => {
      const value = new Date(row['study-last-modified']);
      return `${value.toDateString()}, ${value.toLocaleTimeString()}`;
    },
    {
      sortingFn: (rowA, rowB) => {
        const dateA = new Date(rowA.original['study-last-modified']).getTime();
        const dateB = new Date(rowB.original['study-last-modified']).getTime();
        return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
      },
      id: 'study-last-modified',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Last Modified <ArrowUpDown className="h-4 w-4" />
          </Button>
        );
      },
      cell: ({ getValue }) => {
        return <div>{getValue<string>()}</div>;
      },
    }
  ) as ColumnDef<Study>,
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={evt => {
                evt.stopPropagation();
                window.open(row.original['viewer-link'], '_blank');
              }}
            >
              Launch Viewer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function OPFSManagementTool() {
  const [data, setData] = useState<Study[]>([]);
  const [loading, setLoading] = useState(false);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<Record<number, boolean>>({});
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: hybridGlobalFilter,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    state: {
      sorting,
      columnVisibility,
      globalFilter,
      rowSelection,
    },
  });
  const [appConfig] = useAppConfig() as unknown as [
    AppTypes.Config,
    React.Dispatch<React.SetStateAction<AppTypes.Config>>,
  ];

  useEffect(() => {
    const initialize = async () => {
      await clearPreviousOPFSVersionData();
      await refreshOPFSData();
    };

    initialize();
  }, []);

  const refreshOPFSData = async () => {
    setLoading(true);
    setData([]);
    const fetchedData = await getOPFSData(appConfig.routerBasename as string);
    table.toggleAllPageRowsSelected(false);
    setData(fetchedData);
    setLoading(false);
  };

  const deleteSelectedStudies = async () => {
    try {
      const filteredData = data.filter((study, index) => !rowSelection[index]);
      const studyPaths = data
        .filter((study, index) => rowSelection[index])
        .flatMap(study => study['opfs-paths']);
      await deleteFoldersFromOPFS(studyPaths);
      table.toggleAllPageRowsSelected(false);
      setData(filteredData);
    } catch (error) {
      console.warn('Error deleting selected rows');
      refreshOPFSData();
    }
  };

  const purgeOldFiles = async (time?: number) => {
    await purgeOldFilesFromOPFS(time);
    refreshOPFSData();
  };

  const calculateTotalSize = (list: Study[]) => {
    const totalSize = list.reduce((total, study) => {
      return total + study['study-size'];
    }, 0);

    return formatSize(totalSize);
  };

  return (
    <div className="w-full p-6">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter table..."
          value={globalFilter ?? ''}
          onChange={event => setGlobalFilter(event.target.value)}
          className="mr-2 max-w-sm"
        />
        <Button
          variant="outline"
          className="ml-auto"
          onClick={refreshOPFSData}
        >
          <Icons.ToolReset className="h-5 w-5 rotate-90" />
        </Button>
        <Button
          variant="outline"
          className="ml-2"
          disabled={!Object.keys(rowSelection).length}
          onClick={deleteSelectedStudies}
        >
          Delete
        </Button>
        <Button
          variant="outline"
          className="ml-2"
          disabled={!Object.keys(rowSelection).length}
          onClick={() => {
            const studiesSelected = data.filter((study, index) => rowSelection[index]);
            navigator.clipboard.writeText(JSON.stringify(studiesSelected, null, 2));
          }}
        >
          Debug Copy
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="ml-2"
            >
              Purge <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Files older than</DropdownMenuLabel>
            {OPFS_PURGE_METADATA.map(option => (
              <DropdownMenuItem
                key={option.label}
                className="capitalize"
                onClick={() => purgeOldFiles(option.time)}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="ml-2"
            >
              Columns <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter(column => column.getCanHide())
              .map(column => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={value => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="text-primary-active overflow-hidden rounded-md border">
        <Table className="bg-primary-dark">
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length && !loading ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => row.toggleSelected()}
                  className="cursor-pointer"
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {loading ? (
                    <div className="flex justify-center">
                      <Icons.LoadingSpinner className="h-10 w-10 animate-spin" />
                    </div>
                  ) : (
                    'No results.'
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
          {table.getFilteredSelectedRowModel().rows.length
            ? `  ${calculateTotalSize(data.filter((study, index) => rowSelection[index]))}.`
            : ''}
        </div>
        <div className="text-muted-foreground flex-1 text-sm">
          Total size: {calculateTotalSize(data)}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
