<template>
  <div class="page-container">
    <div class="page-header">
      <div></div>
      <button class="btn btn-primary" @click="openAddDialog">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        添加账单
      </button>
    </div>

    <!-- Filters -->
    <div class="card filter-card">
      <div class="filter-row">
        <div class="filter-group">
          <label class="form-label">类型</label>
          <select v-model="filters.type" class="input-field filter-select" @change="loadBills">
            <option value="">全部</option>
            <option value="income">收入</option>
            <option value="expense">支出</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="form-label">分类</label>
          <select v-model="filters.categoryId" class="input-field filter-select" @change="loadBills">
            <option value="">全部分类</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label class="form-label">开始日期</label>
          <input v-model="filters.startDate" type="date" class="input-field" @change="loadBills" />
        </div>
        <div class="filter-group">
          <label class="form-label">结束日期</label>
          <input v-model="filters.endDate" type="date" class="input-field" @change="loadBills" />
        </div>
        <button class="btn btn-ghost btn-sm" @click="resetFilters">重置</button>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <div class="table-container">
        <table class="data-table" v-if="bills.length > 0">
          <thead>
            <tr>
              <th>日期</th>
              <th>分类</th>
              <th>金额</th>
              <th>类型</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="bill in bills" :key="bill.id">
              <td>{{ bill.billDate }}</td>
              <td>
                <div class="category-tag">
                  <span class="cat-dot" :style="{ background: bill.categoryColor }"></span>
                  {{ bill.categoryName }}
                </div>
              </td>
              <td :class="bill.type === 'income' ? 'text-income' : 'text-expense'">
                {{ bill.type === 'income' ? '+' : '-' }}¥{{ formatMoney(bill.amount) }}
              </td>
              <td>
                <span class="tag" :class="bill.type === 'income' ? 'tag-income' : 'tag-expense'">
                  {{ bill.type === 'income' ? '收入' : '支出' }}
                </span>
              </td>
              <td class="desc-cell">{{ bill.description || '-' }}</td>
              <td>
                <button class="btn btn-ghost btn-sm" @click="openEditDialog(bill)">编辑</button>
                <button class="btn btn-danger btn-sm" style="margin-left:4px" @click="deleteBill(bill.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">
          <p>暂无账单记录</p>
        </div>
      </div>
    </div>

    <!-- Dialog -->
    <div v-if="dialogVisible" class="dialog-overlay" @click.self="dialogVisible = false">
      <div class="dialog">
        <div class="dialog-header">
          <h3>{{ editingBill ? '编辑账单' : '添加账单' }}</h3>
          <button class="dialog-close" @click="dialogVisible = false">&times;</button>
        </div>
        <form @submit.prevent="submitBill" class="dialog-body">
          <div class="form-group">
            <label class="form-label">类型 *</label>
            <div class="type-toggle">
              <button type="button" class="type-btn" :class="{ active: formData.type === 'expense' }" @click="formData.type = 'expense'">支出</button>
              <button type="button" class="type-btn income" :class="{ active: formData.type === 'income' }" @click="formData.type = 'income'">收入</button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">金额 *</label>
            <input v-model.number="formData.amount" type="number" step="0.01" min="0.01" class="input-field" placeholder="请输入金额" required />
          </div>
          <div class="form-group">
            <label class="form-label">分类 *</label>
            <select v-model="formData.categoryId" class="input-field" required>
              <option value="">请选择分类</option>
              <option v-for="cat in filteredCategories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">日期 *</label>
            <input v-model="formData.billDate" type="date" class="input-field" required />
          </div>
          <div class="form-group">
            <label class="form-label">备注</label>
            <input v-model="formData.description" type="text" class="input-field" placeholder="可选备注" maxlength="500" />
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
import { ref, computed, onMounted, watch, inject } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { billAPI, categoryAPI } from '../api/index.js'

const selectedMonth = inject('selectedMonth')
const bills = ref([])
const categories = ref([])
const dialogVisible = ref(false)
const editingBill = ref(null)
const submitting = ref(false)

const filters = ref({
  type: '',
  categoryId: '',
  startDate: '',
  endDate: ''
})

const formData = ref({
  type: 'expense',
  amount: null,
  categoryId: '',
  billDate: '',
  description: ''
})

const filteredCategories = computed(() =>
  categories.value.filter(c => c.type === formData.value.type)
)

function formatMoney(val) {
  return Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function loadCategories() {
  try {
    const res = await categoryAPI.list()
    categories.value = res.data || []
  } catch (e) {}
}

async function loadBills() {
  try {
    const res = await billAPI.list({
      type: filters.value.type || undefined,
      categoryId: filters.value.categoryId || undefined,
      startDate: filters.value.startDate || undefined,
      endDate: filters.value.endDate || undefined
    })
    bills.value = res.data || []
  } catch (e) {}
}

function resetFilters() {
  filters.value = { type: '', categoryId: '', startDate: '', endDate: '' }
  loadBills()
}

function openAddDialog() {
  editingBill.value = null
  const today = new Date().toISOString().split('T')[0]
  formData.value = { type: 'expense', amount: null, categoryId: '', billDate: today, description: '' }
  dialogVisible.value = true
}

function openEditDialog(bill) {
  editingBill.value = bill
  formData.value = {
    type: bill.type,
    amount: Number(bill.amount),
    categoryId: bill.categoryId,
    billDate: bill.billDate,
    description: bill.description || ''
  }
  dialogVisible.value = true
}

async function submitBill() {
  submitting.value = true
  try {
    const data = { ...formData.value, billDate: formData.value.billDate }
    if (editingBill.value) {
      data.id = editingBill.value.id
      await billAPI.update(data)
      ElMessage.success('更新成功')
    } else {
      await billAPI.create(data)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    loadBills()
  } catch (e) {
    // error handled by interceptor
  } finally {
    submitting.value = false
  }
}

async function deleteBill(id) {
  try {
    await ElMessageBox.confirm('确定要删除这条账单吗？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    await billAPI.delete(id)
    ElMessage.success('删除成功')
    loadBills()
  } catch (e) {}
}

watch(selectedMonth, () => {
  const [year, month] = selectedMonth.value.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1).toISOString().split('T')[0]
  const lastDay = new Date(year, month, 0).toISOString().split('T')[0]
  filters.value.startDate = firstDay
  filters.value.endDate = lastDay
  loadBills()
}, { immediate: true })

onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
.filter-card {
  padding: 16px 24px;
}

.filter-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-group {
  min-width: 160px;
}

.filter-select {
  height: 36px;
  padding: 6px 12px;
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

.desc-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.type-toggle {
  display: flex;
  gap: 8px;
}

.type-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  color: var(--text-secondary);
}

.type-btn.active {
  border-color: var(--danger);
  background: #FEE2E2;
  color: var(--danger);
}

.type-btn.income.active {
  border-color: var(--success);
  background: #D1FAE5;
  color: var(--success);
}
</style>
