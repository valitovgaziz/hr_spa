<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSurveyStore } from '../stores/survey.js'

const router = useRouter()
const route = useRoute()
const store = useSurveyStore()

const props = defineProps({
  showToast: Function
})

const currentStep = ref(0)
const answers = reactive({})
const submitted = ref(false)
const visibleQuestions = ref([])

onMounted(async () => {
  try {
    await store.loadSurvey(route.params.id)
    if (!store.currentSurvey) {
      props.showToast?.('Опрос не найден', 'error')
      return router.push('/surveys')
    }
    computeVisible()
  } catch {
    props.showToast?.('Ошибка загрузки опроса', 'error')
    router.push('/surveys')
  }
})

function computeVisible() {
  const survey = store.currentSurvey
  if (!survey) return

  const result = []
  const seen = new Set()

  function walk(questionIds) {
    for (const qid of questionIds) {
      if (seen.has(qid)) continue
      seen.add(qid)
      const q = survey.questions.find(x => x.id === qid)
      if (!q) continue
      result.push(q)
      if (!q.branching || Object.keys(q.branching).length === 0) continue
      const answer = answers[qid]
      const target = q.branching[answer]
      if (target && target.length) {
        walk(target)
      }
    }
  }

  const firstIds = survey.questions.filter(q => {
    return !survey.questions.some(other => {
      if (!other.branching) return false
      return Object.values(other.branching).some(branchIds => branchIds && branchIds.includes(q.id))
    })
  }).map(q => q.id)

  walk(firstIds.length ? firstIds : survey.questions.map(q => q.id))
  visibleQuestions.value = result
}

function setAnswer(qid, value) {
  answers[qid] = value
  computeVisible()
}

function selectScale(qid, val) {
  setAnswer(qid, val)
}

function toggleMultiple(qid, option) {
  const current = answers[qid] || []
  if (current.includes(option)) {
    setAnswer(qid, current.filter(x => x !== option))
  } else {
    setAnswer(qid, [...current, option])
  }
}

function setSingle(qid, option) {
  setAnswer(qid, option)
}

const currentQ = computed(() => visibleQuestions.value[currentStep.value])
const totalSteps = computed(() => visibleQuestions.value.length)
const progress = computed(() => totalSteps.value ? ((currentStep.value + 1) / totalSteps.value) * 100 : 0)

function next() {
  if (currentStep.value < totalSteps.value - 1) {
    currentStep.value++
  }
}

function prev() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

async function finish() {
  try {
    await store.submitResponse(Number(route.params.id), { ...answers })
    submitted.value = true
    props.showToast?.('Спасибо, ответы сохранены!', 'success')
  } catch {
    props.showToast?.('Ошибка при сохранении', 'error')
  }
}

const isScale = (q) => q.type === 'scale'
const isENPS = (q) => q.type === 'scale' && q.scaleMin === 0 && q.scaleMax === 10
</script>

