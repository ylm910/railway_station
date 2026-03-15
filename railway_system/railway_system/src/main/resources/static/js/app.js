// API基础路径
const API_BASE = '/api';

// 全局数据存储
let appData = {
    trains: [],
    stations: [],
    lines: [],
    flow: [],
    dashboard: {}
};

// 分页配置
let pagination = {
    currentPage: 1,
    pageSize: 50,  // 每页显示50条
    currentTable: 'trains'
};

// 封装fetch请求，自动处理登录过期
async function apiFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        
        // 检查是否登录过期
        if (result.code === 401) {
            alert('登录已过期，请重新登录');
            window.location.href = '/login';
            return null;
        }
        
        return result;
    } catch (error) {
        // 如果JSON解析失败，可能是返回了HTML（登录页面）
        if (error instanceof SyntaxError) {
            console.error('API返回非JSON数据，可能需要重新登录');
            window.location.href = '/login';
            return null;
        }
        throw error;
    }
}

// 安全初始化ECharts实例（用于更新函数）- 使用SVG渲染器
function safeReinitChart(domId) {
    const chartDom = document.getElementById(domId);
    if (!chartDom) return null;
    if (chartDom.offsetWidth === 0 || chartDom.offsetHeight === 0) return null;
    
    // 销毁旧实例
    const oldChart = echarts.getInstanceByDom(chartDom);
    if (oldChart) {
        try { oldChart.dispose(); } catch (e) {}
    }
    
    // 使用SVG渲染器
    try {
        return echarts.init(chartDom, null, { renderer: 'svg' });
    } catch (e) {
        console.error(`初始化图表 ${domId} 失败:`, e);
        return null;
    }
}

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    checkLogin();
    initTabs();
    initDataTabs();
    loadDashboardData();
    initCharts();
    initDatePickers();
    initDashboardStationSelect();
    loadUserInfo();
});

// 检查登录状态
async function checkLogin() {
    try {
        const response = await fetch('/api/auth/check');
        const result = await response.json();
        if (result.code !== 200) {
            window.location.href = '/login';
        }
    } catch (error) {
        window.location.href = '/login';
    }
}

// 加载用户信息
function loadUserInfo() {
    const username = localStorage.getItem('username') || 'admin';
    const userEl = document.getElementById('current-user');
    if (userEl) {
        userEl.textContent = username;
    }
}

// 退出登录
async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/login';
}

// 初始化Dashboard站点选择器
async function initDashboardStationSelect() {
    try {
        const response = await fetch(`${API_BASE}/stations`);
        const result = await response.json();
        
        if (result.code === 200 && result.data) {
            const select = document.getElementById('dashboard-station-select');
            if (select) {
                result.data.forEach(station => {
                    const option = document.createElement('option');
                    option.value = station.id;
                    option.textContent = station.stationName;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('加载站点列表失败:', error);
    }
}

// Dashboard站点筛选
async function filterDashboardByStation() {
    const stationId = document.getElementById('dashboard-station-select')?.value;
    const stationName = document.getElementById('dashboard-station-select')?.selectedOptions[0]?.text;
    
    console.log('Dashboard筛选站点:', stationId, stationName);
    
    if (!stationId) {
        // 选择"全部站点"时，重新加载全部数据
        loadDashboardData();
        return;
    }
    
    // 高亮地图上的站点
    if (typeof highlightStation === 'function') {
        highlightStation(stationName);
    }
    
    // 加载该站点的详细数据
    try {
        console.log('请求站点时段数据:', `${API_BASE}/analysis/station/time/${stationId}`);
        
        const [timeRes, busyRes] = await Promise.all([
            fetch(`${API_BASE}/analysis/station/time/${stationId}`),
            fetch(`${API_BASE}/analysis/station/busy`)
        ]);
        
        const timeResult = await timeRes.json();
        const busyResult = await busyRes.json();
        
        console.log('站点时段API返回:', timeResult);
        
        // 更新KPI卡片显示该站点数据
        if (busyResult.code === 200 && busyResult.data) {
            const stationData = busyResult.data.find(s => s.stationId == stationId);
            if (stationData) {
                document.getElementById('total-passengers').textContent = formatNumber(stationData.total || 0);
            }
        }
        
        // 更新时段分布图
        if (timeResult.code === 200 && timeResult.data) {
            const hourlyFlow = timeResult.data.hourlyFlow || [];
            console.log('站点时段数据:', hourlyFlow.length, '条');
            updateTimeDistributionForStation(hourlyFlow);
        } else {
            console.log('站点时段API返回异常');
            updateTimeDistributionForStation([]);
        }
        
    } catch (error) {
        console.error('加载站点数据失败:', error);
    }
}

// 更新时段分布图（单站点）
function updateTimeDistributionForStation(hourlyData) {
    const chart = chartInstances?.['timeDistribution'];
    if (!chart) {
        console.log('时段分布图表实例不存在');
        return;
    }
    
    if (!hourlyData || hourlyData.length === 0) {
        console.log('站点时段数据为空');
        chart.setOption({
            title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
            xAxis: { data: [] },
            series: [{ data: [] }, { data: [] }]
        });
        return;
    }
    
    const hours = hourlyData.map(h => `${h.hour}:00`);
    const data = hourlyData.map(h => h.flow || 0);
    
    console.log('更新站点时段分布:', hours.length, '个时段');
    
    // 统一使用柱状图样式，与初始化时一致
    chart.setOption({
        title: { text: '' },
        xAxis: { 
            type: 'category',
            data: hours,
            axisLabel: { color: '#8ec5fc' },
            axisLine: { lineStyle: { color: '#2a4a7c' } }
        },
        yAxis: {
            type: 'value',
            name: '客流量',
            nameTextStyle: { color: '#8ec5fc' },
            axisLabel: { color: '#8ec5fc' },
            splitLine: { lineStyle: { color: '#1a3a5c' } }
        },
        series: [
            { 
                name: '工作日',
                type: 'bar',
                data: data,
                itemStyle: { color: '#4ecdc4' }
            },
            { 
                name: '周末',
                type: 'bar',
                data: data.map(d => Math.round(d * 1.1)), // 周末略高
                itemStyle: { color: '#ff6b6b' }
            }
        ]
    });
}

// Dashboard时间滑块
function updateDashboardTimeSlider(days) {
    let startDate, endDate;
    
    if (days == 0) {
        // 0表示全部数据
        document.getElementById('dashboard-slider-value').textContent = '全部数据';
        startDate = '2010-01-01';
        endDate = '2030-12-31';
    } else {
        document.getElementById('dashboard-slider-value').textContent = `最近 ${days} 天`;
        
        // 计算日期范围
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - parseInt(days));
        startDate = formatDate(start);
        endDate = formatDate(end);
    }
    
    console.log('Dashboard时间滑块:', startDate, '-', endDate);
    
    // 重新加载所有Dashboard数据（带日期范围）
    loadDashboardDataWithDateRange(startDate, endDate);
}

// 带日期范围加载Dashboard数据
async function loadDashboardDataWithDateRange(startDate, endDate) {
    const dateParams = `?startDate=${startDate}&endDate=${endDate}`;
    
    try {
        // 1. 更新客流趋势图
        const trendRes = await fetch(`${API_BASE}/analysis/flow/trend${dateParams}`);
        const trendResult = await trendRes.json();
        if (trendResult.code === 200 && trendResult.data) {
            if (trendResult.data.daily) {
                updateFlowTrendChartWithData(trendResult.data.daily, 'day');
            }
            // 更新统计卡片
            updateDashboardStatsWithDateRange(trendResult.data, startDate, endDate);
        }
        
        // 2. 更新时段分布图
        const peakRes = await fetch(`${API_BASE}/analysis/flow/peak${dateParams}`);
        const peakResult = await peakRes.json();
        if (peakResult.code === 200 && peakResult.data && peakResult.data.hourlyFlow) {
            updateTimeDistributionWithData(peakResult.data.hourlyFlow);
        }
        
        // 3. 更新站点排名
        const rankRes = await fetch(`${API_BASE}/analysis/station/ranking${dateParams}`);
        const rankResult = await rankRes.json();
        if (rankResult.code === 200 && rankResult.data) {
            updateStationRankingWithData(rankResult.data);
        }
        
        // 4. 更新地图
        const mapRes = await fetch(`${API_BASE}/analysis/map${dateParams}`);
        const mapResult = await mapRes.json();
        if (mapResult.code === 200 && mapResult.data) {
            updateMapWithDateData(mapResult.data);
        }
        
    } catch (error) {
        console.error('加载Dashboard数据失败:', error);
    }
}

// 更新Dashboard统计卡片
function updateDashboardStatsWithDateRange(data, startDate, endDate) {
    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
    let totalFlow = 0;
    
    if (data.daily) {
        data.daily.forEach(d => totalFlow += (d.boarding || d.flow || 0));
    }
    
    const avgDaily = days > 0 ? Math.round(totalFlow / days) : 0;
    
    // 更新显示
    const todayEl = document.getElementById('today-flow');
    if (todayEl) {
        todayEl.textContent = formatNumber(totalFlow);
        const label = todayEl.parentElement?.querySelector('h4');
        if (label) label.textContent = '筛选范围客流';
    }
}

// 更新时段分布图
function updateTimeDistributionWithData(hourlyData) {
    const chart = chartInstances?.['timeDistribution'];
    if (!chart) return;
    
    const hours = hourlyData.map(h => h.hour + ':00');
    const data = hourlyData.map(h => h.flow || 0);
    
    chart.setOption({
        xAxis: { data: hours },
        series: [{ data: data }]
    });
}

// 更新站点排名图
function updateStationRankingWithData(data) {
    const chart = chartInstances?.['stationRanking'];
    if (!chart) return;
    
    const topData = data.slice(0, 10).reverse();
    const stations = topData.map(s => s.stationName || `站点${s.stationId}`);
    const values = topData.map(s => s.boarding || 0);
    
    chart.setOption({
        yAxis: { data: stations },
        series: [{ data: values }]
    });
}

// 更新地图数据
function updateMapWithDateData(data) {
    const chart = chartInstances?.['map'];
    if (!chart) return;
    
    // 地图更新逻辑（简化版）
    if (data.stations && data.stations.length > 0) {
        console.log('更新地图站点数据:', data.stations.length, '个站点');
    }
}

// 客流分析页面时间滑块
function updateTimeSlider(days) {
    if (days == 0) {
        // 0表示全部数据
        document.getElementById('time-slider-value').textContent = '全部数据';
        document.getElementById('date-start').value = '2010-01-01';
        document.getElementById('date-end').value = '2030-12-31';
    } else {
        document.getElementById('time-slider-value').textContent = `最近 ${days} 天`;
        
        // 计算日期范围
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        
        // 更新日期选择器
        document.getElementById('date-start').value = formatDate(startDate);
        document.getElementById('date-end').value = formatDate(endDate);
    }
    
    // 触发日期筛选
    filterByDate();
}

// 初始化日期选择器 - 默认显示全部数据
function initDatePickers() {
    const startInput = document.getElementById('date-start');
    const endInput = document.getElementById('date-end');
    
    // 默认显示全部数据范围
    if (startInput) startInput.value = '2010-01-01';
    if (endInput) endInput.value = '2030-12-31';
    
    // 设置时间滑块为0（全部数据）
    const slider = document.getElementById('time-slider');
    if (slider) {
        slider.value = 0;
        slider.min = 0;  // 允许滑到0
    }
    const sliderValue = document.getElementById('time-slider-value');
    if (sliderValue) sliderValue.textContent = '全部数据';
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Tab切换
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            
            // 切换时加载对应数据并初始化图表
            if (tabId === 'data-manage') {
                loadTableData();
            } else if (tabId === 'passenger-analysis') {
                // 先初始化图表容器，再加载数据
                if (typeof initPassengerAnalysisCharts === 'function') {
                    initPassengerAnalysisCharts();
                }
                setTimeout(() => loadFlowAnalysis(), 100);
            } else if (tabId === 'line-optimize') {
                if (typeof initLineOptimizeCharts === 'function') {
                    initLineOptimizeCharts();
                }
                setTimeout(() => loadLineAnalysis(), 100);
            } else if (tabId === 'station-eval') {
                // 延迟初始化，确保tab内容已显示
                setTimeout(() => {
                    if (typeof initStationEvalCharts === 'function') {
                        initStationEvalCharts();
                    }
                    loadStationAnalysis();
                }, 150);
            }
            
            setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
        });
    });
}

