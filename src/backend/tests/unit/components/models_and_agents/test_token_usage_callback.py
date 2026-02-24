from unittest.mock import MagicMock

import pytest
from langchain_core.messages import AIMessage
from langchain_core.outputs import ChatGeneration, Generation, LLMResult
from lfx.base.callback import TokenUsageCallbackHandler


@pytest.fixture
def handler():
    return TokenUsageCallbackHandler()


def _make_chat_gen(
    *,
    usage_metadata=None,
    response_metadata=None,
) -> ChatGeneration:
    """Create a ChatGeneration with a real AIMessage and custom metadata."""
    # AIMessage requires total_tokens in usage_metadata dict
    if isinstance(usage_metadata, dict) and "total_tokens" not in usage_metadata:
        usage_metadata = {
            **usage_metadata,
            "total_tokens": usage_metadata.get("input_tokens", 0) + usage_metadata.get("output_tokens", 0),
        }
    msg = AIMessage(
        content="test",
        usage_metadata=usage_metadata,
        response_metadata=response_metadata or {},
    )
    return ChatGeneration(message=msg)


class TestLegacyLLMOutput:
    """Strategy 1: response.llm_output['token_usage'] (legacy OpenAI format)."""

    def test_legacy_openai_format(self, handler):
        response = LLMResult(
            generations=[[]],
            llm_output={
                "token_usage": {
                    "prompt_tokens": 10,
                    "completion_tokens": 20,
                    "total_tokens": 30,
                }
            },
        )
        handler.on_llm_end(response)
        result = handler.get_token_usage()
        assert result == {"input": 10, "output": 20, "total": 30}

    def test_legacy_format_takes_priority_over_generation(self, handler):
        """llm_output should be checked first, before generation-level strategies."""
        gen = _make_chat_gen(usage_metadata={"input_tokens": 99, "output_tokens": 99})

        response = LLMResult(
            generations=[[gen]],
            llm_output={
                "token_usage": {
                    "prompt_tokens": 10,
                    "completion_tokens": 20,
                }
            },
        )
        handler.on_llm_end(response)
        result = handler.get_token_usage()
        assert result == {"input": 10, "output": 20, "total": 30}


class TestUsageMetadata:
    """Strategy 2: gen.message.usage_metadata (modern LangChain standard)."""

    def test_dict_format(self, handler):
        gen = _make_chat_gen(usage_metadata={"input_tokens": 15, "output_tokens": 25})

        response = LLMResult(generations=[[gen]])
        handler.on_llm_end(response)
        result = handler.get_token_usage()
        assert result == {"input": 15, "output": 25, "total": 40}

    def test_object_format(self, handler):
        usage_meta = MagicMock()
        usage_meta.input_tokens = 100
        usage_meta.output_tokens = 200

        gen = _make_chat_gen()
        # Override usage_metadata with a mock object after creation
        gen.message.usage_metadata = usage_meta

        response = LLMResult(generations=[[gen]])
        handler.on_llm_end(response)
        result = handler.get_token_usage()
        assert result == {"input": 100, "output": 200, "total": 300}


class TestResponseMetadata:
    """Strategy 3: gen.message.response_metadata (provider-specific)."""

    def test_openai_token_usage(self, handler):
        gen = _make_chat_gen(
            response_metadata={
                "token_usage": {
                    "prompt_tokens": 50,
                    "completion_tokens": 60,
                }
            }
        )

        response = LLMResult(generations=[[gen]])
        handler.on_llm_end(response)
        result = handler.get_token_usage()
        assert result == {"input": 50, "output": 60, "total": 110}

    def test_anthropic_usage(self, handler):
        gen = _make_chat_gen(
            response_metadata={
                "usage": {
                    "input_tokens": 30,
                    "output_tokens": 40,
                }
            }
        )

        response = LLMResult(generations=[[gen]])
        handler.on_llm_end(response)
        result = handler.get_token_usage()
        assert result == {"input": 30, "output": 40, "total": 70}


class TestGenerationInfo:
    """Strategy 4: gen.generation_info (fallback)."""

    def test_openai_format(self, handler):
        gen = Generation(
            text="hello",
            generation_info={
                "token_usage": {
                    "prompt_tokens": 5,
                    "completion_tokens": 10,
                }
            },
        )

        response = LLMResult(generations=[[gen]])
        handler.on_llm_end(response)
        result = handler.get_token_usage()
        assert result == {"input": 5, "output": 10, "total": 15}

    def test_anthropic_format(self, handler):
        gen = Generation(
            text="hello",
            generation_info={
                "usage": {
                    "input_tokens": 8,
                    "output_tokens": 12,
                }
            },
        )

        response = LLMResult(generations=[[gen]])
        handler.on_llm_end(response)
        result = handler.get_token_usage()
        assert result == {"input": 8, "output": 12, "total": 20}