<template>
  <div v-if="submitted" style="text-align:center;padding:80px 20px;">
    <div style="font-size:64px;margin-bottom:20px;">✅</div>
    <h2 style="font-size:28px;margin-bottom:12px;">Спасибо!</h2>
    <p style="color:#6B7280;font-size:16px;">Ваши ответы успешно сохранены.</p>
    <button class="btn btn-primary" style="margin-top:24px;" @click="router.push('/surveys')">
      К списку опросов
    </button>
  </div>

  <div v-else-if="store.loading" style="text-align:center;padding:60px;">
    <div class="spinner" style="width:40px;height:40px;"></div>
  </div>

  <div v-else-if="store.currentSurvey">
    <div class="card" style="max-width:780px;margin:0 auto;">
      <div class="flex-between">
        <div>
          <strong style="font-size:18px;">📊 {{ store.currentSurvey.title }}</strong>
          <span class="badge" :class="store.currentSurvey.anonymous ? 'badge-green' : ''" style="margin-left:12px;">
            {{ store.currentSurvey.anonymous ? 'Анонимный' : 'Идентифицированный' }}
          </span>
        </div>
        <div style="font-size:13px;color:#6B7280;">⏳ до {{ store.currentSurvey.endDate }}</div>
      </div>

      <div v-if="store.currentSurvey.anonymous" class="alert alert-info" style="margin:16px 0;">
        🔒 <strong>Этот опрос анонимный.</strong> HR не увидит ваши ответы в привязке к личности.
      </div>
      <div v-else class="alert alert-warning" style="margin:16px 0;">
        🔓 <strong>Ваши ответы будут видны HR</strong> с указанием вашего имени.
      </div>

      <div class="progress-bar" style="margin-bottom:24px;">
        <div class="progress-fill" :style="{ width: progress + '%', background: '#2563EB' }"></div>
      </div>
      <div style="font-size:13px;color:#6B7280;text-align:right;margin-bottom:16px;">
        Вопрос {{ currentStep + 1 }} из {{ totalSteps }}
      </div>

      <div v-if="currentQ" style="min-height:200px;">
        <div style="font-weight:600;font-size:16px;margin-bottom:16px;">
          {{ currentQ.title }}
        </div>

        <!-- Scale -->
        <div v-if="isScale(currentQ)">
          <div v-if="isENPS(currentQ)" style="font-size:13px;color:#6B7280;margin-bottom:8px;">
            (0-6 — детракторы, 7-8 — нейтралы, 9-10 — промоутеры)
          </div>
          <div class="question-scale">
            <div v-for="n in (currentQ.scaleMax - currentQ.scaleMin + 1)" :key="n"
              :class="['scale-num', { selected: answers[currentQ.id] === n }]"
              @click="selectScale(currentQ.id, n)"
            >
              {{ currentQ.scaleMin + n - 1 }}
            </div>
          </div>
        </div>

        <!-- Single choice -->
        <div v-else-if="currentQ.type === 'single'">
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <div v-for="opt in currentQ.options" :key="opt"
              :class="['badge', { 'selected-badge': answers[currentQ.id] === opt }]"
              style="cursor:pointer;padding:10px 20px;font-size:14px;background:#F1F5F9;border-radius:40px;"
              :style="answers[currentQ.id] === opt ? 'background:#2563EB;color:white;' : ''"
              @click="setSingle(currentQ.id, opt)"
            >
              {{ opt }}
            </div>
          </div>
        </div>

        <!-- Multiple choice -->
        <div v-else-if="currentQ.type === 'multiple'">
          <div style="display:flex;flex-direction:column;gap:10px;">
            <label v-for="opt in currentQ.options" :key="opt" class="checkbox-label">
              <input type="checkbox"
                :checked="(answers[currentQ.id] || []).includes(opt)"
                @change="toggleMultiple(currentQ.id, opt)"
              />
              {{ opt }}
            </label>
          </div>
        </div>

        <!-- Text -->
        <div v-else-if="currentQ.type === 'text'">
          <textarea class="input" rows="4"
            :value="answers[currentQ.id] || ''"
            @input="setAnswer(currentQ.id, $event.target.value)"
            placeholder="Введите ваш ответ…"
          ></textarea>
        </div>

        <!-- Matrix -->
        <div v-else-if="currentQ.type === 'matrix'">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr>
                <th></th>
                <th v-for="col in currentQ.columns" :key="col" style="padding:8px;text-align:center;">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in currentQ.rows" :key="row">
                <td style="padding:8px;font-weight:500;">{{ row }}</td>
                <td v-for="col in currentQ.columns" :key="col" style="text-align:center;">
                  <input type="radio"
                    :name="'matrix-' + currentQ.id + '-' + row"
                    :checked="answers[currentQ.id + '-' + row] === col"
                    @change="setAnswer(currentQ.id + '-' + row, col)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Branching hint -->
        <div v-if="currentQ.branching && Object.keys(currentQ.branching).length" class="branch-note" style="margin-top:16px;">
          💡 На основе вашего ответа будут показаны соответствующие вопросы.
        </div>
      </div>

      <div style="display:flex;gap:16px;margin-top:32px;">
        <button class="btn btn-secondary" @click="prev" :disabled="currentStep === 0">◀ Назад</button>
        <div style="flex:1;"></div>
        <button v-if="currentStep < totalSteps - 1" class="btn btn-primary" @click="next">Далее →</button>
        <button v-else class="btn btn-primary" @click="finish" :disabled="store.submitting">
          <span v-if="store.submitting" class="spinner"></span>
          <span v-else>✅ Отправить ответы</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.selected-badge {
  background: #2563EB !important;
  color: white !important;
}
</style>