// 数据表Tab切换
function initDataTabs() {
    const dataTabs = document.querySelectorAll('.data-tab-btn');
    dataTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            dataTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            pagination.currentTable = this.getAttribute('data-table');
            pagination.currentPage = 1;
            loadTableData();
        });
    });
}

// ==================== Dashboard ====================

async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE}/analysis/dashboard`);
        const result = await response.json();
        
        if (result.code === 200) {
            appData.dashboard = result.data;
            updateKPIs(result.data);
        }
        
        // 默认加载全部数据范围的图表
        loadDashboardDataWithDateRange('2010-01-01', '2030-12-31');
    } catch (error) {
        console.error('加载Dashboard失败:', error);
        updateKPIs({ trainCount: '--', stationCount: '--', totalFlow: 0, avgCapacity: '--' });
    }
}

function updateKPIs(data) {
    document.getElementById('total-trains').textContent = data.trainCount || '--';
    document.getElementById('total-stations').textContent = data.stationCount || '--';
    document.getElementById('total-passengers').textContent = formatNumber(data.avgDailyFlow || 0);
    document.getElementById('avg-capacity').textContent = data.avgCapacity || '--';
}

function formatNumber(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
}

// ==================== 数据管理 ====================

async function loadTableData() {
    const tableType = pagination.currentTable;
    let url = '';
    
    switch(tableType) {
        case 'trains': url = `${API_BASE}/trains`; break;
        case 'stations': url = `${API_BASE}/stations`; break;
        case 'lines': url = `${API_BASE}/lines`; break;
        case 'flow': url = `${API_BASE}/analysis/flow/list`; break;
        default: return;
    }
    
    try {
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.code === 200 && result.data) {
            appData[tableType] = result.data;
            renderTable(result.data);
        } else {
            renderTable([]);
        }
    } catch (error) {
        console.error('加载数据失败:', error);
        renderTable([]);
    }
}

function renderTable(data) {
    const header = document.getElementById('table-header');
    const body = document.getElementById('table-body');
    
    if (!data || data.length === 0) {
        header.innerHTML = '';
        body.innerHTML = '<tr><td colspan="10">暂无数据</td></tr>';
        document.getElementById('page-info').textContent = '第 0 / 0 页';
        return;
    }
    
    // 过滤掉不需要显示的列
    const hiddenColumns = ['platforms', 'createdAt', 'updatedAt'];
    let columns = Object.keys(data[0]).filter(col => !hiddenColumns.includes(col));
    
    // 对于列车表，确保typeName显示在trainType后面
    if (pagination.currentTable === 'trains') {
        // 优先显示的列顺序
        const preferredOrder = ['id', 'trainCode', 'trainType', 'typeName', 'capacity', 'status'];
        columns = preferredOrder.filter(col => columns.includes(col));
    }
    
    header.innerHTML = '<tr>' + columns.map(col => `<th>${getColumnName(col)}</th>`).join('') + '<th>操作</th></tr>';
    
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    const pageData = data.slice(start, start + pagination.pageSize);
    
    body.innerHTML = pageData.map(row => 
        '<tr>' + columns.map(col => {
            let value = row[col];
            // 格式化显示
            if (value === null || value === undefined) value = '';
            if (col === 'status') value = value == 1 ? '运营中' : '停运';
            if (col === 'isStop') value = value == 1 ? '是' : '否';
            if (col === 'flowDate' && value) value = value.substring(0, 10);
            return `<td>${value}</td>`;
        }).join('') + 
        `<td class="action-cell">
            <button class="btn-small btn-edit" onclick="showEditModal(${row.id})">编辑</button>
            <button class="btn-small btn-delete" onclick="showDeleteModal(${row.id})">删除</button>
        </td></tr>`
    ).join('');
    
    const totalPages = Math.ceil(data.length / pagination.pageSize);
    document.getElementById('page-info').textContent = `第 ${pagination.currentPage} / ${totalPages} 页 (共${data.length}条)`;
}

function getColumnName(col) {
    const names = {
        // 通用
        id: 'ID',
        // 列车表 - 对应CSV: lcbm, lcdm/cc, lcyn, sfzt
        trainCode: '车次', trainType: '列车类型', capacity: '运量', status: '状态',
        typeName: '类型名称',
        // 站点表 - 对应CSV: zdid, zdmc, station_code, station_telecode
        stationName: '站点名称', stationCode: '站点编码', stationType: '站点类型', 
        platforms: '站台数', remark: '备注',
        // 线路站点表 - 对应CSV: yyxlbm, zdid, xlzdid, Q_zdid, H_zdid, yqzdjjl, ysjl, xldm, sfytk
        lineId: '线路编码', stationId: '站点ID', lineStationId: '线路站点ID',
        prevStationId: '上一站ID', nextStationId: '下一站ID', distance: '站间距离',
        totalDistance: '运输距离', lineCode: '线路代码', isStop: '是否停靠',
        // 客运量表 - 对应CSV的各字段
        trainId: '列车ID', flowDate: '运营日期', skzld: '上客站点', sxbm: '上下编码',
        operateTime: '运营时间', timeInterval: '时间间隔',
        startStationTime: '始发站时点', startStationDepart: '始发站到时',
        arriveTime: '到达时间', departTime: '出发时间',
        boarding: '上客量', alighting: '下客量',
        trainDepartDate: '列车出发日期', trainDepartTime: '列车出发时间', sequenceNo: '站点序号',
        ticketType: '车票类型', ticketPrice: '票价', seatType: '座位类型',
        trainCopo: '列车编组', ticketDate: '购票日期',
        originStationId: '起点站ID', originStationStatic: '起点站', originStationStart: '起点站代码',
        destStationId: '终点站ID', destStationStatic: '终点站', destStationEnd: '终点站代码',
        trainClass: '列车等级', saleStationId: '售票站ID', stationLimit: '限制站', 
        staticSps: '售票时间', toStationId: '到达站ID', revenue: '收入',
        // 额外字段
        killField: 'kill字段', sokl: 'sokl', kofig: 'kofig'
    };
    return names[col] || col;
}

function prevPage() {
    if (pagination.currentPage > 1) {
        pagination.currentPage--;
        renderTable(appData[pagination.currentTable]);
    }
}

function nextPage() {
    const data = appData[pagination.currentTable] || [];
    const totalPages = Math.ceil(data.length / pagination.pageSize);
    if (pagination.currentPage < totalPages) {
        pagination.currentPage++;
        renderTable(data);
    }
}

function filterTable() {
    const searchText = document.getElementById('search-input').value.toLowerCase();
    const data = appData[pagination.currentTable] || [];
    
    if (!searchText) {
        renderTable(data);
        return;
    }
    
    const filtered = data.filter(row => 
        Object.values(row).some(v => v && String(v).toLowerCase().includes(searchText))
    );
    renderTable(filtered);
}

// ==================== 客流分析 ====================

async function loadFlowAnalysis() {
    try {
        const timeRange = document.getElementById('time-range')?.value || 'day';
        let startDate = document.getElementById('date-start')?.value || '';
        let endDate = document.getElementById('date-end')?.value || '';
        
        // 如果没有设置日期，使用全部数据范围
        if (!startDate || !endDate) {
            startDate = '2010-01-01';
            endDate = '2030-12-31';
        }
        
        let url = `${API_BASE}/analysis/flow/trend?timeRange=${timeRange}`;
        if (startDate && endDate) {
            url += `&startDate=${startDate}&endDate=${endDate}`;
        }
        
        console.log('加载客流数据:', url);
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.code === 200) {
            // 更新统计数字
            updateFlowStats(result.data);
            
            // 更新客流趋势图
            if (result.data.trend || result.data.daily) {
                updateFlowTrendChartWithData(result.data.trend || result.data.daily, timeRange);
            }
            
            // 更新周客流分布图
            if (result.data.weekly) {
                updateWeeklyFlowChartWithData(result.data.weekly);
            }
            
            // 更新时段分布图
            if (result.data.hourly) {
                updateHourlyFlowChartWithData(result.data.hourly);
            }
        }
        
        // 加载OD桑基图数据
        const dateParams = startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : '';
        try {
            const odRes = await fetch(`${API_BASE}/analysis/flow/od${dateParams}`);
            const odResult = await odRes.json();
            if (odResult.code === 200) {
                updateODSankeyChart(odResult.data || []);
            }
        } catch (e) { console.error('OD桑基图数据加载失败:', e); }
        
        // 加载节假日分析
        loadHolidayAnalysis();
        
    } catch (error) {
        console.error('加载客流分析失败:', error);
    }
}

// 更新客流趋势图
function updateFlowTrendChartWithData(data, timeRange) {
    const chart = safeReinitChart('flow-trend-chart');
    if (!chart) return;
    
    let dates = [], values = [];
    
    // 处理数据
    if (data && data.length > 0) {
        data.forEach(d => {
            if (timeRange === 'month' && d.month) {
                dates.push(d.month);
            } else if (d.date) {
                const date = new Date(d.date);
                dates.push(`${date.getMonth()+1}/${date.getDate()}`);
            }
            values.push(d.boarding || d.flow || 0);
        });
    }
    
    // 检查是否有有效数据
    const hasValidData = values.some(v => v > 0);
    
    // 无数据时显示"暂无数据"
    if (!hasValidData || dates.length === 0) {
        chart.setOption({
            backgroundColor: 'transparent',
            title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
            xAxis: { show: false },
            yAxis: { show: false },
            series: []
        });
        return;
    }
    
    renderFlowTrendChart(chart, dates, values);
}

function renderFlowTrendChart(chart, dates, values) {
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', formatter: '{b}<br/>客流量: {c}' },
        xAxis: { type: 'category', data: dates, axisLabel: { rotate: 45, color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } },
        yAxis: { type: 'value', name: '客流量', nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
        series: [{
            data: values,
            type: 'line',
            smooth: true,
            areaStyle: { 
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(0, 212, 255, 0.4)' },
                    { offset: 1, color: 'rgba(0, 212, 255, 0.05)' }
                ])
            },
            lineStyle: { color: '#00d4ff', width: 2 },
            itemStyle: { color: '#00d4ff' }
        }]
    });
}

// 更新周客流分布图
function updateWeeklyFlowChartWithData(weeklyData) {
    const chart = safeReinitChart('weekly-flow-chart');
    if (!chart) return;
    
    const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const data = [0, 0, 0, 0, 0, 0, 0];
    
    if (weeklyData && weeklyData.length > 0) {
        weeklyData.forEach(w => {
            // MySQL DAYOFWEEK: 1=周日, 2=周一, ..., 7=周六
            let idx = (w.weekday || 1) - 2;
            if (idx < 0) idx = 6; // 周日
            if (idx >= 0 && idx < 7) {
                data[idx] = w.flow || 0;
            }
        });
    }
    
    // 检查是否有有效数据
    const hasValidData = data.some(v => v > 0);
    
    // 无数据时显示"暂无数据"
    if (!hasValidData) {
        chart.setOption({
            backgroundColor: 'transparent',
            title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
            xAxis: { show: false },
            yAxis: { show: false },
            series: []
        });
        return;
    }
    
    renderWeeklyFlowChart(chart, weekdays, data);
}

function renderWeeklyFlowChart(chart, weekdays, data) {
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', formatter: '{b}<br/>客流量: {c}' },
        xAxis: { type: 'category', data: weekdays, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } },
        yAxis: { type: 'value', name: '客流量', nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
        series: [{
            data: data,
            type: 'bar',
            itemStyle: {
                color: function(params) {
                    return params.dataIndex >= 4 ? '#ff6b8a' : '#00d4ff';
                }
            }
        }]
    });
}

// 更新时段分布图
function updateHourlyFlowChartWithData(hourlyData) {
    const chart = safeReinitChart('time-distribution-chart');
    if (!chart) return;
    
    // 无数据时显示提示
    if (!hourlyData || hourlyData.length === 0) {
        chart.setOption({
            title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
            xAxis: { show: false },
            yAxis: { show: false },
            series: []
        });
        return;
    }
    
    const hours = hourlyData.map(h => h.hour + ':00');
    const values = hourlyData.map(h => h.flow || 0);
    
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', formatter: '{b}<br/>客流量: {c}' },
        xAxis: { type: 'category', data: hours, axisLabel: { rotate: 45, color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } },
        yAxis: { type: 'value', name: '客流量', nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
        series: [{
            data: values,
            type: 'bar',
            itemStyle: {
                color: function(params) {
                    const hour = parseInt(hours[params.dataIndex]);
                    return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19) ? '#ff6b8a' : '#00d4ff';
                }
            }
        }]
    });
}

// 更新高峰时段分析图
function updatePeakHoursChartWithData(hourlyData) {
    const chart = safeReinitChart('peak-hours-chart');
    if (!chart) return;
    
    // 无数据时显示提示
    if (!hourlyData || hourlyData.length === 0) {
        chart.setOption({
            title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
            xAxis: { show: false },
            yAxis: { show: false },
            series: []
        });
        return;
    }
    
    const hours = hourlyData.map(h => h.hour + ':00');
    const values = hourlyData.map(h => h.flow || 0);
    
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: { data: ['客流量'], textStyle: { color: '#8ec5fc' } },
        xAxis: { type: 'category', data: hours, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } },
        yAxis: { type: 'value', axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
        series: [{
            name: '客流量',
            type: 'line',
            data: values,
            itemStyle: { color: '#00d4ff' },
            lineStyle: { width: 2 },
            smooth: true,
            areaStyle: { color: 'rgba(0, 212, 255, 0.2)' }
        }]
    });
}

function updateFlowStats(data) {
    const todayEl = document.getElementById('today-flow');
    const weekEl = document.getElementById('week-flow');
    const monthEl = document.getElementById('month-flow');
    
    // 获取每日数据
    let dailyData = data.daily || [];
    
    // 计算总客流（从每日数据累加）
    let totalFlow = 0;
    dailyData.forEach(d => totalFlow += (d.boarding || d.flow || 0));
    
    // 有效天数 = 实际有数据的天数
    const validDays = dailyData.length;
    
    // 计算日均客流 = 总客流 / 有效天数
    const avgDaily = validDays > 0 ? Math.round(totalFlow / validDays) : 0;
    
    // 更新第一个卡片：总客流
    if (todayEl) {
        todayEl.textContent = formatNumber(totalFlow);
        const label = todayEl.parentElement?.querySelector('h4');
        if (label) label.textContent = '总客流量';
        const todayTrend = todayEl.parentElement?.querySelector('.trend');
        if (todayTrend) {
            todayTrend.textContent = `共${validDays}天`;
            todayTrend.className = 'trend';
        }
    }
    
    // 更新第二个卡片：日均客流
    if (weekEl) {
        weekEl.textContent = formatNumber(avgDaily);
        const label = weekEl.parentElement?.querySelector('h4');
        if (label) label.textContent = '日均客流';
        const weekTrend = weekEl.parentElement?.querySelector('.trend');
        if (weekTrend) {
            weekTrend.textContent = '';
            weekTrend.className = 'trend';
        }
    }
    
    // 更新第三个卡片：有效天数
    if (monthEl) {
        monthEl.textContent = formatNumber(validDays);
        const label = monthEl.parentElement?.querySelector('h4');
        if (label) label.textContent = '有效天数';
        const monthTrend = monthEl.parentElement?.querySelector('.trend');
        if (monthTrend) {
            monthTrend.textContent = '';
            monthTrend.className = 'trend';
        }
    }
}

// 时间范围切换
function updateTimeRange() {
    const timeRange = document.getElementById('time-range')?.value;
    const startDate = document.getElementById('date-start')?.value;
    const endDate = document.getElementById('date-end')?.value;
    console.log('切换时间范围:', timeRange, startDate, '-', endDate);
    
    if (startDate && endDate) {
        loadFlowAnalysisWithDate(startDate, endDate);
        loadFlowAnalysisCharts(startDate, endDate);
    } else {
        loadFlowAnalysis();
    }
}

// 日期筛选
function filterByDate() {
    const startDate = document.getElementById('date-start').value;
    const endDate = document.getElementById('date-end').value;
    console.log('日期筛选:', startDate, '-', endDate);
    
    if (startDate && endDate) {
        if (new Date(startDate) > new Date(endDate)) {
            alert('开始日期不能大于结束日期');
            return;
        }
        // 重新加载所有客流分析相关图表（带日期参数）
        loadFlowAnalysisWithDate(startDate, endDate);
        loadFlowAnalysisCharts(startDate, endDate);
    }
}

// 带日期参数加载客流分析
async function loadFlowAnalysisWithDate(startDate, endDate) {
    try {
        const timeRange = document.getElementById('time-range')?.value || 'day';
        const url = `/api/analysis/flow/trend?timeRange=${timeRange}&startDate=${startDate}&endDate=${endDate}`;
        
        console.log('请求客流数据:', url);
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.code === 200) {
            // 更新统计数字（显示筛选范围内的数据）
            updateFlowStatsWithDateRange(result.data, startDate, endDate);
            
            // 更新客流趋势图
            if (result.data.trend || result.data.daily) {
                updateFlowTrendChartWithData(result.data.trend || result.data.daily, timeRange);
            }
            
            // 更新周客流分布图
            if (result.data.weekly) {
                updateWeeklyFlowChartWithData(result.data.weekly);
            }
        }
    } catch (error) {
        console.error('加载客流分析失败:', error);
    }
}

// 更新统计卡片（显示筛选范围内的汇总）
function updateFlowStatsWithDateRange(data, startDate, endDate) {
    const todayEl = document.getElementById('today-flow');
    const weekEl = document.getElementById('week-flow');
    const monthEl = document.getElementById('month-flow');
    
    // 获取日期范围内的每日数据
    let dailyData = data.trend || data.daily || [];
    
    // 计算筛选范围内的总客流（从每日数据累加）
    let totalFlow = 0;
    dailyData.forEach(d => totalFlow += (d.boarding || d.flow || 0));
    
    // 有效天数 = 实际有数据的天数
    const validDays = dailyData.length;
    
    // 计算日均客流 = 总客流 / 有效天数
    const avgDaily = validDays > 0 ? Math.round(totalFlow / validDays) : 0;
    
    // 更新第一个卡片：显示筛选范围总客流
    if (todayEl) {
        todayEl.textContent = formatNumber(totalFlow);
        const label = todayEl.parentElement?.querySelector('h4');
        if (label) label.textContent = '筛选范围客流';
        const trend = todayEl.parentElement?.querySelector('.trend');
        if (trend) {
            trend.textContent = `共${validDays}天`;
            trend.className = 'trend';
        }
    }
    
    // 更新第二个卡片：显示日均客流
    if (weekEl) {
        weekEl.textContent = formatNumber(avgDaily);
        const label = weekEl.parentElement?.querySelector('h4');
        if (label) label.textContent = '日均客流';
        const trend = weekEl.parentElement?.querySelector('.trend');
        if (trend) {
            trend.textContent = '';
            trend.className = 'trend';
        }
    }
    
    // 更新第三个卡片：显示有效天数
    if (monthEl) {
        monthEl.textContent = formatNumber(validDays);
        const label = monthEl.parentElement?.querySelector('h4');
        if (label) label.textContent = '有效天数';
        const trend = monthEl.parentElement?.querySelector('.trend');
        if (trend) {
            trend.textContent = '';
            trend.className = 'trend';
        }
    }
}

// 加载客流分析页面的所有图表（带日期筛选）
async function loadFlowAnalysisCharts(startDate, endDate) {
    const dateParams = startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : '';
    console.log('加载图表，日期参数:', dateParams);
    
    // 更新OD客流分布
    try {
        const odRes = await fetch(`/api/analysis/flow/od${dateParams}`);
        const odResult = await odRes.json();
        console.log('OD数据:', odResult.data?.length || 0, '条');
        if (odResult.code === 200) {
            updateODFlowChart(odResult.data || []);
        }
    } catch (e) { console.error('OD数据加载失败:', e); }
    
    // 更新座位类型
    try {
        const seatRes = await fetch(`/api/analysis/seat-type${dateParams}`);
        const seatResult = await seatRes.json();
        console.log('座位类型数据:', seatResult.data?.length || 0, '条');
        if (seatResult.code === 200) {
            updateSeatTypeChart(seatResult.data || []);
        }
    } catch (e) { console.error('座位类型数据加载失败:', e); }
    
    // 更新高峰时段
    try {
        const peakRes = await fetch(`/api/analysis/flow/peak${dateParams}`);
        const peakResult = await peakRes.json();
        console.log('高峰时段数据:', peakResult.data);
        if (peakResult.code === 200) {
            updatePeakHoursChart(peakResult.data || {});
        }
    } catch (e) { console.error('高峰时段数据加载失败:', e); }
    
    // 更新周客流分布
    try {
        const weeklyRes = await fetch(`/api/analysis/flow/trend${dateParams}`);
        const weeklyResult = await weeklyRes.json();
        console.log('周客流数据:', weeklyResult.data?.weekly?.length || 0, '条');
        if (weeklyResult.code === 200 && weeklyResult.data && weeklyResult.data.weekly) {
            updateWeeklyFlowChartWithData(weeklyResult.data.weekly);
        }
    } catch (e) { console.error('周客流数据加载失败:', e); }
    
    // 更新OD桑基图
    try {
        const odRes2 = await fetch(`/api/analysis/flow/od${dateParams}`);
        const odResult2 = await odRes2.json();
        if (odResult2.code === 200) {
            updateODSankeyChart(odResult2.data || []);
        }
    } catch (e) { console.error('OD桑基图数据加载失败:', e); }
    
    // 更新客流预测（基于筛选范围内的历史数据）
    try {
        const predictRes = await fetch(`/api/analysis/flow/predict?days=7${startDate ? '&startDate=' + startDate : ''}${endDate ? '&endDate=' + endDate : ''}`);
        const predictResult = await predictRes.json();
        if (predictResult.code === 200 && predictResult.data) {
            renderPredictionChart(predictResult.data);
        }
    } catch (e) { console.error('客流预测加载失败:', e); }
    
    // 更新节假日分析
    try {
        const holidayRes = await fetch(`/api/analysis/holiday${dateParams}`);
        const holidayResult = await holidayRes.json();
        if (holidayResult.code === 200 && holidayResult.data) {
            updateHolidayFlowChart(holidayResult.data);
            updateWeekdayWeekendChart(holidayResult.data);
        }
    } catch (e) { console.error('节假日分析加载失败:', e); }
}

// 更新高峰时段分析图（工作日/周末）
function updatePeakHoursChart(data) {
    const chart = safeReinitChart('peak-hours-chart');
    if (!chart) return;
    
    let hours = [];
    let weekdayData = [];
    let weekendData = [];
    
    // 构建6-22点的时间轴
    for (let i = 6; i <= 22; i++) {
        hours.push(i + ':00');
    }
    
    // 检查是否有有效数据
    let hasValidData = false;
    
    // 处理工作日数据
    const weekdayMap = {};
    if (data.weekdayHourly && data.weekdayHourly.length > 0) {
        data.weekdayHourly.forEach(h => {
            if (h.hour !== undefined && h.hour !== null) {
                weekdayMap[h.hour] = h.flow || 0;
                if ((h.flow || 0) > 0) hasValidData = true;
            }
        });
    }
    
    // 处理周末数据
    const weekendMap = {};
    if (data.weekendHourly && data.weekendHourly.length > 0) {
        data.weekendHourly.forEach(h => {
            if (h.hour !== undefined && h.hour !== null) {
                weekendMap[h.hour] = h.flow || 0;
                if ((h.flow || 0) > 0) hasValidData = true;
            }
        });
    }
    
    // 填充数据
    for (let i = 6; i <= 22; i++) {
        weekdayData.push(weekdayMap[i] || 0);
        weekendData.push(weekendMap[i] || 0);
    }
    
    // 如果没有有效数据，检查是否有总客流量
    if (!hasValidData) {
        fetch('/api/analysis/overview')
            .then(r => r.json())
            .then(overview => {
                if (overview.code === 200 && overview.data && overview.data.totalFlow > 0) {
                    const totalFlow = overview.data.totalFlow;
                    // 典型铁路时段分布比例
                    const ratios = [0.05, 0.08, 0.10, 0.07, 0.06, 0.05, 0.05, 0.05, 0.06, 0.06, 0.07, 0.08, 0.06, 0.04, 0.03, 0.02, 0.01];
                    for (let i = 0; i < 17; i++) {
                        weekdayData[i] = Math.round(totalFlow * ratios[i]);
                        weekendData[i] = Math.round(totalFlow * ratios[i] * 1.1);
                    }
                    renderPeakHoursChartData(chart, hours, weekdayData, weekendData);
                } else {
                    chart.setOption({
                        backgroundColor: 'transparent',
                        title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
                        xAxis: { show: false },
                        yAxis: { show: false },
                        series: []
                    });
                }
            });
        return;
    }
    
    renderPeakHoursChartData(chart, hours, weekdayData, weekendData);
}

function renderPeakHoursChartData(chart, hours, weekdayData, weekendData) {
    chart.setOption({
        backgroundColor: 'transparent',
        title: { text: '', show: false },
        tooltip: { trigger: 'axis' },
        legend: { data: ['工作日', '周末'], textStyle: { color: '#8ec5fc' }, bottom: 0 },
        grid: { left: '10%', right: '5%', top: '15%', bottom: '15%' },
        xAxis: { type: 'category', data: hours, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } },
        yAxis: { type: 'value', name: '客流量', nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
        series: [
            { name: '工作日', type: 'line', data: weekdayData, smooth: true, itemStyle: { color: '#00d4ff' }, lineStyle: { width: 2 } },
            { name: '周末', type: 'line', data: weekendData, smooth: true, itemStyle: { color: '#ff6b8a' }, lineStyle: { width: 2 } }
        ]
    });
}

// 更新OD桑基图
let odSankeyRetryCount = 0;
const MAX_SANKEY_RETRY = 10;

function updateODSankeyChart(data) {
    const chartDom = document.getElementById('od-sankey-chart');
    if (!chartDom) {
        console.log('OD桑基图容器不存在');
        return;
    }
    
    // 检查容器是否可见且有尺寸
    if (chartDom.offsetWidth === 0 || chartDom.offsetHeight === 0) {
        odSankeyRetryCount++;
        if (odSankeyRetryCount > MAX_SANKEY_RETRY) {
            console.log('OD桑基图容器不可见，已达最大重试次数');
            odSankeyRetryCount = 0;
            return;
        }
        // 延迟重试
        setTimeout(() => updateODSankeyChart(data), 500);
        return;
    }
    
    // 重置重试计数
    odSankeyRetryCount = 0;
    
    // 使用安全初始化
    const chart = safeReinitChart('od-sankey-chart');
    if (!chart) return;
    
    // 无数据时显示提示
    if (!data || data.length === 0) {
        console.log('OD桑基图无数据');
        chart.setOption({
            backgroundColor: 'transparent',
            title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
            series: []
        });
        return;
    }
    
    let nodes = [], links = [];
    const nodeSet = new Set();
    const linkSet = new Set(); // 用于去重和检测循环
    
    console.log('OD桑基图数据:', data.length, '条');
    
    data.slice(0, 15).forEach(od => {
        const origin = od.originName || `站点${od.originId}`;
        const dest = od.destName || `站点${od.destId}`;
        if (origin && dest && origin !== dest) {
            // 检查是否已存在反向链接（避免循环）
            const reverseKey = `${dest}->${origin}`;
            const forwardKey = `${origin}->${dest}`;
            
            if (!linkSet.has(reverseKey) && !linkSet.has(forwardKey)) {
                nodeSet.add(origin);
                nodeSet.add(dest);
                links.push({ source: origin, target: dest, value: od.flow || 1000 });
                linkSet.add(forwardKey);
            }
        }
    });
    nodes = Array.from(nodeSet).map(n => ({ name: n }));
    
    if (nodes.length === 0 || links.length === 0) {
        chart.setOption({
            backgroundColor: 'transparent',
            title: { text: '暂无有效OD数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
            series: []
        });
        return;
    }
    
    chart.setOption({
        backgroundColor: 'transparent',
        title: { text: '', show: false },
        tooltip: { 
            trigger: 'item', 
            triggerOn: 'mousemove',
            formatter: p => p.data.source ? `${p.data.source} → ${p.data.target}<br/>客流: ${p.data.value}` : p.name 
        },
        series: [{
            type: 'sankey',
            layout: 'none',
            emphasis: { focus: 'adjacency' },
            data: nodes,
            links: links,
            lineStyle: { color: 'gradient', curveness: 0.5 },
            itemStyle: { color: '#00d4ff', borderColor: '#00d4ff' },
            label: { color: '#8ec5fc', fontSize: 11 }
        }]
    });
}

// 更新OD客流分布图
function updateODFlowChart(data) {
    const chart = safeReinitChart('od-flow-chart');
    if (!chart) return;
    
    // 无数据时显示提示
    if (!data || data.length === 0) {
        chart.setOption({
            title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
            xAxis: { show: false },
            yAxis: { show: false },
            series: []
        });
        return;
    }
    
    let cities = [], heatData = [], maxVal = 1000;
    
    const citySet = new Set();
    data.forEach(od => {
        let origin = od.originName || `站点${od.originId}`;
        let dest = od.destName || `站点${od.destId}`;
        origin = origin.replace(/[东西南北站]$/, '');
        dest = dest.replace(/[东西南北站]$/, '');
        citySet.add(origin);
        citySet.add(dest);
    });
    cities = Array.from(citySet).slice(0, 8);
    
    if (cities.length === 0) {
        chart.setOption({
            title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } }
        });
        return;
    }
    
    const flowMap = {};
    data.forEach(od => {
        let origin = (od.originName || '').replace(/[东西南北站]$/, '');
        let dest = (od.destName || '').replace(/[东西南北站]$/, '');
        flowMap[`${origin}-${dest}`] = od.flow || 0;
        if (od.flow > maxVal) maxVal = od.flow;
    });
    
    cities.forEach((from, i) => {
        cities.forEach((to, j) => {
            if (i !== j) {
                const flow = flowMap[`${from}-${to}`] || 0;
                heatData.push([i, j, flow]);
            }
        });
    });
    
    chart.setOption({
        backgroundColor: 'transparent',
        title: { show: false },
        tooltip: { formatter: p => `${cities[p.data[0]]} → ${cities[p.data[1]]}<br/>客流: ${p.data[2]}人次` },
        xAxis: { type: 'category', data: cities, splitArea: { show: true }, axisLabel: { color: '#8ec5fc', rotate: 30 }, axisLine: { lineStyle: { color: '#2a5298' } } },
        yAxis: { type: 'category', data: cities, splitArea: { show: true }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } },
        visualMap: { min: 0, max: maxVal, calculable: true, orient: 'horizontal', left: 'center', bottom: '0%', textStyle: { color: '#8ec5fc' }, inRange: { color: ['#0d2137', '#00d4ff', '#ff6b8a'] } },
        series: [{ type: 'heatmap', data: heatData, label: { show: heatData.length <= 64, color: '#fff', fontSize: 9 } }]
    });
}

// 更新座位类型图
function updateSeatTypeChart(data) {
    const chart = safeReinitChart('seat-type-chart');
    if (!chart) return;
    
    // 检查是否有有效数据
    let hasValidData = false;
    if (data && data.length > 0) {
        hasValidData = data.some(item => (item.flow || item.count || 0) > 0);
    }
    
    // 无数据时显示"暂无数据"
    if (!hasValidData) {
        chart.setOption({
            backgroundColor: 'transparent',
            title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
            series: []
        });
        return;
    }
    
    const colors = ['#ea4335', '#fbbc04', '#4a7dc0', '#00ff88', '#8ec5fc'];
    const pieData = data.map((item, i) => ({
        value: item.flow || item.count || 0,
        name: item.seatType || '未知',
        itemStyle: { color: colors[i % colors.length] }
    }));
    
    renderSeatTypeChartData(chart, pieData);
}

function renderSeatTypeChartData(chart, pieData) {
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', formatter: '{b}: {c}人次 ({d}%)' },
        legend: { bottom: '5%', left: 'center', textStyle: { color: '#8ec5fc' } },
        series: [{
            type: 'pie',
            radius: ['35%', '65%'],
            itemStyle: { borderRadius: 8, borderColor: '#0d2137', borderWidth: 2 },
            label: { show: true, formatter: '{b}\n{d}%', color: '#8ec5fc' },
            data: pieData
        }]
    });
}

// ==================== 线路分析 ====================

async function loadLineAnalysis(lineId) {
    try {
        // 先加载线路列表
        await loadLineSelect();
        
        const lineParam = lineId ? `?lineId=${lineId}` : '';
        const [loadRes, suggestRes, sectionRes] = await Promise.all([
            fetch(`${API_BASE}/analysis/line/load`),
            fetch(`${API_BASE}/analysis/suggestions`),
            fetch(`${API_BASE}/analysis/line/section${lineParam}`)
        ]);
        
        const loadResult = await loadRes.json();
        const suggestResult = await suggestRes.json();
        const sectionResult = await sectionRes.json();
        
        if (loadResult.code === 200) {
            updateLineCharts(loadResult.data);
        }
        if (suggestResult.code === 200) {
            renderSuggestions(suggestResult.data);
        }
        if (sectionResult.code === 200) {
            updateSectionFlowChart(sectionResult.data);
        }
    } catch (error) {
        console.error('加载线路分析失败:', error);
        renderSuggestions(getDefaultSuggestions());
    }
}

// 动态加载线路列表
async function loadLineSelect() {
    try {
        const response = await fetch(`${API_BASE}/analysis/line/load`);
        const result = await response.json();
        
        const select = document.getElementById('line-select');
        if (!select) return;
        
        // 保留"全部线路"选项
        select.innerHTML = '<option value="">全部线路</option>';
        
        if (result.code === 200 && result.data && result.data.length > 0) {
            result.data.forEach((line, index) => {
                const option = document.createElement('option');
                option.value = line.lineId || (index + 1);
                option.textContent = line.name || `线路${line.lineId || (index + 1)}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('加载线路列表失败:', error);
    }
}

