import { ForwardedIconComponent } from "@/components/common/genericIconComponent";
import type { PropertiesType } from "@/types/chat";
import { formatTokenCount } from "@/utils/format-token-count";
import { formatSeconds, formatTime } from "../utils/format";

interface MessageStatusHeaderProps {
  thinkingActive: boolean;
  displayTime: number;
  greenMsTime: number;
  messageHasTools: boolean;
  usage?: PropertiesType["usage"];
}

export function MessageStatusHeader({
  thinkingActive,
  displayTime,
  greenMsTime,
  messageHasTools,
  usage,
}: MessageStatusHeaderProps) {
  if (thinkingActive && displayTime > 0) {
    return (
      <>
        <span>Running... {formatSeconds(displayTime)}</span>
        <span className="flex items-center gap-2">
          {messageHasTools && (
            <span className="text-emerald-500">
              {formatTime(greenMsTime, true)}
            </span>
          )}
        </span>
      </>
    );
  }

  if (!thinkingActive && displayTime > 0) {
    return (
      <>
        <span className="text-muted-foreground">Finished</span>
        <span className="flex items-center gap-1 font-mono text-xs text-accent-emerald-foreground">
          {usage && usage.total_tokens > 0 && (
            <>
              <ForwardedIconComponent
                name="Coins"
                className="h-3 w-3 text-muted-foreground"
              />
              <span>{formatTokenCount(usage.total_tokens)}</span>
              <span className="text-muted-foreground">|</span>
            </>
          )}
          {messageHasTools && greenMsTime > 0 ? (
            <span>{formatTime(greenMsTime, true)}</span>
          ) : (
            <span> {formatSeconds(displayTime)}</span>
          )}
        </span>
      </>
    );
  }

  return null;
}
