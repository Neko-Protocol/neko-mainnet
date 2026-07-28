// @xbullcorp/swap-kit is a JSR package whose npm build leaks a Deno-style
// import specifier in its source (`npm:@stellar/stellar-sdk@^15.0.0`). It ships
// no .d.ts, so TypeScript type-checks the raw source and cannot resolve that
// specifier. Map it to the real SDK so the build type-checks cleanly.
declare module "npm:@stellar/stellar-sdk@^15.0.0" {
  export * from "@stellar/stellar-sdk";
}