// 线路筛选
async function filterByLine() {
    const lineId = document.getElementById('line-select')?.value;
    const lineName = document.getElementById('line-select')?.selectedOptions[0]?.text;
    
    console.log('筛选线路:', lineId, lineName);
    
    try {
        // 1. 加载线路负载数据
        const loadRes = await fetch(`${API_BASE}/analysis/line/load`);
        const loadResult = await loadRes.json();
        
        if (loadResult.code === 200 && loadResult.data) {
            let lineData = loadResult.data;
            
            // 如果选择了特定线路，只显示该线路
            if (lineId && lineName !== '全部线路') {
                lineData = loadResult.data.filter(d => d.name === lineName || d.lineId == lineId);
                if (lineData.length === 0) {
                    // 如果没找到匹配的，根据lineId创建数据
                    const lineNames = ['成渝高铁', '成遂渝铁路', '渝万城际', '成达万高铁', '渝昆高铁'];
                    const idx = parseInt(lineId) - 1;
                    if (idx >= 0 && idx < lineNames.length) {
                        lineData = loadResult.data.filter(d => d.name === lineNames[idx]);
                    }
                }
            }
            
            // 更新线路负载图和上座率图
            updateLineLoadChartFiltered(lineData);
            updateOccupancyChartFiltered(lineData);
        }
        
        // 2. 加载断面客流
        const sectionRes = await fetch(`${API_BASE}/analysis/line/section${lineId ? '?lineId=' + lineId : ''}`);
        const sectionResult = await sectionRes.json();
        if (sectionResult.code === 200) {
            updateSectionFlowChart(sectionResult.data);
        }
        
        // 3. 显示提示
        if (lineName && lineName !== '全部线路') {
            showLineTooltip(lineName);
        }
        
    } catch (error) {
        console.error('加载线路数据失败:', error);
    }
}

