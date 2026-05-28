import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";

@ApiTags("rpc")
@Controller("rpc")
@SkipThrottle()
export class RpcController {
  private readonly logger = new Logger(RpcController.name);

  constructor(private readonly config: ConfigService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Forward a JSON-RPC request to the configured Stellar RPC. Hides upstream URL + credentials from the browser.",
  })
  async proxy(@Body() body: unknown): Promise<unknown> {
    const upstreamUrl = this.config.get<string>("STELLAR_RPC_URL");
    if (!upstreamUrl) {
      throw new ServiceUnavailableException({ code: "RPC_NOT_CONFIGURED" });
    }

    let upstream: Response;
    try {
      upstream = await fetch(upstreamUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
    } catch (err) {
      this.logger.error(
        `Upstream RPC unreachable: ${err instanceof Error ? err.message : err}`
      );
      throw new ServiceUnavailableException({ code: "RPC_UNREACHABLE" });
    }

    const text = await upstream.text();
    if (!upstream.ok) {
      this.logger.warn(
        `Upstream RPC ${upstream.status}: ${text.slice(0, 200)}`
      );
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new ServiceUnavailableException({ code: "RPC_INVALID_RESPONSE" });
    }
  }
}
