import request from './request'

export const authAPI = {
  login(data) {
    return request.post('/auth/login', data)
  },
  register(data) {
    return request.post('/auth/register', data)
  },
  getUserInfo() {
    return request.get('/auth/userinfo')
  }
}

export const categoryAPI = {
  list(params) {
    return request.get('/category/list', { params })
  },
  create(data) {
    return request.post('/category', data)
  },
  update(data) {
    return request.put('/category', data)
  },
  delete(id) {
    return request.delete(`/category/${id}`)
  }
}

export const billAPI = {
  list(params) {
    return request.get('/bill/list', { params })
  },
  create(data) {
    return request.post('/bill', data)
  },
  update(data) {
    return request.put('/bill', data)
  },
  delete(id) {
    return request.delete(`/bill/${id}`)
  },
  summary(params) {
    return request.get('/bill/summary', { params })
  },
  recent(params) {
    return request.get('/bill/recent', { params })
  }
}

export const budgetAPI = {
  list(params) {
    return request.get('/budget/list', { params })
  },
  create(data) {
    return request.post('/budget', data)
  },
  update(data) {
    return request.put('/budget', data)
  },
  delete(id) {
    return request.delete(`/budget/${id}`)
  },
  alerts() {
    return request.get('/budget/alerts')
  }
}

export const statisticsAPI = {
  dashboard(params) {
    return request.get('/statistics/dashboard', { params })
  },
  monthly(params) {
    return request.get('/statistics/monthly', { params })
  },
  category(params) {
    return request.get('/statistics/category', { params })
  }
}
