<template>
  <div class="page-container">
    <div class="page-header">
      <div></div>
      <button class="btn btn-primary" @click="openAddDialog">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        添加预算
      </button>
    </div>

    <!-- Period Tabs -->
    <div class="period-tabs">
      <button class="period-tab" :class="{ active: period === 'monthly' }" @click="period = 'monthly'; loadBudgets()">月度预算</button>
      <button class="period-tab" :class="{ active: period === 'yearly' }" @click="period = 'yearly'; loadBudgets()">年度预算</button>
    </div>

    <!-- Budget Cards -->
    <div v-if="budgets.length > 0" class="budget-grid">
      <div v-for="budget in budgets" :key="budget.id" class="budget-card" :class="getBudgetLevel(budget.usedPercent)">
        <div class="budget-header">
          <div class="budget-cat">
            <span class="cat-dot" :style="{ background: budget.categoryColor || '#ccc' }"></span>
            {{ budget.categoryName }}
          </div>
          <div class="budget-actions">
            <button class="btn btn-ghost btn-sm" @click="openEditDialog(budget)">编辑</button>
            <button class="btn btn-danger btn-sm" @click="deleteBudget(budget.id)">删除</button>
          </div>
        </div>
        <div class="budget-amounts">
          <span class="budget-spent">已花费 ¥{{ formatMoney(budget.spentAmount) }}</span>
          <span class="budget-total">/ ¥{{ formatMoney(budget.amount) }}</span>
        </div>
        <div class="budget-progress-wrap">
          <div class="budget-progress-bar">
            <div class="budget-progress-fill"
              :style="{ width: Math.min(budget.usedPercent, 100) + '%', background: getProgressColor(budget.usedPercent) }">
            </div>
          </div>
          <span class="budget-percent" :class="getBudgetLevel(budget.usedPercent)">
            {{ budget.usedPercent.toFixed(1) }}%
          </span>
        </div>
        <div class="budget-meta">
          <span>预警线: {{ budget.alertPercent }}%</span>
          <span>{{ period === 'monthly' ? '月度' : '年度' }}预算</span>
        </div>
      </div>
    </div>

    <div v-else class="card empty-state">
      <p>暂无预算记录，<button class="inline-link" @click="openAddDialog">去添加</button></p>
    </div>

    <!-- Dialog -->
    <div v-if="dialogVisible" class="dialog-overlay" @click.self="dialogVisible = false">
      <div class="dialog">
        <div class="dialog-header">
          <h3>{{ editingBudget ? '编辑预算' : '添加预算' }}</h3>
          <button class="dialog-close" @click="dialogVisible = false">&times;</button>
        </div>
        <form @submit.prevent="submitBudget" class="dialog-body">
          <div class="form-group">
            <label class="form-label">分类 *</label>
            <select v-model="formData.categoryId" class="input-field" required>
              <option value="">请选择分类</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">预算金额 *</label>
            <input v-model.number="formData.amount" type="number" step="0.01" min="0.01" class="input-field" placeholder="请输入预算金额" required />
          </div>
          <div class="form-group">
            <label class="form-label">预警比例 (%) *</label>
            <input v-model.number="formData.alertPercent" type="number" min="10" max="100" class="input-field" placeholder="如: 80 表示花费80%时预警" required />
            <small style="color: var(--text-secondary); font-size: 12px; margin-top: 4px; display: block">超过此比例时发出预警提示</small>
          </div>
          <div class="dialog-footer">
            <button type="button" class="btn btn-ghost" @click="dialogVisible = false">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { budgetAPI, categoryAPI } from '../api/index.js'

const selectedMonth = inject('selectedMonth')

const budgets = ref([])
const categories = ref([])
const dialogVisible = ref(false)
const editingBudget = ref(null)
const submitting = ref(false)
const period = ref('monthly')

const formData = ref({
  categoryId: '',
  amount: null,
  alertPercent: 80,
  period: 'monthly'
})

