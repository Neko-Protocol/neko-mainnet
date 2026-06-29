import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateActivationDto {
  @ApiProperty({ description: "Activation name (e.g. bootcamp cohort)." })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    description: "Reward per participant (in the activation's payout asset).",
  })
  @IsNumber()
  @IsPositive()
  reward_xlm!: number;

  @ApiProperty({
    description: "Payout asset for this activation.",
    enum: ["XLM", "USDC"],
    default: "XLM",
    required: false,
  })
  @IsOptional()
  @IsIn(["XLM", "USDC"])
  payout_asset?: "XLM" | "USDC";

  @ApiProperty({
    description: "ISO timestamp after which verifications no longer count.",
  })
  @IsDateString()
  expires_at!: string;

  @ApiProperty({ description: "Participant emails eligible for the reward." })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @IsEmail({}, { each: true })
  emails!: string[];

  @ApiProperty({
    description: "Admin identifier creating the activation.",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  created_by?: string;

  @ApiProperty({
    description: "Email an invitation to each participant on creation.",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  send_invites?: boolean;
}
