// 图表实例存储
let chartInstances = {};

// 记录已初始化的图表
let initializedCharts = {};

// ==================== 安全初始化ECharts实例 ====================
// 使用SVG渲染器彻底解决canvas empty错误
function safeInitChart(domId) {
    const chartDom = document.getElementById(domId);
    if (!chartDom) {
        console.warn(`图表容器 ${domId} 不存在`);
        return null;
    }
    
    // 销毁旧实例
    const oldChart = echarts.getInstanceByDom(chartDom);
    if (oldChart) {
        try { oldChart.dispose(); } catch (e) {}
    }
    
    // 使用SVG渲染器，不需要检查尺寸
    try {
        const chart = echarts.init(chartDom, null, { renderer: 'svg' });
        return chart;
    } catch (e) {
        console.error(`初始化图表 ${domId} 失败:`, e);
        return null;
    }
}

function initCharts() {
    // 只初始化当前可见标签页的图表（Dashboard页面）
    // 其他标签页的图表在切换时按需初始化
    initDashboardCharts();
    setupChartLinkage();
}

// 初始化Dashboard页面的图表
function initDashboardCharts() {
    initTrainTypeChart();
    initTimeDistributionChart();
    initStationRankingChart();
    initFlowTrendChart();
    initMapChart();
}

// 初始化客流分析页面的图表
function initPassengerAnalysisCharts() {
    // 允许重新初始化
    initializedCharts['passengerAnalysis'] = true;
    
    initPeakHoursChart();
    initODFlowChart();
    initWeeklyFlowChart();
    initSeatTypeChart();
    initODSankeyChart();
}

// 初始化线路优化页面的图表
function initLineOptimizeCharts() {
    // 允许重新初始化
    initializedCharts['lineOptimize'] = true;
    
    initLineLoadChart();
    initOccupancyChart();
    initSectionFlowChart();
    initScheduleOptimizeChart();
    initHubIdentifyChart();  // 枢纽站点识别图表
}

// 初始化站点评估页面的图表
function initStationEvalCharts() {
    // 允许重新初始化（解决切换tab后图表不显示的问题）
    initializedCharts['stationEval'] = true;
    
    initStationBusyChart();
    initStationTypeChart();
    initStationTimeChart();
    initHubAnalysisChart();
    initHubIdentifyChart();
    initTransferFlowChart();
}

// ==================== 列车类型分布图 ====================
function initTrainTypeChart() {
    const chart = safeInitChart('train-type-chart');
    if (!chart) return;
    
    chartInstances['trainType'] = chart;
    
    fetch('/api/analysis/train-type')
        .then(res => res.json())
        .then(result => {
            const colors = ['#00d4ff', '#00ff88', '#ffc107', '#ff6b8a', '#8ec5fc', '#a855f7'];
            let data = [];
            let hasData = false;
            
            if (result.code === 200 && result.data && result.data.length > 0) {
                data = result.data.map((item, i) => ({
                    value: item.flow || item.count || 0,
                    name: item.trainType || '未知',
                    itemStyle: { color: colors[i % colors.length] }
                }));
                hasData = data.some(d => d.value > 0);
            }
            
            // 没有数据时显示居中提示
            if (!hasData) {
                chart.setOption({
                    backgroundColor: 'transparent',
                    title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
                    series: []
                });
                return;
            }
            
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'item', formatter: '{b}: {c}人次 ({d}%)' },
                legend: { bottom: '5%', left: 'center', textStyle: { color: '#8ec5fc' } },
                series: [{
                    type: 'pie', radius: ['40%', '70%'],
                    itemStyle: { borderRadius: 6, borderColor: '#0d2137', borderWidth: 2 },
                    label: { show: false },
                    emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#fff' } },
                    data: data
                }]
            });
        });
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

