"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

export default function PermissionsEditForm({
    open,
    onClose,
    onCreated,
    data,
}) {
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        name: "",
        slug: "",
    });

    const [errors, setErrors] = useState({
        name: "",
        slug: "",
    });

    useEffect(() => {
        if (data) {
            setForm({
                name: data.name || "",
                slug: data.slug || "",
            });
        }
    }, [data]);

    const handleUpdate = async () => {
        setErrors({ name: "", slug: "" });

        if (!form.name.trim()) {
            setErrors({ name: "Permission name is required", slug: "" });
            toast.error("Permission name is required");
            return;
        }

        if (!form.slug.trim()) {
            setErrors({ name: "", slug: "Permission slug is required" });
            toast.error("Permission slug is required");
            return;
        }

        try {
            setLoading(true);

            const payload = {
                id: data.id,
                name: form.name.trim(),
                slug: form.slug.trim(),
            };

            const res = await fetch(
                "/api/v1/protected/admin/permissions",
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const json = await res.json();

            if (!res.ok) {
                if (json.field) {
                    setErrors((prev) => ({
                        ...prev,
                        [json.field]: json.message,
                    }));
                }

                toast.error(json.message || "Failed to update permission");
                return;
            }

            toast.success("Permission updated successfully");
            onCreated?.();
            onClose();
        } catch (err) {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Permission</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">
                            Permission Name *
                        </label>
                        <Input
                            value={form.name}
                            onChange={(e) =>
                                setForm({ ...form, name: e.target.value })
                            }
                            className={errors.name ? "border-red-500" : ""}
                        />
                        {errors.name && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium">
                            Slug *
                        </label>
                        <Input
                            value={form.slug}
                            onChange={(e) =>
                                setForm({ ...form, slug: e.target.value })
                            }
                            className={errors.slug ? "border-red-500" : ""}
                        />
                        {errors.slug && (
                            <p className="text-red-500 text-xs mt-1">
                                {errors.slug}
                            </p>
                        )}
                    </div>

                    <Button
                        onClick={handleUpdate}
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? "Updating..." : "Update Permission"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
