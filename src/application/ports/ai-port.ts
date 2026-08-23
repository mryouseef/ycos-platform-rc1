/** M-04: AI boundary is intentionally disabled and never retains or transmits input content. */
import type { Classification, CorrelationId, PortResult } from "./types";
import { denied } from "./types";
export interface AiPort { requestAssistance(input: Readonly<{ correlationId: CorrelationId; classification: Classification; content: string }>): Promise<PortResult<never>>; }
export class DisabledAiPort implements AiPort { async requestAssistance({ correlationId }: Readonly<{ correlationId: CorrelationId; classification: Classification; content: string }>): Promise<PortResult<never>> { return denied("AI_DISABLED", correlationId); } }
