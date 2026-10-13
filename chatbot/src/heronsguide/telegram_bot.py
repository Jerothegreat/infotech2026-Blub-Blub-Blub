"""Telegram channel: the website pipeline, live progress and suggested replies.

Demo users in TELEGRAM_DEMO_USER_IDS get the sample student's records.
Run: uv run python -m heronsguide.telegram_bot
"""

import asyncio
import logging

from telegram import BotCommand, MenuButtonCommands, ReplyKeyboardMarkup, Update
from telegram.error import BadRequest, NetworkError, TelegramError
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

from .account import SampleAccountProvider, StudentRecord
from .config import Settings, get_settings
from .kb import COLLEGES, normalize_college
from .pipeline import MAX_HISTORY, ChatResult, HeronsGuideBot, Step, build_bot

logger = logging.getLogger("heronsguide.telegram")

COMMANDS = (
    ("start", "Open the welcome and starter questions"),
    ("help", "Show how to chat and all commands"),
    ("new", "Start a fresh conversation"),
    ("suggestions", "Show suggested questions and replies"),
    ("college", "View or set your college: /college CCIS"),
    ("colleges", "List available college codes"),
    ("whoami", "Show your Telegram id and demo sign-in status"),
)
STARTER_QUESTIONS = (
    "What GWA do I need to apply for BS Computer Science?",
    "Who endorses the Varsity Player token fee exemption?",
    "Where is the Office of the University Registrar?",
)
ACCOUNT_QUESTIONS = (
    "What's due this week?",
    "What's the Google Meet link for ELEC4?",
    "How are my grades so far?",
)
WELCOME = (
    "Hi! I'm HeronsGuide, your UMak campus guide. Ask about scholarships, "
    "CCIS admission requirements, campus offices and building locations.\n\n"
    "I show progress as I check your question, look through the knowledge base, "
    "verify the answer and prepare a friendly reply. Tap a suggested question below "
    "or type your own. Follow-up replies stay in this conversation.\n\n"
    + "\n".join(f"/{code} - {description}" for code, description in COMMANDS)
    + "\n\n"
    "I'm a guide; confirm important details with your college or the office concerned."
)
DESCRIPTION = (
    "HeronsGuide helps with UMak scholarships, CCIS admission requirements, "
    "offices and campus locations using official documents. "
    "See answer progress, ask follow-up questions and choose your college. "
    "Press Start or send /start to open the chat and suggested questions."
)
UNAVAILABLE = "The assistant is unavailable right now. Please try again."
MESSAGE_LIMIT = 4000  # conservative UTF-16 bound, below Telegram's 4096-character limit


def linked_account(
    user_id: int | None, settings: Settings, accounts: SampleAccountProvider
) -> StudentRecord | None:
    """The sample student for allow-listed Telegram users; guests otherwise."""
    if user_id is None or user_id not in settings.telegram_demo_user_ids:
        return None
    return accounts.get(settings.student_demo_token)


def account_for(update: Update, context: ContextTypes.DEFAULT_TYPE) -> StudentRecord | None:
    user = update.effective_user
    return context.application.bot_data["account_for"](user.id if user else None)


def starter_questions(account: StudentRecord | None) -> list[str]:
    return (
        [ACCOUNT_QUESTIONS[0], *STARTER_QUESTIONS[:2]] if account else list(STARTER_QUESTIONS)
    )


def reply_keyboard(questions: list[str]) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        [[question] for question in questions] + [["/new", "/suggestions", "/help"]],
        resize_keyboard=True,
        is_persistent=True,
        input_field_placeholder="Ask HeronsGuide or tap a question",
    )


def reset_thread(context: ContextTypes.DEFAULT_TYPE) -> None:
    context.user_data["history"] = []
    context.user_data.pop("follow_ups", None)


def format_reply(result: ChatResult) -> str:
    """Keep the grounded answer and conflict warning, without a displayed source list."""
    if result.status in ("not_in_sources", "greeting", "invalid"):
        return result.answer
    parts = []
    if result.status == "conflict":
        parts.append("Warning: The sources conflict on this.")
    parts.append(result.answer)
    if result.conflict_note:
        parts.append(f"Note: {result.conflict_note}")
    return "\n\n".join(parts)


