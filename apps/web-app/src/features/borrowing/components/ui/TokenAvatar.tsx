import Image from "next/image";
import { getTokenIcon, getTokenIconFitClass } from "@/lib/helpers/tokenUtils";

export function TokenAvatar({ code }: { code: string }) {
  const icon = getTokenIcon({ type: "contract", code });
  return (
    <div className="h-6 w-6 rounded-full border-2 border-[#1C1C1C] bg-[#1a2a4a] flex items-center justify-center overflow-hidden">
      {icon ? (
        <Image
          src={icon}
          alt={code}
          width={24}
          height={24}
          unoptimized
          className={getTokenIconFitClass(code)}
        />
      ) : (
        <span className="text-white text-[9px] font-bold">{code[0]}</span>
      )}
    </div>
  );
}