function formatMoney(val) {
  return Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getParams() {
  const [year, month] = selectedMonth.value.split('-').map(Number)
  return { period: period.value, year, month: period.value === 'monthly' ? month : undefined }
}

async function loadCategories() {
  try {
    const res = await categoryAPI.list({ type: 'expense' })
    categories.value = res.data || []
  } catch (e) {}
}

async function loadBudgets() {
  try {
    const res = await budgetAPI.list(getParams())
    budgets.value = res.data || []
  } catch (e) {}
}

function openAddDialog() {
  editingBudget.value = null
  const [year, month] = selectedMonth.value.split('-').map(Number)
  formData.value = {
    categoryId: '',
    amount: null,
    alertPercent: 80,
    period: period.value,
    year,
    month: period.value === 'monthly' ? month : undefined
  }
  dialogVisible.value = true
}

function openEditDialog(budget) {
  editingBudget.value = budget
  const [year, month] = selectedMonth.value.split('-').map(Number)
  formData.value = {
    categoryId: budget.categoryId,
    amount: Number(budget.amount),
    alertPercent: budget.alertPercent,
    period: period.value,
    year,
    month: period.value === 'monthly' ? month : undefined
  }
  dialogVisible.value = true
}

async function submitBudget() {
  submitting.value = true
  try {
    const data = { ...formData.value }
    if (editingBudget.value) {
      data.id = editingBudget.value.id
      await budgetAPI.update(data)
      ElMessage.success('更新成功')
    } else {
      await budgetAPI.create(data)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    loadBudgets()
  } catch (e) {} finally {
    submitting.value = false
  }
}

async function deleteBudget(id) {
  try {
    await ElMessageBox.confirm('确定要删除这个预算吗？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    await budgetAPI.delete(id)
    ElMessage.success('删除成功')
    loadBudgets()
  } catch (e) {}
}

function getBudgetLevel(percent) {
  if (percent >= 100) return 'danger'
  if (percent >= 80) return 'warning'
  return 'normal'
}

function getProgressColor(percent) {
  if (percent >= 100) return '#EF4444'
  if (percent >= 80) return '#F59E0B'
  return '#10B981'
}

onMounted(() => {
  loadCategories()
  loadBudgets()
})
</script>

<style scoped>
.period-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.period-tab {
  padding: 8px 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.period-tab.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.budget-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.budget-card {
  background: #fff;
  border-radius: var(--radius);
  padding: 20px;
  box-shadow: var(--shadow);
  border-left: 4px solid var(--success);
}

.budget-card.warning {
  border-left-color: var(--warning);
}

.budget-card.danger {
  border-left-color: var(--danger);
}

.budget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.budget-cat {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.cat-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.budget-actions {
  display: flex;
  gap: 4px;
}

.budget-amounts {
  margin-bottom: 12px;
}

.budget-spent {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.budget-total {
  font-size: 14px;
  color: var(--text-secondary);
}

.budget-progress-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.budget-progress-bar {
  flex: 1;
  height: 10px;
  background: var(--bg);
  border-radius: 5px;
  overflow: hidden;
}

.budget-progress-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.3s;
}

.budget-percent {
  font-size: 14px;
  font-weight: 600;
  min-width: 50px;
  text-align: right;
}

.budget-percent.normal { color: var(--success); }
.budget-percent.warning { color: var(--warning); }
.budget-percent.danger { color: var(--danger); }

.budget-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
}

.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.dialog {
  background: #fff;
  border-radius: var(--radius);
  width: 100%;
  max-width: 460px;
  box-shadow: var(--shadow-lg);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.dialog-header h3 {
  font-size: 16px;
  font-weight: 600;
}

.dialog-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-secondary);
  line-height: 1;
}

.dialog-body {
  padding: 24px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.inline-link {
  background: none;
  border: none;
  color: var(--primary);
  cursor: pointer;
  font-size: inherit;
  padding: 0;
}
</style>