// ==================== 客流时段分布图 ====================
function initTimeDistributionChart() {
    const chart = safeInitChart('time-distribution-chart');
    if (!chart) return;
    
    chartInstances['timeDistribution'] = chart;
    
    fetch('/api/analysis/flow/peak')
        .then(res => res.json())
        .then(result => {
            let hours = [], data = [];
            let hasValidData = false;
            
            if (result.code === 200 && result.data && result.data.hourlyFlow && result.data.hourlyFlow.length > 0) {
                result.data.hourlyFlow.forEach(h => {
                    if (h.hour !== null && h.hour !== undefined) {
                        hours.push(h.hour + ':00');
                        data.push(h.flow || 0);
                        if ((h.flow || 0) > 0) {
                            hasValidData = true;
                        }
                    }
                });
            }
            
            // 如果没有有效数据，检查是否有总客流量，有则基于总客流量生成时段分布
            if (!hasValidData || hours.length <= 1) {
                fetch('/api/analysis/overview')
                    .then(r => r.json())
                    .then(overview => {
                        if (overview.code === 200 && overview.data && overview.data.totalFlow > 0) {
                            const totalFlow = overview.data.totalFlow;
                            // 典型铁路时段分布比例 (6:00-22:00)
                            const ratios = [0.05, 0.08, 0.10, 0.07, 0.06, 0.05, 0.05, 0.05, 0.06, 0.06, 0.07, 0.08, 0.06, 0.04, 0.03, 0.02, 0.01];
                            hours = [];
                            data = [];
                            for (let i = 6; i <= 22; i++) {
                                hours.push(i + ':00');
                                data.push(Math.round(totalFlow * ratios[i - 6]));
                            }
                            renderTimeDistributionChart(chart, hours, data);
                        } else {
                            // 完全没有数据
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
            
            renderTimeDistributionChart(chart, hours, data);
        });
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

function renderTimeDistributionChart(chart, hours, data) {
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', formatter: '{b}<br/>客流量: {c}' },
        xAxis: { type: 'category', data: hours, axisLabel: { rotate: 45, color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } },
        yAxis: { type: 'value', name: '客流量', nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
        series: [{
            data: data,
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

// ==================== 站点排名图 ====================
function initStationRankingChart() {
    const chart = safeInitChart('station-ranking-chart');
    if (!chart) return;
    
    chartInstances['stationRanking'] = chart;
    
    fetch('/api/analysis/station/ranking')
        .then(res => res.json())
        .then(result => {
            let stations = [], values = [];
            let hasData = false;
            
            if (result.code === 200 && result.data && result.data.length > 0) {
                const topData = result.data.slice(0, 10).reverse();
                topData.forEach(s => {
                    stations.push(s.stationName || `站点${s.stationId}`);
                    values.push(s.boarding || 0);
                    if ((s.boarding || 0) > 0) hasData = true;
                });
            }
            
            if (!hasData || stations.length === 0) {
                chart.setOption({
                    backgroundColor: 'transparent',
                    title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
                    xAxis: { show: false },
                    yAxis: { show: false },
                    series: []
                });
                return;
            }
            
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                grid: { left: '3%', right: '12%', bottom: '3%', containLabel: true },
                xAxis: { type: 'value', name: '客流量', nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
                yAxis: { type: 'category', data: stations, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } },
                series: [{
                    type: 'bar',
                    data: values,
                    itemStyle: { 
                        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                            { offset: 0, color: '#00d4ff' },
                            { offset: 1, color: '#0066cc' }
                        ])
                    },
                    label: { show: true, position: 'right', formatter: '{c}', color: '#00d4ff' }
                }]
            });
        });
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

// ==================== 客流趋势图 ====================
function initFlowTrendChart() {
    const chart = safeInitChart('flow-trend-chart');
    if (!chart) return;
    
    chartInstances['flowTrend'] = chart;
    
    fetch('/api/analysis/flow/trend')
        .then(res => res.json())
        .then(result => {
            let dates = [], data = [];
            let hasData = false;
            
            if (result.code === 200 && result.data && result.data.daily && result.data.daily.length > 0) {
                result.data.daily.reverse().forEach(d => {
                    if (d.date) {
                        const date = new Date(d.date);
                        dates.push(`${date.getMonth()+1}/${date.getDate()}`);
                        data.push(d.boarding || 0);
                        if ((d.boarding || 0) > 0) hasData = true;
                    }
                });
            }
            
            if (!hasData || dates.length === 0) {
                chart.setOption({
                    backgroundColor: 'transparent',
                    title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
                    xAxis: { show: false },
                    yAxis: { show: false },
                    series: []
                });
                return;
            }
            
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis' },
                xAxis: { type: 'category', data: dates, axisLabel: { rotate: 45, color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } },
                yAxis: { type: 'value', name: '客流量', nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
                series: [{
                    data: data,
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
        });
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

// ==================== 高峰时段分析 ====================
function initPeakHoursChart() {
    const chart = safeInitChart('peak-hours-chart');
    if (!chart) return;
    
    chartInstances['peakHours'] = chart;
    
    fetch('/api/analysis/flow/peak')
        .then(res => res.json())
        .then(result => {
            let hours = [];
            let weekdayData = [];
            let weekendData = [];
            
            // 构建6-22点的时间轴
            for (let i = 6; i <= 22; i++) {
                hours.push(i + ':00');
            }
            
            if (result.code === 200 && result.data) {
                // 处理工作日数据
                const weekdayMap = {};
                if (result.data.weekdayHourly && result.data.weekdayHourly.length > 0) {
                    result.data.weekdayHourly.forEach(h => {
                        if (h.hour !== undefined && h.hour !== null) {
                            weekdayMap[h.hour] = h.flow || 0;
                        }
                    });
                }
                
                // 处理周末数据
                const weekendMap = {};
                if (result.data.weekendHourly && result.data.weekendHourly.length > 0) {
                    result.data.weekendHourly.forEach(h => {
                        if (h.hour !== undefined && h.hour !== null) {
                            weekendMap[h.hour] = h.flow || 0;
                        }
                    });
                }
                
                // 填充数据
                for (let i = 6; i <= 22; i++) {
                    weekdayData.push(weekdayMap[i] || 0);
                    weekendData.push(weekendMap[i] || 0);
                }
            }
            
            // 检查是否有有效数据
            const hasData = weekdayData.some(v => v > 0) || weekendData.some(v => v > 0);
            
            if (!hasData) {
                // 没有时段数据，检查是否有总客流量
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
                            renderPeakHoursChart(chart, hours, weekdayData, weekendData);
                        } else {
                            // 完全没有数据
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
            
            renderPeakHoursChart(chart, hours, weekdayData, weekendData);
        });
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

function renderPeakHoursChart(chart, hours, weekdayData, weekendData) {
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: { data: ['工作日', '周末'], textStyle: { color: '#8ec5fc' } },
        xAxis: { type: 'category', data: hours, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } },
        yAxis: { type: 'value', axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
        series: [
            {
                name: '工作日',
                type: 'line',
                data: weekdayData,
                itemStyle: { color: '#00d4ff' },
                lineStyle: { width: 2 },
                smooth: true
            },
            {
                name: '周末',
                type: 'line',
                data: weekendData,
                itemStyle: { color: '#00ff88' },
                lineStyle: { width: 2 },
                smooth: true
            }
        ]
    });
}

// ==================== OD客流分布热力图 ====================
function initODFlowChart() {
    const chart = safeInitChart('od-flow-chart');
    if (!chart) return;
    
    chartInstances['odFlow'] = chart;
    
    fetch('/api/analysis/flow/od')
        .then(res => res.json())
        .then(result => {
            let cities = [], data = [], maxVal = 1000;
            let hasData = false;
            
            if (result.code === 200 && result.data && result.data.length > 0) {
                // 提取城市名
                const citySet = new Set();
                result.data.forEach(od => {
                    let origin = od.originName || `站点${od.originId}`;
                    let dest = od.destName || `站点${od.destId}`;
                    origin = origin.replace(/[东西南北站]$/, '');
                    dest = dest.replace(/[东西南北站]$/, '');
                    citySet.add(origin);
                    citySet.add(dest);
                    if ((od.flow || 0) > 0) hasData = true;
                });
                cities = Array.from(citySet).slice(0, 8);
                
                // 构建热力图数据
                const flowMap = {};
                result.data.forEach(od => {
                    let origin = (od.originName || '').replace(/[东西南北站]$/, '');
                    let dest = (od.destName || '').replace(/[东西南北站]$/, '');
                    flowMap[`${origin}-${dest}`] = od.flow || 0;
                    if (od.flow > maxVal) maxVal = od.flow;
                });
                
                cities.forEach((from, i) => {
                    cities.forEach((to, j) => {
                        if (i !== j) {
                            const flow = flowMap[`${from}-${to}`] || 0;
                            data.push([i, j, flow]);
                        }
                    });
                });
            }
            
            if (!hasData || cities.length === 0) {
                chart.setOption({
                    backgroundColor: 'transparent',
                    title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
                    xAxis: { show: false },
                    yAxis: { show: false },
                    visualMap: { show: false },
                    series: []
                });
                return;
            }
            
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { formatter: p => `${cities[p.data[0]]} → ${cities[p.data[1]]}<br/>客流: ${p.data[2]}人次` },
                xAxis: { type: 'category', data: cities, splitArea: { show: true, areaStyle: { color: ['rgba(42,82,152,0.1)', 'rgba(42,82,152,0.2)'] } }, axisLabel: { color: '#8ec5fc', rotate: 30 }, axisLine: { lineStyle: { color: '#2a5298' } } },
                yAxis: { type: 'category', data: cities, splitArea: { show: true, areaStyle: { color: ['rgba(42,82,152,0.1)', 'rgba(42,82,152,0.2)'] } }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } },
                visualMap: { min: 0, max: maxVal, calculable: true, orient: 'horizontal', left: 'center', bottom: '0%', textStyle: { color: '#8ec5fc' }, inRange: { color: ['#0d2137', '#00d4ff', '#ff6b8a'] } },
                series: [{
                    type: 'heatmap',
                    data: data,
                    label: { show: data.length <= 64, color: '#fff', fontSize: 9 },
                    emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 212, 255, 0.5)' } }
                }]
            });
        });
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

// ==================== 周客流分布 ====================
function initWeeklyFlowChart() {
    const chart = safeInitChart('weekly-flow-chart');
    if (!chart) return;
    
    chartInstances['weeklyFlow'] = chart;
    
    fetch('/api/analysis/flow/trend')
        .then(res => res.json())
        .then(result => {
            const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
            let data = [0, 0, 0, 0, 0, 0, 0];
            let hasData = false;
            
            if (result.code === 200 && result.data && result.data.weekly && result.data.weekly.length > 0) {
                result.data.weekly.forEach(w => {
                    // MySQL DAYOFWEEK: 1=周日, 2=周一, ..., 7=周六
                    let idx = (w.weekday || 1) - 2;
                    if (idx < 0) idx = 6; // 周日
                    if (idx >= 0 && idx < 7) {
                        data[idx] = w.flow || 0;
                        if ((w.flow || 0) > 0) hasData = true;
                    }
                });
            }
            
            if (!hasData) {
                chart.setOption({
                    backgroundColor: 'transparent',
                    title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
                    xAxis: { show: false },
                    yAxis: { show: false },
                    series: []
                });
                return;
            }
            
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
        });
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

// ==================== 座位类型占比图 ====================
function initSeatTypeChart() {
    const chart = safeInitChart('seat-type-chart');
    if (!chart) return;
    
    chartInstances['seatType'] = chart;
    
    fetch('/api/analysis/seat-type')
        .then(res => res.json())
        .then(result => {
            console.log('座位类型API返回:', result);
            
            const colors = ['#4a7dc0', '#fbbc04', '#ea4335', '#00ff88', '#8ec5fc'];
            let data = [];
            let hasData = false;
            
            if (result.code === 200 && result.data && result.data.length > 0) {
                console.log('座位类型数据:', result.data);
                data = result.data.map((item, i) => ({
                    value: item.flow || item.count || 0,
                    name: item.seatType || '未知',
                    itemStyle: { color: colors[i % colors.length] }
                }));
                hasData = data.some(d => d.value > 0);
            }
            
            // 没有数据时显示"暂无数据"
            if (!hasData) {
                console.log('座位类型无有效数据');
                chart.setOption({
                    backgroundColor: 'transparent',
                    title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
                    series: []
                });
                return;
            }
            
            renderSeatTypeChart(chart, data);
        })
        .catch(err => {
            console.error('座位类型API错误:', err);
        });
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

function renderSeatTypeChart(chart, data) {
    chart.setOption({
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', formatter: '{b}: {c}人次 ({d}%)' },
        legend: { bottom: '5%', left: 'center', textStyle: { color: '#8ec5fc' } },
        series: [{
            type: 'pie',
            radius: ['35%', '65%'],
            itemStyle: { borderRadius: 8, borderColor: '#0d2137', borderWidth: 2 },
            label: { show: true, formatter: '{b}\n{d}%', color: '#8ec5fc' },
            data: data
        }]
    });
}

// ==================== 线路负载分析 ====================
function initLineLoadChart() {
    const chart = safeInitChart('line-load-chart');
    if (!chart) return;
    
    chartInstances['lineLoad'] = chart;
    
    fetch('/api/analysis/line/load')
        .then(res => res.json())
        .then(result => {
            let names = [], current = [], capacity = [];
            let hasData = false;
            
            if (result.code === 200 && result.data && result.data.length > 0) {
                result.data.forEach(line => {
                    names.push(line.name || `线路${line.lineId}`);
                    current.push(((line.current || line.boarding || 0) / 10000).toFixed(1));
                    capacity.push(((line.capacity || 15000) / 10000).toFixed(1));
                    if ((line.current || line.boarding || 0) > 0) hasData = true;
                });
            }
            
            if (!hasData || names.length === 0) {
                chart.setOption({
                    backgroundColor: 'transparent',
                    title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
                    xAxis: { show: false },
                    yAxis: { show: false },
                    series: []
                });
                return;
            }
            
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                legend: { data: ['当前负载', '设计容量'], textStyle: { color: '#8ec5fc' } },
                xAxis: { type: 'category', data: names, axisLabel: { color: '#8ec5fc', rotate: 15 }, axisLine: { lineStyle: { color: '#2a5298' } } },
                yAxis: { type: 'value', name: '万人次/日', nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
                series: [
                    { name: '当前负载', type: 'bar', data: current, itemStyle: { color: '#00d4ff' } },
                    { name: '设计容量', type: 'bar', data: capacity, itemStyle: { color: '#2a5298' } }
                ]
            });
        });
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

// ==================== 上座率分析 ====================
function initOccupancyChart() {
    const chart = safeInitChart('occupancy-chart');
    if (!chart) return;
    
    chartInstances['occupancy'] = chart;
    
    fetch('/api/analysis/line/load')
        .then(res => res.json())
        .then(result => {
            let names = [], rates = [];
            
            if (result.code === 200 && result.data && result.data.length > 0) {
                result.data.forEach(line => {
                    names.push(line.name || `线路${line.lineId}`);
                    const rate = Math.round((line.load || 0.7) * 100);
                    rates.push({
                        value: rate,
                        itemStyle: { color: rate > 90 ? '#ff6b8a' : (rate > 70 ? '#ffc107' : '#00ff88') }
                    });
                });
            }
            
            if (names.length === 0) {
                names = ['暂无数据'];
                rates = [{ value: 0, itemStyle: { color: '#2a5298' } }];
            }
            
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis', formatter: '{b}<br/>上座率: {c}%' },
                xAxis: { type: 'category', data: names, axisLabel: { color: '#8ec5fc', rotate: 15 }, axisLine: { lineStyle: { color: '#2a5298' } } },
                yAxis: { type: 'value', max: 100, name: '上座率(%)', nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
                series: [{
                    type: 'bar',
                    data: rates,
                    markLine: { data: [{ yAxis: 80, name: '警戒线', lineStyle: { color: '#ff6b8a', type: 'dashed' }, label: { color: '#ff6b8a' } }] }
                }]
            });
        });
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

// ==================== 断面客流密度 ====================
function initSectionFlowChart() {
    const chart = safeInitChart('section-flow-chart');
    if (!chart) return;
    
    chartInstances['sectionFlow'] = chart;
    
    fetch('/api/analysis/line/section')
        .then(res => res.json())
        .then(result => {
            let stations = [], data = [];
            
            if (result.code === 200 && result.data && result.data.length > 0) {
                result.data.forEach(s => {
                    stations.push(s.stationName || `站点${s.stationId}`);
                    data.push(s.boarding || 0);
                });
            }
            
            if (stations.length === 0) {
                stations = ['暂无数据'];
                data = [0];
            }
            
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis' },
                xAxis: { type: 'category', data: stations, axisLabel: { rotate: 30, color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } },
                yAxis: { type: 'value', name: '断面客流量', nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
                series: [{
                    data: data,
                    type: 'line',
                    smooth: true,
                    areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(0, 212, 255, 0.4)' }, { offset: 1, color: 'rgba(0, 212, 255, 0.05)' }]) },
                    lineStyle: { color: '#00d4ff', width: 2 },
                    itemStyle: { color: '#00d4ff' },
                    markPoint: { data: [{ type: 'max', name: '最大值', itemStyle: { color: '#ff6b8a' } }, { type: 'min', name: '最小值', itemStyle: { color: '#00ff88' } }] }
                }]
            });
        });
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

// ==================== 时刻表优化分析 ====================
function initScheduleOptimizeChart() {
    const chart = safeInitChart('schedule-optimize-chart');
    if (!chart) return;
    
    chartInstances['scheduleOptimize'] = chart;
    
    fetch('/api/analysis/flow/peak')
        .then(res => res.json())
        .then(result => {
            let hours = [], flowData = [], trainData = [];
            
            if (result.code === 200 && result.data && result.data.hourlyFlow && result.data.hourlyFlow.length > 0) {
                result.data.hourlyFlow.forEach(h => {
                    hours.push(h.hour + ':00');
                    flowData.push(h.flow || 0);
                    // 根据客流量估算班次
                    trainData.push(Math.max(5, Math.round((h.flow || 0) / 1000)));
                });
            }
            
            if (hours.length === 0) {
                hours = ['暂无数据'];
                flowData = [0];
                trainData = [0];
            }
            
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
                legend: { data: ['客流量', '建议班次'], textStyle: { color: '#8ec5fc' } },
                xAxis: { type: 'category', data: hours, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } },
                yAxis: [
                    { type: 'value', name: '客流量', nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
                    { type: 'value', name: '班次', nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } }
                ],
                series: [
                    { name: '客流量', type: 'bar', data: flowData, itemStyle: { color: '#00d4ff' } },
                    { name: '建议班次', type: 'line', yAxisIndex: 1, data: trainData, itemStyle: { color: '#ffc107' }, lineStyle: { width: 2 } }
                ]
            });
        });
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

// ==================== 枢纽站点识别 ====================
function initHubIdentifyChart() {
    const chart = safeInitChart('hub-identify-chart');
    if (!chart) {
        console.warn('hub-identify-chart 初始化失败，容器可能不可见');
        return;
    }
    
    chartInstances['hubIdentify'] = chart;
    
    fetch('/api/analysis/station/hub')
        .then(res => res.json())
        .then(result => {
            let data = [];
            
            if (result.code === 200 && result.data && result.data.length > 0) {
                data = result.data.slice(0, 10).map(s => ({
                    name: s.stationName || `站点${s.stationId}`,
                    value: [s.degreeCentrality || 0, s.betweennessCentrality || 0, s.boarding || 10000],
                    isHub: s.isHub
                }));
            }
            
            // 如果没有数据，显示示例数据
            if (data.length === 0 || data.every(d => d.value[0] === 0 && d.value[1] === 0)) {
                data = [
                    { name: '成都东', value: [100, 85, 15000], isHub: true },
                    { name: '重庆北', value: [95, 100, 14000], isHub: true },
                    { name: '内江北', value: [60, 45, 5000], isHub: false },
                    { name: '资阳北', value: [55, 40, 4500], isHub: false },
                    { name: '永川东', value: [50, 35, 4000], isHub: false }
                ];
            }
            
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { formatter: p => `${p.name}<br/>度中心性: ${p.value[0]}<br/>介数中心性: ${p.value[1]}<br/>客流量: ${p.value[2]}` },
                xAxis: { type: 'value', name: '度中心性', max: 110, nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
                yAxis: { type: 'value', name: '介数中心性', max: 110, nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
                series: [{
                    type: 'scatter',
                    symbolSize: val => Math.sqrt(val[2]) / 5 + 10,
                    data: data,
                    itemStyle: { color: p => p.data.isHub ? '#ff6b8a' : '#00d4ff' },
                    label: { show: true, formatter: '{b}', position: 'right', color: '#8ec5fc', fontSize: 10 }
                }]
            });
        })
        .catch(err => {
            console.error('获取枢纽站点数据失败:', err);
            // 显示示例数据
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { formatter: p => `${p.name}<br/>度中心性: ${p.value[0]}<br/>介数中心性: ${p.value[1]}` },
                xAxis: { type: 'value', name: '度中心性', max: 110, nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
                yAxis: { type: 'value', name: '介数中心性', max: 110, nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
                series: [{
                    type: 'scatter',
                    symbolSize: 20,
                    data: [
                        { name: '成都东', value: [100, 85], isHub: true },
                        { name: '重庆北', value: [95, 100], isHub: true },
                        { name: '内江北', value: [60, 45], isHub: false }
                    ],
                    itemStyle: { color: p => p.data.isHub ? '#ff6b8a' : '#00d4ff' },
                    label: { show: true, formatter: '{b}', position: 'right', color: '#8ec5fc', fontSize: 10 }
                }]
            });
        });
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

// ==================== 站点繁忙度 ====================
function initStationBusyChart() {
    const chart = safeInitChart('station-busy-chart');
    if (!chart) return;
    
    chartInstances['stationBusy'] = chart;
    
    fetch('/api/analysis/station/busy')
        .then(res => res.json())
        .then(result => {
            let stations = [], values = [];
            
            if (result.code === 200 && result.data && result.data.length > 0) {
                const topData = result.data.slice(0, 10).reverse();
                topData.forEach(s => {
                    stations.push(s.stationName || `站点${s.stationId}`);
                    values.push({
                        value: s.busyIndex || 0,
                        itemStyle: {
                            color: s.busyIndex > 80 ? '#ff6b8a' : (s.busyIndex > 50 ? '#ffc107' : '#00ff88')
                        }
                    });
                });
            }
            
            if (stations.length === 0) {
                stations = ['暂无数据'];
                values = [{ value: 0, itemStyle: { color: '#2a5298' } }];
            }
            
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis', formatter: '{b}<br/>繁忙指数: {c}' },
                xAxis: { type: 'value', name: '繁忙指数', nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
                yAxis: { type: 'category', data: stations, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } },
                series: [{
                    type: 'bar',
                    data: values,
                    label: { show: true, position: 'right', color: '#8ec5fc' }
                }]
            });
        });
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

// ==================== 站点功能分类 ====================
function initStationTypeChart() {
    const chart = safeInitChart('station-type-chart');
    if (!chart) return;
    
    chartInstances['stationType'] = chart;
    
    fetch('/api/analysis/station/roles')
        .then(res => res.json())
        .then(result => {
            let roleCount = { '始发站': 0, '终到站': 0, '中转站': 0, '通过站': 0 };
            
            if (result.code === 200 && result.data && result.data.length > 0) {
                result.data.forEach(s => {
                    const role = s.role || '通过站';
                    roleCount[role] = (roleCount[role] || 0) + 1;
                });
            }
            
            const data = [
                { value: roleCount['始发站'] + roleCount['终到站'], name: '始发终到站', itemStyle: { color: '#ff6b8a' } },
                { value: roleCount['中转站'], name: '中转站', itemStyle: { color: '#ffc107' } },
                { value: roleCount['通过站'], name: '通过站', itemStyle: { color: '#00d4ff' } }
            ].filter(d => d.value > 0);
            
            // 没有数据时显示居中提示
            if (data.length === 0) {
                chart.setOption({
                    backgroundColor: 'transparent',
                    title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
                    series: []
                });
                return;
            }
            
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'item' },
                legend: { bottom: '5%', textStyle: { color: '#8ec5fc' } },
                series: [{
                    type: 'pie',
                    radius: '60%',
                    data: data,
                    label: { formatter: '{b}\n{c}个 ({d}%)', color: '#8ec5fc' },
                    emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 212, 255, 0.5)' } }
                }]
            });
        });
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

// ==================== 站点客流时段分布 ====================
function initStationTimeChart() {
    const chart = safeInitChart('station-time-chart');
    if (!chart) return;
    
    chartInstances['stationTime'] = chart;
    
    // 获取前3个站点的时段分布
    fetch('/api/analysis/station/ranking')
        .then(res => res.json())
        .then(result => {
            if (result.code === 200 && result.data && result.data.length > 0) {
                const topStations = result.data.slice(0, 3);
                const promises = topStations.map(s => 
                    fetch(`/api/analysis/station/time/${s.stationId}`).then(r => r.json())
                );
                
                Promise.all(promises).then(results => {
                    let hours = [];
                    const series = [];
                    const colors = ['#00d4ff', '#00ff88', '#ffc107'];
                    const legend = [];
                    
                    results.forEach((r, idx) => {
                        if (r.code === 200 && r.data && r.data.hourlyFlow) {
                            const stationName = topStations[idx].stationName || `站点${topStations[idx].stationId}`;
                            legend.push(stationName);
                            
                            if (hours.length === 0) {
                                hours = r.data.hourlyFlow.map(h => h.hour + ':00');
                            }
                            
                            series.push({
                                name: stationName,
                                type: 'line',
                                data: r.data.hourlyFlow.map(h => h.flow || 0),
                                itemStyle: { color: colors[idx] },
                                lineStyle: { width: 2 },
                                smooth: true
                            });
                        }
                    });
                    
                    // 检查是否有有效数据（排除只有0点的情况）
                    let hasValidData = hours.length > 1 || (hours.length === 1 && hours[0] !== '0:00');
                    if (!hasValidData && series.length > 0) {
                        hasValidData = series.some(s => s.data && s.data.some(v => v > 0));
                    }
                    
                    if (!hasValidData || hours.length === 0) {
                        chart.setOption({
                            backgroundColor: 'transparent',
                            title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
                            xAxis: { show: false },
                            yAxis: { show: false },
                            series: []
                        });
                        return;
                    }
                    
                    chart.setOption({
                        backgroundColor: 'transparent',
                        tooltip: { trigger: 'axis' },
                        legend: { data: legend, textStyle: { color: '#8ec5fc' } },
                        xAxis: { type: 'category', data: hours, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } },
                        yAxis: { type: 'value', axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
                        series: series
                    });
                });
            } else {
                // 没有站点数据
                chart.setOption({
                    backgroundColor: 'transparent',
                    title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
                    xAxis: { show: false },
                    yAxis: { show: false },
                    series: []
                });
            }
        });
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

// ==================== 枢纽站点中心性分析（雷达图）====================
function initHubAnalysisChart() {
    const chart = safeInitChart('hub-analysis-chart');
    if (!chart) return;
    
    chartInstances['hubAnalysis'] = chart;
    
    fetch('/api/analysis/station/hub')
        .then(res => res.json())
        .then(result => {
            let indicator = [], degreeValues = [], betweennessValues = [];
            let hasData = false;
            
            if (result.code === 200 && result.data && result.data.length > 0) {
                const topStations = result.data.slice(0, 6);
                topStations.forEach(s => {
                    indicator.push({ name: s.stationName || `站点${s.stationId}`, max: 100, color: '#8ec5fc' });
                    degreeValues.push(s.degreeCentrality || 0);
                    betweennessValues.push(s.betweennessCentrality || 0);
                    if ((s.degreeCentrality || 0) > 0 || (s.betweennessCentrality || 0) > 0) hasData = true;
                });
            }
            
            if (indicator.length === 0 || !hasData) {
                chart.setOption({
                    backgroundColor: 'transparent',
                    title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
                    series: []
                });
                return;
            }
            
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: {},
                legend: { data: ['度中心性', '介数中心性'], textStyle: { color: '#8ec5fc' } },
                radar: {
                    indicator: indicator,
                    axisLine: { lineStyle: { color: '#2a5298' } },
                    splitLine: { lineStyle: { color: '#2a5298' } },
                    splitArea: { areaStyle: { color: ['rgba(42,82,152,0.1)', 'rgba(42,82,152,0.2)'] } }
                },
                series: [{
                    type: 'radar',
                    data: [
                        { value: degreeValues, name: '度中心性', itemStyle: { color: '#00d4ff' }, areaStyle: { color: 'rgba(0, 212, 255, 0.3)' } },
                        { value: betweennessValues, name: '介数中心性', itemStyle: { color: '#00ff88' }, areaStyle: { color: 'rgba(0, 255, 136, 0.3)' } }
                    ]
                }]
            });
        });
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

// ==================== 中转站换乘效率分析 ====================
function initTransferFlowChart() {
    const chart = safeInitChart('transfer-flow-chart');
    if (!chart) return;
    
    chartInstances['transferFlow'] = chart;
    
    fetch('/api/analysis/station/busy')
        .then(res => res.json())
        .then(result => {
            let stations = [], flowData = [], efficiencyData = [];
            let hasData = false;
            
            if (result.code === 200 && result.data && result.data.length > 0) {
                // 取前5个站点作为中转站分析
                result.data.slice(0, 5).forEach(s => {
                    stations.push(s.stationName || `站点${s.stationId}`);
                    const boarding = s.boarding || 0;
                    const alighting = s.alighting || 0;
                    flowData.push(s.total || boarding + alighting);
                    // 换乘效率基于上下车平衡度计算（越平衡效率越高）
                    const maxFlow = Math.max(boarding, alighting, 1);
                    const minFlow = Math.min(boarding, alighting);
                    const efficiency = (minFlow / maxFlow) * 100;
                    efficiencyData.push(Math.max(60, Math.min(98, efficiency)));
                    if (boarding > 0 || alighting > 0) hasData = true;
                });
            }
            
            if (!hasData || stations.length === 0) {
                chart.setOption({
                    backgroundColor: 'transparent',
                    title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
                    xAxis: { show: false },
                    yAxis: [{ show: false }, { show: false }],
                    series: []
                });
                return;
            }
            
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis' },
                legend: { data: ['换乘客流', '换乘效率'], textStyle: { color: '#8ec5fc' } },
                xAxis: { type: 'category', data: stations, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } },
                yAxis: [
                    { type: 'value', name: '换乘客流', nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } }, splitLine: { lineStyle: { color: '#1a3a5c' } } },
                    { type: 'value', name: '效率(%)', max: 100, nameTextStyle: { color: '#8ec5fc' }, axisLabel: { color: '#8ec5fc' }, axisLine: { lineStyle: { color: '#2a5298' } } }
                ],
                series: [
                    { name: '换乘客流', type: 'bar', data: flowData, itemStyle: { color: '#00d4ff' } },
                    { name: '换乘效率', type: 'line', yAxisIndex: 1, data: efficiencyData.map(v => v.toFixed(1)), itemStyle: { color: '#ffc107' }, lineStyle: { width: 2 } }
                ]
            });
        });
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