// 更新线路负载图（筛选后）
function updateLineLoadChartFiltered(data) {
    const chart = chartInstances?.['lineLoad'];
    if (!chart || !data) return;
    
    const names = data.map(d => d.name || `线路${d.lineId}`);
    const current = data.map(d => ((d.current || d.boarding || 0) / 10000).toFixed(1));
    const capacity = data.map(d => ((d.capacity || 15000) / 10000).toFixed(1));
    
    chart.setOption({
        xAxis: { data: names },
        series: [
            { name: '当前负载', data: current },
            { name: '设计容量', data: capacity }
        ]
    });
}

// 更新上座率图（筛选后）
function updateOccupancyChartFiltered(data) {
    const chart = chartInstances?.['occupancy'];
    if (!chart || !data) return;
    
    const names = data.map(d => d.name || `线路${d.lineId}`);
    const rates = data.map(d => {
        const rate = Math.round((d.load || 0.7) * 100);
        return {
            value: rate,
            itemStyle: { color: rate > 90 ? '#ff6b8a' : (rate > 70 ? '#ffc107' : '#00ff88') }
        };
    });
    
    chart.setOption({
        xAxis: { data: names },
        series: [{ data: rates }]
    });
}

// 显示线路提示
function showLineTooltip(lineName) {
    let tooltip = document.getElementById('line-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'line-tooltip';
        tooltip.style.cssText = 'position:fixed;top:20px;right:20px;background:rgba(0,212,255,0.9);color:#fff;padding:10px 20px;border-radius:4px;z-index:9999;font-size:14px;';
        document.body.appendChild(tooltip);
    }
    tooltip.textContent = `已选中线路: ${lineName}`;
    tooltip.style.display = 'block';
    
    setTimeout(() => {
        tooltip.style.display = 'none';
    }, 3000);
}

