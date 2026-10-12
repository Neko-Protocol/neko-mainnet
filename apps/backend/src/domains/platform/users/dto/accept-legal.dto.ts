import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class AcceptLegalDto {
  @ApiProperty({ description: "Stellar wallet public key (G...)." })
  @IsString()
  @MinLength(1)
  wallet_address!: string;

  @ApiProperty({
    description: "Version identifier of the Terms of Service being accepted.",
  })
  @IsString()
  @MinLength(1)
  terms_version!: string;

  @ApiProperty({
    description: "Version identifier of the Privacy Policy being accepted.",
  })
  @IsString()
  @MinLength(1)
  privacy_version!: string;
}
