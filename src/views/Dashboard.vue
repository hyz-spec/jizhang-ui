<template>
  <div class="page-container">
    <!-- Budget Alerts -->
    <div v-if="alerts.length > 0" class="alerts-bar">
      <div class="alerts-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        预算预警
      </div>
      <div class="alerts-list">
        <span
          v-for="alert in alerts"
          :key="alert.budgetId"
          class="alert-badge"
          :class="`alert-${alert.alertLevel}`"
        >
          {{ alert.categoryName }} {{ alert.usedPercent.toFixed(0) }}%
        </span>
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-icon income-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="19" x2="12" y2="5"/>
            <polyline points="5 12 12 5 19 12"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-label">本月收入</div>
          <div class="stat-value income">¥{{ formatMoney(totalIncome) }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon expense-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <polyline points="19 12 12 19 5 12"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-label">本月支出</div>
          <div class="stat-value expense">¥{{ formatMoney(totalExpense) }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon balance-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-label">本月结余</div>
          <div class="stat-value balance" :class="{ negative: balance < 0 }">
            ¥{{ formatMoney(balance) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Income Ranking -->
      <div class="card chart-card">
        <div class="card-title">收入分类占比</div>
        <div ref="incomePieRef" class="chart-container"></div>
        <div v-if="incomeRanking.length === 0" class="empty-state">
          <p>暂无收入数据</p>
        </div>
      </div>

    <!-- Recent Bills -->
    <div class="card">
      <div class="card-title">最近账单</div>
      <div v-if="recentBills.length === 0" class="empty-state">
        <p>暂无账单记录，<router-link to="/bills" style="color: var(--primary)">去添加一笔</router-link></p>
      </div>
      <div v-else class="bill-list">
        <div v-for="bill in recentBills" :key="bill.id" class="bill-item">
          <div class="bill-dot" :style="{ background: bill.categoryColor || '#ccc' }"></div>
          <div class="bill-info">
            <div class="bill-name">{{ bill.categoryName }}</div>
            <div class="bill-desc">{{ bill.description || '无备注' }} · {{ formatDate(bill.billDate) }}</div>
          </div>
          <div class="bill-amount" :class="bill.type === 'income' ? 'text-income' : 'text-expense'">
            {{ bill.type === 'income' ? '+' : '-' }}¥{{ formatMoney(bill.amount) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, inject, nextTick, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { statisticsAPI } from '../api/index.js'

const selectedMonth = inject('selectedMonth')

const totalIncome = ref(0)
const totalExpense = ref(0)
const balance = ref(0)
const expenseRanking = ref([])
const incomeRanking = ref([])
const recentBills = ref([])
const alerts = ref([])

const expensePieRef = ref(null)
const incomePieRef = ref(null)
let expensePieChart = null
let incomePieChart = null

function formatMoney(val) {
  const num = Number(val) || 0
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  return `${parts[1]}/${parts[2]}`
}

function getParams() {
  const [year, month] = selectedMonth.value.split('-').map(Number)
  return { year, month }
}

async function loadDashboard() {
  try {
    const res = await statisticsAPI.dashboard(getParams())
    const d = res.data
    totalIncome.value = d.totalIncome || 0
    totalExpense.value = d.totalExpense || 0
    balance.value = d.balance || 0
    expenseRanking.value = d.expenseRanking || []
    incomeRanking.value = d.incomeRanking || []
    recentBills.value = d.recentBills || []
    alerts.value = d.budgetAlerts || []
    await nextTick()
    renderExpensePie()
    renderIncomePie()
  } catch (e) {
    // error handled by interceptor
  }
}

function renderExpensePie() {
  if (!expensePieRef.value) return
  if (!expenseRanking.value || expenseRanking.value.length === 0) {
    if (expensePieChart) {
      expensePieChart.clear()
    }
    return
  }
  if (!expensePieChart) {
    expensePieChart = echarts.init(expensePieRef.value)
  }
  const data = expenseRanking.value.map(item => ({
    name: item.categoryName,
    value: Number(item.totalAmount) || 0,
    itemStyle: { color: item.categoryColor || '#ccc' }
  }))
  expensePieChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 20,
      top: 'center',
      textStyle: { fontSize: 12 }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: false,
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold' }
      },
      data
    }]
  }, true)
}

function renderIncomePie() {
  if (!incomePieRef.value) return
  if (!incomeRanking.value || incomeRanking.value.length === 0) {
    if (incomePieChart) {
      incomePieChart.clear()
    }
    return
  }
  if (!incomePieChart) {
    incomePieChart = echarts.init(incomePieRef.value)
  }
  const data = incomeRanking.value.map(item => ({
    name: item.categoryName,
    value: Number(item.totalAmount) || 0,
    itemStyle: { color: item.categoryColor || '#ccc' }
  }))
  incomePieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { orient: 'vertical', right: 20, top: 'center', textStyle: { fontSize: 12 } },
    series: [{
      type: 'pie', radius: ['40%', '70%'], center: ['35%', '50%'],
      avoidLabelOverlap: false, label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data
    }]
  }, true)
}

function handleResize() {
  expensePieChart?.resize()
  incomePieChart?.resize()
}

watch(selectedMonth, loadDashboard)

onMounted(() => {
  loadDashboard()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  expensePieChart?.dispose()
  incomePieChart?.dispose()
})
</script>

<style scoped>
.alerts-bar {
  background: #FEF3C7;
  border: 1px solid #FCD34D;
  border-radius: var(--radius);
  padding: 12px 16px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.alerts-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #92400E;
  white-space: nowrap;
}

.alerts-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.alert-badge {
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.alert-danger {
  background: #FEE2E2;
  color: #991B1B;
}

.alert-warning {
  background: #FEF3C7;
  color: #92400E;
}

.alert-info {
  background: #DBEAFE;
  color: #1E40AF;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.income-icon {
  background: #D1FAE5;
  color: #059669;
}

.expense-icon {
  background: #FEE2E2;
  color: #DC2626;
}

.balance-icon {
  background: #EEF2FF;
  color: #4F46E5;
}

.stat-info {
  flex: 1;
}

.stat-value.negative {
  color: var(--danger) !important;
}

.chart-card {
  min-height: 340px;
  display: flex;
  flex-direction: column;
}

.chart-container {
  flex: 1;
  min-height: 280px;
}

.bill-list {
  display: flex;
  flex-direction: column;
}

.bill-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.bill-item:last-child {
  border-bottom: none;
}

.bill-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.bill-info {
  flex: 1;
}

.bill-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.bill-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.bill-amount {
  font-size: 14px;
  font-weight: 600;
}
</style>
