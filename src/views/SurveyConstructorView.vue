<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSurveyStore } from '../stores/survey.js'

const router = useRouter()
const route = useRoute()
const store = useSurveyStore()
const isEdit = computed(() => route.name === 'SurveyEdit')

const props = defineProps({
  showToast: Function
})

const survey = ref({
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  anonymous: true,
  isCritical: false,
  targetRoles: ['employee'],
  status: 'draft',
  questions: []
})

const questionTypes = [
  { value: 'single', label: 'Одиночный выбор' },
  { value: 'multiple', label: 'Множественный выбор' },
  { value: 'scale', label: 'Шкала (NPS/eNPS)' },
  { value: 'text', label: 'Текстовый ответ' },
  { value: 'matrix', label: 'Матричный вопрос' }
]

const saving = ref(false)
const showBranchConfig = ref(null)

onMounted(async () => {
  if (isEdit.value) {
    try {
      await store.loadSurvey(route.params.id)
      if (store.currentSurvey) {
        survey.value = JSON.parse(JSON.stringify(store.currentSurvey))
      }
    } catch {
      props.showToast?.('Не удалось загрузить опрос', 'error')
      router.push('/hr/surveys')
    }
  }
  if (!survey.value.startDate) {
    const today = new Date()
    survey.value.startDate = today.toISOString().split('T')[0]
    const end = new Date(today)
    end.setDate(end.getDate() + 14)
    survey.value.endDate = end.toISOString().split('T')[0]
  }
})

function addQuestion() {
  survey.value.questions.push({
    id: Date.now(),
    type: 'single',
    title: '',
    required: true,
    options: ['Вариант 1'],
    branching: {}
  })
}

function removeQuestion(idx) {
  survey.value.questions.splice(idx, 1)
}

function addOption(question) {
  if (question.type === 'scale') return
  question.options.push('Вариант ' + (question.options.length + 1))
}

function removeOption(q, oi) {
  q.options.splice(oi, 1)
  if (q.branching) {
    delete q.branching[oi]
  }
}

function updateType(question) {
  if (question.type === 'scale') {
    question.scaleMin = 1
    question.scaleMax = 5
    delete question.options
    question.branching = {}
  } else if (question.type === 'text') {
    delete question.options
    delete question.scaleMin
    delete question.scaleMax
    question.branching = {}
  } else if (question.type === 'matrix') {
    question.rows = ['Строка 1']
    question.columns = ['1', '2', '3', '4', '5']
    delete question.options
    delete question.scaleMin
    delete question.scaleMax
    question.branching = {}
  } else {
    question.options = question.options || ['Вариант 1']
    delete question.scaleMin
    delete question.scaleMax
    delete question.rows
    delete question.columns
    question.branching = question.branching || {}
  }
}

function addMatrixRow(q) { q.rows.push('Строка ' + (q.rows.length + 1)) }
function removeMatrixRow(q, i) { q.rows.splice(i, 1) }
function addMatrixCol(q) { q.columns.push(String(q.columns.length + 1)) }
function removeMatrixCol(q, i) { q.columns.splice(i, 1) }

function setBranching(question) {
  showBranchConfig.value = question.id
}

function getBranchTargets(question) {
  if (question.type === 'scale') {
    const range = []
    for (let i = question.scaleMin; i <= question.scaleMax; i++) range.push(i)
    return range
  }
  return question.options || []
}

function getQuestionLabel(id) {
  const q = survey.value.questions.find(x => x.id === id)
  return q ? q.title.slice(0, 30) + (q.title.length > 30 ? '…' : '') : 'Вопрос ' + id
}

async function saveDraft() {
  saving.value = true
  try {
    if (isEdit.value) {
      await store.updateSurvey(route.params.id, survey.value)
    } else {
      survey.value.status = 'draft'
      await store.createSurvey(survey.value)
    }
    props.showToast?.('Черновик сохранён', 'success')
    router.push('/hr/surveys')
  } catch {
    props.showToast?.('Ошибка сохранения', 'error')
  } finally {
    saving.value = false
  }
}

async function publish() {
  saving.value = true
  try {
    let id = route.params.id
    if (!isEdit.value) {
      survey.value.status = 'draft'
      const result = await store.createSurvey(survey.value)
      id = result.id
    }
    await store.publishSurvey(Number(id))
    props.showToast?.('Опрос опубликован! Уведомления отправлены целевой аудитории.', 'success')
    router.push('/hr/surveys')
  } catch {
    props.showToast?.('Ошибка публикации', 'error')
  } finally {
    saving.value = false
  }
}

