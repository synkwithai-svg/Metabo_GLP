"use client";
import { useEffect } from "react";
import { getFCMToken } from "@/lib/services/getFCMToken";

export default function NotificationInit() {
  useEffect(() => {
    async function fetchToken() {
      const token = await getFCMToken();
    }

    fetchToken();
  }, []);

  return null;
}
