"use client";

import React from "react";
import {
  FormControl,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from "@mui/material";
import {
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
  useCurrencyStore,
} from "@/stores/currency.store";

interface CurrencySelectorProps {
  embedded?: boolean;
}

export function CurrencySelector({ embedded = false }: CurrencySelectorProps) {
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency);
  const setSelectedCurrency = useCurrencyStore(
    (state) => state.setSelectedCurrency
  );

  const handleChange = (event: SelectChangeEvent<SupportedCurrency>) => {
    setSelectedCurrency(event.target.value as SupportedCurrency);
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
        htmlFor="currency-selector"
        className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-white/45"
      >
        Display currency
      </label>
      <FormControl fullWidth size="small">
        <Select
          id="currency-selector"
          value={selectedCurrency}
          onChange={handleChange}
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
          {SUPPORTED_CURRENCIES.map((currency) => (
            <MenuItem
              key={currency}
              value={currency}
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
              {currency}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
}
