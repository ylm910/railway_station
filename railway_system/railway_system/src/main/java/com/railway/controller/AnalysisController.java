package com.railway.controller;

import com.railway.entity.PassengerFlow;
import com.railway.mapper.PassengerFlowMapper;
import com.railway.service.AnalysisService;
import com.railway.common.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analysis")
public class AnalysisController {
    
    @Autowired
    private AnalysisService analysisService;
    
    @Autowired
    private PassengerFlowMapper flowMapper;
    
    // ==================== Dashboard ====================
    
    @GetMapping("/dashboard")
    public Result<Map<String, Object>> dashboard() {
        return Result.success(analysisService.getDashboardData());
    }
    
    // 概览数据（用于前端判断是否有数据）
    @GetMapping("/overview")
    public Result<Map<String, Object>> overview() {
        Map<String, Object> data = new HashMap<>();
        data.put("totalFlow", flowMapper.totalBoarding());
        data.put("totalCount", flowMapper.count());
        return Result.success(data);
    }
    
    // ==================== 客流分析 ====================
    
    @GetMapping("/flow/trend")
    public Result<Map<String, Object>> flowTrend(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false, defaultValue = "day") String timeRange) {
        if (startDate != null && endDate != null && !startDate.isEmpty() && !endDate.isEmpty()) {
            return Result.success(analysisService.getFlowTrendByDateRange(startDate, endDate, timeRange));
        }
        return Result.success(analysisService.getFlowTrend());
    }
    
    @GetMapping("/flow/od")
    public Result<?> odFlow(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        if (startDate != null && endDate != null && !startDate.isEmpty() && !endDate.isEmpty()) {
            return Result.success(analysisService.getODFlowByDateRange(startDate, endDate));
        }
        return Result.success(analysisService.getODFlow());
    }
    
    @GetMapping("/flow/peak")
    public Result<Map<String, Object>> peakAnalysis(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        if (startDate != null && endDate != null && !startDate.isEmpty() && !endDate.isEmpty()) {
            return Result.success(analysisService.getPeakAnalysisByDateRange(startDate, endDate));
        }
        return Result.success(analysisService.getPeakAnalysis());
    }
    
    @GetMapping("/flow/predict")
    public Result<Map<String, Object>> predict(
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        if (startDate != null && endDate != null && !startDate.isEmpty() && !endDate.isEmpty()) {
            return Result.success(analysisService.predictFlowByDateRange(days, startDate, endDate));
        }
        return Result.success(analysisService.predictFlow(days));
    }

    @GetMapping("/flow/list")
    public Result<List<PassengerFlow>> flowList() {
        return Result.success(flowMapper.findAll());
    }
    
    @GetMapping("/flow/detail/{id}")
    public Result<PassengerFlow> getFlow(@PathVariable Integer id) {
        PassengerFlow flow = flowMapper.findById(id);
        if (flow == null) {
            return Result.error("数据不存在");
        }
        return Result.success(flow);
    }
    
    @PostMapping("/flow/save")
    public Result<String> saveFlow(@RequestBody PassengerFlow flow) {
        if (flow.getId() != null) {
            flowMapper.update(flow);
        } else {
            flowMapper.insert(flow);
        }
        return Result.success("保存成功");
    }
    
    @DeleteMapping("/flow/delete/{id}")
    public Result<String> deleteFlow(@PathVariable Integer id) {
        flowMapper.delete(id);
        return Result.success("删除成功");
    }
    
    // ==================== 站点分析 ====================
    
    @GetMapping("/station/ranking")
    public Result<?> stationRanking() {
        return Result.success(analysisService.getStationRanking());
    }
    
    @GetMapping("/station/busy")
    public Result<?> stationBusy() {
        return Result.success(analysisService.getStationBusy());
    }
    
    @GetMapping("/station/roles")
    public Result<?> stationRoles() {
        return Result.success(analysisService.getStationRoles());
    }
    
    @GetMapping("/station/time/{stationId}")
    public Result<?> stationTime(@PathVariable Integer stationId) {
        return Result.success(analysisService.getStationTimeDistribution(stationId));
    }
    
    @GetMapping("/station/hub")
    public Result<?> hubStations() {
        return Result.success(analysisService.getHubStations());
    }
    
    // ==================== 线路分析 ====================
    
    @GetMapping("/line/load")
    public Result<?> lineLoad() {
        return Result.success(analysisService.getLineLoad());
    }
    
    @GetMapping("/line/section")
    public Result<?> sectionFlow(@RequestParam(required = false) Integer lineId) {
        return Result.success(analysisService.getSectionFlow(lineId));
    }
    
    @GetMapping("/suggestions")
    public Result<?> suggestions() {
        return Result.success(analysisService.getOptimizationSuggestions());
    }
    
    // ==================== 票务分析 ====================
    
    @GetMapping("/seat-type")
    public Result<?> seatTypeStats(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        if (startDate != null && endDate != null && !startDate.isEmpty() && !endDate.isEmpty()) {
            return Result.success(analysisService.getSeatTypeStatsByDateRange(startDate, endDate));
        }
        return Result.success(analysisService.getSeatTypeStats());
    }
    
    @GetMapping("/train-type")
    public Result<?> trainTypeStats() {
        return Result.success(analysisService.getTrainTypeStats());
    }
    
    @GetMapping("/train-class")
    public Result<?> trainClassStats() {
        return Result.success(analysisService.getTrainClassStats());
    }
    
    @GetMapping("/ticket-type")
    public Result<?> ticketTypeStats() {
        return Result.success(analysisService.getTicketTypeStats());
    }
    
    // ==================== 地图数据 ====================
    
    @GetMapping("/map")
    public Result<?> mapData() {
        return Result.success(analysisService.getMapData());
    }
    
    // ==================== 节假日分析 ====================
    
    @GetMapping("/holiday")
    public Result<?> holidayAnalysis(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        if (startDate != null && endDate != null && !startDate.isEmpty() && !endDate.isEmpty()) {
            return Result.success(analysisService.getHolidayAnalysisByDateRange(startDate, endDate));
        }
        return Result.success(analysisService.getHolidayAnalysis());
    }
    
    // ==================== 服务能力评估 ====================
    
    @GetMapping("/service-capacity")
    public Result<?> serviceCapacity() {
        return Result.success(analysisService.getServiceCapacityEvaluation());
    }
    
    // ==================== 数据导出 ====================
    
    @GetMapping("/export/csv")
    public Result<?> exportCsv(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        String csv = analysisService.exportFlowDataToCsv(startDate, endDate);
        return Result.success(csv);
    }
}
