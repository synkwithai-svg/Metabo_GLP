"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

export default function PermissionsAddForm({ open, onClose, onCreated }) {
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        name: "",
        slug: "",
    });

    const [errors, setErrors] = useState({
        name: "",
        slug: "",
    });

    const handleCreate = async () => {
        setErrors({ name: "", slug: "" });

        if (!form.name.trim()) {
            setErrors((prev) => ({ ...prev, name: "Permission name is required" }));
            toast.error("Please provide permission name");
            return;
        }

        if (!form.slug.trim()) {
            setErrors((prev) => ({ ...prev, slug: "Slug is required" }));
            toast.error("Please provide permission slug");
            return;
        }

        try {
            setLoading(true);

            const payload = {
                name: form.name.trim(),
                slug: form.slug.trim(),
            };

            const res = await fetch("/api/v1/protected/admin/permissions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (!res.ok) {
                // 👇 Handle field-specific API errors
                if (json.field) {
                    setErrors((prev) => ({
                        ...prev,
                        [json.field]: json.message,
                    }));
                }

                toast.error(json.message || "Failed to add permission");
                return;
            }

            toast.success("Permission added successfully");
            onCreated?.();
            onClose();
            setForm({ name: "", slug: "" });

        } catch (err) {
            toast.error("Something went wrong");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Permission</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Permission Name *</label>
                        <Input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Edit Users"
                            className={errors.name ? "border-red-500" : ""}
                        />
                        {errors.name && (
                            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium">Slug *</label>
                        <Input
                            value={form.slug}
                            onChange={(e) => setForm({ ...form, slug: e.target.value })}
                            placeholder="edit_users"
                            className={errors.slug ? "border-red-500" : ""}
                        />
                        {errors.slug && (
                            <p className="text-red-500 text-xs mt-1">{errors.slug}</p>
                        )}
                    </div>

                    <Button onClick={handleCreate} disabled={loading} className="w-full">
                        {loading ? "Adding..." : "Add Permission"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
