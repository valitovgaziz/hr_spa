export async function sendTelegramMessage(userId, surveyId, title, surveyUrl) {
  // В MVP — только логирование.
  // В продакшене: Telegram Bot API → bot.sendMessage(chatId, text)
  console.log(`[TELEGRAM] Mock send to user ${userId}: "${title}" — ${surveyUrl}`)
  return { success: true, channel: 'telegram' }
}
