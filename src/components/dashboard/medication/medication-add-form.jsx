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

export default function MedicationAddForm({ open, onClose, onCreated }) {
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        name: "",
        doseMg: "",
        halfLifeHours: "",
        absorptionRateKa: "",
        bioavailability: "",
        volumeDistribution: "",
    });

    const [errors, setErrors] = useState({
        name: "",
    });

    const handleCreate = async () => {
        setErrors({ name: "" });

        if (!form.name.trim()) {
            setErrors({ name: "Medication name is required" });
            toast.error("Please provide medication name");
            return;
        }

        try {
            setLoading(true);

            const payload = [
                {
                    name: form.name.trim(),
                    doseMg: form.doseMg ? Number(form.doseMg) : undefined,
                    halfLifeHours: form.halfLifeHours
                        ? Number(form.halfLifeHours)
                        : undefined,
                    absorptionRateKa: form.absorptionRateKa
                        ? Number(form.absorptionRateKa)
                        : undefined,
                    bioavailability: form.bioavailability
                        ? Number(form.bioavailability)
                        : undefined,
                    volumeDistribution: form.volumeDistribution
                        ? Number(form.volumeDistribution)
                        : undefined,
                },
            ];

            const res = await fetch("/api/v1/protected/admin/medication/post", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.message || "Failed to add medication");

            toast.success("Medication added successfully");
            onCreated?.();
            onClose();

            setForm({
                name: "",
                doseMg: "",
                halfLifeHours: "",
                absorptionRateKa: "",
                bioavailability: "",
                volumeDistribution: "",
            });
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
                    <DialogTitle>Add Medication</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Medication Name *</label>
                        <Input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Testosterone Enanthate"
                            className={errors.name ? "border-red-500" : ""}
                        />
                        {errors.name && (
                            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium">Dose (mg)</label>
                        <Input
                            type="number"
                            min={0}
                            value={form.doseMg}
                            onChange={(e) =>
                                setForm({ ...form, doseMg: e.target.value })
                            }
                            placeholder="250"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Half-life (hours)</label>
                        <Input
                            type="number"
                            min={0}
                            value={form.halfLifeHours}
                            onChange={(e) =>
                                setForm({ ...form, halfLifeHours: e.target.value })
                            }
                            placeholder="120"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">
                            Absorption Rate (Ka)
                        </label>
                        <Input
                            type="number"
                            step="0.01"
                            min={0}
                            value={form.absorptionRateKa}
                            onChange={(e) =>
                                setForm({ ...form, absorptionRateKa: e.target.value })
                            }
                            placeholder="0.8"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">
                            Bioavailability (0–1)
                        </label>
                        <Input
                            type="number"
                            step="0.01"
                            min={0}
                            max={1}
                            value={form.bioavailability}
                            onChange={(e) =>
                                setForm({ ...form, bioavailability: e.target.value })
                            }
                            placeholder="1"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">
                            Volume of Distribution (L)
                        </label>
                        <Input
                            type="number"
                            step="0.01"
                            min={0}
                            value={form.volumeDistribution}
                            onChange={(e) =>
                                setForm({ ...form, volumeDistribution: e.target.value })
                            }
                            placeholder="15"
                        />
                    </div>

                    <Button
                        onClick={handleCreate}
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? "Adding..." : "Add Medication"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
