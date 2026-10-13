import asyncio
from dataclasses import replace
from types import SimpleNamespace
from unittest.mock import AsyncMock

from heronsguide import telegram_bot as tg
from heronsguide.account import SampleAccountProvider
from heronsguide.config import get_settings
from heronsguide.pipeline import FALLBACK, ChatResult, Citation, Step


def test_only_listed_telegram_users_get_the_sample_student():
    settings = replace(get_settings(), telegram_demo_user_ids=frozenset({42}))
    accounts = SampleAccountProvider(settings.sample_account_path, settings.student_demo_token)
    assert tg.linked_account(42, settings, accounts) is accounts.record
    assert tg.linked_account(7, settings, accounts) is None
    assert tg.linked_account(None, settings, accounts) is None


def harness(bot=None, account=None, text="Where is the Registrar?"):
    progress = SimpleNamespace(edit_text=AsyncMock())
    message = SimpleNamespace(
        text=text, reply_text=AsyncMock(return_value=progress),
        chat=SimpleNamespace(send_action=AsyncMock()),
    )
    update = SimpleNamespace(message=message, effective_user=SimpleNamespace(id=42))
    context = SimpleNamespace(
        user_data={}, args=[],
        application=SimpleNamespace(bot_data={
            "heronsguide": bot, "account_for": lambda uid: account,
        }),
    )
    return update, context, progress


def buttons(markup):
    return [button.text for row in markup.keyboard for button in row]


def test_answers_hide_source_list_but_preserve_conflicts_and_exact_refusal():
    result = ChatResult(
        status="conflict", answer="Two different requirements are recorded.",
        citations=[Citation(id="Source01-s001", source="Source01", section="Scholarships")],
        conflict_note="Confirm the requirement with the office.",
    )
    reply = tg.format_reply(result)
    assert result.answer in reply and result.conflict_note in reply
    assert "conflict" in reply.lower()
    assert "Sources:" not in reply and "Source01" not in reply
    assert tg.format_reply(ChatResult(
        status="not_in_sources", answer=FALLBACK, citations=[],
    )) == FALLBACK


def test_start_and_help_show_suggestions_and_all_commands_without_resetting_history():
    update, context, _ = harness()
    context.user_data["history"] = [{"role": "user", "content": "previous"}]
    asyncio.run(tg.start(update, context))
    call = update.message.reply_text.call_args
    for command, _ in tg.COMMANDS:
        assert "/" + command in call.args[0]
    assert tg.STARTER_QUESTIONS[0] in buttons(call.kwargs["reply_markup"])
    assert context.user_data["history"][0]["content"] == "previous"


def test_new_resets_thread_and_suggestions_but_keeps_college():
    update, context, _ = harness()
    context.user_data.update(
        history=[{"role": "user", "content": "old"}],
        college="CCIS", follow_ups=["Old follow-up?"],
    )
    asyncio.run(tg.new(update, context))
    assert context.user_data["history"] == []
    assert context.user_data["college"] == "CCIS"
    assert "Old follow-up?" not in buttons(
        update.message.reply_text.call_args.kwargs["reply_markup"],
    )


def test_suggestions_restore_latest_replies_and_personal_starters_only_for_linked_users():
    update, context, _ = harness()
    context.user_data["follow_ups"] = ["Where is that office?"]
    asyncio.run(tg.suggestions(update, context))
    assert "Where is that office?" in buttons(
        update.message.reply_text.call_args.kwargs["reply_markup"],
    )
    settings = get_settings()
    provider = SampleAccountProvider(settings.sample_account_path, settings.student_demo_token)
    account = provider.record
    guest_update, guest_context, _ = harness()
    linked_update, linked_context, _ = harness(account=account)
    asyncio.run(tg.start(guest_update, guest_context))
    asyncio.run(tg.start(linked_update, linked_context))
    assert "What's due this week?" not in buttons(
        guest_update.message.reply_text.call_args.kwargs["reply_markup"],
    )
    assert "What's due this week?" in buttons(
        linked_update.message.reply_text.call_args.kwargs["reply_markup"],
    )


