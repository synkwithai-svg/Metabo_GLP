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

export default function SideEffectsAddForm({ open, onClose, onCreated }) {
    const [loading, setLoading] = useState(false);
    const [sideEffects, setSideEffects] = useState([""]); 

    const handleChange = (index, value) => {
        const updated = [...sideEffects];
        updated[index] = value;
        setSideEffects(updated);
    };

    const addField = () => setSideEffects([...sideEffects, ""]);
    const removeField = (index) => setSideEffects(sideEffects.filter((_, i) => i !== index));

    const handleCreate = async () => {
        const filtered = sideEffects.map((s) => s.trim()).filter(Boolean);
        if (!filtered.length) {
            toast.error("Please add at least one side effect");
            return;
        }

        try {
            setLoading(true);
            const res = await fetch("/api/v1/protected/admin/side-effects", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(filtered.map((name) => ({ name }))),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.message || "Failed to add side effects");

            toast.success(`${json.inserted} side effect(s) added successfully`);
            onCreated?.();
            onClose();
            setSideEffects([""]);
        } catch (err) {
            toast.error(err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Side Effects</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {sideEffects.map((effect, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <Input
                                value={effect}
                                onChange={(e) => handleChange(i, e.target.value)}
                                placeholder={`Side effect ${i + 1}`}
                                className="flex-1"
                            />
                            {sideEffects.length > 1 && (
                                <Button
                                    variant="destructive"
                                    onClick={() => removeField(i)}
                                    size="sm"
                                >
                                    Remove
                                </Button>
                            )}
                        </div>
                    ))}

                    <Button variant="outline" onClick={addField} className="w-full">
                        + Add another side effect
                    </Button>

                    <Button onClick={handleCreate} disabled={loading} className="w-full">
                        {loading ? "Adding..." : "Add Side Effects"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
