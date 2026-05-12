<template>
  <div class="page-container">
    <!-- Summary Stats -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-icon income-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="19" x2="12" y2="5"/>
            <polyline points="5 12 12 5 19 12"/>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-label">总收入</div>
          <div class="stat-value income">¥{{ formatMoney(stats.totalIncome) }}</div>
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
          <div class="stat-label">总支出</div>
          <div class="stat-value expense">¥{{ formatMoney(stats.totalExpense) }}</div>
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
          <div class="stat-label">结余</div>
          <div class="stat-value balance">¥{{ formatMoney(stats.balance) }}</div>
        </div>
      </div>
    </div>

    <!-- Charts -->
    <div class="charts-grid">
      <div class="card chart-card">
        <div class="card-title">支出分类占比</div>
        <div ref="expensePieRef" class="chart-container"></div>
        <div v-if="categoryStats.length === 0" class="empty-state">
          <p>暂无支出数据</p>
        </div>
      </div>
      <div class="card chart-card">
        <div class="card-title">收入分类占比</div>
        <div ref="incomePieRef" class="chart-container"></div>
        <div v-if="incomeStats.length === 0" class="empty-state">
          <p>暂无收入数据</p>
        </div>
      </div>
    </div>

    <!-- Daily Trend -->
    <div class="card chart-card">
      <div class="card-title">每日收支趋势</div>
      <div ref="dailyLineRef" class="chart-container-wide"></div>
    </div>

    <!-- Category Detail -->
    <div class="card">
      <div class="card-title">分类明细</div>
      <div class="table-container">
        <table class="data-table" v-if="categoryStats.length > 0">
          <thead>
            <tr>
              <th>分类</th>
              <th>金额</th>
              <th>占比</th>
              <th>笔数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in categoryStats" :key="item.categoryId">
              <td>
                <div class="category-tag">
                  <span class="cat-dot" :style="{ background: item.categoryColor }"></span>
                  {{ item.categoryName }}
                </div>
              </td>
              <td class="text-expense">¥{{ formatMoney(item.totalAmount) }}</td>
              <td>
                <div class="percent-bar">
                  <div class="percent-fill" :style="{ width: item.percent + '%', background: item.categoryColor }"></div>
                </div>
                <span class="percent-text">{{ item.percent.toFixed(1) }}%</span>
              </td>
              <td>{{ item.billCount }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">
          <p>暂无分类数据</p>
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

const stats = ref({ totalIncome: 0, totalExpense: 0, balance: 0 })
const categoryStats = ref([])
const incomeStats = ref([])
const dailyStats = ref([])

const expensePieRef = ref(null)
const incomePieRef = ref(null)
const dailyLineRef = ref(null)
let expensePieChart = null
let incomePieChart = null
let dailyLineChart = null

function formatMoney(val) {
  return Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getParams() {
  const [year, month] = selectedMonth.value.split('-').map(Number)
  return { year, month }
}

async function loadStats() {
  try {
    const [monthRes, expenseRes, incomeRes] = await Promise.all([
      statisticsAPI.monthly(getParams()),
      statisticsAPI.category({ type: 'expense', year: getParams().year, month: getParams().month }),
      statisticsAPI.category({ type: 'income', year: getParams().year, month: getParams().month })
    ])

    const m = monthRes.data
    stats.value = {
      totalIncome: m.totalIncome || 0,
      totalExpense: m.totalExpense || 0,
      balance: m.balance || 0
    }
    categoryStats.value = m.categoryStats || []
    dailyStats.value = m.dailyStats || []
    incomeStats.value = incomeRes.data || []

    await nextTick()
    renderCharts()
  } catch (e) {}
}

function renderCharts() {
  renderPie(expensePieRef, expensePieChart, categoryStats.value, 'expense')
  renderPie(incomePieRef, incomePieChart, incomeStats.value, 'income')
  renderDailyLine()
}

function renderPie(refEl, chartInstance, data, type) {
  if (!refEl.value) return
  if (!chartInstance) {
    chartInstance = echarts.init(refEl.value)
  } else {
    chartInstance.clear()
    chartInstance = echarts.init(refEl.value)
  }
  if (!data || data.length === 0) {
    chartInstance.clear()
    return
  }
  chartInstance.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    legend: { orient: 'vertical', right: 20, top: 'center', textStyle: { fontSize: 12 } },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['35%', '50%'],
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
      data: data.map(item => ({
        name: item.categoryName,
        value: Number(item.totalAmount) || 0,
        itemStyle: { color: item.categoryColor || '#ccc' }
      }))
    }]
  }, true)

  if (type === 'expense') expensePieChart = chartInstance
  else incomePieChart = chartInstance
}

function renderDailyLine() {
  if (!dailyLineRef.value) return
  if (!dailyLineChart) {
    dailyLineChart = echarts.init(dailyLineRef.value)
  } else {
    dailyLineChart.clear()
    dailyLineChart = echarts.init(dailyLineRef.value)
  }
  const dates = dailyStats.value.map(d => d.date)
  const incomes = dailyStats.value.map(d => Number(d.income) || 0)
  const expenses = dailyStats.value.map(d => Number(d.expense) || 0)
  dailyLineChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '支出'], top: 10 },
    grid: { left: 60, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
    series: [
      { name: '收入', type: 'line', data: incomes, smooth: true, itemStyle: { color: '#10B981' }, areaStyle: { color: 'rgba(16,185,129,0.1)' } },
      { name: '支出', type: 'line', data: expenses, smooth: true, itemStyle: { color: '#EF4444' }, areaStyle: { color: 'rgba(239,68,68,0.1)' } }
    ]
  }, true)
}

function handleResize() {
  expensePieChart?.resize()
  incomePieChart?.resize()
  dailyLineChart?.resize()
}

watch(selectedMonth, loadStats, { immediate: true })
onMounted(() => {
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  expensePieChart?.dispose()
  incomePieChart?.dispose()
  dailyLineChart?.dispose()
})
</script>

<style scoped>
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
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

.chart-container-wide {
  width: 100%;
  height: 280px;
}

@media (max-width: 900px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

.category-tag {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.percent-bar {
  width: 120px;
  height: 6px;
  background: var(--bg);
  border-radius: 3px;
  display: inline-block;
  vertical-align: middle;
  overflow: hidden;
}

.percent-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.percent-text {
  margin-left: 8px;
  font-size: 13px;
  color: var(--text-secondary);
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

.income-icon { background: #D1FAE5; color: #059669; }
.expense-icon { background: #FEE2E2; color: #DC2626; }
.balance-icon { background: #EEF2FF; color: #4F46E5; }
.stat-info { flex: 1; }
</style>