def message_chunks(text: str) -> list[str]:
    """Split without losing text, including characters using two UTF-16 code units."""
    chunks, start, units = [], 0, 0
    for index, character in enumerate(text):
        size = 2 if ord(character) > 0xFFFF else 1
        if units + size > MESSAGE_LIMIT:
            chunks.append(text[start:index])
            start, units = index, 0
        units += size
    if start < len(text):
        chunks.append(text[start:])
    return chunks


def format_progress(steps: list[Step], heading: str = "Preparing your answer...") -> str:
    lines = [heading]
    for step in steps:
        lines.append(f"- {step.label}")
        # Source filenames and section headings stay out of Telegram's progress display.
        if step.key == "rewrite" and step.detail:
            lines.append(f"  {step.detail[:1000]}")
    return "\n".join(lines)


async def edit_progress(message, text: str) -> None:
    if message is None:
        return
    try:
        await message.edit_text(text)
    except TelegramError:
        # A progress edit must never prevent delivery of the actual answer.
        logger.warning("Could not update Telegram progress")


async def typing(message) -> None:
    try:
        await message.chat.send_action("typing")
    except TelegramError:
        logger.warning("Could not update Telegram typing indicator")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    account = account_for(update, context)
    extra = (
        "\n\nYour linked demo also supports questions about classes, deadlines, grades "
        "and class Meet links."
        if account else ""
    )
    await update.message.reply_text(
        WELCOME + extra, reply_markup=reply_keyboard(starter_questions(account)),
    )


