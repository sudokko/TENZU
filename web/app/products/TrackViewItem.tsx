"use client";

import { useEffect } from "react";
import { trackViewItem } from "../analytics";

export default function TrackViewItem({
  id,
  name,
  price,
}: {
  id: string;
  name: string;
  price: number;
}) {
  useEffect(() => {
    trackViewItem({ id, name, price, category: "paper" });
  }, [id, name, price]);
  return null;
}