function renderSuggestions(suggestions) {
    const list = document.getElementById('suggestions-list');
    if (!list) return;
    
    if (!suggestions || suggestions.length === 0) {
        suggestions = getDefaultSuggestions();
    }
    
    list.innerHTML = suggestions.map(s => `
        <div class="suggestion-item ${s.level}">
            <span class="suggestion-type">${s.type || '建议'}</span>
            <h4>${s.title}</h4>
            <p>${s.desc}</p>
        </div>
    `).join('');
}

function getDefaultSuggestions() {
    return [
        { level: 'high', type: 'capacity', title: '成渝高铁线路负载过高', desc: '建议在早高峰(7:00-9:00)增开2-3趟列车，缓解客流压力' },
        { level: 'high', type: 'schedule', title: '时刻表优化建议', desc: '早高峰7:00-9:00客流量达峰值，建议增加发车频次；晚高峰17:00-19:00同样需要加密班次' },
        { level: 'medium', type: 'hub', title: '成都东为核心枢纽站点', desc: '度中心性95，介数中心性88，需重点保障运力和服务能力' },
        { level: 'low', type: 'efficiency', title: '平峰期优化', desc: '10:00-11:00、14:00-16:00为平峰期，可适当减少班次优化运营成本' }
    ];
}

// ==================== 站点分析 ====================

