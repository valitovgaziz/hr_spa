<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const auth = useAuthStore()
const agreed = ref(false)
const submitting = ref(false)

async function accept() {
  if (!agreed.value) return
  submitting.value = true
  try {
    await auth.giveConsent()
    router.push(auth.isHR ? '/hr/dashboard' : '/surveys')
  } catch {
    alert('Ошибка при сохранении согласия. Попробуйте снова.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div style="max-width:720px;margin:40px auto;padding:0 16px;">
    <div class="card" style="padding:32px;">
      <h2 style="margin-bottom:8px;">🔐 Согласие на обработку персональных данных</h2>
      <p style="color:#6B7280;font-size:14px;margin-bottom:24px;">
        В соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных»
      </p>

      <div style="font-size:14px;line-height:1.7;color:#334155;">
        <p>Нажимая «Принять», я даю своё согласие <strong>ООО «Пульс HR»</strong> (далее — Оператор) на обработку следующих персональных данных:</p>
        <ul style="padding-left:20px;margin:12px 0;">
          <li>фамилия, имя, отчество;</li>
          <li>номер контактного телефона;</li>
          <li>адрес электронной почты;</li>
          <li>наименование подразделения и должность;</li>
          <li>результаты прохождения опросов.</li>
        </ul>

        <p><strong>Цели обработки:</strong></p>
        <ul style="padding-left:20px;margin:12px 0;">
          <li>проведение анонимных опросов удовлетворённости сотрудников;</li>
          <li>расчёт показателя eNPS и иных HR-метрик;</li>
          <li>направление уведомлений о новых опросах и напоминаний;</li>
          <li>улучшение внутренних коммуникаций и корпоративной культуры.</li>
        </ul>

        <p><strong>Действия с данными:</strong> сбор, запись, систематизация, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передача (предоставление доступа), обезличивание, блокирование, удаление, уничтожение.</p>

        <p><strong>Срок действия согласия:</strong> на весь период работы в компании плюс 5 лет после увольнения.</p>

        <p>Согласие может быть отозвано в любой момент путём направления письменного уведомления на адрес Оператора или через HR-отдел.</p>

        <p style="color:#6B7280;font-size:13px;margin-top:16px;">
          Персональные данные обрабатываются с использованием автоматизированных средств. Оператор принимает необходимые правовые, организационные и технические меры для защиты данных от неправомерного доступа, уничтожения, изменения, блокирования, копирования, распространения.
        </p>
      </div>

      <label style="display:flex;align-items:flex-start;gap:10px;margin-top:24px;padding:16px;background:#F1F5F9;border-radius:12px;cursor:pointer;">
        <input type="checkbox" v-model="agreed" style="margin-top:3px;width:18px;height:18px;" />
        <span style="font-size:14px;color:#334155;">
          Я ознакомлен(а) и принимаю условия обработки персональных данных в соответствии с 152-ФЗ
        </span>
      </label>

      <div style="display:flex;gap:12px;margin-top:24px;">
        <button class="btn btn-primary" :disabled="!agreed || submitting" @click="accept" style="flex:1;">
          {{ submitting ? 'Сохранение…' : '✅ Принять' }}
        </button>
        <button class="btn btn-secondary" @click="auth.logout(); router.push('/login')" style="flex:1;">
          Отказаться и выйти
        </button>
      </div>
    </div>
  </div>
</template>
