import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { getTOTP } from "@/lib/auth";

export async function GET() {
  if (!process.env.ADMIN_TOTP_SECRET) {
    return NextResponse.json(
      { error: "Set ADMIN_TOTP_SECRET in .env.local first" },
      { status: 400 }
    );
  }

  try {
    const totp = getTOTP();
    const uri = totp.toString();
    const qrDataUrl = await QRCode.toDataURL(uri);

    return NextResponse.json({
      qrDataUrl,
      secret: process.env.ADMIN_TOTP_SECRET,
      uri,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate TOTP QR code" },
      { status: 500 }
    );
  }
}