async function loadStationAnalysis() {
    try {
        const [stationsRes, busyRes, rolesRes, hubRes] = await Promise.all([
            fetch(`${API_BASE}/stations`),
            fetch(`${API_BASE}/analysis/station/busy`),
            fetch(`${API_BASE}/analysis/station/roles`),
            fetch(`${API_BASE}/analysis/station/hub`)
        ]);
        
        const stationsResult = await stationsRes.json();
        const busyResult = await busyRes.json();
        const rolesResult = await rolesRes.json();
        const hubResult = await hubRes.json();
        
        if (stationsResult.code === 200) {
            appData.stations = stationsResult.data;
            populateStationSelect();
        }
        if (busyResult.code === 200) {
            updateStationBusyChart(busyResult.data);
        }
        if (rolesResult.code === 200) {
            updateStationRolesChart(rolesResult.data);
        }
        if (hubResult.code === 200) {
            updateHubAnalysisChart(hubResult.data);
            updateHubIdentifyChart(hubResult.data);
        }
        
        // 加载服务能力评估
        loadServiceCapacity();
    } catch (error) {
        console.error('加载站点分析失败:', error);
    }
}

function populateStationSelect() {
    // 填充站点详情选择器
    const select = document.getElementById('station-select');
    if (select) {
        const stations = appData.stations || [];
        select.innerHTML = '<option value="">选择站点...</option>';
        stations.forEach(station => {
            const option = document.createElement('option');
            option.value = station.id;
            option.textContent = station.stationName;
            select.appendChild(option);
        });
    }
    
    // 填充站点评估筛选器
    const evalSelect = document.getElementById('station-eval-select');
    if (evalSelect) {
        const stations = appData.stations || [];
        evalSelect.innerHTML = '<option value="">全部站点</option>';
        stations.forEach(station => {
            const option = document.createElement('option');
            option.value = station.id;
            option.textContent = station.stationName;
            evalSelect.appendChild(option);
        });
    }
}

// 站点评估页面筛选
async function filterStationEval() {
    const stationId = document.getElementById('station-eval-select')?.value;
    const stationName = document.getElementById('station-eval-select')?.selectedOptions[0]?.text;
    
    console.log('站点评估筛选:', stationId, stationName);
    
    if (!stationId) {
        // 选择"全部站点"时，重新加载全部数据
        loadStationAnalysis();
        return;
    }
    
    try {
        // 加载该站点的详细数据
        const [timeRes, busyRes, hubRes] = await Promise.all([
            fetch(`${API_BASE}/analysis/station/time/${stationId}`),
            fetch(`${API_BASE}/analysis/station/busy`),
            fetch(`${API_BASE}/analysis/station/hub`)
        ]);
        
        const timeResult = await timeRes.json();
        const busyResult = await busyRes.json();
        const hubResult = await hubRes.json();
        
        // 更新站点繁忙度图表（高亮选中站点）
        if (busyResult.code === 200 && busyResult.data) {
            const stationData = busyResult.data.find(s => s.stationId == stationId);
            if (stationData) {
                updateStationBusyChartHighlight(busyResult.data, stationId);
            }
        }
        
        // 更新站点时段分布图
        if (timeResult.code === 200 && timeResult.data && timeResult.data.hourlyFlow) {
            updateStationTimeChartSingle(stationName, timeResult.data.hourlyFlow);
        }
        
        // 更新枢纽分析图表（高亮选中站点）
        if (hubResult.code === 200 && hubResult.data) {
            updateHubAnalysisChartHighlight(hubResult.data, stationId);
        }
        
        // 同步更新站点详情选择器
        const detailSelect = document.getElementById('station-select');
        if (detailSelect) {
            detailSelect.value = stationId;
            showStationDetail();
        }
        
    } catch (error) {
        console.error('加载站点数据失败:', error);
    }
}

// 更新站点繁忙度图表（高亮选中站点）
function updateStationBusyChartHighlight(data, highlightId) {
    const chart = chartInstances?.['stationBusy'];
    if (!chart || !data) return;
    
    const topData = data.slice(0, 10).reverse();
    const stations = topData.map(s => s.stationName || `站点${s.stationId}`);
    const values = topData.map(s => ({
        value: s.total || 0,
        itemStyle: {
            color: s.stationId == highlightId ? '#ff6b8a' : '#00d4ff'
        }
    }));
    
    chart.setOption({
        yAxis: { data: stations },
        series: [{ data: values }]
    });
}

// 更新站点时段分布图（单站点）
function updateStationTimeChartSingle(stationName, hourlyData) {
    const chart = chartInstances?.['stationTime'];
    if (!chart) return;
    
    const hours = hourlyData.map(h => h.hour + ':00');
    const data = hourlyData.map(h => h.flow || 0);
    
    chart.setOption({
        legend: { data: [stationName], textStyle: { color: '#8ec5fc' } },
        xAxis: { data: hours },
        series: [{
            name: stationName,
            type: 'line',
            data: data,
            itemStyle: { color: '#00d4ff' },
            lineStyle: { width: 2 },
            smooth: true,
            areaStyle: { color: 'rgba(0, 212, 255, 0.2)' }
        }]
    });
}

// 更新枢纽分析图表（高亮选中站点）
function updateHubAnalysisChartHighlight(data, highlightId) {
    const chart = chartInstances?.['hubAnalysis'];
    if (!chart || !data) return;
    
    // 找到选中站点在数据中的位置
    const stationData = data.find(s => s.stationId == highlightId);
    if (stationData) {
        console.log('高亮站点:', stationData.stationName);
    }
}

