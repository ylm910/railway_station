package com.railway.controller;

import com.railway.entity.LineStation;
import com.railway.service.LineStationService;
import com.railway.common.Result;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/lines")
public class LineStationController {
    
    @Autowired
    private LineStationService lineStationService;
    
    @GetMapping
    public Result<List<LineStation>> list() {
        return Result.success(lineStationService.findAll());
    }
    
    @GetMapping("/{id}")
    public Result<LineStation> get(@PathVariable Integer id) {
        LineStation lineStation = lineStationService.findById(id);
        if (lineStation == null) {
            return Result.error("线路站点不存在");
        }
        return Result.success(lineStation);
    }
    
    @GetMapping("/line/{lineId}")
    public Result<List<LineStation>> getByLine(@PathVariable Integer lineId) {
        return Result.success(lineStationService.findByLineId(lineId));
    }
    
    @PostMapping
    public Result<String> save(@RequestBody LineStation lineStation) {
        lineStationService.save(lineStation);
        return Result.success("保存成功");
    }
    
    @DeleteMapping("/{id}")
    public Result<String> delete(@PathVariable Integer id) {
        lineStationService.delete(id);
        return Result.success("删除成功");
    }
    
    @GetMapping("/count")
    public Result<Integer> count() {
        return Result.success(lineStationService.count());
    }
    
    @GetMapping("/summary")
    public Result<List<Map<String, Object>>> summary() {
        return Result.success(lineStationService.getLinesSummary());
    }
}
