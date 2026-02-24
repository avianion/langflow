from __future__ import annotations

import threading
from typing import TYPE_CHECKING, Any

from langchain_core.callbacks import BaseCallbackHandler

if TYPE_CHECKING:
    from langchain_core.outputs import LLMResult


class TokenUsageCallbackHandler(BaseCallbackHandler):
    """Callback handler that accumulates token usage across LLM calls.

    Works for all providers through LangChain's unified callback system.
    Handles multiple token formats with fallbacks.
    """

    def __init__(self) -> None:
        super().__init__()
        self._total_input_tokens = 0
        self._total_output_tokens = 0
        self._has_data = False
        self._lock = threading.Lock()

    def on_llm_end(self, response: LLMResult, **kwargs: Any) -> None:  # noqa: ARG002
        """Extract and accumulate token usage from LLM response."""
        tokens = self._extract_from_llm_output(response)
        if tokens is None:
            tokens = self._extract_from_generations(response)
        if tokens is not None:
            with self._lock:
                self._total_input_tokens += tokens[0]
                self._total_output_tokens += tokens[1]
                self._has_data = True

    def get_token_usage(self) -> dict[str, int] | None:
        """Return accumulated token usage or None if no data was collected."""
        if not self._has_data:
            return None
        return {
            "input": self._total_input_tokens,
            "output": self._total_output_tokens,
            "total": self._total_input_tokens + self._total_output_tokens,
        }

    def _extract_from_llm_output(self, response: LLMResult) -> tuple[int, int] | None:
        """Strategy 1: Extract from response.llm_output['token_usage'] (legacy OpenAI)."""
        llm_output = response.llm_output
        if not isinstance(llm_output, dict):
            return None
        token_usage = llm_output.get("token_usage")
        if isinstance(token_usage, dict):
            prompt = token_usage.get("prompt_tokens", 0)
            completion = token_usage.get("completion_tokens", 0)
            if prompt or completion:
                return (prompt, completion)
        return None

    def _extract_from_generations(self, response: LLMResult) -> tuple[int, int] | None:
        """Extract tokens from individual generations using multiple fallback strategies.

        Note: Returns tokens from the first generation that contains token data.
        This is intentional for the typical n=1 case. For n>1 completions in a single
        LLMResult, only the first generation's tokens are captured. Multi-call
        accumulation (e.g. agents) is handled by repeated on_llm_end invocations.
        """
        if not response.generations:
            return None

        for generation_list in response.generations:
            for gen in generation_list:
                # Strategy 2: gen.message.usage_metadata (modern LangChain standard)
                result = self._try_usage_metadata(gen)
                if result is not None:
                    return result

                # Strategy 3: gen.message.response_metadata
                result = self._try_response_metadata(gen)
                if result is not None:
                    return result

                # Strategy 4: gen.generation_info
                result = self._try_generation_info(gen)
                if result is not None:
                    return result

        return None

    def _try_usage_metadata(self, gen: Any) -> tuple[int, int] | None:
        """Strategy 2: gen.message.usage_metadata (modern LangChain standard)."""
        message = getattr(gen, "message", None)
        if message is None:
            return None
        usage_metadata = getattr(message, "usage_metadata", None)
        if usage_metadata is None:
            return None

        if isinstance(usage_metadata, dict):
            input_tokens = usage_metadata.get("input_tokens", 0)
            output_tokens = usage_metadata.get("output_tokens", 0)
        elif hasattr(usage_metadata, "input_tokens") and hasattr(usage_metadata, "output_tokens"):
            input_tokens = usage_metadata.input_tokens or 0
            output_tokens = usage_metadata.output_tokens or 0
        else:
            return None

        if input_tokens or output_tokens:
            return (input_tokens, output_tokens)
        return None

    def _try_response_metadata(self, gen: Any) -> tuple[int, int] | None:
        """Strategy 3: gen.message.response_metadata['token_usage'] or ['usage']."""
        message = getattr(gen, "message", None)
        if message is None:
            return None
        response_metadata = getattr(message, "response_metadata", None)
        if not isinstance(response_metadata, dict):
            return None

        # OpenAI format: token_usage
        token_usage = response_metadata.get("token_usage")
        if isinstance(token_usage, dict):
            prompt = token_usage.get("prompt_tokens", 0)
            completion = token_usage.get("completion_tokens", 0)
            if prompt or completion:
                return (prompt, completion)

        # Anthropic format: usage
        usage = response_metadata.get("usage")
        if isinstance(usage, dict):
            input_tokens = usage.get("input_tokens", 0)
            output_tokens = usage.get("output_tokens", 0)
            if input_tokens or output_tokens:
                return (input_tokens, output_tokens)

        return None

    def _try_generation_info(self, gen: Any) -> tuple[int, int] | None:
        """Strategy 4: gen.generation_info['token_usage'] or ['usage']."""
        generation_info = getattr(gen, "generation_info", None)
        if not isinstance(generation_info, dict):
            return None

        # OpenAI format
        token_usage = generation_info.get("token_usage")
        if isinstance(token_usage, dict):
            prompt = token_usage.get("prompt_tokens", 0)
            completion = token_usage.get("completion_tokens", 0)
            if prompt or completion:
                return (prompt, completion)

        # Anthropic format
        usage = generation_info.get("usage")
        if isinstance(usage, dict):
            input_tokens = usage.get("input_tokens", 0)
            output_tokens = usage.get("output_tokens", 0)
            if input_tokens or output_tokens:
                return (input_tokens, output_tokens)

        return None
