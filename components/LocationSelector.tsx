"use client";

import { LocationChooser } from "@/components/LocationChooser";

export function LocationSelector({ compact = false }: { compact?: boolean }) {
  return <LocationChooser variant="header" compact={compact} />;
}