def test_college_switch_clears_old_context_and_invalid_code_preserves_it():
    update, context, _ = harness()
    old_history = [{"role": "user", "content": "previous"}]
    context.user_data.update(history=old_history.copy(), college="CCIS")
    context.args = ["not-a-college"]
    asyncio.run(tg.college(update, context))
    assert context.user_data["history"] == old_history
    context.args = ["CBA"]
    asyncio.run(tg.college(update, context))
    assert context.user_data["college"] == "CBA" and context.user_data["history"] == []


def test_startup_registers_commands_menu_and_pre_chat_description():
    bot = SimpleNamespace(
        set_my_commands=AsyncMock(), set_chat_menu_button=AsyncMock(),
        set_my_description=AsyncMock(), set_my_short_description=AsyncMock(),
    )
    asyncio.run(tg.configure_telegram(SimpleNamespace(bot=bot)))
    registered = bot.set_my_commands.call_args.args[0]
    assert [item.command for item in registered] == [code for code, _ in tg.COMMANDS]
    assert bot.set_chat_menu_button.call_args.kwargs["menu_button"].type == "commands"
    assert "/start" in bot.set_my_description.call_args.args[0]


def test_pipeline_progress_replies_history_and_scope_match_website(make_bot):
    bot, _ = make_bot()
    update, context, progress = harness(bot)
    context.user_data["college"] = "CCIS"
    asyncio.run(tg.ask(update, context))
    texts = [call.args[0] for call in progress.edit_text.call_args_list]
    assert any("Checked the message" in text for text in texts)
    assert "Wrote a friendly reply" in texts[-1]
    assert all("Source01" not in text and "Source02" not in text for text in texts)
    call = update.message.reply_text.call_args
    assert "85%" in call.args[0] and "Sources:" not in call.args[0]
    assert "What documents do I need?" in buttons(call.kwargs["reply_markup"])
    assert context.user_data["history"][-1]["content"] == "Sure! 85% and above GWA."


def test_progress_is_visible_before_generation_finishes():
    import threading

    visible = threading.Event()

    class WaitingBot:
        def ask(self, *args, on_step, **kwargs):
            on_step(Step(key="guard", label="Checked the message"))
            assert visible.wait(timeout=5), "Progress was withheld until the answer finished"
            return ChatResult(status="greeting", answer="Hello!", citations=[])

    update, context, progress = harness(WaitingBot())

    async def edit(text):
        visible.set()

    progress.edit_text.side_effect = edit
    asyncio.run(tg.ask(update, context))
    assert update.message.reply_text.call_args.args[0] == "Hello!"


def test_model_failure_ends_progress_and_keeps_history_unchanged():
    class FailingBot:
        def ask(self, *args, on_step, **kwargs):
            on_step(Step(key="guard", label="Checked the message"))
            raise RuntimeError("model unavailable")

    update, context, progress = harness(FailingBot())
    context.user_data["history"] = [{"role": "user", "content": "previous"}]
    asyncio.run(tg.ask(update, context))
    assert "unavailable" in update.message.reply_text.call_args.args[0]
    assert "unavailable" in progress.edit_text.call_args.args[0]
    assert context.user_data["history"] == [{"role": "user", "content": "previous"}]


def test_progress_delivery_failure_does_not_drop_answer(make_bot):
    from telegram.error import TimedOut

    bot, _ = make_bot()
    update, context, progress = harness(bot)
    progress.edit_text.side_effect = TimedOut()
    asyncio.run(tg.ask(update, context))
    assert "85%" in update.message.reply_text.call_args.args[0]


