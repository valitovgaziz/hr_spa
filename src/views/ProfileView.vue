<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth.js'

const auth = useAuthStore()

const props = defineProps({
  showToast: Function
})

function handleSave() {
  props.showToast?.('Профиль обновлён', 'success')
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">👤 Профиль</h1>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3 style="margin-bottom:20px;">Личные данные</h3>

        <div style="margin-bottom:16px;">
          <label class="label">Имя</label>
          <input class="input" v-model="auth.user.name" />
        </div>

        <div style="margin-bottom:16px;">
          <label class="label">Телефон</label>
          <input class="input" :value="auth.user.phone" disabled style="opacity:0.6;" />
        </div>

        <div style="margin-bottom:16px;">
          <label class="label">Подразделение</label>
          <input class="input" v-model="auth.user.department" />
        </div>

        <div style="margin-bottom:16px;">
          <label class="label">Должность</label>
          <input class="input" v-model="auth.user.position" />
        </div>

        <button class="btn btn-primary" @click="handleSave">💾 Сохранить</button>
      </div>

      <div class="card">
        <h3 style="margin-bottom:20px;">Роль и доступ</h3>
        <div class="channel-row">
          <span>Роль</span>
          <span class="badge">{{ auth.roleLabel }}</span>
        </div>
        <div class="channel-row">
          <span>Статус</span>
          <span class="badge badge-green">✅ Активен</span>
        </div>
        <div class="channel-row">
          <span>Номер телефона</span>
          <span>{{ auth.user.phone }}</span>
        </div>
        <div class="alert alert-info" style="margin-top:16px;">
          🔐 Разделение ролей: HR может создавать и анализировать опросы. Сотрудник может только проходить назначенные опросы.
        </div>
      </div>
    </div>
  </div>
</template>