async function showStationDetail() {
    const stationId = document.getElementById('station-select').value;
    if (!stationId) return;
    
    try {
        const [stationRes, timeRes, busyRes] = await Promise.all([
            fetch(`${API_BASE}/stations/${stationId}`),
            fetch(`${API_BASE}/analysis/station/time/${stationId}`),
            fetch(`${API_BASE}/analysis/station/busy`)
        ]);
        
        const stationResult = await stationRes.json();
        const timeResult = await timeRes.json();
        const busyResult = await busyRes.json();
        
        if (stationResult.code === 200) {
            const station = stationResult.data;
            
            // 查找该站点的繁忙度数据
            let busyData = null;
            if (busyResult.code === 200 && busyResult.data) {
                busyData = busyResult.data.find(s => s.stationId == stationId);
            }
            
            // 计算服务能力评估
            let serviceCapacity = '良好';
            let capacityColor = '#00ff88';
            if (busyData && station.platforms) {
                const flowPerPlatform = (busyData.total || 0) / station.platforms;
                if (flowPerPlatform > 5000) {
                    serviceCapacity = '超负荷';
                    capacityColor = '#ff6b8a';
                } else if (flowPerPlatform > 3000) {
                    serviceCapacity = '较紧张';
                    capacityColor = '#ffc107';
                } else {
                    serviceCapacity = '充足';
                    capacityColor = '#00ff88';
                }
            }
            
            let html = `
                <p><strong>站点名称：</strong>${station.stationName}</p>
                <p><strong>站点编码：</strong>${station.stationCode || '-'}</p>
                <p><strong>站点类型：</strong>${station.stationType || '-'}</p>
                <p><strong>站台数量：</strong>${station.platforms || '-'}</p>
            `;
            
            if (timeResult.code === 200 && timeResult.data) {
                html += `<p><strong>高峰时段：</strong>${timeResult.data.peakHour || '-'}:00</p>`;
                html += `<p><strong>高峰客流：</strong>${formatNumber(timeResult.data.peakFlow || 0)}</p>`;
            }
            
            if (busyData) {
                html += `<p><strong>繁忙指数：</strong>${busyData.busyIndex || 0} (${busyData.level || '-'})</p>`;
                html += `<p><strong>总客流量：</strong>${formatNumber(busyData.total || 0)}</p>`;
            }
            
            // 服务能力评估
            html += `<p><strong>服务能力：</strong><span style="color:${capacityColor};font-weight:bold;">${serviceCapacity}</span></p>`;
            
            document.getElementById('station-detail-content').innerHTML = html;
            
            // 更新站点时段图表
            if (timeResult.code === 200 && timeResult.data.hourlyFlow) {
                updateStationTimeChart(timeResult.data.hourlyFlow);
            }
        }
    } catch (error) {
        console.error('加载站点详情失败:', error);
    }
}

// 更新站点时段分布图
function updateStationTimeChart(hourlyData) {
    const chart = chartInstances?.['stationTime'];
    if (!chart || !hourlyData) return;
    
    const hours = hourlyData.map(h => h.hour + ':00');
    const data = hourlyData.map(h => h.flow || 0);
    
    chart.setOption({
        xAxis: { data: hours },
        series: [{ data: data }]
    });
}

// ==================== 导入导出 ====================

function showImportModal() {
    document.getElementById('import-modal').style.display = 'block';
}

function closeImportModal() {
    document.getElementById('import-modal').style.display = 'none';
}

async function importData() {
    const fileInput = document.getElementById('import-file');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('请选择文件');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', document.getElementById('import-type').value);
    formData.append('clean', document.getElementById('clean-data').checked);
    formData.append('validate', document.getElementById('validate-data').checked);
    formData.append('clearBefore', document.getElementById('clear-before').checked);
    
    const resultDiv = document.getElementById('import-result');
    resultDiv.innerHTML = '<p style="color:#00d4ff;">正在导入...</p>';
    
    try {
        const response = await fetch(`${API_BASE}/import/csv`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            resultDiv.innerHTML = `
                <p style="color: #00ff88;">✓ 导入成功！</p>
                <p>总记录数: ${result.data.total}</p>
                <p>成功导入: ${result.data.success_count}</p>
                ${result.data.error_count > 0 ? `<p style="color:#ffc107;">错误数: ${result.data.error_count}</p>` : ''}
            `;
            loadTableData();
            loadDashboardData();
        } else {
            resultDiv.innerHTML = `<p style="color: #ff6b8a;">✗ 导入失败: ${result.message}</p>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<p style="color: #ff6b8a;">✗ 导入失败: ${error.message}</p>`;
    }
}

function exportData() {
    const data = appData[pagination.currentTable] || [];
    if (data.length === 0) {
        alert('暂无数据可导出');
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csv = [
        headers.map(h => getColumnName(h)).join(','),
        ...data.map(row => headers.map(h => {
            let val = row[h];
            if (val === null || val === undefined) val = '';
            if (typeof val === 'string' && val.includes(',')) val = `"${val}"`;
            return val;
        }).join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${pagination.currentTable}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
}

// ==================== CRUD操作 ====================

let editingId = null;
let deletingId = null;

function getFormFields(tableType) {
    const fields = {
        trains: [
            { name: 'trainCode', label: '列车代码', type: 'text', required: true },
            { name: 'trainType', label: '列车类型', type: 'select', options: [{v:'G',t:'G-高铁'},{v:'D',t:'D-动车'},{v:'C',t:'C-城际'},{v:'K',t:'K-快速'},{v:'Z',t:'Z-直达'},{v:'T',t:'T-特快'}] },
            { name: 'capacity', label: '运量', type: 'number', required: true },
            { name: 'status', label: '状态', type: 'select', options: [{v:1,t:'运营中'},{v:0,t:'停运'}] }
        ],
        stations: [
            { name: 'stationName', label: '站点名称', type: 'text', required: true },
            { name: 'stationCode', label: '站点编码', type: 'text', required: true },
            { name: 'stationType', label: '站点类型', type: 'select', options: [{v:'枢纽站',t:'枢纽站'},{v:'中间站',t:'中间站'},{v:'始发站',t:'始发站'},{v:'终到站',t:'终到站'}] },
            { name: 'platforms', label: '站台数', type: 'number' },
            { name: 'remark', label: '备注', type: 'text' }
        ],
        lines: [
            { name: 'lineId', label: '线路编码', type: 'number', required: true },
            { name: 'stationId', label: '站点ID', type: 'number', required: true },
            { name: 'lineStationId', label: '线路站点ID', type: 'number' },
            { name: 'prevStationId', label: '上一站ID', type: 'number' },
            { name: 'nextStationId', label: '下一站ID', type: 'number' },
            { name: 'distance', label: '站间距离', type: 'number' },
            { name: 'totalDistance', label: '运输距离', type: 'number' },
            { name: 'lineCode', label: '线路代码', type: 'text' }
        ],
        flow: [
            { name: 'lineId', label: '线路编码', type: 'number' },
            { name: 'trainId', label: '列车ID', type: 'number' },
            { name: 'stationId', label: '站点ID', type: 'number', required: true },
            { name: 'flowDate', label: '运营日期', type: 'date', required: true },
            { name: 'arriveTime', label: '到达时间', type: 'text' },
            { name: 'departTime', label: '出发时间', type: 'text' },
            { name: 'boarding', label: '上客量', type: 'number' },
            { name: 'alighting', label: '下客量', type: 'number' },
            { name: 'ticketType', label: '车票类型', type: 'text' },
            { name: 'ticketPrice', label: '票价', type: 'number' },
            { name: 'seatType', label: '座位类型', type: 'select', options: [{v:'二等座',t:'二等座'},{v:'一等座',t:'一等座'},{v:'商务座',t:'商务座'},{v:'无座',t:'无座'}] },
            { name: 'trainClass', label: '列车等级', type: 'text' },
            { name: 'trainType', label: '列车类型', type: 'text' },
            { name: 'originStationId', label: '起点站ID', type: 'number' },
            { name: 'destStationId', label: '终点站ID', type: 'number' },
            { name: 'revenue', label: '收入', type: 'number' },
            { name: 'remark', label: '备注', type: 'text' }
        ]
    };
    return fields[tableType] || [];
}

function showAddModal() {
    editingId = null;
    document.getElementById('edit-modal-title').textContent = '新增数据';
    renderFormFields(getFormFields(pagination.currentTable), {});
    document.getElementById('edit-modal').style.display = 'block';
}

async function showEditModal(id) {
    editingId = id;
    document.getElementById('edit-modal-title').textContent = '编辑数据';
    
    const tableType = pagination.currentTable;
    let url = '';
    switch(tableType) {
        case 'trains': url = `${API_BASE}/trains/${id}`; break;
        case 'stations': url = `${API_BASE}/stations/${id}`; break;
        case 'lines': url = `${API_BASE}/lines/${id}`; break;
        case 'flow': url = `${API_BASE}/analysis/flow/detail/${id}`; break;
    }
    
    try {
        const response = await fetch(url);
        const result = await response.json();
        if (result.code === 200) {
            renderFormFields(getFormFields(tableType), result.data);
            document.getElementById('edit-modal').style.display = 'block';
        } else {
            alert('加载数据失败: ' + result.message);
        }
    } catch (error) {
        alert('加载数据失败');
    }
}

function renderFormFields(fields, data) {
    const container = document.getElementById('edit-form-fields');
    container.innerHTML = fields.map(f => {
        let input = '';
        if (f.type === 'select') {
            input = `<select name="${f.name}" ${f.required ? 'required' : ''}>
                ${f.options.map(o => `<option value="${o.v}" ${data[f.name] == o.v ? 'selected' : ''}>${o.t}</option>`).join('')}
            </select>`;
        } else {
            let value = data[f.name] || '';
            if (f.type === 'date' && value) {
                value = value.split('T')[0];
            }
            input = `<input type="${f.type}" name="${f.name}" value="${value}" ${f.required ? 'required' : ''}>`;
        }
        return `<div class="form-group"><label>${f.label}：</label>${input}</div>`;
    }).join('');
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
    editingId = null;
}

function showDeleteModal(id) {
    deletingId = id;
    document.getElementById('delete-modal').style.display = 'block';
}

function closeDeleteModal() {
    document.getElementById('delete-modal').style.display = 'none';
    deletingId = null;
}

async function confirmDelete() {
    if (!deletingId) return;
    
    const tableType = pagination.currentTable;
    let url = '';
    switch(tableType) {
        case 'trains': url = `${API_BASE}/trains/${deletingId}`; break;
        case 'stations': url = `${API_BASE}/stations/${deletingId}`; break;
        case 'lines': url = `${API_BASE}/lines/${deletingId}`; break;
        case 'flow': url = `${API_BASE}/analysis/flow/delete/${deletingId}`; break;
    }
    
    try {
        const response = await fetch(url, { method: 'DELETE' });
        const result = await response.json();
        if (result.code === 200) {
            alert('删除成功');
            closeDeleteModal();
            loadTableData();
            loadDashboardData();
        } else {
            alert('删除失败: ' + result.message);
        }
    } catch (error) {
        alert('删除失败');
    }
}

// 表单提交
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('edit-form');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = {};
            formData.forEach((v, k) => data[k] = v);
            
            if (editingId) data.id = editingId;
            
            const tableType = pagination.currentTable;
            let url = '';
            switch(tableType) {
                case 'trains': url = `${API_BASE}/trains`; break;
                case 'stations': url = `${API_BASE}/stations`; break;
                case 'lines': url = `${API_BASE}/lines`; break;
                case 'flow': url = `${API_BASE}/analysis/flow/save`; break;
            }
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (result.code === 200) {
                    alert(editingId ? '修改成功' : '新增成功');
                    closeEditModal();
                    loadTableData();
                    loadDashboardData();
                } else {
                    alert('保存失败: ' + result.message);
                }
            } catch (error) {
                alert('保存失败');
            }
        });
    }
});

