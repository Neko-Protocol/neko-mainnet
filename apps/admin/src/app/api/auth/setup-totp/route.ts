import QRCode from "qrcode";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { generateTOTPSecret, getTOTPUri } from "@/lib/auth";

const passwordHashCommand =
  "node -e \"const b=require('bcryptjs'); b.hash('YOUR_PASSWORD',10).then(console.log)\"";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim() ?? "";
  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  try {
    const secret = generateTOTPSecret();
    const uri = getTOTPUri(email, secret);
    const qrDataUrl = await QRCode.toDataURL(uri);

    return NextResponse.json({
      qrDataUrl,
      secret,
      uri,
      passwordHashCommand,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate TOTP QR code" },
      { status: 500 }
    );
  }
}
