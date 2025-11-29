"use client";

import clsx from "clsx";
import { useState } from "react";

interface Tab {
  id: string;
  label: string;
}

interface TabSwitcherProps {
  tabs: Tab[];
  onChange?: (id: string) => void;
}

export default function TabSwitcher({ tabs, onChange }: TabSwitcherProps) {
  const [active, setActive] = useState(tabs[0]?.id);

  const handleChange = (id: string) => {
    setActive(id);
    onChange?.(id);
  };

  return (
    <div className="inline-flex rounded-full border border-slate-800 bg-slate-950/60 p-1 text-sm">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleChange(tab.id)}
          className={clsx(
            "rounded-full px-3 py-1 font-medium transition",
            active === tab.id ? "bg-emerald-500/20 text-emerald-200" : "text-slate-500 hover:text-slate-200"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