def test_long_unicode_answer_is_split_without_losing_text(make_bot):
    answer = "\U0001f600" * 5000
    bot, _ = make_bot(reply=answer + " 85% and above GWA.")
    update, context, _ = harness(bot)
    asyncio.run(tg.ask(update, context))
    answer_calls = update.message.reply_text.call_args_list[1:]
    assert len(answer_calls) >= 3
    assert "".join(call.args[0] for call in answer_calls) == answer + " 85% and above GWA."
    assert all(len(call.args[0].encode("utf-16-le")) // 2 <= 4096 for call in answer_calls)
    assert "reply_markup" in answer_calls[-1].kwargs


def test_refusal_restores_starters_without_changing_fallback(make_bot):
    from conftest import grounded

    bot, _ = make_bot(answer=grounded(status="not_in_sources", text="", citations=()))
    update, context, progress = harness(bot)
    asyncio.run(tg.ask(update, context))
    call = update.message.reply_text.call_args
    assert call.args[0] == FALLBACK
    assert tg.STARTER_QUESTIONS[0] in buttons(call.kwargs["reply_markup"])
    assert "Answer ready." in progress.edit_text.call_args.args[0]


def test_tapping_a_suggestion_uses_same_thread_and_history_is_bounded(make_bot):
    bot, stubs = make_bot()
    update, context, _ = harness(bot)
    context.user_data["history"] = [
        {"role": "user", "content": f"old turn {i}"} for i in range(20)
    ]
    asyncio.run(tg.ask(update, context))
    assert len(context.user_data["history"]) <= tg.MAX_HISTORY
    update.message.text = context.user_data["follow_ups"][0]
    asyncio.run(tg.ask(update, context))
    assert "Where is the Registrar?" in stubs.rewrite.prompts[-1]
    assert "85%" in stubs.rewrite.prompts[-1]
    assert context.user_data["history"][-2]["content"] == "What documents do I need?"


def test_linked_student_uses_the_same_records_as_website(make_bot):
    settings = get_settings()
    provider = SampleAccountProvider(settings.sample_account_path, settings.student_demo_token)
    bot, stubs = make_bot()
    update, context, _ = harness(bot, account=provider.record, text="What's due this week?")
    asyncio.run(tg.ask(update, context))
    assert "Account-" in stubs.answer.prompts[0]
    assert "What's due this week?" in context.user_data["history"][-2]["content"]


def startup_bot():
    return SimpleNamespace(
        set_my_commands=AsyncMock(), set_chat_menu_button=AsyncMock(),
        set_my_description=AsyncMock(), set_my_short_description=AsyncMock(),
    )


def test_menu_setup_recovers_from_temporary_timeout(monkeypatch):
    from telegram.error import TimedOut

    bot = startup_bot()
    bot.set_my_commands.side_effect = [TimedOut(), True]
    pause = AsyncMock()
    monkeypatch.setattr(tg.asyncio, "sleep", pause)
    asyncio.run(tg.configure_telegram(SimpleNamespace(bot=bot)))
    assert bot.set_my_commands.await_count == 2
    bot.set_my_short_description.assert_awaited_once()
    pause.assert_awaited_once()


def test_menu_setup_network_outage_does_not_abort_chat_startup(monkeypatch, caplog):
    from telegram.error import TimedOut

    bot = startup_bot()
    bot.set_my_commands.side_effect = TimedOut()
    monkeypatch.setattr(tg.asyncio, "sleep", AsyncMock())
    asyncio.run(tg.configure_telegram(SimpleNamespace(bot=bot)))
    assert bot.set_my_commands.await_count == 3
    assert "Chat will start" in caplog.text


def test_menu_setup_does_not_hide_invalid_configuration(monkeypatch):
    import pytest
    from telegram.error import BadRequest, InvalidToken

    for error in (BadRequest("invalid description"), InvalidToken()):
        bot = startup_bot()
        bot.set_my_commands.side_effect = error
        monkeypatch.setattr(tg.asyncio, "sleep", AsyncMock())
        with pytest.raises(type(error)):
            asyncio.run(tg.configure_telegram(SimpleNamespace(bot=bot)))
        bot.set_my_commands.assert_awaited_once()


def test_initialization_outage_has_bounded_retries_and_clear_error(monkeypatch):
    import pytest
    from telegram.error import TimedOut

    applications = []

    def fail_start(application, **options):
        applications.append(application)
        assert options["bootstrap_retries"] == 3
        assert application.bot.request.read_timeout == 30
        raise TimedOut()

    settings = replace(get_settings(), telegram_bot_token="123:test-token")
    monkeypatch.setattr(tg, "get_settings", lambda: settings)
    monkeypatch.setattr(tg, "build_bot", lambda: None)
    monkeypatch.setattr(tg.Application, "run_polling", fail_start)
    with pytest.raises(SystemExit, match="Could not reach Telegram"):
        tg.main()
    for application in applications:
        asyncio.run(application.bot.request.shutdown())
