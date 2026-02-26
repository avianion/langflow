import { useMemo } from "react";
import useFlowStore from "@/stores/flowStore";
import type { ChatMessageType } from "@/types/chat";
import { useMessageDuration } from "./use-message-duration";
import { useToolDurations } from "./use-tool-durations";

export function useBotMessageMetrics(
  chat: ChatMessageType,
  lastMessage: boolean,
) {
  const isBuilding = useFlowStore((state) => state.isBuilding);
  const buildStartTime = useFlowStore((state) => state.buildStartTime);
  const buildDuration = useFlowStore((state) => state.buildDuration);

  const thinkingActive = Boolean(isBuilding && lastMessage);

  const { displayTime: liveDisplayTime } = useMessageDuration({
    lastMessage,
    isBuilding,
    buildStartTime,
    buildDuration,
  });

  // Prefer persisted duration (frozen value) over live timer
  // This ensures nested agent segments show their own duration after reset
  const persistedDuration = chat.properties?.build_duration;
  const displayTime =
    typeof persistedDuration === "number" && persistedDuration > 0
      ? persistedDuration
      : liveDisplayTime;

  // Use shared hook for tool duration tracking
  const { totalToolDuration } = useToolDurations(
    chat.content_blocks,
    thinkingActive,
  );

  // Check if message has tools
  const messageHasTools = useMemo(
    () =>
      Boolean(
        chat.content_blocks?.some((block) =>
          block.contents.some((content) => content.type === "tool_use"),
        ),
      ),
    [chat.content_blocks],
  );

  // The total tool duration green ms ALWAYS shows the sum of backend tool durations when tools exist
  // It will be 0 until backend provides durations, then show the sum
  // For messages without tools, it shows the same as displayTime
  const greenMsTime = messageHasTools ? totalToolDuration : displayTime;

  return { thinkingActive, displayTime, greenMsTime, messageHasTools };
}