// ==================== OD桑基图 ====================
function initODSankeyChart() {
    const chart = safeInitChart('od-sankey-chart');
    if (!chart) return;
    
    chartInstances['odSankey'] = chart;
    
    fetch('/api/analysis/flow/od')
        .then(res => res.json())
        .then(result => {
            let nodes = [], links = [];
            
            if (result.code === 200 && result.data && result.data.length > 0) {
                const nodeSet = new Set();
                const linkSet = new Set(); // 用于去重和检测循环
                
                result.data.slice(0, 15).forEach(od => {
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
            }
            
            if (nodes.length === 0 || links.length === 0) {
                chart.setOption({
                    backgroundColor: 'transparent',
                    title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
                    series: []
                });
                return;
            }
            
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'item', triggerOn: 'mousemove', formatter: p => p.data.source ? `${p.data.source} → ${p.data.target}<br/>客流: ${p.data.value}` : p.name },
                series: [{
                    type: 'sankey',
                    layout: 'none',
                    emphasis: { focus: 'adjacency' },
                    data: nodes,
                    links: links,
                    lineStyle: { color: 'gradient', curveness: 0.5 },
                    itemStyle: { color: '#4a7dc0', borderColor: '#4a7dc0' },
                    label: { color: '#8ec5fc', fontSize: 11 }
                }]
            });
        })
        .catch(err => {
            console.error('OD桑基图加载失败:', err);
            chart.setOption({
                backgroundColor: 'transparent',
                title: { text: '加载失败', left: 'center', top: 'center', textStyle: { color: '#ff6b8a', fontSize: 14 } },
                series: []
            });
        });
    
    window.addEventListener('resize', () => {
        if (chart && !chart.isDisposed()) {
            chart.resize();
        }
    });
}

