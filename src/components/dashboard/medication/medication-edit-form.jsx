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

export default function MedicationEditForm({
    open,
    onClose,
    onCreated,
    data,
}) {
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        name: "",
        doseMg: "",
        halfLifeHours: "",
        absorptionRateKa: "",
        bioavailability: "",
        volumeDistribution: "",
    });

    const [errors, setErrors] = useState({ name: "" });

    // Prefill form when editData changes
    useEffect(() => {
        if (data) {
            setForm({
                name: data.name || "",
                doseMg: data.doseMg ?? "",
                halfLifeHours: data.halfLifeHours ?? "",
                absorptionRateKa: data.absorptionRateKa ?? "",
                bioavailability: data.bioavailability ?? "",
                volumeDistribution: data.volumeDistribution ?? "",
            });
        }
    }, [data]);

    const handleUpdate = async () => {
        setErrors({ name: "" });

        if (!form.name.trim()) {
            setErrors({ name: "Medication name is required" });
            toast.error("Please provide medication name");
            return;
        }

        try {
            setLoading(true);

            const payload = {
                name: form.name.trim(),
                doseMg: form.doseMg ? Number(form.doseMg) : null,
                halfLifeHours: form.halfLifeHours
                    ? Number(form.halfLifeHours)
                    : null,
                absorptionRateKa: form.absorptionRateKa
                    ? Number(form.absorptionRateKa)
                    : null,
                bioavailability: form.bioavailability
                    ? Number(form.bioavailability)
                    : null,
                volumeDistribution: form.volumeDistribution
                    ? Number(form.volumeDistribution)
                    : null,
            };

            const res = await fetch(
                `/api/v1/protected/admin/medication/edit/${data.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const json = await res.json();
            if (!res.ok)
                throw new Error(json.message || "Failed to update medication");

            toast.success("Medication updated successfully");
            onCreated?.();
            onClose();
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
                    <DialogTitle>Edit Medication</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Medication Name *</label>
                        <Input
                            value={form.name}
                            onChange={(e) =>
                                setForm({ ...form, name: e.target.value })
                            }
                            className={errors.name ? "border-red-500" : ""}
                        />
                        {errors.name && (
                            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                        )}
                    </div>

                    <InputBlock
                        label="Dose (mg)"
                        value={form.doseMg}
                        onChange={(v) => setForm({ ...form, doseMg: v })}
                    />

                    <InputBlock
                        label="Half-life (hours)"
                        value={form.halfLifeHours}
                        onChange={(v) => setForm({ ...form, halfLifeHours: v })}
                    />

                    <InputBlock
                        label="Absorption Rate (Ka)"
                        value={form.absorptionRateKa}
                        step="0.01"
                        onChange={(v) =>
                            setForm({ ...form, absorptionRateKa: v })
                        }
                    />

                    <InputBlock
                        label="Bioavailability (0–1)"
                        value={form.bioavailability}
                        step="0.01"
                        min={0}
                        max={1}
                        onChange={(v) =>
                            setForm({ ...form, bioavailability: v })
                        }
                    />

                    <InputBlock
                        label="Volume of Distribution (L)"
                        value={form.volumeDistribution}
                        step="0.01"
                        onChange={(v) =>
                            setForm({ ...form, volumeDistribution: v })
                        }
                    />

                    <Button
                        onClick={handleUpdate}
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? "Updating..." : "Update Medication"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/* Small reusable input helper */
function InputBlock({
    label,
    value,
    onChange,
    step = "1",
    min = 0,
    max,
}) {
    return (
        <div>
            <label className="text-sm font-medium">{label}</label>
            <Input
                type="number"
                step={step}
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}
