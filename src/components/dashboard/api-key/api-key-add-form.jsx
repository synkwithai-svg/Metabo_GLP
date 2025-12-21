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



export default function APIKeyAddForm({ open, onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    key: "",
    provider: "",
    tokens: "",
    expiresAt: "",
  });

  const [errors, setErrors] = useState({
    key: "",
    provider: "",
  });

  const handleCreate = async () => {
    // Reset errors
    setErrors({ key: "", provider: "" });

    // Validation
    const newErrors = { key: "", provider: "" };
    if (!form.key.trim()) newErrors.key = "API Key is required";
    if (!form.provider.trim()) newErrors.provider = "Provider is required";

    if (newErrors.key || newErrors.provider) {
      setErrors(newErrors);
      toast.error("Please fill the required fields");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/v1/protected/admin/api-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: form.key,
          provider: form.provider,
          tokens: form.tokens ? Number(form.tokens) : undefined,
          expiresAt: form.expiresAt || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to create API key");

      toast.success("API Key created successfully");
      onCreated?.();
      onClose();

      // Reset form
      setForm({
        key: "",
        provider: "",
        tokens: "",
        expiresAt: "",
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
          <DialogTitle>Add API Key</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">API Key</label>
            <Input
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              placeholder="sk-xxxxxxxx"
              required
              className={errors.key ? "border-red-500" : ""}
            />
            {errors.key && (
              <p className="text-red-500 text-xs mt-1">{errors.key}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Provider</label>
            <Input
              value={form.provider}
              onChange={(e) =>
                setForm({ ...form, provider: e.target.value })
              }
              placeholder="openai "
              required
              className={errors.provider ? "border-red-500" : ""}
            />
            {errors.provider && (
              <p className="text-red-500 text-xs mt-1">{errors.provider}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Tokens (optional)</label>
            <Input
              type="number"
              min={0}
              value={form.tokens}
              onChange={(e) => setForm({ ...form, tokens: e.target.value })}
              placeholder="100000"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Expires At (optional)</label>
            <Input
              type="date"
              value={form.expiresAt}
              onChange={(e) =>
                setForm({ ...form, expiresAt: e.target.value })
              }
            />
          </div>

          <Button onClick={handleCreate} disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create API Key"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
