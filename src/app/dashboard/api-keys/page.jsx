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
import { MoreHorizontal, Trash, Plus } from "lucide-react";
import DeleteDialog from "@/components/dashboard/delete-dialog";

import APIKeyAddForm from "@/components/dashboard/api-key/api-key-add-form";

const columns = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "key", header: "Key" },
    { accessorFn: (row) => row.tokens || "_", id: "tokens", header: "Tokens" },
    { accessorFn: (row) => row.provider || "_", id: "provider", header: "Provider" },
    {
        accessorFn: (row) => row.expiresAt || null,
        id: "expiresAt",
        header: "Expires At",
        cell: ({ getValue }) => {
            const value = getValue();
            if (!value) return "_";
            return new Date(value).toLocaleDateString();
        },
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
];

const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "API Keys" },
];

export default function ApiKeysTable() {
    const [hasAnyActions] = useState(true);
    const [deleteItem, setDeleteItem] = useState(null);
    const [refresh, setRefresh] = useState(0);
    const [addFormOpen, setAddFormOpen] = useState(false);

    return (
        <ContentLayout title="API Keys">
            <DashboardBreadcrumb items={breadcrumbItems} />

            <div className="flex items-center justify-end my-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddFormOpen(true)}
                >
                    <Plus className="w-4 h-4 mr-2" /> Add New API Key
                </Button>

                <APIKeyAddForm
                    open={addFormOpen}
                    onClose={() => setAddFormOpen(false)}
                    onCreated={() => setRefresh((r) => r + 1)}
                />
            </div>

            {deleteItem && (
                <DeleteDialog
                    open={!!deleteItem}
                    setOpen={() => setDeleteItem(null)}
                    apiRoute={`/api/v1/protected/admin/api-key/?id=${deleteItem.id}`}
                    onSuccess={() => {
                        setDeleteItem(null);
                        setRefresh((r) => r + 1);
                    }}
                />
            )}

            <DynamicTable
                key={refresh}
                endpoint="/api/v1/protected/admin/api-key"
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
