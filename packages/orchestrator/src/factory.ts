import { Orchestrator } from "./core/Orchestrator.js";
import { PoolRegistry } from "./core/PoolRegistry.js";
import { BlendPoolAdapter } from "./adapters/BlendPoolAdapter.js";
import { SoroswapPoolAdapter } from "./adapters/SoroswapPoolAdapter.js";
import { AquaPoolAdapter } from "./adapters/AquaPoolAdapter.js";
import { getBlendPoolIds } from "./adapters/blend-config.js";
import type { OrchestratorConfig } from "./config.js";

export interface CreatedOrchestrator {
  orchestrator: Orchestrator;
  poolRegistry: PoolRegistry;
}

export function createOrchestrator(
  config: OrchestratorConfig
): CreatedOrchestrator {
  const poolRegistry = new PoolRegistry();
  for (const blendPoolId of getBlendPoolIds(config.network.id)) {
    poolRegistry.register(new BlendPoolAdapter(blendPoolId, config));
  }
  poolRegistry.register(new SoroswapPoolAdapter(config));
  poolRegistry.register(new AquaPoolAdapter(config));
  return { orchestrator: new Orchestrator(poolRegistry), poolRegistry };
}
