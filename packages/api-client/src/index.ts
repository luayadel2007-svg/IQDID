export { ApiError, describeError, isApiError, type ApiErrorKind } from './errors.ts';
export {
  DemoHttpTransport, RealTransportPlaceholder, createTransport,
  type DemoTransportOptions, type HttpMethod, type RequestSpec, type Transport, type TransportMode,
} from './transport.ts';
export { createVerifierGateway, createWalletGateway, type VerifierGateway, type WalletGateway } from './gateways.ts';
