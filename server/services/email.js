export async function sendEmail(userId, address, subject, text) {
  // В MVP — только логирование.
  // В продакшене: SMTP-шлюз (nodemailer)
  console.log(`[EMAIL] Mock send to user ${userId} <${address}>: "${subject}"`)
  return { success: true, channel: 'email', cost: 0 }
}
