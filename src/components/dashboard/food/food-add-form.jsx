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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-hot-toast";

export default function FoodAddForm({ open, onClose, onCreated }) {
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState("form");

    const [form, setForm] = useState({
        name: "",
        dataPerAmount: 100,
        dataPerUnit: "g",
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
        fiber: "",
    });

    const [jsonInput, setJsonInput] = useState("");

    const handleSubmit = async () => {
        try {
            setLoading(true);

            let payload;

            if (mode === "json") {
                payload = JSON.parse(jsonInput);
            } else {
                if (!form.name.trim()) {
                    toast.error("Food name is required");
                    return;
                }

                payload = {
                    name: form.name.trim(),
                    dataPerAmount: Number(form.dataPerAmount),
                    dataPerUnit: form.dataPerUnit,
                    macros: {
                        calories: Number(form.calories || 0),
                        protein: Number(form.protein || 0),
                        carbs: Number(form.carbs || 0),
                        fat: Number(form.fat || 0),
                        fiber: Number(form.fiber || 0),
                    },
                };
            }

            const res = await fetch("/api/v1/protected/admin/food/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.message || "Failed to add food");

            toast.success(`Food added (${json.count || 1})`);
            onCreated?.();
            onClose();

            setForm({
                name: "",
                dataPerAmount: 100,
                dataPerUnit: "g",
                calories: "",
                protein: "",
                carbs: "",
                fat: "",
                fiber: "",
            });
            setJsonInput("");
        } catch (err) {
            toast.error(err.message || "Invalid JSON");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Add Food</DialogTitle>
                </DialogHeader>

                {/* Mode Toggle */}
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant={mode === "form" ? "default" : "outline"}
                        onClick={() => setMode("form")}
                    >
                        Form
                    </Button>
                    <Button
                        size="sm"
                        variant={mode === "json" ? "default" : "outline"}
                        onClick={() => setMode("json")}
                    >
                        JSON / Bulk
                    </Button>
                </div>

                {mode === "form" ? (
                    <div className="space-y-6 mt-4">
                        {/* Basic Info */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-muted-foreground">
                                Basic Information
                            </h4>

                            <div className="space-y-1">
                                <label className="text-sm font-medium">Food Name *</label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Chicken Breast"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Data Per Amount</label>
                                    <Input
                                        type="number"
                                        value={form.dataPerAmount}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                dataPerAmount: e.target.value,
                                            })
                                        }
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Unit</label>
                                    <Input
                                        value={form.dataPerUnit}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                dataPerUnit: e.target.value,
                                            })
                                        }
                                        placeholder="g"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Nutrition */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-muted-foreground">
                                Nutrition (per serving)
                            </h4>

                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Calories"
                                    placeholder="Calories"
                                    type="number"
                                    value={form.calories}
                                    onChange={(e) =>
                                        setForm({ ...form, calories: e.target.value })
                                    }
                                />
                                <Input
                                    label="Protein (g)"
                                    placeholder="Protein"
                                    type="number"
                                    value={form.protein}
                                    onChange={(e) =>
                                        setForm({ ...form, protein: e.target.value })
                                    }
                                />
                                <Input
                                    label="Carbs (g)"
                                    placeholder="Carbs"
                                    type="number"
                                    value={form.carbs}
                                    onChange={(e) => setForm({ ...form, carbs: e.target.value })}
                                />
                                <Input
                                    label="Fat (g)"
                                    placeholder="Fat"
                                    type="number"
                                    value={form.fat}
                                    onChange={(e) => setForm({ ...form, fat: e.target.value })}
                                />
                                <Input
                                    label="Fiber (g)"
                                    placeholder="Fiber"
                                    type="number"
                                    value={form.fiber}
                                    onChange={(e) => setForm({ ...form, fiber: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2 mt-4">
                        <label className="text-sm font-medium">
                            Food JSON (single or array)
                        </label>
                        <Textarea
                            rows={10}
                            placeholder={`[
  {
    "name": "Rice",
    "dataPerAmount": 100,
    "dataPerUnit": "g",
    "macros": {
      "calories": 130,
      "protein": 2.7,
      "carbs": 28,
      "fat": 0.3,
      "fiber": 0.4
    }
  }
]`}
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                        />
                    </div>
                )}

                <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full mt-6"
                >
                    {loading ? "Saving..." : "Add Food"}
                </Button>
            </DialogContent>
        </Dialog>
    );
}
