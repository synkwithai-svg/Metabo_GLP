"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

interface DeleteDialogProps {
  apiRoute: string;
  open: boolean;
  setOpen: (value: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Common Delete Component (TypeScript)
 * Usage:
 * <DeleteDialog
 *    apiRoute={`/api/protected/permission/${id}`}
 *    open={open}
 *    setOpen={setOpen}
 *    onSuccess={refreshData}
 * />
 */
export default function DeleteDialog({
  apiRoute,
  open,
  setOpen,
  onSuccess,
}: DeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    try {
      setLoading(true);

      const res = await fetch(apiRoute, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");

      toast.success("Deleted successfully");

      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-600">
          This action cannot be undone. It will permanently delete this item.
        </p>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
