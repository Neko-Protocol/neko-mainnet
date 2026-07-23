"use client";

import React, { useTransition } from "react";
import { useLocale } from "next-intl";
import {
  FormControl,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { setUserLocale } from "@/i18n/actions";
import { locales, type Locale } from "@/i18n/config";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

interface LanguageSelectorProps {
  embedded?: boolean;
}

export function LanguageSelector({ embedded = false }: LanguageSelectorProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (event: SelectChangeEvent<Locale>) => {
    const nextLocale = event.target.value as Locale;
    startTransition(() => {
      setUserLocale(nextLocale).then(() => router.refresh());
    });
  };

  return (
    <div
      className={
        embedded
          ? "rounded-xl bg-[#2A2A2A] px-4 py-3"
          : "rounded-xl border border-white/10 bg-[#2A2A2A] p-3"
      }
    >
      <label
        htmlFor="language-selector"
        className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-white/45"
      >
        Language
      </label>
      <FormControl fullWidth size="small">
        <Select
          id="language-selector"
          value={locale}
          onChange={handleChange}
          disabled={isPending}
          variant="outlined"
          displayEmpty
          MenuProps={{
            PaperProps: {
              sx: {
                mt: 0.5,
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.08)",
                backgroundColor: "#121212",
                color: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(8px)",
              },
            },
          }}
          sx={{
            color: "rgba(255,255,255,0.95)",
            borderRadius: "10px",
            backgroundColor: "#121212",
            fontSize: "0.9rem",
            fontWeight: 600,
            minHeight: "40px",
            ".MuiSelect-icon": {
              color: "rgba(255,255,255,0.55)",
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(255,255,255,0.1)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(255,255,255,0.22)",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#229EDF",
              borderWidth: 1,
            },
            "& .MuiSelect-select": {
              py: 1.1,
              px: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 1,
            },
          }}
        >
          {locales.map((l) => (
            <MenuItem
              key={l}
              value={l}
              sx={{
                fontSize: "0.9rem",
                fontWeight: 500,
                color: "rgba(255,255,255,0.9)",
                "&.Mui-selected": {
                  backgroundColor: "rgba(34,158,223,0.15)",
                },
                "&.Mui-selected:hover": {
                  backgroundColor: "rgba(34,158,223,0.22)",
                },
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.06)",
                },
              }}
            >
              {LOCALE_LABELS[l]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
}
