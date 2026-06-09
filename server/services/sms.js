export async function sendSms(phone, text) {
  // В MVP — только логирование.
  // В продакшене: HTTP API SMS-провайдера (МТС, SMSC.ru и т.п.)
  console.log(`[SMS] Mock send to ${phone}: "${text}"`)
  return { success: true, channel: 'sms', cost: 0.5 }
}