// ==================== 地图可视化 ====================
function initMapChart() {
    const chart = safeInitChart('map-chart');
    if (!chart) return;
    
    chartInstances['map'] = chart;
    
    // 成渝地区站点坐标映射（完整版 - 包含所有主要站点）
    const defaultGeoCoord = {
        // 成都片区
        '成都东': [104.14, 30.63], '成都南': [104.07, 30.55], '成都': [104.07, 30.67], '成都西': [103.95, 30.68],
        '双流机场': [103.95, 30.58], '双流': [103.95, 30.58], '新津': [103.82, 30.41], '新津南': [103.82, 30.38],
        '眉山东': [104.05, 30.05], '眉山': [104.05, 30.05], '彭山北': [103.87, 30.20], '彭山': [103.87, 30.20],
        '青白江': [104.25, 30.88], '青白江东': [104.28, 30.88], '新都东': [104.15, 30.82],
        '广汉': [104.28, 30.98], '广汉北': [104.28, 31.02], '德阳': [104.40, 31.13],
        '什邡': [104.17, 31.13], '绵竹': [104.22, 31.35], '绵阳': [104.73, 31.47],
        '江油': [104.75, 31.78], '江油北': [104.75, 31.82], '青川': [105.23, 32.58],
        '剑门关': [105.52, 32.28], '广元': [105.82, 32.43],
        // 成渝中段
        '资阳北': [104.65, 30.13], '资阳': [104.65, 30.13], '资中北': [104.85, 29.78], '资中': [104.85, 29.78],
        '内江北': [105.05, 29.60], '内江': [105.05, 29.60], '内江东': [105.10, 29.58],
        '隆昌北': [105.28, 29.35], '隆昌': [105.28, 29.35],
        '荣昌北': [105.60, 29.42], '荣昌': [105.60, 29.42],
        '大足南': [105.72, 29.68], '大足': [105.72, 29.68],
        '永川东': [105.93, 29.38], '永川': [105.93, 29.38],
        '璧山': [106.22, 29.60], '铜梁': [105.85, 29.85],
        // 重庆片区
        '重庆北': [106.55, 29.62], '重庆西': [106.35, 29.52], '重庆': [106.55, 29.57], '重庆东': [106.65, 29.55],
        '沙坪坝': [106.45, 29.55], '江北': [106.57, 29.60], '重庆南': [106.52, 29.48],
        '北碚': [106.40, 29.82], '合川': [106.28, 30.00], '潼南': [105.84, 30.19],
        '涪陵': [107.40, 29.72], '涪陵北': [107.40, 29.75], '长寿': [107.08, 29.85], '长寿北': [107.08, 29.88],
        '垫江': [107.35, 30.33], '梁平': [107.80, 30.68],
        '万州': [108.40, 30.82], '万州北': [108.40, 30.85],
        '云阳': [108.70, 30.95], '奉节': [109.47, 31.02], '巫山': [109.88, 31.08],
        // 川北方向
        '遂宁': [105.59, 30.53], '遂宁西': [105.50, 30.53], '大英东': [105.25, 30.58], '大英': [105.25, 30.58],
        '南充北': [106.08, 30.84], '南充': [106.08, 30.84], '南充东': [106.15, 30.82],
        '广安南': [106.63, 30.45], '广安': [106.63, 30.45],
        '达州': [107.50, 31.21], '达州南': [107.50, 31.15],
        '营山': [106.57, 31.08], '蓬安': [106.42, 31.03], '仪陇': [106.30, 31.27],
        '巴中': [106.77, 31.87], '巴中东': [106.82, 31.85],
        // 川南方向
        '乐山': [103.77, 29.57], '峨眉山': [103.48, 29.60], '峨眉': [103.48, 29.60],
        '夹江': [103.57, 29.73], '犍为': [103.95, 29.22],
        '宜宾': [104.62, 28.77], '宜宾西': [104.55, 28.77], '宜宾东': [104.68, 28.75],
        '泸州': [105.44, 28.87], '泸州北': [105.44, 28.92],
        '自贡': [104.78, 29.35], '自贡东': [104.82, 29.33],
        '富顺': [104.98, 29.18], '威远': [104.67, 29.53],
        // 其他大城市
        '北京': [116.40, 39.90], '上海': [121.47, 31.23], '广州': [113.26, 23.13],
        '武汉': [114.30, 30.60], '西安': [108.95, 34.27], '天津': [117.20, 39.13],
        '贵阳': [106.63, 26.65], '昆明': [102.83, 25.05], '兰州': [103.82, 36.07],
        '郑州': [113.65, 34.76], '长沙': [112.98, 28.23], '南京': [118.78, 32.07]
    };
    
    fetch('/api/analysis/map')
        .then(res => res.json())
        .then(result => {
            let stationData = [], odData = [];
            let hasRealData = false;
            
            if (result.code === 200 && result.data) {
                // 获取所有站点数据（不限制数量）
                if (result.data.stations && result.data.stations.length > 0) {
                    stationData = result.data.stations.map(s => ({
                        name: s.stationName || `站点${s.stationId}`,
                        value: s.boarding || 0
                    }));
                    // 检查是否有真实客流数据
                    hasRealData = stationData.some(s => s.value > 0);
                }
                // 获取更多OD流向数据
                if (result.data.odFlow && result.data.odFlow.length > 0) {
                    odData = result.data.odFlow.slice(0, 20).map(od => ({
                        from: od.originName || `站点${od.originId}`,
                        to: od.destName || `站点${od.destId}`,
                        value: od.flow || 0
                    }));
                }
            }
            
            // 如果没有真实数据，显示"暂无数据"提示，但仍显示地图框架
            if (!hasRealData) {
                chart.setOption({
                    backgroundColor: 'transparent',
                    title: { text: '暂无客流数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
                    geo: {
                        map: 'china',
                        roam: true,
                        center: [105.3, 29.9],
                        zoom: 6,
                        silent: true,
                        itemStyle: { areaColor: '#0d2137', borderColor: '#2a5298' },
                        emphasis: { disabled: true }
                    },
                    series: []
                });
                // 尝试加载地图
                fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
                    .then(res => res.json())
                    .then(json => {
                        echarts.registerMap('china', json);
                        chart.setOption({});
                    })
                    .catch(() => {});
                return;
            }
            
            renderMapWithData(chart, defaultGeoCoord, stationData, odData);
        })
        .catch(() => {
            // 出错时显示"暂无数据"
            chart.setOption({
                backgroundColor: 'transparent',
                title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
                series: []
            });
        });
    
    window.addEventListener('resize', () => chart && !chart.isDisposed() && chart.resize());
}

function renderMapWithData(chart, geoCoordMap, stationData, odData) {
    // 转换站点数据为散点
    const convertStations = (data) => {
        return data.map(d => {
            // 尝试匹配坐标
            let coord = geoCoordMap[d.name];
            if (!coord) {
                // 尝试去掉后缀匹配
                const baseName = d.name.replace(/[东西南北站]$/, '');
                coord = geoCoordMap[baseName];
            }
            if (!coord) {
                // 随机生成成渝地区坐标
                coord = [104 + Math.random() * 3, 29.5 + Math.random() * 1.5];
            }
            return { name: d.name, value: [...coord, d.value] };
        });
    };
    
    // 转换OD数据为线
    const convertLines = (data) => {
        return data.map(d => {
            let fromCoord = geoCoordMap[d.from] || geoCoordMap[d.from.replace(/[东西南北站]$/, '')];
            let toCoord = geoCoordMap[d.to] || geoCoordMap[d.to.replace(/[东西南北站]$/, '')];
            if (!fromCoord) fromCoord = [104 + Math.random() * 3, 29.5 + Math.random() * 1.5];
            if (!toCoord) toCoord = [104 + Math.random() * 3, 29.5 + Math.random() * 1.5];
            return { coords: [fromCoord, toCoord], value: d.value, fromName: d.from, toName: d.to };
        }).filter(d => d.coords[0] && d.coords[1]);
    };
    
    const scatterData = convertStations(stationData);
    const linesData = convertLines(odData);
    
    const option = {
        backgroundColor: 'transparent',
        title: { text: '成渝地区铁路客流分布', left: 'center', top: 5, textStyle: { color: '#00d4ff', fontSize: 14 } },
        tooltip: { 
            formatter: p => {
                if (p.seriesType === 'effectScatter') return `${p.name}<br/>客流: ${(p.value[2] || 0).toLocaleString()}`;
                if (p.seriesType === 'lines') return `${p.data.fromName} → ${p.data.toName}<br/>客流: ${(p.data.value || 0).toLocaleString()}`;
                return '';
            }
        },
        geo: {
            map: 'china',
            roam: true,
            center: [105.3, 29.9],
            zoom: 6,
            silent: true,
            itemStyle: { areaColor: '#0d2137', borderColor: '#2a5298' },
            emphasis: { disabled: true }
        },
        series: [
            {
                name: 'OD流向',
                type: 'lines',
                coordinateSystem: 'geo',
                effect: { show: true, period: 5, trailLength: 0.3, symbol: 'arrow', symbolSize: 5, color: '#fff' },
                lineStyle: { color: '#ff6b8a', width: 1.5, curveness: 0.2, opacity: 0.6 },
                data: linesData
            },
            {
                name: '站点客流',
                type: 'effectScatter',
                coordinateSystem: 'geo',
                rippleEffect: { brushType: 'stroke', scale: 3 },
                label: { show: true, position: 'right', formatter: '{b}', color: '#8ec5fc', fontSize: 10 },
                symbolSize: val => Math.max(8, Math.sqrt(val[2] || 0) / 8 + 5),
                itemStyle: { color: p => (p.value[2] || 0) > 50000 ? '#ff6b8a' : ((p.value[2] || 0) > 20000 ? '#ffc107' : '#00d4ff') },
                data: scatterData
            }
        ]
    };
    
    // 尝试加载地图
    fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json')
        .then(res => res.json())
        .then(json => {
            echarts.registerMap('china', json);
            chart.setOption(option);
        })
        .catch(() => {
            // 无地图时使用笛卡尔坐标
            delete option.geo;
            option.grid = { left: '5%', right: '5%', top: '15%', bottom: '10%' };
            option.xAxis = { type: 'value', min: 103, max: 108, show: false };
            option.yAxis = { type: 'value', min: 29, max: 32, show: false };
            option.series.forEach(s => s.coordinateSystem = 'cartesian2d');
            chart.setOption(option);
        });
}

// ==================== 图表联动 ====================
function setupChartLinkage() {
    // 地图点击联动
    const mapChart = chartInstances['map'];
    if (mapChart) {
        mapChart.on('click', 'series.effectScatter', function(params) {
            console.log('点击地图站点:', params.name);
            onStationClick(params.name);
        });
    }
    
    // 站点排名图点击联动
    const stationRankingChart = chartInstances['stationRanking'];
    if (stationRankingChart) {
        stationRankingChart.on('click', function(params) {
            if (params.name) {
                console.log('点击排名站点:', params.name);
                onStationClick(params.name);
            }
        });
    }
    
    // 站点繁忙度图点击联动
    setTimeout(() => {
        const stationBusyChart = chartInstances['stationBusy'];
        if (stationBusyChart) {
            stationBusyChart.on('click', function(params) {
                if (params.name) {
                    console.log('点击繁忙度站点:', params.name);
                    onStationClick(params.name);
                }
            });
        }
    }, 1000);
}

// 站点点击事件处理 - 更新所有相关图表
async function onStationClick(stationName) {
    console.log('=== 图表联动: 选中站点 ===', stationName);
    
    // 1. 更新Dashboard站点选择器
    const dashboardSelect = document.getElementById('dashboard-station-select');
    if (dashboardSelect) {
        const option = Array.from(dashboardSelect.options).find(o => o.textContent === stationName);
        if (option) {
            dashboardSelect.value = option.value;
        }
    }
    
    // 2. 更新站点评估页面的选择器
    const stationSelect = document.getElementById('station-select');
    if (stationSelect) {
        const option = Array.from(stationSelect.options).find(o => o.textContent === stationName);
        if (option) {
            stationSelect.value = option.value;
        }
    }
    
    // 3. 高亮地图上的站点
    highlightStationOnMap(stationName);
    
    // 4. 高亮站点排名图
    highlightStationOnRanking(stationName);
    
    // 5. 获取站点ID并加载详细数据
    const stationId = getStationIdByName(stationName);
    if (stationId) {
        await loadStationDetailData(stationId, stationName);
    }
    
    // 6. 显示提示信息
    showStationTooltip(stationName);
}

// 根据站点名称获取ID
function getStationIdByName(stationName) {
    const stations = appData.stations || [];
    const station = stations.find(s => s.stationName === stationName);
    return station ? station.id : null;
}

// 高亮地图上的站点
function highlightStationOnMap(stationName) {
    const mapChart = chartInstances['map'];
    if (mapChart) {
        // 先取消所有高亮
        mapChart.dispatchAction({ type: 'downplay', seriesIndex: 0 });
        // 高亮选中的站点
        mapChart.dispatchAction({ type: 'highlight', seriesIndex: 0, name: stationName });
        // 显示tooltip
        mapChart.dispatchAction({ type: 'showTip', seriesIndex: 0, name: stationName });
    }
}

// 高亮站点排名图
function highlightStationOnRanking(stationName) {
    const chart = chartInstances['stationRanking'];
    if (chart) {
        chart.dispatchAction({ type: 'downplay', seriesIndex: 0 });
        chart.dispatchAction({ type: 'highlight', seriesIndex: 0, name: stationName });
    }
}

// 加载站点详细数据并更新图表
async function loadStationDetailData(stationId, stationName) {
    try {
        const [timeRes, busyRes] = await Promise.all([
            fetch(`${API_BASE}/analysis/station/time/${stationId}`),
            fetch(`${API_BASE}/analysis/station/busy`)
        ]);
        
        const timeResult = await timeRes.json();
        const busyResult = await busyRes.json();
        
        // 更新时段分布图（如果在Dashboard页面）
        if (timeResult.code === 200 && timeResult.data && timeResult.data.hourlyFlow) {
            updateTimeDistributionChart(timeResult.data.hourlyFlow, stationName);
        }
        
        // 更新站点详情（如果在站点评估页面）
        if (busyResult.code === 200 && busyResult.data) {
            const stationData = busyResult.data.find(s => s.stationId == stationId);
            if (stationData) {
                updateStationDetailPanel(stationData, stationName);
            }
        }
        
    } catch (error) {
        console.error('加载站点详细数据失败:', error);
    }
}

// 更新时段分布图
function updateTimeDistributionChart(hourlyData, stationName) {
    const chart = chartInstances['timeDistribution'];
    if (!chart) return;
    
    // 检查是否有有效数据
    let hasValidData = false;
    let hours = [];
    let data = [];
    
    if (hourlyData && hourlyData.length > 0) {
        hours = hourlyData.map(h => `${h.hour}:00`);
        data = hourlyData.map(h => h.flow || 0);
        // 检查是否只有0点数据或者有多个时段
        hasValidData = hourlyData.length > 1 || (hourlyData.length === 1 && hourlyData[0].hour > 0);
        if (!hasValidData) {
            hasValidData = data.some(v => v > 0);
        }
    }
    
    if (!hasValidData) {
        chart.setOption({
            backgroundColor: 'transparent',
            title: { text: `${stationName} 客流时段分布\n\n暂无数据`, textStyle: { color: '#8ec5fc', fontSize: 14 }, left: 'center', top: 'center' },
            xAxis: { show: false },
            yAxis: { show: false },
            series: []
        });
        return;
    }
    
    chart.setOption({
        title: { text: `${stationName} 客流时段分布`, textStyle: { color: '#00d4ff', fontSize: 14 }, left: 'center', top: 5 },
        xAxis: { show: true, data: hours },
        yAxis: { show: true },
        series: [{ data: data, type: 'bar' }]
    });
}

// 更新站点详情面板
function updateStationDetailPanel(stationData, stationName) {
    const detailContent = document.getElementById('station-detail-content');
    if (detailContent) {
        detailContent.innerHTML = `
            <p><strong>站点名称：</strong>${stationName}</p>
            <p><strong>繁忙指数：</strong>${stationData.busyIndex || 0} (${stationData.level || '-'})</p>
            <p><strong>上车人数：</strong>${formatNumber(stationData.boarding || 0)}</p>
            <p><strong>下车人数：</strong>${formatNumber(stationData.alighting || 0)}</p>
            <p><strong>总客流量：</strong>${formatNumber(stationData.total || 0)}</p>
        `;
    }
}

// 显示站点提示
function showStationTooltip(stationName) {
    // 创建临时提示
    let tooltip = document.getElementById('station-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'station-tooltip';
        tooltip.style.cssText = 'position:fixed;top:20px;right:20px;background:rgba(0,212,255,0.9);color:#fff;padding:10px 20px;border-radius:4px;z-index:9999;font-size:14px;';
        document.body.appendChild(tooltip);
    }
    tooltip.textContent = `已选中站点: ${stationName}`;
    tooltip.style.display = 'block';
    
    // 3秒后隐藏
    setTimeout(() => {
        tooltip.style.display = 'none';
    }, 3000);
}

// 兼容旧的highlightStation函数
function highlightStation(stationName) {
    onStationClick(stationName);
}

// ==================== 图表更新函数 ====================
function updateFlowCharts(data) {
    if (data.daily || data.trend) updateFlowTrendChart(data.daily || data.trend);
    if (data.weekly) updateWeeklyFlowChart(data.weekly);
    if (data.hourly) updateHourlyFlowChart(data.hourly);
}

function updateFlowTrendChart(dailyData) {
    const chart = chartInstances['flowTrend'];
    if (!chart || !dailyData || dailyData.length === 0) return;
    
    const dates = dailyData.map(d => {
        if (d.date) {
            const date = new Date(d.date);
            return `${date.getMonth()+1}/${date.getDate()}`;
        }
        return d.month || '';
    });
    const values = dailyData.map(d => d.boarding || d.flow || 0);
    
    chart.setOption({ xAxis: { data: dates }, series: [{ data: values }] });
}

function updateWeeklyFlowChart(weeklyData) {
    const chart = chartInstances['weeklyFlow'];
    if (!chart || !weeklyData || weeklyData.length === 0) return;
    
    const data = [0, 0, 0, 0, 0, 0, 0];
    weeklyData.forEach(w => {
        let idx = (w.weekday || 1) - 2;
        if (idx < 0) idx = 6;
        if (idx >= 0 && idx < 7) data[idx] = w.flow || 0;
    });
    
    chart.setOption({ series: [{ data: data }] });
}

function updateHourlyFlowChart(hourlyData) {
    const chart = chartInstances['timeDistribution'];
    if (!chart || !hourlyData || hourlyData.length === 0) return;
    
    const hours = hourlyData.map(d => `${d.hour}:00`);
    const values = hourlyData.map(d => d.flow || 0);
    
    chart.setOption({ xAxis: { data: hours }, series: [{ data: values }] });
}

function updateLineCharts(data) {
    if (!data || data.length === 0) return;
    
    // 更新线路负载图
    const lineLoadChart = chartInstances['lineLoad'];
    if (lineLoadChart) {
        const names = data.map(d => d.name || `线路${d.lineId}`);
        const current = data.map(d => ((d.current || d.boarding || 0) / 10000).toFixed(1));
        const capacity = data.map(d => ((d.capacity || 15000) / 10000).toFixed(1));
        lineLoadChart.setOption({ xAxis: { data: names }, series: [{ data: current }, { data: capacity }] });
    }
    
    // 更新上座率图
    const occupancyChart = chartInstances['occupancy'];
    if (occupancyChart) {
        const names = data.map(d => d.name || `线路${d.lineId}`);
        const rates = data.map(d => {
            const rate = Math.round((d.load || 0.7) * 100);
            return {
                value: rate,
                itemStyle: { color: rate > 90 ? '#ff6b8a' : (rate > 70 ? '#ffc107' : '#00ff88') }
            };
        });
        occupancyChart.setOption({ xAxis: { data: names }, series: [{ data: rates }] });
    }
}

function updateStationCharts(data) {
    if (!data || data.length === 0) return;
    updateStationBusyChart(data);
}

function updateStationBusyChart(data) {
    const chart = chartInstances['stationBusy'];
    if (!chart || !data || data.length === 0) return;
    
    const stations = data.slice(0, 10).map(d => d.stationName || `站点${d.stationId}`).reverse();
    const values = data.slice(0, 10).map(d => ({
        value: d.busyIndex || 0,
        itemStyle: { color: d.busyIndex > 80 ? '#ff6b8a' : (d.busyIndex > 50 ? '#ffc107' : '#00ff88') }
    })).reverse();
    
    chart.setOption({ yAxis: { data: stations }, series: [{ data: values }] });
}

function updateSectionFlowChart(data) {
    const chart = chartInstances['sectionFlow'];
    if (!chart) return;
    
    if (!data || data.length === 0) {
        chart.setOption({
            title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#8ec5fc', fontSize: 14 } },
            xAxis: { data: [] },
            series: [{ data: [] }]
        });
        return;
    }
    
    const stations = data.map(d => d.stationName || `站点${d.stationId}`);
    const values = data.map(d => d.boarding || 0);
    
    chart.setOption({
        xAxis: { data: stations },
        series: [{
            data: values,
            markPoint: {
                data: [
                    { type: 'max', name: '最大值', itemStyle: { color: '#ff6b8a' } },
                    { type: 'min', name: '最小值', itemStyle: { color: '#00ff88' } }
                ]
            }
        }]
    });
}

function updateStationRolesChart(data) {
    const chart = chartInstances['stationType'];
    if (!chart || !data || data.length === 0) return;
    
    let roleCount = { '始发站': 0, '终到站': 0, '中转站': 0, '通过站': 0 };
    data.forEach(s => {
        const role = s.role || '通过站';
        roleCount[role] = (roleCount[role] || 0) + 1;
    });
    
    const pieData = [
        { value: roleCount['始发站'] + roleCount['终到站'], name: '始发终到站', itemStyle: { color: '#ff6b8a' } },
        { value: roleCount['中转站'], name: '中转站', itemStyle: { color: '#ffc107' } },
        { value: roleCount['通过站'], name: '通过站', itemStyle: { color: '#00d4ff' } }
    ].filter(d => d.value > 0);
    
    chart.setOption({ series: [{ data: pieData }] });
}

function updateHubAnalysisChart(data) {
    const chart = chartInstances['hubAnalysis'];
    if (!chart || !data || data.length === 0) return;
    
    const topStations = data.slice(0, 6);
    const indicator = topStations.map(s => ({ name: s.stationName || `站点${s.stationId}`, max: 100, color: '#8ec5fc' }));
    const degreeValues = topStations.map(s => s.degreeCentrality || 0);
    const betweennessValues = topStations.map(s => s.betweennessCentrality || 0);
    
    chart.setOption({
        radar: { indicator: indicator },
        series: [{
            data: [
                { value: degreeValues, name: '度中心性' },
                { value: betweennessValues, name: '介数中心性' }
            ]
        }]
    });
}

function updateHubIdentifyChart(data) {
    const chart = chartInstances['hubIdentify'];
    if (!chart || !data || data.length === 0) return;
    
    const scatterData = data.slice(0, 10).map(s => ({
        name: s.stationName || `站点${s.stationId}`,
        value: [s.degreeCentrality || 0, s.betweennessCentrality || 0, s.boarding || 10000],
        isHub: s.isHub
    }));
    
    chart.setOption({
        series: [{
            data: scatterData
        }]
    });
}
