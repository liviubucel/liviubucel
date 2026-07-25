declare module "*.riv" {
  const content: any;
  export default content;
}

declare module "cloudflare:workers" {
  export const env: Env;
}