const availableBranchQuestions = computed(() => {
  return survey.value.questions.map((q, i) => ({ id: q.id, title: q.title || 'Вопрос ' + (i + 1), index: i }))
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">{{ isEdit ? '✏️ Редактирование опроса' : '🛠️ Новый опрос' }}</h1>
      <div style="display:flex;gap:12px;">
        <button class="btn btn-secondary" :disabled="saving" @click="saveDraft">💾 Черновик</button>
        <button class="btn btn-primary" :disabled="saving" @click="publish">🚀 Опубликовать</button>
      </div>
    </div>

    <div class="grid-2">
      <div class="card" style="flex:1.3;">
        <div style="margin-bottom:16px;">
          <label class="label">Название опроса *</label>
          <input class="input" v-model="survey.title" placeholder="Например: Pulse-опрос: апрель 2026" />
        </div>

        <div style="margin-bottom:16px;">
          <label class="label">Описание</label>
          <textarea class="input" v-model="survey.description" rows="2" placeholder="Краткое описание цели опроса" style="resize:vertical;"></textarea>
        </div>

        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;">
          <div>
            <label class="label">📅 Дата начала</label>
            <input class="input" type="date" v-model="survey.startDate" style="width:auto;" />
          </div>
          <div>
            <label class="label">📅 Дата окончания</label>
            <input class="input" type="date" v-model="survey.endDate" style="width:auto;" />
          </div>
        </div>

        <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:16px;">
          <div>
            <label class="label">🎭 Режим</label>
            <select class="select" v-model="survey.anonymous">
              <option :value="true">🔒 Анонимный</option>
              <option :value="false">🔓 Идентифицированный</option>
            </select>
          </div>
          <div>
            <label class="label">👥 Целевая аудитория</label>
            <select class="select" v-model="survey.targetRoles" multiple style="min-height:60px;">
              <option value="employee">Сотрудники</option>
              <option value="hr">HR</option>
              <option value="manager">Руководители</option>
            </select>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <input type="checkbox" id="criticalToggle" v-model="survey.isCritical" style="width:18px;height:18px;" />
            <label for="criticalToggle" style="font-weight:600;font-size:14px;cursor:pointer;">🔴 Критичный опрос</label>
          </div>
        </div>

        <div v-if="survey.anonymous" class="alert alert-info">
          🔒 Анонимный режим: ответы не привязываются к личности. HR увидит только список прошедших.
        </div>
        <div v-else class="alert alert-warning">
          🔓 Идентифицированный режим: ответы будут видны HR с указанием имени.
        </div>
        <div v-if="survey.isCritical" class="alert alert-danger" style="margin-top:8px;">
          🔴 Критичный опрос: уведомления будут доставлены принудительно по всем каналам, независимо от настроек сотрудников.
        </div>
      </div>

      <div class="card" style="flex:0.9;background:#FEFCF5;">
        <h3 style="font-weight:700;">🔒 Режимы конфиденциальности</h3>
        <table style="width:100%;font-size:13px;margin-top:12px;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #E2E8F0;">
            <th style="text-align:left;padding:8px 0;">Параметр</th>
            <th>Анонимный</th>
            <th>Идентифицир.</th>
          </tr>
          <tr><td style="padding:8px 0;">Кто видит ответы</td><td>✅ обезличено</td><td>HR видит + ФИО</td></tr>
          <tr><td style="padding:8px 0;">Охват</td><td>список прошедших</td><td>полная привязка</td></tr>
          <tr><td style="padding:8px 0;">Плашка</td><td>«Анонимно»</td><td>«С именем»</td></tr>
        </table>
      </div>
    </div>

    <div class="card" style="margin-top:28px;">
      <div class="flex-between">
        <h3>📝 Вопросы ({{ survey.questions.length }})</h3>
        <button class="btn btn-secondary" @click="addQuestion">➕ Добавить вопрос</button>
      </div>

      <div v-if="survey.questions.length === 0" class="empty-state" style="padding:40px;">
        <h3>Нет вопросов</h3>
        <p>Нажмите «Добавить вопрос», чтобы начать</p>
      </div>

      <div v-for="(q, qi) in survey.questions" :key="q.id" class="card" style="margin-top:16px;border:1px solid #E2E8F0;background:#FAFBFD;">
        <div class="flex-between">
          <strong>Вопрос {{ qi + 1 }}</strong>
          <button class="btn btn-danger" style="padding:4px 10px;font-size:12px;" @click="removeQuestion(qi)">✕ Удалить</button>
        </div>

        <div style="margin:12px 0;">
          <input class="input" v-model="q.title" placeholder="Текст вопроса" />
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
          <select class="select" v-model="q.type" @change="updateType(q)">
            <option v-for="t in questionTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
          <label class="checkbox-label">
            <input type="checkbox" v-model="q.required" /> Обязательный
          </label>
        </div>

        <div v-if="q.type === 'single' || q.type === 'multiple'">
          <label class="label">Варианты ответов:</label>
          <div v-for="(opt, oi) in q.options" :key="oi" style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
            <span style="font-size:13px;color:#6B7280;min-width:20px;">{{ oi + 1 }}.</span>
            <input class="input" v-model="q.options[oi]" style="flex:1;" />
            <button v-if="q.options.length > 1" class="btn btn-danger" style="padding:2px 8px;font-size:12px;" @click="removeOption(q, oi)">✕</button>
            <button class="btn btn-secondary" style="padding:2px 8px;font-size:12px;" @click="setBranching(q)">🧩 Ветвление</button>
          </div>
          <button class="btn btn-secondary" style="margin-top:6px;padding:6px 14px;font-size:13px;" @click="addOption(q)">+ Вариант</button>
        </div>

        <div v-if="q.type === 'scale'">
          <div style="display:flex;gap:16px;flex-wrap:wrap;">
            <div>
              <label class="label">От</label>
              <input class="input" type="number" v-model.number="q.scaleMin" style="width:80px;" />
            </div>
            <div>
              <label class="label">До</label>
              <input class="input" type="number" v-model.number="q.scaleMax" style="width:80px;" />
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
            <div v-for="n in (q.scaleMax - q.scaleMin + 1)" :key="n" class="scale-num" style="cursor:default;">
              {{ q.scaleMin + n - 1 }}
            </div>
          </div>
          <button class="btn btn-secondary" style="margin-top:8px;padding:4px 12px;font-size:12px;" @click="setBranching(q)">🧩 Ветвление по оценке</button>
        </div>

        <div v-if="q.type === 'matrix'">
          <div style="display:flex;gap:24px;flex-wrap:wrap;">
            <div>
              <label class="label">Строки:</label>
              <div v-for="(row, ri) in q.rows" :key="ri" style="display:flex;gap:6px;margin-bottom:4px;">
                <input class="input" v-model="q.rows[ri]" style="width:150px;" />
                <button v-if="q.rows.length > 1" class="btn btn-danger" style="padding:2px 8px;font-size:12px;" @click="removeMatrixRow(q, ri)">✕</button>
              </div>
              <button class="btn btn-secondary" style="padding:4px 10px;font-size:12px;margin-top:4px;" @click="addMatrixRow(q)">+ Строка</button>
            </div>
            <div>
              <label class="label">Колонки:</label>
              <div v-for="(col, ci) in q.columns" :key="ci" style="display:flex;gap:6px;margin-bottom:4px;">
                <input class="input" v-model="q.columns[ci]" style="width:80px;" />
                <button v-if="q.columns.length > 1" class="btn btn-danger" style="padding:2px 8px;font-size:12px;" @click="removeMatrixCol(q, ci)">✕</button>
              </div>
              <button class="btn btn-secondary" style="padding:4px 10px;font-size:12px;margin-top:4px;" @click="addMatrixCol(q)">+ Колонка</button>
            </div>
          </div>
        </div>

        <div v-if="q.type === 'text'" class="alert alert-info" style="margin-top:8px;">
          📝 Текстовый ответ (многострочный)
        </div>

        <!-- Branching config -->
        <div v-if="showBranchConfig === q.id" class="branch-note" style="margin-top:12px;">
          <div class="flex-between">
            <strong>🧩 Conditional Logic (ветвление)</strong>
            <button class="btn btn-secondary" style="padding:2px 10px;font-size:12px;" @click="showBranchConfig=null">✓ Готово</button>
          </div>
          <div style="margin-top:8px;font-size:13px;">
            <p v-if="Object.keys(q.branching || {}).length === 0" style="color:#6B7280;">
              Выберите варианты, на которые нужно настроить переход:
            </p>
            <div v-for="target in getBranchTargets(q)" :key="target" style="margin-top:8px;">
              <label style="font-weight:500;">Если ответ «{{ target }}» → показать:</label>
              <select class="select" style="margin-left:8px;width:auto;max-width:200px;"
                :value="(q.branching || {})[target] || ''"
                @change="(e) => { if (!q.branching) q.branching = {}; q.branching[target] = Number(e.target.value) || undefined }">
                <option value="">— следующий вопрос</option>
                <option v-for="bq in availableBranchQuestions" :key="bq.id" :value="bq.id">
                  Вопрос {{ bq.index + 1 }}: {{ bq.title || '…' }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
