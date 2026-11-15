import type { SourceAdapter } from "@/lib/types";
import { tfl } from "./tfl";
import { windy } from "./windy";
import { orendor } from "./orendor";
import { optin } from "./optin";
import { caltrans } from "./caltrans";
import { dot511 } from "./dot511";

// Register every adapter here. Add a new provider = add a file + one line.
export const adapters: Record<string, SourceAdapter> = {
  tfl,
  windy,
  orendor,
  optin,
  caltrans,
  dot511,
};
