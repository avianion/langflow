import { memo, useState } from "react";

import LangflowLogo from "@/assets/LangflowLogo.svg?react";
import IconComponent, {
  ForwardedIconComponent,
} from "@/components/common/genericIconComponent";
import { ContentBlockDisplay } from "@/components/core/chatComponents/ContentBlockDisplay";
import { CustomMarkdownField } from "@/customization/components/custom-markdown-field";
import useFlowStore from "@/stores/flowStore";
import type { chatMessagePropsType } from "@/types/components";
import { cn } from "@/utils/utils";

import { useBotMessageMetrics } from "../hooks/use-bot-message-metrics";
import { useMessageActions } from "../hooks/use-message-actions";
import { useStreamingMessage } from "../hooks/use-streaming-message";
import {
  getContentBlockLoadingState,
  getContentBlockState,
} from "../utils/content-blocks";
import EditMessageField from "./edit-message-field";
import { EditMessageButton } from "./message-options";
import { MessageStatusHeader } from "./message-status-header";

export const BotMessage = memo(
  ({ chat, lastMessage, updateChat, playgroundPage }: chatMessagePropsType) => {
    const [editMessage, setEditMessage] = useState(false);
    const isBuilding = useFlowStore((state) => state.isBuilding);

    const isAudioMessage = chat.category === "audio";

    const { chatMessage: decodedMessage, isStreaming } = useStreamingMessage({
      chat,
      isBuilding,
      updateChat,
    });

    const isEmpty = decodedMessage?.trim() === "";
    const chatMessage = chat.message ? chat.message.toString() : "";

    const { handleEditMessage, handleEvaluateAnswer } = useMessageActions(
      chat,
      {
        sender: "Machine",
        senderName: "AI",
        onEditSuccess: (message) => {
          updateChat?.(chat, message);
          setEditMessage(false);
        },
      },
    );

    const editedFlag = chat.edit ? (
      <div className="text-sm text-muted-foreground">(Edited)</div>
    ) : null;

    const { thinkingActive, displayTime, greenMsTime, messageHasTools } =
      useBotMessageMetrics(chat, lastMessage);

    return (
      <>
        <div className="w-full py-4 word-break-break-word">
          <div
            className={cn(
              "group relative flex w-full flex-col gap-3 rounded-md p-2",
              editMessage ? "" : "hover:bg-muted",
            )}
          >
            {/* Content: thinking (paragraph) -> steps dropdown -> answer with bot avatar */}
            <div className="flex w-full flex-col gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {!thinkingActive && displayTime > 0 && (
                  <ForwardedIconComponent
                    name="Check"
                    className="h-4 w-4 text-emerald-400"
                  />
                )}
                <span className="w-full flex justify-between">
                  <MessageStatusHeader
                    thinkingActive={thinkingActive}
                    displayTime={displayTime}
                    greenMsTime={greenMsTime}
                    messageHasTools={messageHasTools}
                    usage={chat.properties?.usage}
                  />
                </span>
              </div>

              {/* Show content blocks if they exist OR if we're building the last message (to show tools immediately when user sends message) */}
              {((chat.content_blocks && chat.content_blocks.length > 0) ||
                (isBuilding && lastMessage)) && (
                <ContentBlockDisplay
                  playgroundPage={playgroundPage}
                  contentBlocks={chat.content_blocks || []}
                  isLoading={getContentBlockLoadingState(
                    chat,
                    isBuilding,
                    lastMessage,
                  )}
                  state={getContentBlockState(chat, isBuilding, lastMessage)}
                  chatId={chat.id}
                  hideHeader={true}
                />
              )}

              <div className="flex w-full items-start gap-3">
                {(thinkingActive || displayTime > 0 || chatMessage !== "") && (
                  <div
                    className="relative hidden h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-white text-2xl @[45rem]/chat-panel:!flex border-0"
                    style={
                      chat.properties?.background_color
                        ? { backgroundColor: chat.properties.background_color }
                        : {}
                    }
                  >
                    <div className="flex h-5 w-5 items-center justify-center">
                      <LangflowLogo className="h-4 w-4 text-black" />
                    </div>
                  </div>
                )}

                <div className="form-modal-chat-text-position flex-grow">
                  <div className="form-modal-chat-text">
                    <div className="flex w-full flex-col">
                      <div
                        className="flex w-full flex-col dark:text-white"
                        data-testid="div-chat-message"
                      >
                        <div
                          data-testid={`chat-message-${chat.sender_name}-${chatMessage}`}
                          className="flex w-full flex-col"
                        >
                          {(chatMessage === "" || (isEmpty && !isStreaming)) &&
                          isBuilding &&
                          lastMessage ? (
                            <IconComponent
                              name="MoreHorizontal"
                              className="h-8 w-8 animate-pulse"
                            />
                          ) : (
                            <div className="w-full">
                              {editMessage ? (
                                <EditMessageField
                                  key={`edit-message-${chat.id}`}
                                  message={decodedMessage}
                                  onEdit={handleEditMessage}
                                  onCancel={() => setEditMessage(false)}
                                />
                              ) : (
                                <CustomMarkdownField
                                  isAudioMessage={isAudioMessage}
                                  chat={chat}
                                  isEmpty={isEmpty && !isStreaming}
                                  chatMessage={decodedMessage}
                                  editedFlag={editedFlag}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            {!editMessage && (
              <div className="invisible absolute -top-4 right-0 group-hover:visible">
                <EditMessageButton
                  onCopy={() => navigator.clipboard.writeText(chatMessage)}
                  onEdit={() => setEditMessage(true)}
                  className="h-fit group-hover:visible"
                  isBotMessage={true}
                  onEvaluate={handleEvaluateAnswer}
                  evaluation={chat.properties?.positive_feedback}
                  isAudioMessage={isAudioMessage}
                />
              </div>
            )}
          </div>
        </div>
        <div id={lastMessage ? "last-chat-message" : undefined} />
      </>
    );
  },
);