async def new(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    reset_thread(context)
    await update.message.reply_text(
        "New conversation started. What would you like to know?",
        reply_markup=reply_keyboard(starter_questions(account_for(update, context))),
    )


async def suggestions(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    questions = context.user_data.get("follow_ups") or starter_questions(
        account_for(update, context)
    )
    await update.message.reply_text(
        "Tap a suggested reply below, or type your own question.",
        reply_markup=reply_keyboard(questions),
    )


async def colleges(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    lines = [f"{code} - {name}" for code, name in COLLEGES.items()]
    await update.message.reply_text(
        "Colleges:\n" + "\n".join(lines)
        + "\n\nUse /college <code>, e.g. /college CCIS.",
    )


async def college(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    requested = context.args[0] if context.args else ""
    code = normalize_college(requested)
    if code is None:
        account = account_for(update, context)
        current = context.user_data.get("college") or (
            account.profile.college if account else "all colleges"
        )
        await update.message.reply_text(
            f"Current scope: {current}. Use /college <code>, e.g. /college CCIS. "
            "See /colleges.",
        )
        return
    context.user_data["college"] = code
    reset_thread(context)
    scope = f"{code} - {COLLEGES[code]}"
    await update.message.reply_text(
        f"Scope set to {scope}. A fresh conversation has started.",
        reply_markup=reply_keyboard(starter_questions(account_for(update, context))),
    )


async def whoami(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    linked = account_for(update, context)
    status = (
        f"Signed in as the sample student ({linked.profile.first_name} {linked.profile.last_name})."
        if linked
        else "Guest. Your own TBL Hub records are not linked to this Telegram account."
    )
    await update.message.reply_text(f"Your Telegram user id: {user.id if user else '?'}\n{status}")


async def ask(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    bot: HeronsGuideBot = context.application.bot_data["heronsguide"]
    account = account_for(update, context)
    question = (update.message.text or "").strip()[:1000]
    if not question:
        return
    history = context.user_data.setdefault("history", [])
    progress = None
    try:
        progress = await update.message.reply_text(format_progress([]))
    except TelegramError:
        logger.warning("Could not send Telegram progress")
    loop = asyncio.get_running_loop()
    events: asyncio.Queue[Step | None] = asyncio.Queue()

    async def generate() -> ChatResult:
        try:
            return await asyncio.to_thread(
                bot.ask, question, context.user_data.get("college"), "telegram",
                list(history), account,
                on_step=lambda step: loop.call_soon_threadsafe(events.put_nowait, step),
            )
        finally:
            events.put_nowait(None)

    task = asyncio.create_task(generate())
    steps: list[Step] = []
    edited, last_edit, last_typing = "", -10.0, -10.0
    try:
        while True:
            finished = False
            try:
                event = await asyncio.wait_for(events.get(), timeout=1)
                if event is None:
                    finished = True
                else:
                    steps.append(event)
            except TimeoutError:
                pass
            now = loop.time()
            if now - last_typing >= 4:
                await typing(update.message)
                last_typing = now
            text = format_progress(steps)
            if text != edited and (now - last_edit >= 1 or finished):
                await edit_progress(progress, text)
                edited, last_edit = text, now
            if finished:
                break
        result = await task
        await edit_progress(progress, format_progress(steps, "Answer ready."))
        follow_ups = list(dict.fromkeys(
            q.strip() for q in result.follow_ups if q.strip() and len(q.strip()) <= 1000
        ))[:3] or starter_questions(account)
        chunks = message_chunks(format_reply(result))
        for index, chunk in enumerate(chunks):
            options = (
                {"reply_markup": reply_keyboard(follow_ups)}
                if index == len(chunks) - 1 else {}
            )
            await update.message.reply_text(chunk, **options)
        context.user_data["follow_ups"] = follow_ups
        history += [
            {"role": "user", "content": question},
            {"role": "assistant", "content": result.answer},
        ]
        del history[:-MAX_HISTORY]
    except Exception:
        logger.exception("telegram ask failed")
        await edit_progress(progress, format_progress(steps, UNAVAILABLE))
        await update.message.reply_text(
            UNAVAILABLE, reply_markup=reply_keyboard(starter_questions(account)),
        )
    finally:
        if not task.done():
            task.cancel()
        # Retrieve any task exception even if a Telegram delivery failure interrupted the loop.
        await asyncio.gather(task, return_exceptions=True)


async def unknown_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text("Unknown command. Use /help or open Menu to see the commands.")


async def configure_telegram(application: Application) -> None:
    """Retry optional menu/profile setup without blocking chat on a network outage."""
    for attempt in range(3):
        try:
            await application.bot.set_my_commands([
                BotCommand(code, description) for code, description in COMMANDS
            ])
            await application.bot.set_chat_menu_button(menu_button=MenuButtonCommands())
            await application.bot.set_my_description(DESCRIPTION)
            await application.bot.set_my_short_description(
                "Your UMak guide: official answers, live progress and suggested replies.",
            )
            return
        except BadRequest:
            raise  # Invalid API arguments need a fix, not a network retry.
        except NetworkError:
            if attempt < 2:
                logger.warning("Telegram menu/profile setup timed out or lost connection; retrying")
                await asyncio.sleep(attempt + 1)
            else:
                logger.warning(
                    "Telegram menu/profile setup is unavailable. Chat will start; "
                    "restart the bot later to retry setup."
                )


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    logging.getLogger("httpx").setLevel(logging.WARNING)  # request URLs contain the bot token
    settings = get_settings()
    if not settings.telegram_bot_token:
        raise SystemExit("TELEGRAM_BOT_TOKEN is not set. Add it to chatbot/.env.")
    app = (
        Application.builder().token(settings.telegram_bot_token)
        .connect_timeout(15).read_timeout(30).write_timeout(30)
        .get_updates_connect_timeout(15).get_updates_read_timeout(30)
        .post_init(configure_telegram).build()
    )
    app.bot_data["heronsguide"] = build_bot()
    accounts = SampleAccountProvider(settings.sample_account_path, settings.student_demo_token)
    app.bot_data["account_for"] = lambda uid: linked_account(uid, settings, accounts)
    app.add_handler(CommandHandler(["start", "help"], start))
    app.add_handler(CommandHandler("new", new))
    app.add_handler(CommandHandler("suggestions", suggestions))
    app.add_handler(CommandHandler("colleges", colleges))
    app.add_handler(CommandHandler("college", college))
    app.add_handler(CommandHandler("whoami", whoami))
    app.add_handler(MessageHandler(filters.COMMAND, unknown_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, ask))
    try:
        app.run_polling(bootstrap_retries=3)
    except BadRequest:
        raise
    except NetworkError:
        raise SystemExit(
            "Could not reach Telegram after startup retries. Check access to "
            "https://api.telegram.org on your network, then rerun the bot."
        ) from None


if __name__ == "__main__":
    main()
