import React from "react";
import { useTranslations } from "next-intl";

export type OrderType = "swap" | "limit" | "twap";

interface OrderTypeTabsProps {
  orderType: OrderType;
  onOrderTypeChange: (type: OrderType) => void;
}

export const OrderTypeTabs: React.FC<OrderTypeTabsProps> = ({
  orderType,
  onOrderTypeChange,
}) => {
  const t = useTranslations("expert.swap");
  return (
    <div className="flex gap-2 mb-6">
      <button
        onClick={() => onOrderTypeChange("swap")}
        className={`px-5 py-2.5 text-base font-semibold rounded-lg transition-colors ${
          orderType === "swap"
            ? "text-white bg-[#229EDF]"
            : "text-gray-400 hover:text-gray-300"
        }`}
      >
        {t("orderTypeTabs.swap")}
      </button>
      <button
        disabled
        className="px-5 py-2.5 text-base font-semibold rounded-lg text-gray-600 cursor-not-allowed opacity-40"
        title={t("comingSoon")}
      >
        {t("orderTypeTabs.limit")}
      </button>
      <button
        disabled
        className="px-5 py-2.5 text-base font-semibold rounded-lg text-gray-600 cursor-not-allowed opacity-40"
        title={t("comingSoon")}
      >
        {t("orderTypeTabs.twap")}
      </button>
    </div>
  );
};
