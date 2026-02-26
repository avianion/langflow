import { useUpdateMessage } from "@/controllers/API/queries/messages";
import useAlertStore from "@/stores/alertStore";
import useFlowsManagerStore from "@/stores/flowsManagerStore";
import type { ChatMessageType } from "@/types/chat";
import { convertFiles } from "../utils/convert-files";

export function useMessageActions(
  chat: ChatMessageType,
  options: {
    sender: string;
    senderName: string;
    onEditSuccess?: (message: string) => void;
  },
) {
  const setErrorData = useAlertStore((state) => state.setErrorData);
  const flow_id = useFlowsManagerStore((state) => state.currentFlowId);
  const { mutate: updateMessageMutation } = useUpdateMessage();

  const handleEditMessage = (message: string) => {
    updateMessageMutation(
      {
        message: {
          id: chat.id,
          files: convertFiles(chat.files),
          sender_name: chat.sender_name ?? options.senderName,
          text: message,
          sender: options.sender,
          flow_id,
          session_id: chat.session ?? "",
        },
        refetch: true,
      },
      {
        onSuccess: () => {
          options.onEditSuccess?.(message);
        },
        onError: () => {
          setErrorData({
            title: "Error updating messages.",
          });
        },
      },
    );
  };

  const handleEvaluateAnswer = (evaluation: boolean | null) => {
    updateMessageMutation(
      {
        message: {
          ...chat,
          files: convertFiles(chat.files),
          sender_name: chat.sender_name ?? options.senderName,
          text: chat.message.toString(),
          sender: options.sender,
          flow_id,
          session_id: chat.session ?? "",
          properties: {
            ...chat.properties,
            positive_feedback: evaluation,
          },
        },
        refetch: true,
      },
      {
        onError: () => {
          setErrorData({
            title: "Error updating messages.",
          });
        },
      },
    );
  };

  return { handleEditMessage, handleEvaluateAnswer };
}
