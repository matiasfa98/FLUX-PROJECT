// mobile/src/types/shims.d.ts

/*
|--------------------------------------------------------------------------
| MODULE SHIMS
|--------------------------------------------------------------------------
| These packages ship without their own type declarations and don't have
| a `@types/...` package on npm. We declare them as `any` here so TS
| stops complaining while keeping the code working at runtime.
|--------------------------------------------------------------------------
*/

declare module "react-native-syntax-highlighter" {
  import { ComponentType } from "react";

  interface SyntaxHighlighterProps {
    language?: string;
    style?: any;
    customStyle?: any;
    highlighter?: string;
    fontSize?: number;
    fontFamily?: string;
    PreTag?: any;
    CodeTag?: any;
    children?: React.ReactNode;
    [key: string]: any;
  }

  const SyntaxHighlighter: ComponentType<SyntaxHighlighterProps>;
  export default SyntaxHighlighter;
}

declare module "react-syntax-highlighter/dist/esm/styles/hljs" {
  const styles: Record<string, any>;
  export const atomOneDark: any;
  export const atomOneLight: any;
  export const github: any;
  export const dracula: any;
  export const monokai: any;
  export default styles;
}