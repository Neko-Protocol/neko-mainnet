import { Module } from "@nestjs/common";
import { AssetPricesModule } from "@domains/market-data/asset-prices/asset-prices.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [AssetPricesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
