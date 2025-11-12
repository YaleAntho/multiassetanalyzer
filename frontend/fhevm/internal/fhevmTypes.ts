// Re-export types from parent
export type {
  FhevmInstance,
  FhevmInstanceConfig,
  FhevmDecryptionSignatureType,
  EIP712Type,
} from "../fhevmTypes";

// Import types for use in this file
import type { FhevmInstance, FhevmInstanceConfig } from "../fhevmTypes";

export type FhevmInitSDKOptions = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export type FhevmInitSDKType = (
  options?: FhevmInitSDKOptions
) => Promise<boolean>;

export type FhevmLoadSDKType = () => Promise<void>;

export type FhevmRelayerSDKType = {
  initSDK: FhevmInitSDKType;
  createInstance: (
    config: FhevmInstanceConfig
  ) => Promise<FhevmInstance>;
  SepoliaConfig: FhevmInstanceConfig;
  __initialized__?: boolean;
};

export type FhevmWindowType = {
  relayerSDK: FhevmRelayerSDKType;
};