class TestAccumulation:
    """Test token accumulation across multiple LLM calls (agents)."""

    def test_accumulates_across_calls(self, handler):
        response1 = LLMResult(
            generations=[[]],
            llm_output={"token_usage": {"prompt_tokens": 10, "completion_tokens": 20}},
        )
        handler.on_llm_end(response1)

        response2 = LLMResult(
            generations=[[]],
            llm_output={"token_usage": {"prompt_tokens": 30, "completion_tokens": 40}},
        )
        handler.on_llm_end(response2)

        result = handler.get_token_usage()
        assert result == {"input": 40, "output": 60, "total": 100}

    def test_accumulates_three_calls(self, handler):
        for i in range(3):
            response = LLMResult(
                generations=[[]],
                llm_output={"token_usage": {"prompt_tokens": 10 * (i + 1), "completion_tokens": 5 * (i + 1)}},
            )
            handler.on_llm_end(response)

        result = handler.get_token_usage()
        # input: 10+20+30=60, output: 5+10+15=30
        assert result == {"input": 60, "output": 30, "total": 90}


class TestNoData:
    """Test that None is returned when no token data is available."""

    def test_returns_none_initially(self, handler):
        assert handler.get_token_usage() is None

    def test_returns_none_with_empty_response(self, handler):
        response = LLMResult(generations=[[]])
        handler.on_llm_end(response)
        assert handler.get_token_usage() is None

    def test_returns_none_with_no_token_fields(self, handler):
        gen = _make_chat_gen()

        response = LLMResult(generations=[[gen]])
        handler.on_llm_end(response)
        assert handler.get_token_usage() is None

    def test_returns_none_with_zero_tokens(self, handler):
        gen = _make_chat_gen(usage_metadata={"input_tokens": 0, "output_tokens": 0})

        response = LLMResult(generations=[[gen]])
        handler.on_llm_end(response)
        assert handler.get_token_usage() is None


class TestEdgeCases:
    """Test edge cases: malformed values, mixed strategies, thread safety."""

    def test_malformed_none_token_values_in_llm_output(self, handler):
        """Token values that are None should be treated as 0 via .get() defaults."""
        response = LLMResult(
            generations=[[]],
            llm_output={
                "token_usage": {
                    # Missing prompt_tokens and completion_tokens entirely
                }
            },
        )
        handler.on_llm_end(response)
        assert handler.get_token_usage() is None

    def test_llm_output_without_token_usage_key(self, handler):
        """llm_output dict without 'token_usage' key should be gracefully ignored."""
        response = LLMResult(
            generations=[[]],
            llm_output={"model_name": "gpt-4", "some_other_key": 42},
        )
        handler.on_llm_end(response)
        assert handler.get_token_usage() is None

    def test_mixed_strategies_across_calls(self, handler):
        """Accumulates correctly when call 1 uses OpenAI format and call 2 uses Anthropic format."""
        # Call 1: legacy OpenAI format via llm_output
        response1 = LLMResult(
            generations=[[]],
            llm_output={"token_usage": {"prompt_tokens": 10, "completion_tokens": 20}},
        )
        handler.on_llm_end(response1)

        # Call 2: Anthropic format via response_metadata
        gen = _make_chat_gen(response_metadata={"usage": {"input_tokens": 30, "output_tokens": 40}})
        response2 = LLMResult(generations=[[gen]])
        handler.on_llm_end(response2)

        result = handler.get_token_usage()
        assert result == {"input": 40, "output": 60, "total": 100}

    def test_empty_generations_list(self, handler):
        """Empty generations list should not crash."""
        response = LLMResult(generations=[])
        handler.on_llm_end(response)
        assert handler.get_token_usage() is None

    def test_generation_with_no_message(self, handler):
        """Plain Generation objects without message attribute fall through to generation_info."""
        gen = Generation(text="hello")
        response = LLMResult(generations=[[gen]])
        handler.on_llm_end(response)
        assert handler.get_token_usage() is None

    def test_thread_safety_with_lock(self, handler):
        """Verify the handler has a lock attribute for thread safety."""
        import threading

        assert hasattr(handler, "_lock")
        assert isinstance(handler._lock, type(threading.Lock()))