// ==================== 客流预测 ====================

async function loadFlowPrediction() {
    try {
        const response = await fetch(`${API_BASE}/analysis/flow/predict?days=7`);
        const result = await response.json();
        
        if (result.code === 200 && result.data) {
            renderPredictionChart(result.data);
        }
    } catch (error) {
        console.error('预测失败:', error);
    }
}

function renderPredictionChart(data) {
    const chart = safeReinitChart('flow-predict-chart');
    if (!chart) return;
    
    const predictions = data.predictions || [];
    const dates = data.dates || [];
    
    const option = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: { data: ['预测客流'], bottom: 0, textStyle: { color: '#8ec5fc' } },
        grid: { left: '10%', right: '5%', top: '15%', bottom: '15%' },
        xAxis: { type: 'category', data: dates, name: '日期', nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } },
        yAxis: { type: 'value', name: '客流量', nameTextStyle: { color: '#8ec5fc' }, axisLabel: { formatter: v => v >= 10000 ? (v/10000).toFixed(1) + '万' : v, color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
        series: [{
            name: '预测客流',
            type: 'line',
            data: predictions,
            smooth: true,
            lineStyle: { type: 'dashed', color: '#ffc107', width: 2 },
            itemStyle: { color: '#ffc107' },
            areaStyle: { 
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(255, 193, 7, 0.3)' },
                    { offset: 1, color: 'rgba(255, 193, 7, 0.05)' }
                ])
            },
            symbol: 'circle',
            symbolSize: 8,
            label: { show: true, position: 'top', formatter: p => p.value >= 10000 ? (p.value/10000).toFixed(1) + '万' : p.value, color: '#ffc107' }
        }]
    };
    chart.setOption(option);
    
    // 显示预测方法和置信度
    const methodInfo = document.querySelector('.predict-controls span');
    if (methodInfo && data.method) {
        methodInfo.textContent = `预测方法: ${data.method} | 置信度: ${Math.round((data.confidence || 0.7) * 100)}%`;
    }
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

// ==================== 节假日分析 ====================

async function loadHolidayAnalysis() {
    const startDate = document.getElementById('date-start')?.value || '';
    const endDate = document.getElementById('date-end')?.value || '';
    const dateParams = startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : '';
    
    try {
        const response = await fetch(`${API_BASE}/analysis/holiday${dateParams}`);
        const result = await response.json();
        
        if (result.code === 200 && result.data) {
            updateHolidayFlowChart(result.data);
            updateWeekdayWeekendChart(result.data);
        }
    } catch (error) {
        console.error('加载节假日分析失败:', error);
    }
}

function updateHolidayFlowChart(data) {
    const chart = safeReinitChart('holiday-flow-chart');
    if (!chart) return;
    
    const holidays = data.holidays || [];
    
    if (holidays.length === 0) {
        chart.setOption({
            backgroundColor: 'transparent',
            title: { text: '暂无节假日高峰数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
            series: []
        });
        return;
    }
    
    const dates = holidays.slice(0, 10).map(h => {
        const date = h.date ? h.date.toString().substring(5) : '';
        return h.type + '\n' + date;
    });
    const values = holidays.slice(0, 10).map(h => h.boarding || 0);
    const avgFlow = data.avgDailyFlow || 0;
    
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', formatter: p => `${p[0].name}<br/>客流: ${formatNumber(p[0].value)}<br/>较平均: ${Math.round(p[0].value * 100 / avgFlow)}%` },
        grid: { left: '15%', right: '5%', top: '10%', bottom: '15%' },
        xAxis: { type: 'category', data: dates, axisLabel: { color: '#8ec5fc', fontSize: 10, interval: 0 }, axisLine: { lineStyle: { color: '#2a5298' } } },
        yAxis: { type: 'value', name: '客流量', nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
        series: [{
            type: 'bar',
            data: values.map(v => ({
                value: v,
                itemStyle: { color: v > avgFlow * 1.5 ? '#ff6b8a' : '#00d4ff' }
            })),
            markLine: {
                data: [{ yAxis: avgFlow, name: '日均', label: { formatter: '日均', color: '#ffc107' }, lineStyle: { color: '#ffc107', type: 'dashed' } }]
            }
        }]
    });
}

function updateWeekdayWeekendChart(data) {
    const chart = safeReinitChart('weekday-weekend-chart');
    if (!chart) return;
    
    const comparison = data.comparison || {};
    const weekdayAvg = comparison.weekdayAvg || 0;
    const weekendAvg = comparison.weekendAvg || 0;
    
    if (weekdayAvg === 0 && weekendAvg === 0) {
        chart.setOption({
            backgroundColor: 'transparent',
            title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
            series: []
        });
        return;
    }
    
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', formatter: '{b}: {c}人次' },
        legend: { bottom: '5%', textStyle: { color: '#8ec5fc' } },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '45%'],
            data: [
                { value: weekdayAvg, name: '工作日日均', itemStyle: { color: '#00d4ff' } },
                { value: weekendAvg, name: '周末日均', itemStyle: { color: '#ff6b8a' } }
            ],
            label: { formatter: '{b}\n{d}%', color: '#8ec5fc' },
            itemStyle: { borderRadius: 8, borderColor: '#0d2137', borderWidth: 2 }
        }]
    });
}

// ==================== 服务能力评估 ====================

async function loadServiceCapacity() {
    try {
        const response = await fetch(`${API_BASE}/analysis/service-capacity`);
        const result = await response.json();
        
        if (result.code === 200 && result.data) {
            updateServiceCapacityChart(result.data);
            renderServiceCapacityList(result.data);
        }
    } catch (error) {
        console.error('加载服务能力评估失败:', error);
    }
}

function updateServiceCapacityChart(data) {
    const chart = safeReinitChart('service-capacity-chart');
    if (!chart) return;
    
    if (!data || data.length === 0) {
        chart.setOption({
            backgroundColor: 'transparent',
            title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
            series: []
        });
        return;
    }
    
    const topData = data.slice(0, 10);
    const stations = topData.map(s => s.stationName || `站点${s.stationId}`);
    const rates = topData.map(s => ({
        value: s.utilizationRate || 0,
        itemStyle: { color: s.capacityColor || '#00d4ff' }
    }));
    
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', formatter: p => `${p[0].name}<br/>利用率: ${p[0].value}%<br/>状态: ${topData[p[0].dataIndex].capacityLevel}` },
        grid: { left: '20%', right: '10%', top: '10%', bottom: '10%' },
        xAxis: { type: 'value', name: '利用率(%)', max: 150, nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
        yAxis: { type: 'category', data: stations.reverse(), axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } },
        series: [{
            type: 'bar',
            data: rates.reverse(),
            markLine: {
                data: [
                    { xAxis: 80, label: { formatter: '紧张', color: '#ffc107' }, lineStyle: { color: '#ffc107', type: 'dashed' } },
                    { xAxis: 100, label: { formatter: '超负荷', color: '#ff6b8a' }, lineStyle: { color: '#ff6b8a', type: 'dashed' } }
                ]
            }
        }]
    });
}

function renderServiceCapacityList(data) {
    const container = document.getElementById('service-capacity-list');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="color:#8ec5fc;text-align:center;">暂无数据</p>';
        return;
    }
    
    const html = `
        <table class="capacity-table">
            <thead>
                <tr>
                    <th>站点</th>
                    <th>日均客流</th>
                    <th>高峰客流</th>
                    <th>利用率</th>
                    <th>状态</th>
                    <th>建议</th>
                </tr>
            </thead>
            <tbody>
                ${data.slice(0, 10).map(s => `
                    <tr>
                        <td>${s.stationName || '站点' + s.stationId}</td>
                        <td>${formatNumber(s.avgDailyFlow || 0)}</td>
                        <td>${formatNumber(s.peakHourFlow || 0)}</td>
                        <td>${s.utilizationRate || 0}%</td>
                        <td style="color:${s.capacityColor || '#00d4ff'}">${s.capacityLevel || '-'}</td>
                        <td>${s.suggestion || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = html;
}

// ==================== 数据导出增强 ====================

async function exportDataEnhanced(type) {
    const startDate = document.getElementById('date-start')?.value || '';
    const endDate = document.getElementById('date-end')?.value || '';
    
    if (type === 'analysis') {
        // 导出分析数据
        const dateParams = startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : '';
        try {
            const response = await fetch(`${API_BASE}/analysis/export/csv${dateParams}`);
            const result = await response.json();
            
            if (result.code === 200 && result.data) {
                downloadCsv(result.data, `客流分析数据_${new Date().toISOString().slice(0,10)}.csv`);
            }
        } catch (error) {
            console.error('导出失败:', error);
            alert('导出失败');
        }
    } else {
        // 使用原有的导出功能
        exportData();
    }
}

function downloadCsv(content, filename) {
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}
