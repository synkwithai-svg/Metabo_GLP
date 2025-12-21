"use client";

import { useState } from "react";
import { ContentLayout } from "@/components/dashboard/content-layout";
import { DashboardBreadcrumb } from "@/components/dashboard/dashboard-breadcrumb";
import { DynamicTable } from "@/components/dashboard/dynamic-table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash, Plus, Pencil } from "lucide-react";
import DeleteDialog from "@/components/dashboard/delete-dialog";
import MedicationEditForm from "@/components/dashboard/medication/medication-edit-form";
import MedicationAddForm from "@/components/dashboard/medication/medication-add-form";

const columns = [
    { accessorKey: "id", header: "ID" },

    { accessorKey: "name", header: "Medication Name" },

    {
        accessorFn: (row) => row.doseMg ?? "_",
        id: "doseMg",
        header: "Dose (mg)",
    },

    {
        accessorFn: (row) => row.halfLifeHours ?? "_",
        id: "halfLifeHours",
        header: "Half-life (hrs)",
    },

    {
        accessorFn: (row) => row.absorptionRateKa ?? "_",
        id: "absorptionRateKa",
        header: "Absorption (Ka)",
    },

    {
        accessorFn: (row) => row.bioavailability ?? "_",
        id: "bioavailability",
        header: "Bioavailability",
    },

    {
        accessorFn: (row) => row.volumeDistribution ?? "_",
        id: "volumeDistribution",
        header: "Vd",
    },

    {
        accessorFn: (row) => row.createdAt || null,
        id: "createdAt",
        header: "Created At",
        cell: ({ getValue }) => {
            const value = getValue();
            if (!value) return "_";
            return new Date(value).toLocaleDateString();
        },
    },

    {
        accessorFn: (row) => row.updatedAt || null,
        id: "updatedAt",
        header: "Updated At",
        cell: ({ getValue }) => {
            const value = getValue();
            if (!value) return "_";
            return new Date(value).toLocaleDateString();
        },
    },
];


const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Medications" },
];

export default function ApiKeysTable() {
    const [editData, setEditData] = useState(null);
    const [hasAnyActions] = useState(true);
    const [deleteItem, setDeleteItem] = useState(null);
    const [refresh, setRefresh] = useState(0);
    const [addFormOpen, setAddFormOpen] = useState(false);

    return (
        <ContentLayout title="Medications">
            <DashboardBreadcrumb items={breadcrumbItems} />

            <div className="flex items-center justify-end my-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddFormOpen(true)}
                >
                    <Plus className="w-4 h-4 mr-2" /> Add Medication
                </Button>

                <MedicationAddForm
                    open={addFormOpen}
                    onClose={() => setAddFormOpen(false)}
                    onCreated={() => setRefresh((r) => r + 1)}
                />

            </div>

            {deleteItem && (
                <DeleteDialog
                    open={!!deleteItem}
                    setOpen={() => setDeleteItem(null)}
                    apiRoute={`/api/v1/protected/admin/medication/delete?id=${deleteItem.id}`}
                    onSuccess={() => {
                        setDeleteItem(null);
                        setRefresh((r) => r + 1);
                    }}
                />
            )}
            {
                editData && (
                    <MedicationEditForm
                        open={!!editData}
                        data={editData}
                        onClose={() => setEditData(null)}
                        onCreated={() => setRefresh((r) => r + 1)}
                    />
                )
            }
            <DynamicTable
                key={refresh}
                endpoint="/api/v1/public/medication"
                columns={columns}
                ActionComponent={(item) => {
                    if (!hasAnyActions) return null;

                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditData(item)}>
                                    <Pencil className="w-4 h-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setDeleteItem(item)}
                                    className="text-red-600"
                                >
                                    <Trash className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                }}
            />
        </ContentLayout>
    );
}
